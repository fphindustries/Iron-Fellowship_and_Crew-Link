import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";
import { openaiApiKey } from "./openai.client";
import { anthropicApiKey } from "./anthropic.client";
import {
  PortraitGenerationRequest,
  PortraitGenerationOutput,
} from "./_ai.type";


// Portrait generation always uses OpenAI/DALL-E regardless of provider setting.
export const generateCharacterPortraits = onCall<
  PortraitGenerationRequest,
  Promise<PortraitGenerationOutput | null>
>(
  { secrets: [openaiApiKey, anthropicApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("generateCharacterPortraits: unauthenticated request");
      return null;
    }

    const { look, act, wear, paths, backstory, backgroundVow } = request.data;

    logger.info("generateCharacterPortraits called", { uid });

    const openai = new OpenAI({ apiKey: openaiApiKey.value() });

    const pathsLine = paths.length > 0 ? ` Paths: ${paths.join(", ")}.` : "";
    const backstoryLine = backstory ? ` Background: ${backstory.slice(0, 200)}` : "";
    const vowLine = backgroundVow ? ` Vow: ${backgroundVow.slice(0, 100)}` : "";

    const prompt = [
      "Ironsworn Starforged sci-fi RPG character portrait, head and shoulders.",
      `Appearance: ${look}.`,
      `Personality: ${act}.`,
      `Wearing: ${wear}.`,
      pathsLine,
      backstoryLine,
      vowLine,
      "Digital art, detailed face, dramatic lighting, square composition, no text.",
    ]
      .filter(Boolean)
      .join(" ");

    const result = await openai.images.generate({
      model: "dall-e-2",
      prompt,
      n: 3,
      size: "512x512",
      response_format: "b64_json",
    });

    const images = (result.data ?? [])
      .map((d) => d.b64_json)
      .filter((b): b is string => typeof b === "string");

    logger.info("generateCharacterPortraits: completed", {
      uid,
      count: images.length,
    });

    return { images };
  }
);
