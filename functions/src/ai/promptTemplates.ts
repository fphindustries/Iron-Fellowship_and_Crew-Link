import { AiCampaignContext, AiMode, GameSystem } from "./_ai.type";

// ---------------------------------------------------------------------------
// Tone and system-name helpers
// ---------------------------------------------------------------------------

const SYSTEM_NAME: Record<GameSystem, string> = {
  ironsworn: "Ironsworn",
  starforged: "Ironsworn: Starforged",
};

const SYSTEM_TONE: Record<GameSystem, string> = {
  ironsworn:
    "gritty dark fantasy — dangerous wilderness, desperate struggle, personal stakes",
  starforged:
    "hopeful space opera — dangerous cosmos, found family, personal vows against vast darkness",
};

// ---------------------------------------------------------------------------
// Shared role block (injected into every system prompt)
// ---------------------------------------------------------------------------

function buildRoleBlock(context: AiCampaignContext): string {
  const systemName = SYSTEM_NAME[context.gameSystem];
  const tone = SYSTEM_TONE[context.gameSystem];
  return [
    `You are a narrative game copilot for ${systemName}, a solo/co-op narrative RPG.`,
    "Your role is to SUGGEST, not decide. The player is the author of their story.",
    "Never invent game mechanics or override established campaign facts.",
    "Keep all suggestions consistent with the provided world truths, vows, and canon facts.",
    `Match the tone: ${tone}.`,
    "Be vivid, specific, and evocative. Output only what is explicitly requested.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Context block helpers
// ---------------------------------------------------------------------------

function formatVows(context: AiCampaignContext): string {
  if (context.activeVows.length === 0) return "None";
  return context.activeVows
    .map((v) => `- "${v.label}" (${v.difficulty}, progress: ${v.value}/10)`)
    .join("\n");
}

function formatRecentRolls(context: AiCampaignContext, limit = 10): string {
  const rolls = context.recentRolls.slice(0, limit);
  if (rolls.length === 0) return "No recent rolls recorded.";
  return rolls
    .map((r) => {
      const base = `- ${r.label}: ${r.result}`;
      return r.oracleResult ? `${base} → "${r.oracleResult}"` : base;
    })
    .join("\n");
}

function formatCharacters(context: AiCampaignContext): string {
  if (context.characters.length === 0) return "Unknown";
  return context.characters
    .map((c) => {
      const metersStr = Object.entries(c.conditionMeters)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const statsStr = Object.entries(c.stats)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      return `${c.name} — stats: ${statsStr} | ${metersStr} | momentum: ${c.momentum}`;
    })
    .join("\n");
}

function formatNPCs(context: AiCampaignContext): string {
  if (!context.currentNPCs || context.currentNPCs.length === 0) return "None";
  return context.currentNPCs
    .map((n) => {
      const parts = [n.name];
      if (n.role) parts.push(`role: ${n.role}`);
      if (n.disposition) parts.push(`disposition: ${n.disposition}`);
      if (n.goal) parts.push(`goal: ${n.goal}`);
      return `- ${parts.join(", ")}`;
    })
    .join("\n");
}

function formatWorldTruths(context: AiCampaignContext): string {
  if (!context.worldTruths) return "Default setting";
  const entries = Object.entries(context.worldTruths);
  if (entries.length === 0) return "Default setting";
  return entries.map(([k, v]) => `- ${k}: ${v}`).join("\n");
}

function buildContextBlock(context: AiCampaignContext): string {
  const lines: string[] = [
    `Campaign: ${context.campaignName} (${context.campaignType})`,
    "",
    "World truths:",
    formatWorldTruths(context),
    "",
    "Characters:",
    formatCharacters(context),
    "",
    "Active vows:",
    formatVows(context),
    "",
    "Recent rolls:",
    formatRecentRolls(context),
  ];

  if (context.currentLocation) {
    lines.push("", `Current location: ${context.currentLocation.name}`);
    if (context.currentLocation.type) {
      lines.push(`Location type: ${context.currentLocation.type}`);
    }
    if (context.currentLocation.fields) {
      const fields = Object.entries(context.currentLocation.fields)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join("\n");
      if (fields) lines.push("Location details:", fields);
    }
  }

  if (context.currentNPCs && context.currentNPCs.length > 0) {
    lines.push("", "NPCs present:", formatNPCs(context));
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Mode: Story Generator
// ---------------------------------------------------------------------------

function buildStoryGeneratorPrompts(context: AiCampaignContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = [
    buildRoleBlock(context),
    "",
    "Generate scene possibilities from the provided context.",
    "Do not resolve the scenes — give the player distinct choices to make.",
    "Label each suggestion type clearly (A/B/C for scenes, Complication, Sensory, Twist).",
    "For each item, prefix with one of: [established fact], [likely inference], [suggestion], or [dramatic twist].",
  ].join("\n");

  const objectiveLine = context.freeformInput
    ? `Current objective: ${context.freeformInput}`
    : "Current objective: Explore what comes next.";

  const userPrompt = [
    buildContextBlock(context),
    "",
    objectiveLine,
    "",
    "Generate:",
    "1. THREE distinct scene possibilities (label them A, B, C — each 2-3 sentences).",
    "2. TWO potential complications that could arise regardless of scene choice.",
    "3. TWO sensory details that ground this location (sight, sound, smell, or texture).",
    "4. ONE unexpected twist or revelation that could deepen the story.",
  ].join("\n");

  return { systemPrompt, userPrompt };
}

// ---------------------------------------------------------------------------
// Mode: Stuck Player
// ---------------------------------------------------------------------------

function buildStuckPlayerPrompts(context: AiCampaignContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = [
    buildRoleBlock(context),
    "",
    "The player is stuck or uncertain what to do next.",
    "Provide concrete, actionable options that respect player agency.",
    "Each option must start with a strong action verb.",
    "Draw on the active vows, recent events, and world context to make suggestions specific.",
  ].join("\n");

  const lastRoll = context.recentRolls[0];
  const lastRollLine = lastRoll
    ? `Last roll: ${lastRoll.label} — ${lastRoll.result}${lastRoll.oracleResult ? ` (${lastRoll.oracleResult})` : ""}`
    : "No recent rolls.";

  const situationLine = context.freeformInput
    ? `Current situation: ${context.freeformInput}`
    : "Current situation: The player is unsure what to do next.";

  const userPrompt = [
    buildContextBlock(context),
    "",
    situationLine,
    lastRollLine,
    "",
    "Generate:",
    "1. THREE concrete next actions the character could take (each 1 sentence, starts with action verb).",
    "2. TWO complications or threats that could emerge if the character delays or hesitates.",
    "3. ONE oracle-style surprise — something unexpected that reframes the situation.",
    "4. THREE escalation options, each with a specific story-grounded suggestion:",
    "   - \"Escalate the tension\": ...",
    "   - \"Complicate the situation\": ...",
    "   - \"Reveal something hidden\": ...",
  ].join("\n");

  return { systemPrompt, userPrompt };
}

// ---------------------------------------------------------------------------
// Mode: Action Elaborator
// ---------------------------------------------------------------------------

function buildActionElaboratorPrompts(context: AiCampaignContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemName = SYSTEM_NAME[context.gameSystem];
  const systemPrompt = [
    buildRoleBlock(context),
    "",
    "Elaborate on a player-described character action.",
    `Suggest relevant ${systemName} move names where applicable.`,
    "Do not resolve outcomes — only elaborate on the attempt and its narrative implications.",
  ].join("\n");

  const primaryChar = context.characters[0];
  const charLine = primaryChar
    ? `Character: ${primaryChar.name} (momentum: ${primaryChar.momentum})`
    : "Character: unknown";

  const userPrompt = [
    buildContextBlock(context),
    "",
    `Action to elaborate: "${context.freeformInput ?? "unspecified action"}"`,
    charLine,
    "",
    "Provide:",
    "1. A vivid 2-3 sentence narrative version of this action.",
    "2. The most likely RISK or complication if this goes wrong.",
    "3. The probable consequence if this succeeds weakly (a partial win).",
    `4. TWO ${systemName} move names that most naturally fit this action.`,
  ].join("\n");

  return { systemPrompt, userPrompt };
}

// ---------------------------------------------------------------------------
// Mode: Session Recap
// ---------------------------------------------------------------------------

function buildSessionRecapPrompts(context: AiCampaignContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = [
    buildRoleBlock(context),
    "",
    "Summarize a play session and extract canon facts for the campaign record.",
    "Distinguish established facts from inferences.",
    "Use EXACTLY the section headers listed — they will be parsed programmatically.",
  ].join("\n");

  const allRollsStr = context.recentRolls
    .map((r) => {
      const base = `- ${r.label}: ${r.result}`;
      return r.oracleResult ? `${base} → "${r.oracleResult}"` : base;
    })
    .join("\n");

  const notesSection = context.noteText
    ? `Session notes:\n${context.noteText}`
    : "No session notes provided.";

  const userPrompt = [
    buildContextBlock(context),
    "",
    notesSection,
    "",
    `All rolls this session:\n${allRollsStr || "None recorded."}`,
    "",
    "Produce a session recap with EXACTLY these section headers:",
    "",
    "## Summary",
    "(3-5 sentence narrative summary of what happened)",
    "",
    "## Canon Facts Established",
    "(bullet list of things now true in the world)",
    "",
    "## NPC Appearances",
    "(bullet list: NPC name — what they did or revealed; omit if none)",
    "",
    "## Location Visits",
    "(bullet list: location name — what happened there; omit if none)",
    "",
    "## Suggested Note Title",
    "(a short evocative title for this session, max 8 words)",
  ].join("\n");

  return { systemPrompt, userPrompt };
}

// ---------------------------------------------------------------------------
// Mode: Bookkeeper
// ---------------------------------------------------------------------------

function buildBookkeeperPrompts(context: AiCampaignContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = [
    buildRoleBlock(context),
    "",
    "Extract structured campaign updates from freeform session text.",
    "Only suggest changes clearly supported by the text — do not invent.",
    "For existing records, use the exact names from the known lists when possible.",
    "Return a JSON object matching the bookkeeper_output schema exactly.",
  ].join("\n");

  const knownVows = context.activeVows.map((v) => `"${v.label}"`).join(", ");
  const knownNPCs = (context.currentNPCs ?? [])
    .map((n) => `"${n.name}"`)
    .join(", ");
  const knownLocation = context.currentLocation?.name ?? "unknown";

  const userPrompt = [
    `Known vows: ${knownVows || "none"}`,
    `Known NPCs: ${knownNPCs || "none"}`,
    `Current location: ${knownLocation}`,
    "",
    `Session text to extract from:\n"${context.freeformInput ?? ""}"`,
  ].join("\n");

  return { systemPrompt, userPrompt };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  useStructuredOutput: boolean;
}

export function buildPrompt(
  mode: AiMode,
  context: AiCampaignContext
): BuiltPrompt {
  switch (mode) {
  case "storyGenerator":
    return { ...buildStoryGeneratorPrompts(context), useStructuredOutput: false };
  case "stuckPlayer":
    return { ...buildStuckPlayerPrompts(context), useStructuredOutput: false };
  case "actionElaborator":
    return { ...buildActionElaboratorPrompts(context), useStructuredOutput: false };
  case "sessionRecap":
    return { ...buildSessionRecapPrompts(context), useStructuredOutput: false };
  case "bookkeeper":
    return { ...buildBookkeeperPrompts(context), useStructuredOutput: true };
  default: {
    const exhaustiveCheck: never = mode;
    throw new Error(`Unknown AI mode: ${exhaustiveCheck}`);
  }
  }
}
