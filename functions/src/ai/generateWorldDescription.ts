import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { openaiApiKey } from "./openai.client";
import { anthropicApiKey } from "./anthropic.client";
import { callTextGeneration } from "./callProvider";
import { WorldDescriptionRequest, WorldDescriptionOutput } from "./_ai.type";

export const generateWorldDescription = onCall<
  WorldDescriptionRequest,
  Promise<WorldDescriptionOutput | null>
>(
  { secrets: [openaiApiKey, anthropicApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("generateWorldDescription: unauthenticated request");
      return null;
    }

    const { worldName, truths, assumptions, worldTonePrompt } = request.data;

    logger.info("generateWorldDescription called", { uid });

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

    const truthsText = truths
      .map((t) => `${t.name}: ${t.description}`)
      .join("\n");

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

    logger.info("generateWorldDescription: completed", { uid });

    return { description };
  }
);
