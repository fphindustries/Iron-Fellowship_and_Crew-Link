import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";
import { openaiApiKey } from "./openai.client";
import {
  AssetRecommendationRequest,
  AssetRecommendationOutput,
} from "./_ai.type";


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

export const recommendFinalAsset = onCall<
  AssetRecommendationRequest,
  Promise<AssetRecommendationOutput | null>
>(
  { secrets: [openaiApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("recommendFinalAsset: unauthenticated request");
      return null;
    }

    const { paths, backstory, backgroundVow, availableAssets } = request.data;

    logger.info("recommendFinalAsset called", { uid });

    const openai = new OpenAI({ apiKey: openaiApiKey.value() });

    const systemPrompt = [
      "You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.",
      "The player has already chosen 2 path assets. Now recommend exactly 3 additional assets from the provided list.",
      "You MUST only choose asset names from the 'Available assets' list provided in the user message. Do not invent or guess asset names.",
      "For each recommendation, provide the exact asset name (copied verbatim from the list) and a single sentence explaining why it fits.",
      "Base your reasoning on the character's paths, backstory, and background vow.",
      "Keep reasoning concise and personal.",
    ].join("\n");

    const pathsLine =
      paths.length > 0 ? `Chosen paths: ${paths.join(", ")}.` : "";
    const backstoryLine = backstory ? `Backstory: ${backstory}` : "";
    const vowLine = backgroundVow ? `Background vow: ${backgroundVow}` : "";
    const assetsLine =
      availableAssets.length > 0
        ? `Available assets: ${availableAssets.join(", ")}`
        : "";

    const userPrompt = [pathsLine, backstoryLine, vowLine, assetsLine]
      .filter(Boolean)
      .join("\n");

    const completion = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions: systemPrompt,
      input: userPrompt || "Recommend 3 assets for a new Starforged character.",
      text: {
        format: {
          type: "json_schema",
          name: "asset_recommendation_output",
          schema: ASSET_RECOMMENDATION_SCHEMA,
          strict: true,
        },
      },
    });

    const output = JSON.parse(
      completion.output_text
    ) as AssetRecommendationOutput;

    logger.info("recommendFinalAsset: completed", {
      uid,
      count: output.recommendations.length,
    });

    return output;
  }
);
