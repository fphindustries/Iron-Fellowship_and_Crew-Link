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

    const { look, wear, pronouns, role } = request.data;

    logger.info("generateCharacterPortraits called", { uid });

    const openai = new OpenAI({ apiKey: openaiApiKey.value() });

    const pronounsLine = pronouns ? ` Pronouns: ${pronouns}.` : "";

    const prompt = [
      `Close-up mugshot portrait of a ${role ?? "character"} in a gritty cassette futurism sci-fi universe.`,
      "Style: analog sci-fi, worn industrial aesthetic, retro-future, practical tech, tactile materials, no sleek modern design.",
      "Framing: tight head, centered composition, subject facing camera.",
      "Lighting: strong directional lighting with high contrast, dramatic shadows, face clearly readable.",
      "Background: simple, bright, slightly textured or blurred spaceship interior, minimal detail.",
      "Design priority for small thumbnail (64x64): bold silhouette, clear facial structure, one or two distinctive visual features, no clutter, no busy background.",
      "Details: visible wear, scratches, fabric texture, subtle grime, realistic materials.",
      "Color palette: muted tones with one accent color.",
      "Camera: portrait lens, shallow depth of field, cinematic.",
      `Appearance: ${look}.`,
      `Wearing: ${wear}.`,
      pronounsLine,
      // styleAnchorLine,
      "--no full body, no complex background, no multiple characters, no text, no logos",
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
