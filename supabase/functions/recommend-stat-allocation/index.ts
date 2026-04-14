/**
 * recommend-stat-allocation — Recommend stat value distribution for a Starforged character
 *
 * Ported from functions/src/ai/recommendStatAllocation.ts
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

const STAT_ALLOCATION_SCHEMA = {
  type: "object",
  properties: {
    allocations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          statKey: { type: "string" },
          value: { type: "number" },
        },
        required: ["statKey", "value"],
        additionalProperties: false,
      },
    },
    reasoning: { type: "string" },
  },
  required: ["allocations", "reasoning"],
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

  const { paths, backstory, backgroundVow, stats, worldContext } = body as {
    paths: string[];
    backstory?: string;
    backgroundVow?: string;
    stats: { key: string; label: string; description: string }[];
    worldContext?: WorldContext;
  };

  const statList = stats.map((s) => `- ${s.key} (${s.label}): ${s.description}`).join("\n");

  const systemPrompt = [
    "You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.",
    "Allocate the values [3, 2, 2, 1, 1] across exactly the stat keys provided. Each value must be used exactly once.",
    "Choose allocations that best fit the character's paths, backstory, and background vow.",
    "Return the exact stat keys provided — do not rename or omit any.",
    "Give a brief (2-3 sentence) reasoning explaining your choices.",
    "",
    "Available stats:",
    statList,
  ].join("\n");

  const pathsLine = paths?.length > 0 ? `Chosen paths: ${paths.join(", ")}.` : "";
  const backstoryLine = backstory ? `Backstory: ${backstory}` : "";
  const vowLine = backgroundVow ? `Background vow: ${backgroundVow}` : "";

  const userParts = [pathsLine, backstoryLine, vowLine].filter(Boolean);
  appendWorldContextLines(userParts, worldContext);

  const resultText = await callStructuredGeneration({
    systemPrompt,
    userPrompt: userParts.join("\n") || "Recommend stat allocations for a new Starforged character.",
    schema: STAT_ALLOCATION_SCHEMA,
    schemaName: "stat_allocation_output",
  });

  const output = JSON.parse(resultText);

  return new Response(
    JSON.stringify(output),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
