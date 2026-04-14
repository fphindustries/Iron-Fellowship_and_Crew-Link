/**
 * recommend-final-asset — Recommend a third Starforged asset based on character build
 *
 * Ported from functions/src/ai/recommendFinalAsset.ts
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

const ASSET_RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          assetName: { type: "string" },
          reasoning: { type: "string" },
        },
        required: ["assetName", "reasoning"],
        additionalProperties: false,
      },
    },
  },
  required: ["recommendations"],
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

  const { paths, backstory, backgroundVow, availableAssets, worldContext } = body as {
    paths: string[];
    backstory?: string;
    backgroundVow?: string;
    availableAssets: string[];
    worldContext?: WorldContext;
  };

  const systemPrompt = [
    "You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.",
    "The player has already chosen 2 path assets. Now recommend exactly 3 additional assets from the provided list.",
    "You MUST only choose asset names from the 'Available assets' list provided in the user message. Do not invent or guess asset names.",
    "For each recommendation, provide the exact asset name (copied verbatim from the list) and a single sentence explaining why it fits.",
    "Base your reasoning on the character's paths, backstory, and background vow.",
    "Keep reasoning concise and personal.",
  ].join("\n");

  const pathsLine = paths?.length > 0 ? `Chosen paths: ${paths.join(", ")}.` : "";
  const backstoryLine = backstory ? `Backstory: ${backstory}` : "";
  const vowLine = backgroundVow ? `Background vow: ${backgroundVow}` : "";
  const assetsLine = availableAssets?.length > 0 ? `Available assets: ${availableAssets.join(", ")}` : "";

  const userParts = [pathsLine, backstoryLine, vowLine, assetsLine].filter(Boolean);
  appendWorldContextLines(userParts, worldContext);

  const resultText = await callStructuredGeneration({
    systemPrompt,
    userPrompt: userParts.join("\n") || "Recommend 3 assets for a new Starforged character.",
    schema: ASSET_RECOMMENDATION_SCHEMA,
    schemaName: "asset_recommendation_output",
  });

  const output = JSON.parse(resultText);

  return new Response(
    JSON.stringify(output),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
