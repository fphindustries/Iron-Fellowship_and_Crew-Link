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
      "You are a narrative writer for Ironsworn: Starforged, a gritty sci-fi tabletop RPG.",
      "Write a vivid 1-2 paragraph character introduction in the third person.",
      "Weave together the character's name, paths, backstory, background vow, appearance, personality, and gear into a cohesive narrative.",
      "Be evocative and atmospheric, matching the tone of a dark science-fiction setting.",
      "Do not use headers, bullet points, or lists. Write flowing prose only.",
      `The character uses ${pronouns} pronouns.`,
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
