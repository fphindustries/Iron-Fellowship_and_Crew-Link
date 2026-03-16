import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import { openaiApiKey } from "./openai.client";
import { VowRequest, VowOutput } from "./_ai.type";

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

export const generateCharacterVow = onCall<
  VowRequest,
  Promise<VowOutput | null>
>(
  { secrets: [openaiApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("generateCharacterVow: unauthenticated request");
      return null;
    }

    const { paths, backstory, prompt } = request.data;

    logger.info("generateCharacterVow called", { uid });

    await checkRateLimit(uid);

    const openai = new OpenAI({ apiKey: openaiApiKey.value() });

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
    const backstoryLine = backstory
      ? `Character backstory: ${backstory}`
      : "";
    const promptLine = prompt
      ? `Additional context: ${prompt}`
      : "";

    const userInput = [pathsLine, backstoryLine, promptLine]
      .filter(Boolean)
      .join("\n");

    const completion = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions: systemPrompt,
      input: userInput || "Generate a fitting background vow.",
    });

    logger.info("generateCharacterVow: completed", { uid });

    return { vow: completion.output_text.trim() };
  }
);
