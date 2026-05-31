type GameSystem = 'ironsworn' | 'starforged';
type AiCopilotMode =
  | 'storyGenerator'
  | 'actionElaborator'
  | 'stuckPlayer'
  | 'sessionRecap'
  | 'bookkeeper';

type AiGuidedMode =
  | 'sceneFrame'
  | 'askOrAnswer'
  | 'moveSuggestion'
  | 'outcomeNarration'
  | 'priceProposal'
  | 'oracleInterpretation'
  | 'clockAdvance'
  | 'sceneChallengeGuidance'
  | 'bookkeepingProposal'
  | 'actionSuggestions'
  | 'intentToMove'
  | 'spotlightNudge';

type AiMode = AiCopilotMode | AiGuidedMode;

interface AiTrackContext {
  label: string;
  difficulty: string;
  value: number;
}
interface AiCharacterContext {
  name: string;
  stats: Record<string, number>;
  conditionMeters: Record<string, number>;
  momentum: number;
}
interface AiLocationContext {
  name: string;
  type?: string;
  fields?: Record<string, string>;
}
interface AiNPCContext {
  name: string;
  role?: string;
  disposition?: string;
  goal?: string;
}
interface AiRollResult {
  label: string;
  result: string;
  oracleResult?: string;
}
interface AiCampaignContext {
  gameSystem: GameSystem;
  campaignName: string;
  campaignType: string;
  worldTruths?: Record<string, string>;
  activeVows: AiTrackContext[];
  activeJourneys: AiTrackContext[];
  characters: AiCharacterContext[];
  recentRolls: AiRollResult[];
  currentLocation?: AiLocationContext;
  currentNPCs?: AiNPCContext[];
  noteText?: string;
  freeformInput?: string;
}

// ---------------------------------------------------------------------------
// Tone and system-name helpers
// ---------------------------------------------------------------------------

const SYSTEM_NAME: Record<GameSystem, string> = {
  ironsworn: 'Ironsworn',
  starforged: 'Ironsworn: Starforged',
};

const SYSTEM_TONE: Record<GameSystem, string> = {
  ironsworn:
    'gritty dark fantasy — dangerous wilderness, desperate struggle, personal stakes',
  starforged:
    'hopeful space opera — dangerous cosmos, found family, personal vows against vast darkness',
};

// ---------------------------------------------------------------------------
// Shared role block (injected into every system prompt)
// ---------------------------------------------------------------------------

function buildRoleBlock(
  context: AiCampaignContext,
  worldTonePrompt?: string,
): string {
  const systemName = SYSTEM_NAME[context.gameSystem];
  const tone = SYSTEM_TONE[context.gameSystem];
  const lines = [
    `You are a narrative game copilot for ${systemName}, a solo/co-op narrative RPG.`,
    'Your role is to SUGGEST, not decide. The player is the author of their story.',
    'Never invent game mechanics or override established campaign facts.',
    'Keep all suggestions consistent with the provided world truths, vows, and canon facts.',
    `Match the tone: ${tone}.`,
    'Be vivid, specific, and evocative. Output only what is explicitly requested.',
  ];

  if (worldTonePrompt) {
    lines.push(`Additional world tone: ${worldTonePrompt}`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Context block helpers
// ---------------------------------------------------------------------------

function formatVows(context: AiCampaignContext): string {
  if (context.activeVows.length === 0) return 'None';
  return context.activeVows
    .map((v) => `- "${v.label}" (${v.difficulty}, progress: ${v.value}/10)`)
    .join('\n');
}

function formatRecentRolls(context: AiCampaignContext, limit = 10): string {
  const rolls = context.recentRolls.slice(0, limit);
  if (rolls.length === 0) return 'No recent rolls recorded.';
  return rolls
    .map((r) => {
      const base = `- ${r.label}: ${r.result}`;
      return r.oracleResult ? `${base} → "${r.oracleResult}"` : base;
    })
    .join('\n');
}

function formatCharacters(context: AiCampaignContext): string {
  if (context.characters.length === 0) return 'Unknown';
  return context.characters
    .map((c) => {
      const metersStr = Object.entries(c.conditionMeters)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      const statsStr = Object.entries(c.stats)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `${c.name} — stats: ${statsStr} | ${metersStr} | momentum: ${c.momentum}`;
    })
    .join('\n');
}

function formatNPCs(context: AiCampaignContext): string {
  if (!context.currentNPCs || context.currentNPCs.length === 0) return 'None';
  return context.currentNPCs
    .map((n) => {
      const parts = [n.name];
      if (n.role) parts.push(`role: ${n.role}`);
      if (n.disposition) parts.push(`disposition: ${n.disposition}`);
      if (n.goal) parts.push(`goal: ${n.goal}`);
      return `- ${parts.join(', ')}`;
    })
    .join('\n');
}

function formatWorldTruths(context: AiCampaignContext): string {
  if (!context.worldTruths) return 'Default setting';
  const entries = Object.entries(context.worldTruths);
  if (entries.length === 0) return 'Default setting';
  return entries.map(([k, v]) => `- ${k}: ${v}`).join('\n');
}

function buildContextBlock(context: AiCampaignContext): string {
  const lines: string[] = [
    `Campaign: ${context.campaignName} (${context.campaignType})`,
    '',
    'World truths:',
    formatWorldTruths(context),
    '',
    'Characters:',
    formatCharacters(context),
    '',
    'Active vows:',
    formatVows(context),
    '',
    'Recent rolls:',
    formatRecentRolls(context),
  ];

  if (context.currentLocation) {
    lines.push('', `Current location: ${context.currentLocation.name}`);
    if (context.currentLocation.type) {
      lines.push(`Location type: ${context.currentLocation.type}`);
    }
    if (context.currentLocation.fields) {
      const fields = Object.entries(context.currentLocation.fields)
        .map(([k, v]) => `  ${k}: ${v}`)
        .join('\n');
      if (fields) lines.push('Location details:', fields);
    }
  }

  if (context.currentNPCs && context.currentNPCs.length > 0) {
    lines.push('', 'NPCs present:', formatNPCs(context));
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// AI Guide role block — injected as cached system prompt for AI Guided campaigns
// ---------------------------------------------------------------------------

function buildGuideRoleBlock(
  context: AiCampaignContext,
  worldTonePrompt?: string,
): string {
  const systemName = SYSTEM_NAME[context.gameSystem];
  const tone = SYSTEM_TONE[context.gameSystem];
  const lines = [
    `You are the Guide for a ${systemName} campaign — you replace the human GM role entirely.`,
    '',
    'CORE GUIDE PRINCIPLES (non-negotiable):',
    "- Facilitate, don't impose. Never override a protagonist's declared action or intent.",
    '- Let players choose their path. Present consequences and complications, not correct answers.',
    '- Deliver answers, ask questions. Confirm oracle results with authority, then ask an open question to build shared fiction.',
    '- Embrace chaos. Let dice and player choices steer the narrative. Avoid railroad plotting.',
    '- Moderate consequences. Match severity to fiction and momentum — not every Miss is catastrophic.',
    '',
    'WHAT YOU DO NOT DO:',
    '- Never roll action dice for protagonists — all action rolls belong to the player.',
    '- Never invent game mechanics or alter established rules.',
    '- Never contradict accepted canon facts already established in the session.',
    '- Never tell the player what their character feels or decides.',
    '',
    `Match the tone: ${tone}.`,
    'Be vivid, specific, and evocative. End responses with an open question when possible.',
  ];

  if (worldTonePrompt) {
    lines.push(``, `Additional world tone: ${worldTonePrompt}`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Context block helpers for AI Guide modes
// ---------------------------------------------------------------------------

interface AiGuideContext extends AiCampaignContext {
  guideState?: {
    currentScene?: {
      title: string;
      description: string;
      unresolvedQuestions: string[];
    };
    canonFacts?: string[];
    npcIntents?: Record<
      string,
      {
        currentIntent: string;
        hiddenAspects: string[];
        firstImpressionRevealed?: boolean;
      }
    >;
    tensionClocks?: Array<{
      label: string;
      segments: number;
      filled: number;
      consequence: string;
    }>;
    sceneChallengeState?: {
      objective: string;
      progress: number;
      complicationsIntroduced: string[];
    } | null;
    spotlight?: {
      current?: string;
      recent: string[];
      quiet: string[];
    };
  };
}

function buildGuideContextBlock(context: AiGuideContext): string {
  const base = buildContextBlock(context);
  const extra: string[] = [];

  if (context.guideState?.currentScene?.title) {
    extra.push('', `Current scene: ${context.guideState.currentScene.title}`);
    if (context.guideState.currentScene.description) {
      extra.push(context.guideState.currentScene.description);
    }
    if (context.guideState.currentScene.unresolvedQuestions?.length) {
      extra.push('Open threads:');
      context.guideState.currentScene.unresolvedQuestions.forEach((q) =>
        extra.push(`- ${q}`),
      );
    }
  }

  if (context.guideState?.canonFacts?.length) {
    extra.push('', 'Canon facts:');
    context.guideState.canonFacts.forEach((f) => extra.push(`- ${f}`));
  }

  if (context.guideState?.tensionClocks?.length) {
    extra.push('', 'Tension clocks (Guide-tracked):');
    context.guideState.tensionClocks.forEach((c) =>
      extra.push(`- ${c.label}: ${c.filled}/${c.segments} — ${c.consequence}`),
    );
  }

  if (context.guideState?.sceneChallengeState) {
    const sc = context.guideState.sceneChallengeState;
    extra.push(
      '',
      `Active scene challenge: "${sc.objective}" (progress: ${sc.progress}/10)`,
    );
    if (sc.complicationsIntroduced.length) {
      extra.push('Complications introduced:');
      sc.complicationsIntroduced.forEach((c) => extra.push(`- ${c}`));
    }
  }

  if (context.guideState?.spotlight) {
    const sp = context.guideState.spotlight;
    if (sp.current) {
      extra.push('', `Current spotlight: ${sp.current}`);
    }
    if (sp.quiet.length) {
      extra.push(`Characters not recently featured: ${sp.quiet.join(', ')}`);
    }
  }

  if (context.guideState?.npcIntents) {
    const npcs = Object.entries(context.guideState.npcIntents).filter(
      ([, intent]) => intent.firstImpressionRevealed && intent.currentIntent,
    );
    if (npcs.length) {
      extra.push('', 'Active NPC intents:');
      npcs.forEach(([name, intent]) =>
        extra.push(`- ${name}: ${intent.currentIntent}`),
      );
    }
  }

  return extra.length ? base + '\n' + extra.join('\n') : base;
}

// ---------------------------------------------------------------------------
// AI Guide modes
// ---------------------------------------------------------------------------

function buildSceneFramePrompts(
  context: AiGuideContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    'Frame the current scene for the players.',
    'Describe the environment with sensory details. Surface immediate tensions or opportunities.',
    'End with one open question that invites player action.',
  ];
  if (options?.modeCustomInstructions)
    modeLines.push(options.modeCustomInstructions);

  const locationLine = context.currentLocation
    ? `Location: ${context.currentLocation.name}${context.currentLocation.type ? ` (${context.currentLocation.type})` : ''}`
    : 'Location: unknown';

  const userPrompt = [
    locationLine,
    context.freeformInput ? `Additional context: ${context.freeformInput}` : '',
    '',
    'Provide:',
    '1. A 3-4 sentence scene description (atmosphere, sights, sounds, immediate details).',
    '2. ONE potential threat or opportunity the characters notice.',
    '3. ONE open question that draws the players in.',
  ]
    .filter(Boolean)
    .join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

function buildAskOrAnswerPrompts(
  context: AiGuideContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    "Answer the player's question about the world or fiction.",
    'If the answer is established in canon, state it directly.',
    'If the answer is unknown, make an evocative choice consistent with world truths — then ask a follow-up question to deepen shared fiction.',
  ];
  if (options?.modeCustomInstructions)
    modeLines.push(options.modeCustomInstructions);

  const userPrompt = [
    `Player question: "${context.freeformInput ?? 'What happens next?'}"`,
    '',
    'Respond in 2-4 sentences. End with one open question if the fiction is still unresolved.',
  ].join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

function buildMoveSuggestionPrompts(
  context: AiGuideContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const systemName = SYSTEM_NAME[context.gameSystem];
  const modeLines = [
    `Suggest ${systemName} moves appropriate to the current scene.`,
    'Each suggestion must be grounded in the fiction — not just a list of move names.',
    'Do not choose for the player; offer options.',
  ];
  if (options?.modeCustomInstructions)
    modeLines.push(options.modeCustomInstructions);

  const primaryChar = context.characters[0];
  const situationLine = context.freeformInput
    ? `Situation: ${context.freeformInput}`
    : 'Situation: Player is considering their next action.';

  const userPrompt = [
    situationLine,
    primaryChar
      ? `Character: ${primaryChar.name} (momentum: ${primaryChar.momentum})`
      : '',
    '',
    'Suggest 3 possible moves:',
    '- Each entry: move name — one sentence of narrative framing.',
    '- Include at least one aggressive option, one cautious option, and one creative option.',
  ]
    .filter(Boolean)
    .join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

function buildOutcomeNarrationPrompts(
  context: AiGuideContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    "Narrate the result of a player's move roll.",
    'Ground the outcome firmly in the fiction. Do not invent mechanical consequences beyond what the roll demands.',
    'Moderate the tone: strong hits should feel earned, weak hits bittersweet, misses ominous — not crushing.',
  ];
  if (options?.modeCustomInstructions)
    modeLines.push(options.modeCustomInstructions);

  const lastRoll = context.recentRolls[0];
  const rollLine = lastRoll
    ? `Roll: ${lastRoll.label} — ${lastRoll.result}${lastRoll.oracleResult ? ` (oracle: ${lastRoll.oracleResult})` : ''}`
    : 'Roll result: unspecified';

  const situationLine = context.freeformInput
    ? `Action attempted: ${context.freeformInput}`
    : 'Action attempted: unspecified';

  const userPrompt = [
    rollLine,
    situationLine,
    '',
    'Narrate the outcome in 2-3 sentences. End with a question that keeps the momentum going.',
  ].join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

function buildPriceProposalPrompts(
  context: AiGuideContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    'Propose the consequences of a Miss outcome.',
    'Choose consequences that are meaningful but not gratuitously punishing.',
    'Vary consequence types — not every miss is physical harm.',
    'Return a JSON object matching the price_proposal schema exactly.',
  ];
  if (options?.modeCustomInstructions)
    modeLines.push(options.modeCustomInstructions);

  const lastRoll = context.recentRolls[0];
  const moveLine = lastRoll
    ? `Failed move: ${lastRoll.label}`
    : 'Failed move: unspecified';

  const userPrompt = [
    moveLine,
    context.freeformInput ? `Context: ${context.freeformInput}` : '',
    '',
    'Characters:',
    formatCharacters(context),
  ]
    .filter(Boolean)
    .join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

function buildOracleInterpretationPrompts(
  context: AiGuideContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    'Interpret an oracle roll result in the context of the current scene.',
    "Connect the oracle result meaningfully to established fiction — don't treat it as abstract.",
    'Confirm the interpretation as canon, then ask one question to build on it.',
  ];
  if (options?.modeCustomInstructions)
    modeLines.push(options.modeCustomInstructions);

  const lastRoll = context.recentRolls.find((r) => r.oracleResult);
  const oracleLine = lastRoll
    ? `Oracle: ${lastRoll.label} → "${lastRoll.oracleResult}"`
    : `Oracle result: ${context.freeformInput ?? 'unspecified'}`;

  const userPrompt = [
    oracleLine,
    '',
    'In 2-3 sentences, weave this result into the current scene. End with one open question.',
  ].join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

function buildClockAdvancePrompts(
  context: AiGuideContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    'Determine whether tension clocks should advance based on recent events.',
    'Only advance clocks when fiction clearly warrants it — not on every action.',
    'Return a JSON object matching the clock_advance schema.',
  ];
  if (options?.modeCustomInstructions)
    modeLines.push(options.modeCustomInstructions);

  const clocksStr = context.guideState?.tensionClocks?.length
    ? context.guideState.tensionClocks
        .map(
          (c) =>
            `- "${c.label}": ${c.filled}/${c.segments} (consequence: ${c.consequence})`,
        )
        .join('\n')
    : 'No active tension clocks.';

  const userPrompt = [
    `Recent event: ${context.freeformInput ?? 'unspecified'}`,
    '',
    'Active tension clocks:',
    clocksStr,
    '',
    'Determine: should any clock advance? If yes, which one and by how much?',
  ].join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

function buildSceneChallengeGuidancePrompts(
  context: AiGuideContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    'Guide the players through the current scene challenge.',
    "Acknowledge the player's action, narrate its effect on the scene challenge, and introduce a complication or opportunity.",
  ];
  if (options?.modeCustomInstructions)
    modeLines.push(options.modeCustomInstructions);

  const sc = context.guideState?.sceneChallengeState;
  const scLine = sc
    ? `Scene challenge: "${sc.objective}" — progress ${sc.progress}/10`
    : 'Scene challenge: active (details unspecified)';

  const lastRoll = context.recentRolls[0];
  const rollLine = lastRoll
    ? `Last roll: ${lastRoll.label} — ${lastRoll.result}`
    : 'No recent roll.';

  const userPrompt = [
    scLine,
    rollLine,
    context.freeformInput ? `Player action: ${context.freeformInput}` : '',
    '',
    'Narrate the outcome (2-3 sentences) and introduce ONE complication or opportunity that changes the dynamic.',
  ]
    .filter(Boolean)
    .join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

function buildBookkeepingProposalPrompts(
  context: AiGuideContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  // Reuses the Bookkeeper prompt structure but framed for accepted Guide consequences.
  const modeLines = [
    'Extract structured campaign updates from an accepted Guide consequence.',
    'Only suggest changes clearly supported by the accepted narrative — do not invent.',
    'For existing records, use exact names from the known lists when possible.',
    'Return a JSON object matching the bookkeeper_output schema exactly.',
  ];
  if (options?.modeCustomInstructions)
    modeLines.push(options.modeCustomInstructions);

  const knownVows = context.activeVows.map((v) => `"${v.label}"`).join(', ');
  const knownNPCs = (context.currentNPCs ?? [])
    .map((n) => `"${n.name}"`)
    .join(', ');
  const knownLocation = context.currentLocation?.name ?? 'unknown';

  const userPrompt = [
    `Known vows: ${knownVows || 'none'}`,
    `Known NPCs: ${knownNPCs || 'none'}`,
    `Current location: ${knownLocation}`,
    '',
    `Accepted consequence text:\n"${context.freeformInput ?? ''}"`,
  ].join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

function buildActionSuggestionsPrompts(
  context: AiGuideContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    'Generate 4-6 concrete player actions appropriate for the current scene.',
    'Group them by intent: investigative (safe/curious), risky (direct/dangerous), social (people-focused), meta (oracle/recap).',
    'For each action, identify the most likely Ironsworn/Starforged move and stat.',
    'Rate confidence as high/medium/low based on how clearly the scene matches the move trigger.',
    'Return a JSON object matching the action_suggestions schema exactly.',
  ];
  if (options?.modeCustomInstructions)
    modeLines.push(options.modeCustomInstructions);

  const sceneTitle = context.guideState?.currentScene?.title;
  const sceneDesc = context.guideState?.currentScene?.description;

  const userPrompt = [
    sceneTitle ? `Current scene: ${sceneTitle}` : '',
    sceneDesc ? sceneDesc.slice(0, 500) : '',
    context.freeformInput ? `Additional context: ${context.freeformInput}` : '',
    '',
    'Generate action suggestions that fit the immediate fictional situation. Each should be a plain-language verb phrase (e.g. "Scan the debris field", "Confront the guard", "Ask the oracle about the signal").',
  ]
    .filter(Boolean)
    .join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

function buildIntentToMovePrompts(
  context: AiGuideContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    "Map the player's declared intent to the most applicable Ironsworn/Starforged move.",
    'Identify the stat that would be rolled.',
    'List any character assets that might apply.',
    'Rate confidence high/medium/low based on move trigger fit.',
    'Return a JSON object matching the intent_to_move schema exactly.',
  ];
  if (options?.modeCustomInstructions)
    modeLines.push(options.modeCustomInstructions);

  const userPrompt = [
    `Player intent: "${context.freeformInput ?? 'unspecified'}"`,
    '',
    'Identify: which move applies, which stat to roll, which assets might trigger, and why.',
  ]
    .filter(Boolean)
    .join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

function buildSpotlightNudgePrompts(
  context: AiGuideContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    'A party member has been quiet and not featured in recent scene beats.',
    'Suggest which character to bring into the spotlight next and what specific situation or question could draw them in naturally.',
    'The suggestion should fit the current scene, not feel forced.',
    'Return a JSON object matching the spotlight_nudge schema exactly.',
  ];
  if (options?.modeCustomInstructions)
    modeLines.push(options.modeCustomInstructions);

  const quiet = context.guideState?.spotlight?.quiet ?? [];
  const charNames = context.characters.map((c) => c.name);

  const userPrompt = [
    `Characters: ${charNames.join(', ') || 'unknown'}`,
    quiet.length > 0
      ? `Characters who have been quiet: ${quiet.join(', ')}`
      : '',
    context.freeformInput ? `Scene focus: ${context.freeformInput}` : '',
    '',
    'Suggest which quiet character to bring into focus and how.',
  ]
    .filter(Boolean)
    .join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

// ---------------------------------------------------------------------------
// Options for custom prompt injection
// ---------------------------------------------------------------------------

export interface BuildPromptOptions {
  worldTonePrompt?: string;
  assumptions?: string;
  modeCustomInstructions?: string;
}

// ---------------------------------------------------------------------------
// Mode: Story Generator
// ---------------------------------------------------------------------------

function buildStoryGeneratorPrompts(
  context: AiCampaignContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    'Generate scene possibilities from the provided context.',
    'Do not resolve the scenes — give the player distinct choices to make.',
  ];

  if (options?.modeCustomInstructions) {
    modeLines.push(options.modeCustomInstructions);
  }

  // Structural format requirements (hardcoded, not overridable)
  modeLines.push(
    'Label each suggestion type clearly (A/B/C for scenes, Complication, Sensory, Twist).',
    'For each item, prefix with one of: [established fact], [likely inference], [suggestion], or [dramatic twist].',
  );

  const objectiveLine = context.freeformInput
    ? `Current objective: ${context.freeformInput}`
    : 'Current objective: Explore what comes next.';

  const userPrompt = [
    objectiveLine,
    '',
    'Generate:',
    '1. THREE distinct scene possibilities (label them A, B, C — each 2-3 sentences).',
    '2. TWO potential complications that could arise regardless of scene choice.',
    '3. TWO sensory details that ground this location (sight, sound, smell, or texture).',
    '4. ONE unexpected twist or revelation that could deepen the story.',
  ].join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

// ---------------------------------------------------------------------------
// Mode: Stuck Player
// ---------------------------------------------------------------------------

function buildStuckPlayerPrompts(
  context: AiCampaignContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    'The player is stuck or uncertain what to do next.',
    'Provide concrete, actionable options that respect player agency.',
    'Each option must start with a strong action verb.',
  ];

  if (options?.modeCustomInstructions) {
    modeLines.push(options.modeCustomInstructions);
  }

  modeLines.push(
    'Draw on the active vows, recent events, and world context to make suggestions specific.',
  );

  const lastRoll = context.recentRolls[0];
  const lastRollLine = lastRoll
    ? `Last roll: ${lastRoll.label} — ${lastRoll.result}${lastRoll.oracleResult ? ` (${lastRoll.oracleResult})` : ''}`
    : 'No recent rolls.';

  const situationLine = context.freeformInput
    ? `Current situation: ${context.freeformInput}`
    : 'Current situation: The player is unsure what to do next.';

  const userPrompt = [
    situationLine,
    lastRollLine,
    '',
    'Generate:',
    '1. THREE concrete next actions the character could take (each 1 sentence, starts with action verb).',
    '2. TWO complications or threats that could emerge if the character delays or hesitates.',
    '3. ONE oracle-style surprise — something unexpected that reframes the situation.',
    '4. THREE escalation options, each with a specific story-grounded suggestion:',
    '   - "Escalate the tension": ...',
    '   - "Complicate the situation": ...',
    '   - "Reveal something hidden": ...',
  ].join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

// ---------------------------------------------------------------------------
// Mode: Action Elaborator
// ---------------------------------------------------------------------------

function buildActionElaboratorPrompts(
  context: AiCampaignContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const systemName = SYSTEM_NAME[context.gameSystem];
  const modeLines = [
    'Elaborate on a player-described character action.',
    `Suggest relevant ${systemName} move names where applicable.`,
  ];

  if (options?.modeCustomInstructions) {
    modeLines.push(options.modeCustomInstructions);
  }

  modeLines.push(
    'Do not resolve outcomes — only elaborate on the attempt and its narrative implications.',
  );

  const primaryChar = context.characters[0];
  const charLine = primaryChar
    ? `Character: ${primaryChar.name} (momentum: ${primaryChar.momentum})`
    : 'Character: unknown';

  const userPrompt = [
    `Action to elaborate: "${context.freeformInput ?? 'unspecified action'}"`,
    charLine,
    '',
    'Provide:',
    '1. A vivid 2-3 sentence narrative version of this action.',
    '2. The most likely RISK or complication if this goes wrong.',
    '3. The probable consequence if this succeeds weakly (a partial win).',
    `4. TWO ${systemName} move names that most naturally fit this action.`,
  ].join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

// ---------------------------------------------------------------------------
// Mode: Session Recap
// ---------------------------------------------------------------------------

function buildSessionRecapPrompts(
  context: AiCampaignContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    'Summarize a play session and extract canon facts for the campaign record.',
    'Distinguish established facts from inferences.',
  ];

  if (options?.modeCustomInstructions) {
    modeLines.push(options.modeCustomInstructions);
  }

  modeLines.push(
    'Use EXACTLY the section headers listed — they will be parsed programmatically.',
  );

  const allRollsStr = context.recentRolls
    .map((r) => {
      const base = `- ${r.label}: ${r.result}`;
      return r.oracleResult ? `${base} → "${r.oracleResult}"` : base;
    })
    .join('\n');

  const notesSection = context.noteText
    ? `Session notes:\n${context.noteText}`
    : 'No session notes provided.';

  const userPrompt = [
    notesSection,
    '',
    `All rolls this session:\n${allRollsStr || 'None recorded.'}`,
    '',
    'Produce a session recap with EXACTLY these section headers:',
    '',
    '## Summary',
    '(3-5 sentence narrative summary of what happened)',
    '',
    '## Canon Facts Established',
    '(bullet list of things now true in the world)',
    '',
    '## NPC Appearances',
    '(bullet list: NPC name — what they did or revealed; omit if none)',
    '',
    '## Location Visits',
    '(bullet list: location name — what happened there; omit if none)',
    '',
    '## Suggested Note Title',
    '(a short evocative title for this session, max 8 words)',
  ].join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

// ---------------------------------------------------------------------------
// Mode: Bookkeeper
// ---------------------------------------------------------------------------

function buildBookkeeperPrompts(
  context: AiCampaignContext,
  options?: BuildPromptOptions,
): { modeInstructions: string; userPrompt: string } {
  const modeLines = [
    'Extract structured campaign updates from freeform session text.',
    'Only suggest changes clearly supported by the text — do not invent.',
  ];

  if (options?.modeCustomInstructions) {
    modeLines.push(options.modeCustomInstructions);
  }

  modeLines.push(
    'For existing records, use the exact names from the known lists when possible.',
    'Return a JSON object matching the bookkeeper_output schema exactly.',
  );

  const knownVows = context.activeVows.map((v) => `"${v.label}"`).join(', ');
  const knownNPCs = (context.currentNPCs ?? [])
    .map((n) => `"${n.name}"`)
    .join(', ');
  const knownLocation = context.currentLocation?.name ?? 'unknown';

  const userPrompt = [
    `Known vows: ${knownVows || 'none'}`,
    `Known NPCs: ${knownNPCs || 'none'}`,
    `Current location: ${knownLocation}`,
    '',
    `Session text to extract from:\n"${context.freeformInput ?? ''}"`,
  ].join('\n');

  return { modeInstructions: modeLines.join('\n'), userPrompt };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BuiltPrompt {
  systemPromptStatic: string;
  systemPromptDynamic: string;
  userPrompt: string;
  useStructuredOutput: boolean;
}

const AI_GUIDED_MODES = new Set<AiMode>([
  'sceneFrame',
  'askOrAnswer',
  'moveSuggestion',
  'outcomeNarration',
  'priceProposal',
  'oracleInterpretation',
  'clockAdvance',
  'sceneChallengeGuidance',
  'bookkeepingProposal',
]);

export function buildPrompt(
  mode: AiMode,
  context: AiCampaignContext,
  options?: BuildPromptOptions,
): BuiltPrompt {
  const isGuideMode = AI_GUIDED_MODES.has(mode);
  const guideContext = context as AiGuideContext;
  let modeResult: { modeInstructions: string; userPrompt: string };
  let useStructuredOutput = false;

  switch (mode) {
    // ── Copilot modes ──────────────────────────────────────────────────────
    case 'storyGenerator':
      modeResult = buildStoryGeneratorPrompts(context, options);
      break;
    case 'stuckPlayer':
      modeResult = buildStuckPlayerPrompts(context, options);
      break;
    case 'actionElaborator':
      modeResult = buildActionElaboratorPrompts(context, options);
      break;
    case 'sessionRecap':
      modeResult = buildSessionRecapPrompts(context, options);
      break;
    case 'bookkeeper':
      modeResult = buildBookkeeperPrompts(context, options);
      useStructuredOutput = true;
      break;
    // ── AI Guide modes ─────────────────────────────────────────────────────
    case 'sceneFrame':
      modeResult = buildSceneFramePrompts(guideContext, options);
      break;
    case 'askOrAnswer':
      modeResult = buildAskOrAnswerPrompts(guideContext, options);
      break;
    case 'moveSuggestion':
      modeResult = buildMoveSuggestionPrompts(guideContext, options);
      break;
    case 'outcomeNarration':
      modeResult = buildOutcomeNarrationPrompts(guideContext, options);
      break;
    case 'priceProposal':
      modeResult = buildPriceProposalPrompts(guideContext, options);
      useStructuredOutput = true;
      break;
    case 'oracleInterpretation':
      modeResult = buildOracleInterpretationPrompts(guideContext, options);
      break;
    case 'clockAdvance':
      modeResult = buildClockAdvancePrompts(guideContext, options);
      useStructuredOutput = true;
      break;
    case 'sceneChallengeGuidance':
      modeResult = buildSceneChallengeGuidancePrompts(guideContext, options);
      break;
    case 'bookkeepingProposal':
      modeResult = buildBookkeepingProposalPrompts(guideContext, options);
      useStructuredOutput = true;
      break;
    case 'actionSuggestions':
      modeResult = buildActionSuggestionsPrompts(guideContext, options);
      useStructuredOutput = true;
      break;
    case 'intentToMove':
      modeResult = buildIntentToMovePrompts(guideContext, options);
      useStructuredOutput = true;
      break;
    case 'spotlightNudge':
      modeResult = buildSpotlightNudgePrompts(guideContext, options);
      useStructuredOutput = true;
      break;
    default: {
      const exhaustiveCheck: never = mode;
      throw new Error(`Unknown AI mode: ${exhaustiveCheck}`);
    }
  }

  // Static: role block + assumptions + mode instructions (cached — stable per world/mode)
  const roleBlock = isGuideMode
    ? buildGuideRoleBlock(context, options?.worldTonePrompt)
    : buildRoleBlock(context, options?.worldTonePrompt);
  const staticParts = [roleBlock];
  if (options?.assumptions) {
    staticParts.push('', 'World assumptions:', options.assumptions);
  }
  staticParts.push('', modeResult.modeInstructions);
  const systemPromptStatic = staticParts.join('\n');

  // Dynamic: context block (changes every request)
  const systemPromptDynamic = isGuideMode
    ? buildGuideContextBlock(guideContext)
    : buildContextBlock(context);

  return {
    systemPromptStatic,
    systemPromptDynamic,
    userPrompt: modeResult.userPrompt,
    useStructuredOutput,
  };
}
