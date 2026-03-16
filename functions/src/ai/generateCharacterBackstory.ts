import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import { openaiApiKey } from "./openai.client";
import { BackstoryRequest, BackstoryOutput } from "./_ai.type";

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

    await checkRateLimit(uid);

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
