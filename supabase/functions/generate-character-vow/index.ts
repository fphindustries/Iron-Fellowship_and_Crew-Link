/**
 * generate-character-vow — Generate a background vow for a Starforged character
 *
 * Ported from functions/src/ai/generateCharacterVow.ts
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

  const { paths, backstory, prompt, worldContext } = body as {
    paths: string[];
    backstory?: string;
    prompt?: string;
    worldContext?: WorldContext;
  };

  const systemPrompt = [
    "You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.",
    "Write a single background vow in first person for the character.",
    "The vow must start with 'I will' or 'I vow to'.",
    "It represents an epic, lifelong commitment — a primary motivation or sacred goal sworn months or years ago.",
    "Keep it to one sentence, evocative and personal but simple enough to leave room for the story to develop.",
    "Do not mention game mechanics, asset names, or difficulty ratings.",
    "Match the tone: personal struggle against a vast, dangerous cosmos.",
  ].join("\n");

  const pathsLine = paths?.length > 0 ? `Character paths: ${paths.join(", ")}.` : "";
  const backstoryLine = backstory ? `Character backstory: ${backstory}` : "";
  const promptLine = prompt ? `Additional context: ${prompt}` : "";

  const userParts = [pathsLine, backstoryLine, promptLine].filter(Boolean);
  appendWorldContextLines(userParts, worldContext);

  const vow = await callTextGeneration({
    systemPrompt,
    userPrompt: userParts.join("\n") || "Generate a fitting background vow.",
  });

  return new Response(
    JSON.stringify({ vow: vow.trim() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
