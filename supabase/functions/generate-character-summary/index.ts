/**
 * generate-character-summary — Generate a brief character descriptor for Starforged
 *
 * Ported from functions/src/ai/generateCharacterSummary.ts
 */
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/supabase-client.ts";
import { callTextGeneration } from "../_shared/ai-providers.ts";

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

  const { name, paths, backstory, backgroundVow, look, act, wear, pronouns, worldContext } = body as {
    name: string;
    paths: string[];
    backstory?: string;
    backgroundVow?: string;
    look?: string;
    act?: string;
    wear?: string;
    pronouns?: string;
    worldContext?: WorldContext;
  };

  const systemPrompt = [
    "You are a character descriptor writer for an Ironsworn/Starforged tabletop RPG.",
    "Write a brief character descriptor: 2–4 comma-separated traits that capture a key personality trait or background, a distinctive physical feature or implant, and their signature appearance or gear.",
    "Example: \"Ace pilot with a grudge, Cybernetic eye, wears a bright red flight suit.\"",
    "Be concise and specific. Do not write full sentences or paragraphs. No headers or bullet points.",
    "The character uses " + (pronouns ?? "they/them") + " pronouns.",
  ].join("\n");

  const pathsLine = paths?.length > 0 ? `Paths: ${paths.join(", ")}.` : "";
  const backstoryLine = backstory ? `Backstory: ${backstory}` : "";
  const vowLine = backgroundVow ? `Background vow: ${backgroundVow}` : "";
  const lookLine = look ? `Look: ${look}` : "";
  const actLine = act ? `Act: ${act}` : "";
  const wearLine = wear ? `Wear: ${wear}` : "";

  const userParts = [
    `Character name: ${name}`,
    pathsLine,
    backstoryLine,
    vowLine,
    lookLine,
    actLine,
    wearLine,
  ].filter(Boolean);
  appendWorldContextLines(userParts, worldContext);

  const summary = await callTextGeneration({
    systemPrompt,
    userPrompt: userParts.join("\n"),
  });

  return new Response(
    JSON.stringify({ summary }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
