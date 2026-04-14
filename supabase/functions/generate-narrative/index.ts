/**
 * generate-narrative — Streaming narrative generation using Claude
 *
 * Ported from functions/src/aiGuide.ts
 * Preserves:
 *   - Three-tier prompt caching (ephemeral cache_control on system blocks)
 *   - Model selection (claude-haiku-4-5-20251001 default)
 *   - Max tokens (700 default)
 *   - SSE streaming format (data: JSON lines)
 */
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.79.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/supabase-client.ts";

const ROLE_BLOCK = `You are the Guide — the narrative voice of a solo or co-op tabletop RPG session in the Ironsworn or Starforged universe. Your role is to respond to player moves and dice outcomes with vivid, immersive story beats that honour the mechanical result while breathing life into the fiction.

Rules you must follow:
- Write in third person ("She...", "He...", "They...", or use the character's name)
- Always honour the outcome: Strong Hit = genuine success, Weak Hit = success with cost/complication, Miss = failure or danger
- Write 5–8 evocative sentences — paint a vivid picture with sensory detail, emotional resonance, and narrative consequence
- Avoid clichés; favour specific sensory details over vague descriptions
- Never introduce new plot elements the player hasn't established
- Do not repeat the move name or outcome label verbatim
- Match the tone of the world: Ironsworn is grim Norse-inspired; Starforged is dark science fiction`;

interface NarrativeMoveEvent {
  moveName: string;
  moveId: string;
  stat?: string;
  statValue?: number;
  playerContext?: string;
  outcome: string;
  action?: number;
  challengeDice?: [number, number];
  score?: number;
}

interface NarrativeGameContext {
  characterName: string;
  worldTruths: string[];
  characterAssets: string[];
  campaignCharacterNames?: string[];
  recentEvents: string[];
  previousSessionSummary?: string;
  characterPronouns?: string;
  callsign?: string;
  characteristics?: string;
  activeCombat?: { objective: string; enemies: string[]; position: string } | null;
}

interface NarrativeRequest {
  sessionId: string;
  moveEvent?: NarrativeMoveEvent;
  prompt?: string;
  gameContext: NarrativeGameContext;
  debugOverride?: { systemPrompt?: string; userMessage?: string; model?: string; maxTokens?: number };
}

function buildGameContextBlock(req: NarrativeRequest): string {
  const { gameContext } = req;
  const lines: string[] = [];
  const callsignPart = gameContext.callsign ? ` — "${gameContext.callsign}"` : "";
  const pronounsPart = gameContext.characterPronouns ? ` (${gameContext.characterPronouns})` : "";
  lines.push(`Character: ${gameContext.characterName}${callsignPart}${pronounsPart}`);
  if (gameContext.characteristics) lines.push(`Characteristics: ${gameContext.characteristics}`);
  if (gameContext.worldTruths.length > 0) {
    lines.push("\nWorld Truths:");
    gameContext.worldTruths.forEach((t) => lines.push(`  - ${t}`));
  }
  if (gameContext.characterAssets.length > 0) {
    lines.push("\nCharacter Assets:");
    gameContext.characterAssets.forEach((a) => lines.push(`  - ${a}`));
  }
  if (gameContext.campaignCharacterNames?.length) {
    lines.push(`\nCampaign companions: ${gameContext.campaignCharacterNames.join(", ")}`);
  }
  return lines.join("\n");
}

function buildCombatBlock(gameContext: NarrativeGameContext): string {
  if (!gameContext.activeCombat) return "";
  const { objective, enemies, position } = gameContext.activeCombat;
  const positionLabel = position === "in_control" ? "In Control" : "In a Bad Spot";
  return ["\n## Active Combat", `Objective: ${objective}`,
    enemies.length > 0 ? `Enemies: ${enemies.join(", ")}` : "",
    `Position: ${positionLabel}`].filter(Boolean).join("\n");
}

function buildMoveUserMessage(req: NarrativeRequest): string {
  const { moveEvent, gameContext } = req;
  if (!moveEvent) return "";
  const lines: string[] = [];
  const statPart = moveEvent.stat && moveEvent.statValue !== undefined ? ` using ${moveEvent.stat} (${moveEvent.statValue})` : "";
  const scorePart = moveEvent.score !== undefined && moveEvent.challengeDice ? ` — action score ${moveEvent.score} vs [${moveEvent.challengeDice[0]}, ${moveEvent.challengeDice[1]}]` : "";
  lines.push(`Move: ${moveEvent.moveName}${statPart}${scorePart}`);
  lines.push(`Outcome: ${moveEvent.outcome}`);
  if (moveEvent.playerContext) lines.push(`Player's intent: "${moveEvent.playerContext}"`);
  if (gameContext.previousSessionSummary) lines.push(`\nPrevious session (now concluded):\n${gameContext.previousSessionSummary}`);
  if (gameContext.recentEvents.length > 0) {
    lines.push("\nCurrent session events so far (chronological):");
    gameContext.recentEvents.forEach((e) => lines.push(`  - ${e}`));
  }
  const combatBlock = buildCombatBlock(gameContext);
  if (combatBlock) lines.push(combatBlock);
  lines.push("\nWrite a vivid 5–8 sentence story beat in third person that honours this outcome. Ground the narrative in the current session events above. The previous session is backstory only — do not treat it as the current scene.");
  return lines.join("\n");
}

function buildPromptUserMessage(req: NarrativeRequest): string {
  const { prompt, gameContext } = req;
  const lines: string[] = [];
  if (gameContext.previousSessionSummary) {
    lines.push(`Previous session (now concluded):\n${gameContext.previousSessionSummary}`);
    lines.push("");
  }
  if (gameContext.recentEvents.length > 0) {
    lines.push("Current session events so far (chronological):");
    gameContext.recentEvents.forEach((e) => lines.push(`  - ${e}`));
    lines.push("");
  }
  const combatBlock = buildCombatBlock(gameContext);
  if (combatBlock) { lines.push(combatBlock); lines.push(""); }
  lines.push(`Player prompt: "${prompt}"\n\nWrite a vivid 5–8 sentence story beat in third person inspired by this prompt. Ground the narrative in the current session events above. The previous session is backstory only — do not treat it as the current scene.`);
  return lines.join("\n");
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const user = await getAuthUser(req);
  if (!user) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  let data: NarrativeRequest;
  try {
    const body = await req.json();
    data = body.data ?? body;
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  if (!data.sessionId || (!data.moveEvent && !data.prompt && !data.debugOverride)) {
    return new Response(JSON.stringify({ done: false }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
  const { debugOverride } = data;
  const model = debugOverride?.model ?? "claude-haiku-4-5-20251001";
  const maxTokens = debugOverride?.maxTokens ?? 700;
  const gameContextText = buildGameContextBlock(data);
  const userMessage = debugOverride?.userMessage
    ?? (data.moveEvent ? buildMoveUserMessage(data) : buildPromptUserMessage(data));

  type SystemBlock = Parameters<typeof client.messages.stream>[0]["system"];
  const systemBlocks: SystemBlock = debugOverride?.systemPrompt
    ? [{ type: "text", text: debugOverride.systemPrompt }]
    : [
        {
          type: "text",
          text: ROLE_BLOCK,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cache_control: { type: "ephemeral" } as any,
        },
        {
          type: "text",
          text: gameContextText,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cache_control: { type: "ephemeral" } as any,
        },
      ];

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model,
          max_tokens: maxTokens,
          system: systemBlocks,
          messages: [{ role: "user", content: userMessage }],
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = `data: ${JSON.stringify({ message: { text: event.delta.text } })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ result: { done: true } })}\n\n`));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
