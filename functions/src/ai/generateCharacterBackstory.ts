import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { openaiApiKey } from "./openai.client";
import { anthropicApiKey } from "./anthropic.client";
import { callTextGeneration } from "./callProvider";
import { BackstoryRequest, BackstoryOutput } from "./_ai.type";
import { appendWorldContextLines } from "./worldContext";


export const generateCharacterBackstory = onCall<
  BackstoryRequest,
  Promise<BackstoryOutput | null>
>(
  { secrets: [openaiApiKey, anthropicApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("generateCharacterBackstory: unauthenticated request");
      return null;
    }

    const { prompt, pathNames, role, worldContext } = request.data;
    if (!prompt?.trim()) {
      logger.warn("generateCharacterBackstory: empty prompt");
      return null;
    }

    logger.info("generateCharacterBackstory called", { uid });

    const systemPrompt = [
      "You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.",
      "Write a concise character backstory (2–3 short paragraphs) based on the given prompt.",
      "Match the tone: hopeful space opera, personal struggle against a vast and dangerous cosmos.",
      "Keep it simple and evocative — leave room for the story to unfold in play.",
      "Do not mention game mechanics or asset names.",
      "Write in second person (\"you\").",
      "Weave the character's role and path skills naturally into the narrative without naming them as game mechanics.",
    ].join("\n");

    const userParts = [prompt];
    if (role) {
      userParts.push("", `Character role: ${role}`);
    }
    if (pathNames && pathNames.length > 0) {
      userParts.push("", `Character paths (skills/background): ${pathNames.join(", ")}`);
    }
    appendWorldContextLines(userParts, worldContext);

    const backstory = await callTextGeneration({
      systemPrompt,
      userPrompt: userParts.join("\n"),
    });

    logger.info("generateCharacterBackstory: completed", { uid });

    return { backstory };
  }
);
