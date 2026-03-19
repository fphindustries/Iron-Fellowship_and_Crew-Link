import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";
import { openaiApiKey } from "./openai.client";
import { anthropicApiKey } from "./anthropic.client";
import {
  PortraitGenerationRequest,
  PortraitGenerationOutput,
} from "./_ai.type";

// Portrait generation always uses OpenAI image models regardless of provider setting.
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

    const { look, act, wear, pronouns, paths, portraitStyleAnchor } = request.data;

    logger.info("generateCharacterPortraits called", { uid });

    const openai = new OpenAI({ apiKey: openaiApiKey.value() });

    const pathsLine =
      paths.length > 0 ? ` Character roles: ${paths.join(", ")}.` : "";
    const pronounsLine = pronouns ? ` Pronouns: ${pronouns}.` : "";
    const styleAnchorLine = portraitStyleAnchor
      ? ` Art style: ${portraitStyleAnchor}.`
      : "";

    const prompt = [
      "Ironsworn Starforged sci-fi RPG character portrait.",
      "Close-up portrait, face clearly visible and centered, head and shoulders only.",
      `Appearance: ${look}.`,
      `Personality: ${act}.`,
      `Wearing: ${wear}.`,
      pathsLine,
      pronounsLine,
      styleAnchorLine,
      "Digital art, dramatic lighting, square composition, no text, no watermarks.",
    ]
      .filter(Boolean)
      .join(" ");

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 3,
      size: "1024x1024",
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
