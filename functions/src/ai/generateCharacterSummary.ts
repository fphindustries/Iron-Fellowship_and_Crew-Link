import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { openaiApiKey } from "./openai.client";
import { anthropicApiKey } from "./anthropic.client";
import { callTextGeneration } from "./callProvider";
import { CharacterSummaryRequest, CharacterSummaryOutput } from "./_ai.type";
import { appendWorldContextLines } from "./worldContext";


export const generateCharacterSummary = onCall<
  CharacterSummaryRequest,
  Promise<CharacterSummaryOutput | null>
>(
  { secrets: [openaiApiKey, anthropicApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("generateCharacterSummary: unauthenticated request");
      return null;
    }

    const { name, paths, backstory, backgroundVow, look, act, wear, pronouns, worldContext } =
      request.data;

    logger.info("generateCharacterSummary called", { uid });

    const systemPrompt = [
      "You are a character descriptor writer for an Ironsworn/Starforged tabletop RPG.",
      "Write a brief character descriptor: 2–4 comma-separated traits that capture a key personality trait or background, a distinctive physical feature or implant, and their signature appearance or gear.",
      "Example: \"Ace pilot with a grudge, Cybernetic eye, wears a bright red flight suit.\"",
      "Be concise and specific. Do not write full sentences or paragraphs. No headers or bullet points.",
      "The character uses " + pronouns + " pronouns.",
    ].join("\n");

    const pathsLine = paths.length > 0 ? `Paths: ${paths.join(", ")}.` : "";
    const backstoryLine = backstory ? `Backstory: ${backstory}` : "";
    const vowLine = backgroundVow ? `Background vow: ${backgroundVow}` : "";
    const lookLine = look ? `Look: ${look}` : "";
    const actLine = act ? `Act: ${act}` : "";
    const wearLine = wear ? `Wear: ${wear}` : "";

    const userParts = [
      `Character name: ${name}`,
      pathsLine,
      backstoryLine,
      vowLine,
      lookLine,
      actLine,
      wearLine,
    ].filter(Boolean);
    appendWorldContextLines(userParts, worldContext);

    const summary = await callTextGeneration({
      systemPrompt,
      userPrompt: userParts.join("\n"),
    });

    logger.info("generateCharacterSummary: completed", { uid });

    return { summary };
  }
);
