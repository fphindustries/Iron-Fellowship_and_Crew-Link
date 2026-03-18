import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { openaiApiKey } from "./openai.client";
import { anthropicApiKey } from "./anthropic.client";
import { callTextGeneration } from "./callProvider";
import { VowRequest, VowOutput } from "./_ai.type";
import { appendWorldContextLines } from "./worldContext";


export const generateCharacterVow = onCall<
  VowRequest,
  Promise<VowOutput | null>
>(
  { secrets: [openaiApiKey, anthropicApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("generateCharacterVow: unauthenticated request");
      return null;
    }

    const { paths, backstory, prompt, worldContext } = request.data;

    logger.info("generateCharacterVow called", { uid });

    const systemPrompt = [
      "You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.",
      "Write a single background vow in first person for the character.",
      "The vow must start with 'I will' or 'I vow to'.",
      "It represents an epic, lifelong commitment — a primary motivation or sacred goal sworn months or years ago.",
      "Keep it to one sentence, evocative and personal but simple enough to leave room for the story to develop.",
      "Do not mention game mechanics, asset names, or difficulty ratings.",
      "Match the tone: personal struggle against a vast, dangerous cosmos.",
    ].join("\n");

    const pathsLine =
      paths.length > 0 ? `Character paths: ${paths.join(", ")}.` : "";
    const backstoryLine = backstory ? `Character backstory: ${backstory}` : "";
    const promptLine = prompt ? `Additional context: ${prompt}` : "";

    const userParts = [pathsLine, backstoryLine, promptLine].filter(Boolean);
    appendWorldContextLines(userParts, worldContext);

    const vow = await callTextGeneration({
      systemPrompt,
      userPrompt: userParts.join("\n") || "Generate a fitting background vow.",
    });

    logger.info("generateCharacterVow: completed", { uid });

    return { vow: vow.trim() };
  }
);
