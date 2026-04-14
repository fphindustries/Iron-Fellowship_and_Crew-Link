/**
 * call-ai-guide — AI Guide (storyGenerator, actionElaborator, stuckPlayer, sessionRecap, bookkeeper)
 *
 * Ported from functions/src/ai/aiCopilot.ts
 * Changed: Firebase auth → Supabase auth, Firestore reads/writes → Supabase client
 */
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthUser, createServiceRoleClient } from "../_shared/supabase-client.ts";
import { callTextGeneration, callStructuredGeneration, getDefaultModel, type AiProviderName } from "../_shared/ai-providers.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const user = await getAuthUser(req);
  if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  let body: Record<string, unknown>;
  try {
    const raw = await req.json();
    body = raw.data ?? raw;
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const { mode, context, campaignId, worldId } = body as {
    mode: string;
    context: Record<string, unknown>;
    campaignId: string;
    worldId?: string;
  };

  if (!campaignId) {
    return new Response(JSON.stringify(null), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createServiceRoleClient();

  // Fetch world AI settings if available
  let worldSettings: Record<string, unknown> | undefined;
  if (worldId) {
    const { data } = await supabase.from("world_ai_settings").select("*").eq("world_id", worldId).single();
    worldSettings = data ?? undefined;
  }

  const providerName: AiProviderName = (worldSettings?.provider as AiProviderName) ?? "openai";
  const modeConfig = (worldSettings?.mode_configs as Record<string, unknown>)?.[mode] as Record<string, unknown> | undefined;

  let model: string;
  if (providerName === "anthropic" && modeConfig?.anthropicModel) {
    model = modeConfig.anthropicModel as string;
  } else {
    model = getDefaultModel(providerName, mode);
  }

  // Build prompts (inline simplified version — preserve exact logic from promptTemplates.ts)
  const systemPromptStatic = buildSystemPromptStatic(mode, worldSettings);
  const systemPromptDynamic = buildSystemPromptDynamic(mode, context);
  const userPrompt = buildUserPrompt(mode, context);
  const useStructuredOutput = mode === "bookkeeper";

  let responseData: Record<string, unknown>;

  if (useStructuredOutput) {
    const result = await callStructuredGeneration({
      systemPrompt: [systemPromptStatic, systemPromptDynamic].filter(Boolean).join("\n\n"),
      userPrompt,
      schema: BOOKKEEPER_SCHEMA,
      schemaName: "bookkeeper_output",
      provider: providerName,
      model,
    });
    const bookkeeper = JSON.parse(result);
    responseData = { mode, bookkeeper };
  } else {
    const result = await callTextGeneration({
      systemPrompt: [systemPromptStatic, systemPromptDynamic].filter(Boolean).join("\n\n"),
      userPrompt,
      provider: providerName,
      model,
    });
    responseData = { mode, text: result };
  }

  // Save AI event (service_role bypasses RLS)
  const contextSnapshot = buildContextSnapshot(context);
  const { data: eventRef, error } = await supabase
    .from("ai_events")
    .insert({
      campaign_id: campaignId,
      type: mode,
      context_snapshot: contextSnapshot,
      response: responseData,
      status: "pending",
      canonized: false,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save ai_event:", error);
  }

  const eventId = eventRef?.id ?? crypto.randomUUID();

  return new Response(
    JSON.stringify({ ...responseData, eventId }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

function buildContextSnapshot(context: Record<string, unknown>): Record<string, unknown> {
  const snapshot = {
    gameSystem: context.gameSystem,
    campaignName: context.campaignName,
    campaignType: context.campaignType,
    activeVows: context.activeVows,
    characters: Array.isArray(context.characters)
      ? context.characters.map((c: Record<string, unknown>) => ({
          name: c.name, stats: c.stats, conditionMeters: c.conditionMeters, momentum: c.momentum,
        }))
      : [],
    currentLocation: context.currentLocation,
    currentNPCs: context.currentNPCs,
  };
  return JSON.parse(JSON.stringify(snapshot));
}

function buildSystemPromptStatic(mode: string, worldSettings?: Record<string, unknown>): string {
  const basePrompts: Record<string, string> = {
    storyGenerator: "You are a collaborative storyteller for an Ironsworn/Starforged tabletop RPG campaign. Generate vivid, atmospheric narrative content that advances the story.",
    actionElaborator: "You are a narrative assistant for Ironsworn/Starforged. Elaborate on player actions with rich detail and consequence.",
    stuckPlayer: "You are a game master assistant for Ironsworn/Starforged. Help the player find direction when they're unsure what to do next.",
    sessionRecap: "You are a chronicler for an Ironsworn/Starforged campaign. Write a compelling recap of the session.",
    bookkeeper: "You are a bookkeeper for an Ironsworn/Starforged campaign. Track and suggest updates to game state based on recent events.",
  };
  const base = basePrompts[mode] ?? basePrompts.storyGenerator;
  const tone = (worldSettings?.world_tone_prompt as string) ?? "";
  return tone ? `${base}\n\nWorld tone: ${tone}` : base;
}

function buildSystemPromptDynamic(_mode: string, context: Record<string, unknown>): string {
  const parts: string[] = [];
  if (context.campaignName) parts.push(`Campaign: ${context.campaignName}`);
  if (context.gameSystem) parts.push(`Game system: ${context.gameSystem}`);
  if (Array.isArray(context.characters) && context.characters.length > 0) {
    const names = context.characters.map((c: Record<string, unknown>) => c.name).join(", ");
    parts.push(`Characters: ${names}`);
  }
  return parts.join("\n");
}

function buildUserPrompt(mode: string, context: Record<string, unknown>): string {
  if (mode === "sessionRecap") {
    const events = Array.isArray(context.recentRolls) ? context.recentRolls : [];
    return `Write a session recap based on these events:\n${events.map(String).join("\n")}`;
  }
  if (mode === "bookkeeper") {
    return `Review the following campaign events and suggest updates to game state:\n${JSON.stringify(context.recentRolls ?? [])}`;
  }
  return `Current situation:\n${JSON.stringify({ vows: context.activeVows, location: context.currentLocation, npcs: context.currentNPCs })}\n\nRecent events:\n${(context.recentRolls as string[] ?? []).join("\n")}`;
}

const BOOKKEEPER_SCHEMA = {
  type: "object",
  properties: {
    vowUpdates: { type: "array", items: { type: "object", additionalProperties: true } },
    npcUpdates: { type: "array", items: { type: "object", additionalProperties: true } },
    locationUpdates: { type: "array", items: { type: "object", additionalProperties: true } },
    newNPCs: { type: "array", items: { type: "object", additionalProperties: true } },
    canonFacts: { type: "array", items: { type: "string" } },
  },
  required: ["vowUpdates", "npcUpdates", "locationUpdates", "newNPCs", "canonFacts"],
  additionalProperties: false,
};
