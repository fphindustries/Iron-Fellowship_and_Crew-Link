#!/usr/bin/env node
/**
 * API error monitor.
 *
 * Spawns `nest start --watch`, streams its output, and when a server-side
 * error is detected it:
 *   1. Collects the full error block (2 s window)
 *   2. Writes a markdown log to <repo-root>/logs/errors/
 *   3. Calls Claude via the Anthropic SDK to read relevant files and apply a fix
 *
 * Guardrails:
 *   - Max 3 fix attempts per distinct error signature (per session)
 *   - 60 s debounce between attempts for the same signature
 *   - HTTP 4xx/5xx per-request errors are ignored — only structural errors acted on
 *   - If ANTHROPIC_API_KEY is absent the error is logged but no fix is attempted
 */

import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Paths ────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_DIR = join(__dirname, '..');
const REPO_ROOT = join(API_DIR, '..');
const LOG_DIR = join(REPO_ROOT, 'logs', 'errors');

// ─── Load api/.env before instantiating the Anthropic client ─────────────────

for (const envFile of ['.env.local', '.env']) {
  const envPath = join(API_DIR, envFile);
  if (!existsSync(envPath)) continue;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ''] = match;
    process.env[key] ??= rawValue.trim().replace(/^['"]|['"]$/g, '');
  }
}

const { default: Anthropic } = await import('@anthropic-ai/sdk');

// ─── Constants ────────────────────────────────────────────────────────────────

const COLLECT_MS = 2_000;       // wait this long after last error line before acting
const DEBOUNCE_MS = 60_000;     // min gap between fix attempts for the same signature
const MAX_ATTEMPTS = 3;         // max fix attempts per signature per session
const AGENT_MAX_ITER = 12;      // max tool-call iterations per agent run

// ─── Error classification ─────────────────────────────────────────────────────

const ACT_ON = [
  /\[ExceptionsHandler\]/,
  /\[ExceptionHandler\]/,
  /\[InstanceLoader\]/,
  /error TS\d+:/,
  /Cannot find module/,
  /UnhandledPromiseRejection/,
  /TypeError:/,
  /SyntaxError:/,
];

const IGNORE = [
  // per-request HTTP log lines  e.g.  GET /api/... 200
  /\b(GET|POST|PATCH|DELETE|PUT)\b.+\b\d{3}\b/,
  // nest bootstrap log lines
  /\[Nest\]\s+\d+\s+-.*\b(LOG|VERBOSE|DEBUG)\b/,
  // webpack/swc rebuild lines
  /\[12:\d{2}:\d{2}\] (Starting|Found \d+ error|File change)/,
];

function isActionable(text) {
  if (IGNORE.some((p) => p.test(text))) return false;
  return ACT_ON.some((p) => p.test(text));
}

// ─── Attempt tracking ─────────────────────────────────────────────────────────

/** @type {Map<string, { count: number; lastAttempt: number }>} */
const tracker = new Map();

function signature(text) {
  const m = text.match(/(?:Error|TypeError|SyntaxError|ReferenceError): ([^\n]{1,120})/)
    || text.match(/error TS\d+: ([^\n]{1,120})/);
  return m ? m[1].trim() : text.replace(/\s+/g, ' ').slice(0, 100);
}

function canFix(sig) {
  const r = tracker.get(sig);
  if (!r) return true;
  if (r.count >= MAX_ATTEMPTS) return false;
  if (Date.now() - r.lastAttempt < DEBOUNCE_MS) return false;
  return true;
}

function markAttempt(sig) {
  const r = tracker.get(sig) ?? { count: 0, lastAttempt: 0 };
  tracker.set(sig, { count: r.count + 1, lastAttempt: Date.now() });
}

// ─── Logging ──────────────────────────────────────────────────────────────────

function logFilename(sig) {
  const ts = new Date().toISOString().replace(/:/g, '-').slice(0, 19).replace('T', '_');
  const slug = sig.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 40).replace(/-$/, '');
  return `${ts}_${slug}.md`;
}

// ─── File helpers ─────────────────────────────────────────────────────────────

function extractPaths(text) {
  const paths = new Set();
  // stack trace entries:  (/absolute/path.ts:line:col)
  for (const m of text.matchAll(/\((\/.+?\.ts):\d+:\d+\)/g)) {
    if (!m[1].includes('node_modules')) paths.add(m[1]);
  }
  // TypeScript compiler errors:  /absolute/path.ts:line:col
  for (const m of text.matchAll(/(\/[^\s:]+\.ts)(?::\d+)?/g)) {
    if (!m[1].includes('node_modules') && existsSync(m[1])) paths.add(m[1]);
  }
  return [...paths].slice(0, 6);
}

function readSafe(path) {
  try { return readFileSync(path, 'utf8'); } catch { return null; }
}

// ─── Agent ────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'read_file',
    description: 'Read the full contents of a file.',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Absolute path to the file.' } },
      required: ['path'],
    },
  },
  {
    name: 'edit_file',
    description: 'Replace an exact string in a file. The old_string must match exactly.',
    input_schema: {
      type: 'object',
      properties: {
        path:       { type: 'string', description: 'Absolute path to the file.' },
        old_string: { type: 'string', description: 'The exact text to replace.' },
        new_string: { type: 'string', description: 'The replacement text.' },
      },
      required: ['path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'done',
    description: 'Signal completion. Always call this last.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'What was done, or why it could not be fixed.' },
        success: { type: 'boolean', description: 'True if a fix was applied.' },
      },
      required: ['summary', 'success'],
    },
  },
];

/**
 * @param {Anthropic} client
 * @param {string} errorText
 * @param {string[]} filePaths
 * @returns {Promise<{ summary: string; success: boolean; changes: { file: string; description: string }[] }>}
 */
async function runAgent(client, errorText, filePaths) {
  const changes = [];

  // Build initial file context from stack-traced paths
  const fileContext = filePaths
    .map((p) => {
      const content = readSafe(p);
      if (!content) return '';
      const rel = p.replace(REPO_ROOT + '/', '');
      return `### ${rel}\n\`\`\`ts\n${content}\n\`\`\``;
    })
    .filter(Boolean)
    .join('\n\n');

  const messages = [
    {
      role: 'user',
      content:
        `The NestJS API server threw this error:\n\n\`\`\`\n${errorText}\n\`\`\`\n\n` +
        (fileContext ? `Relevant files from the stack trace:\n\n${fileContext}\n\n` : '') +
        `Analyze the error, read any additional files you need, apply the minimal fix, then call \`done\`.`,
    },
  ];

  let doneResult = null;

  for (let i = 0; i < AGENT_MAX_ITER && !doneResult; i++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system:
        `You are an expert NestJS/TypeScript developer embedded in an error-monitoring script.\n` +
        `Fix only what is clearly broken — no refactoring, no unrelated changes.\n` +
        `Repository root: ${REPO_ROOT}`,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') break;

    const toolResults = [];

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      let result;
      const { path, old_string, new_string, summary, success } = block.input ?? {};

      if (block.name === 'read_file') {
        result = readSafe(path) ?? `Error: could not read ${path}`;

      } else if (block.name === 'edit_file') {
        const content = readSafe(path);
        if (!content) {
          result = `Error: could not read ${path}`;
        } else if (!content.includes(old_string)) {
          result = `Error: old_string not found in ${path}`;
        } else {
          writeFileSync(path, content.replace(old_string, new_string), 'utf8');
          const rel = path.replace(REPO_ROOT + '/', '');
          changes.push({
            file: rel,
            description: `**Replaced:**\n\`\`\`\n${old_string}\n\`\`\`\n**With:**\n\`\`\`\n${new_string}\n\`\`\``,
          });
          result = `Edit applied to ${rel}`;
        }

      } else if (block.name === 'done') {
        doneResult = { summary, success };
        result = 'Done.';
      }

      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: String(result) });
    }

    if (toolResults.length) {
      messages.push({ role: 'user', content: toolResults });
    }
  }

  return {
    summary: doneResult?.summary ?? 'Agent loop ended without calling done.',
    success: doneResult?.success ?? false,
    changes,
  };
}

// ─── Main error handler ───────────────────────────────────────────────────────

async function handleError(errorText) {
  const sig = signature(errorText);
  const filename = logFilename(sig);
  const timestamp = new Date().toISOString();

  let md =
    `# Error Report\n\n` +
    `**Time:** ${timestamp}  \n` +
    `**Signature:** \`${sig}\`\n\n` +
    `## Raw Output\n\n\`\`\`\n${errorText.trim()}\n\`\`\`\n\n`;

  if (!process.env.ANTHROPIC_API_KEY) {
    md += `## Fix Attempt\n\n_Skipped — \`ANTHROPIC_API_KEY\` not set._\n`;
    writeLog(filename, md);
    return;
  }

  if (!canFix(sig)) {
    const r = tracker.get(sig);
    const reason = r?.count >= MAX_ATTEMPTS
      ? `max attempts (${MAX_ATTEMPTS}) reached`
      : `debounce (${DEBOUNCE_MS / 1000}s)`;
    console.log(`[monitor] Skipping fix for "${sig}" — ${reason}`);
    md += `## Fix Attempt\n\n_Skipped — ${reason}._\n`;
    writeLog(filename, md);
    return;
  }

  markAttempt(sig);
  console.log(`[monitor] Attempting fix… (${tracker.get(sig).count}/${MAX_ATTEMPTS}) → logs/errors/${filename}`);

  try {
    const client = new Anthropic();
    const paths = extractPaths(errorText);
    const result = await runAgent(client, errorText, paths);

    md += `## Fix Attempt\n\n${result.summary}\n\n`;

    if (result.changes.length) {
      md += `## Changes Applied\n\n`;
      for (const c of result.changes) {
        md += `### ${c.file}\n\n${c.description}\n\n`;
      }
    }

    md += `---\n\n**Result:** ${result.success ? '✅ Fix applied — server will reload.' : '⚠️ Could not resolve automatically — see log for details.'}\n`;

    console.log(`[monitor] ${result.success ? '✅ Fix applied' : '⚠️ No fix found'} — ${filename}`);
  } catch (e) {
    md += `## Fix Attempt\n\n**Agent error:** ${e.message}\n`;
    console.error('[monitor] Agent error:', e.message);
  }

  writeLog(filename, md);
}

function writeLog(filename, content) {
  mkdirSync(LOG_DIR, { recursive: true });
  writeFileSync(join(LOG_DIR, filename), content, 'utf8');
  console.log(`[monitor] Log written → logs/errors/${filename}`);
}

// ─── Spawn nest & wire up output ──────────────────────────────────────────────

let buffer = '';
let timer = null;

function onChunk(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);

  if (!isActionable(text)) return;

  buffer += text;
  clearTimeout(timer);
  timer = setTimeout(() => {
    const captured = buffer;
    buffer = '';
    handleError(captured).catch(console.error);
  }, COLLECT_MS);
}

const proc = spawn('pnpm', ['run', 'start:dev'], {
  cwd: API_DIR,
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
});

proc.stdout.on('data', onChunk);
proc.stderr.on('data', onChunk);

proc.on('exit', (code) => {
  console.log(`[monitor] nest exited (code ${code ?? 0})`);
  process.exit(code ?? 0);
});

process.on('SIGINT', () => proc.kill('SIGINT'));
process.on('SIGTERM', () => proc.kill('SIGTERM'));

console.log('[monitor] Watching NestJS API for errors…');
