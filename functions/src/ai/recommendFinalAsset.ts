import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import { openaiApiKey } from "./openai.client";
import {
  AssetRecommendationRequest,
  AssetRecommendationOutput,
} from "./_ai.type";

const MAX_DAILY_REQUESTS = 20;

async function checkRateLimit(uid: string): Promise<void> {
  const db = getFirestore();
  const ref = db.doc(`/users/${uid}/ai-rate-limit/daily`);
  const today = new Date().toISOString().slice(0, 10);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.data();
    const count: number =
      data?.date === today ? (data?.count ?? 0) : 0;

    if (count >= MAX_DAILY_REQUESTS) {
      throw new HttpsError(
        "resource-exhausted",
        `Daily AI request limit of ${MAX_DAILY_REQUESTS} reached. Try again tomorrow.`
      );
    }

    tx.set(ref, { count: count + 1, date: today });
  });
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

    const { paths, backstory, backgroundVow } = request.data;

    logger.info("recommendFinalAsset called", { uid });

    await checkRateLimit(uid);

    const openai = new OpenAI({ apiKey: openaiApiKey.value() });

    const systemPrompt = [
      "You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.",
      "The player has already chosen 2 path assets. Now recommend exactly 3 additional assets from other categories.",
      "Starforged asset categories include: Command Vehicle, Module, Support Vehicle, Companion, and Path.",
      "Recommend assets from categories other than Path (e.g. companions, command vehicles, modules, support vehicles).",
      "For each recommendation, provide the exact asset name and a single sentence explaining why it fits.",
      "Base your reasoning on the character's paths, backstory, and background vow.",
      "Use only real Starforged asset names. Keep reasoning concise and personal.",
    ].join("\n");

    const pathsLine =
      paths.length > 0 ? `Chosen paths: ${paths.join(", ")}.` : "";
    const backstoryLine = backstory ? `Backstory: ${backstory}` : "";
    const vowLine = backgroundVow ? `Background vow: ${backgroundVow}` : "";

    const userPrompt = [pathsLine, backstoryLine, vowLine]
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
