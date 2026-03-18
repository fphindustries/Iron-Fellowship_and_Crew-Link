import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { openaiApiKey } from "./openai.client";
import { anthropicApiKey } from "./anthropic.client";
import { callStructuredGeneration } from "./callProvider";
import {
  RandomizeAppearanceRequest,
  RandomizeAppearanceOutput,
} from "./_ai.type";
import { appendWorldContextLines } from "./worldContext";


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

export const randomizeCharacterAppearance = onCall<
  RandomizeAppearanceRequest,
  Promise<RandomizeAppearanceOutput | null>
>(
  { secrets: [openaiApiKey, anthropicApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("randomizeCharacterAppearance: unauthenticated request");
      return null;
    }

    const { paths, backstory, backgroundVow, worldContext } = request.data;

    logger.info("randomizeCharacterAppearance called", { uid });

    const systemPrompt = [
      "You are a Starforged character creation assistant for a sci-fi narrative RPG.",
      "Generate one or two vivid short phrases (10 words or less each) for a character's:",
      "- look: distinctive physical features or appearance",
      "- act: personality traits or behavioral tendencies",
      "- wear: clothing, gear, or equipment they typically carry",
      "Be creative and genre-appropriate for a gritty sci-fi setting. Avoid clichés.",
    ].join("\n");

    const pathsLine = paths.length > 0 ? `Chosen paths: ${paths.join(", ")}.` : "";
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

    const output = JSON.parse(resultText) as RandomizeAppearanceOutput;

    logger.info("randomizeCharacterAppearance: completed", { uid });

    return output;
  }
);
