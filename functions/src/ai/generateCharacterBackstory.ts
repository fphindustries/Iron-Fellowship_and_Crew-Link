import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";
import { openaiApiKey } from "./openai.client";
import { BackstoryRequest, BackstoryOutput } from "./_ai.type";


export const generateCharacterBackstory = onCall<
  BackstoryRequest,
  Promise<BackstoryOutput | null>
>(
  { secrets: [openaiApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("generateCharacterBackstory: unauthenticated request");
      return null;
    }

    const { prompt } = request.data;
    if (!prompt?.trim()) {
      logger.warn("generateCharacterBackstory: empty prompt");
      return null;
    }

    logger.info("generateCharacterBackstory called", { uid });

    const openai = new OpenAI({ apiKey: openaiApiKey.value() });

    const systemPrompt = [
      "You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.",
      "Write a concise character backstory (2–3 short paragraphs) based on the given prompt.",
      "Match the tone: hopeful space opera, personal struggle against a vast and dangerous cosmos.",
      "Keep it simple and evocative — leave room for the story to unfold in play.",
      "Do not mention game mechanics or asset names.",
      "Write in second person (\"you\").",
    ].join("\n");

    const completion = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions: systemPrompt,
      input: prompt,
    });

    logger.info("generateCharacterBackstory: completed", { uid });

    return { backstory: completion.output_text };
  }
);
