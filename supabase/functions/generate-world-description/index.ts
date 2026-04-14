/**
 * generate-world-description — Generate a narrative world description from Starforged truths
 *
 * Ported from functions/src/ai/generateWorldDescription.ts
 */
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthUser } from "../_shared/supabase-client.ts";
import { callTextGeneration } from "../_shared/ai-providers.ts";

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

  const { worldName, truths, assumptions, worldTonePrompt } = body as {
    worldName: string;
    truths: { name: string; description: string }[];
    assumptions?: string;
    worldTonePrompt?: string;
  };

  const systemLines = [
    "You are a world-building writer for Ironsworn: Starforged, a gritty sci-fi tabletop RPG set in a distant galaxy called the Forge.",
    "Write 2-3 evocative paragraphs describing this specific world based on its chosen truths.",
    "The description should give players a visceral sense of what makes this version of the Forge unique.",
    "Focus on atmosphere, dangers, culture, and the tensions created by the chosen truths.",
    "Do not use headers, bullet points, or lists. Write flowing prose only.",
    "Do not repeat the truth names verbatim — weave their meaning into the narrative.",
  ];

  if (assumptions) {
    systemLines.push("", "Setting assumptions:", assumptions);
  }

  if (worldTonePrompt) {
    systemLines.push("", `Additional tone: ${worldTonePrompt}`);
  }

  const truthsText = truths.map((t) => `${t.name}: ${t.description}`).join("\n");

  const userPrompt = [
    `World name: ${worldName}`,
    "",
    "Chosen truths for this world:",
    truthsText,
  ].join("\n");

  const description = await callTextGeneration({
    systemPrompt: systemLines.join("\n"),
    userPrompt,
  });

  return new Response(
    JSON.stringify({ description }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
