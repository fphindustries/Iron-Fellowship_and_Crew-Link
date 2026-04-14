/**
 * randomize-character-appearance — Generate look/act/wear for a Starforged character
 *
 * Ported from functions/src/ai/randomizeCharacterAppearance.ts
 */
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/supabase-client.ts";
import { callStructuredGeneration } from "../_shared/ai-providers.ts";

interface WorldContext {
  truths?: { name: string; description: string }[];
  assumptions?: string;
}

function appendWorldContextLines(parts: string[], worldContext?: WorldContext): void {
  if (!worldContext) return;
  if (worldContext.truths?.length) {
    parts.push("", "Setting truths for this world:");
    worldContext.truths.forEach((t) => parts.push(`- ${t.name}: ${t.description}`));
  }
  if (worldContext.assumptions) {
    parts.push("", "World assumptions:", worldContext.assumptions);
  }
}

const APPEARANCE_SCHEMA = {
  type: "object",
  properties: {
    look: { type: "string" },
    act: { type: "string" },
    wear: { type: "string" },
  },
  required: ["look", "act", "wear"],
  additionalProperties: false,
};

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

  const { paths, backstory, backgroundVow, worldContext } = body as {
    paths: string[];
    backstory?: string;
    backgroundVow?: string;
    worldContext?: WorldContext;
  };

  const systemPrompt = [
    "You are a Starforged character creation assistant for a sci-fi narrative RPG.",
    "Generate one or two vivid short phrases (10 words or less each) for a character's:",
    "- look: distinctive physical features or appearance",
    "- act: personality traits or behavioral tendencies",
    "- wear: clothing, gear, or equipment they typically carry",
    "Be creative and genre-appropriate for a gritty sci-fi setting. Avoid clichés.",
  ].join("\n");

  const pathsLine = paths?.length > 0 ? `Chosen paths: ${paths.join(", ")}.` : "";
  const backstoryLine = backstory ? `Backstory: ${backstory}` : "";
  const vowLine = backgroundVow ? `Background vow: ${backgroundVow}` : "";

  const userParts = [pathsLine, backstoryLine, vowLine].filter(Boolean);
  appendWorldContextLines(userParts, worldContext);

  const resultText = await callStructuredGeneration({
    systemPrompt,
    userPrompt: userParts.join("\n") || "Generate appearance for a new Starforged character.",
    schema: APPEARANCE_SCHEMA,
    schemaName: "appearance_output",
  });

  const output = JSON.parse(resultText);

  return new Response(
    JSON.stringify(output),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
