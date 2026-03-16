import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import { openaiApiKey } from "./openai.client";
import {
  PortraitGenerationRequest,
  PortraitGenerationOutput,
} from "./_ai.type";

const MAX_DAILY_REQUESTS = 20;

async function checkRateLimit(uid: string): Promise<void> {
  const db = getFirestore();
  const ref = db.doc(`/users/${uid}/ai-rate-limit/daily`);
  const today = new Date().toISOString().slice(0, 10);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.data();
    const count: number =
      data?.date === today ? (data?.count ?? 0) : 0;

    if (count >= MAX_DAILY_REQUESTS) {
      throw new HttpsError(
        "resource-exhausted",
        `Daily AI request limit of ${MAX_DAILY_REQUESTS} reached. Try again tomorrow.`
      );
    }

    tx.set(ref, { count: count + 1, date: today });
  });
}

export const generateCharacterPortraits = onCall<
  PortraitGenerationRequest,
  Promise<PortraitGenerationOutput | null>
>(
  { secrets: [openaiApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("generateCharacterPortraits: unauthenticated request");
      return null;
    }

    const { look, act, wear, paths, backstory, backgroundVow } = request.data;

    logger.info("generateCharacterPortraits called", { uid });

    await checkRateLimit(uid);

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
