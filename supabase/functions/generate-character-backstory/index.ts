/**
 * generate-character-backstory — Generate a character backstory for Starforged
 *
 * Ported from functions/src/ai/generateCharacterBackstory.ts
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

  const { prompt, worldContext } = body as { prompt: string; worldContext?: WorldContext };
  if (!prompt?.trim()) {
    return new Response(JSON.stringify(null), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const systemPrompt = [
    "You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.",
    "Write a concise character backstory (2–3 short paragraphs) based on the given prompt.",
    "Match the tone: hopeful space opera, personal struggle against a vast and dangerous cosmos.",
    "Keep it simple and evocative — leave room for the story to unfold in play.",
    "Do not mention game mechanics or asset names.",
    "Write in second person (\"you\").",
  ].join("\n");

  const userParts = [prompt];
  appendWorldContextLines(userParts, worldContext);

  const backstory = await callTextGeneration({
    systemPrompt,
    userPrompt: userParts.join("\n"),
  });

  return new Response(
    JSON.stringify({ backstory }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
