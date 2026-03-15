import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

export const openaiApiKey = defineSecret("OPENAI_API_KEY");

export function createOpenAiClient(): OpenAI {
  return new OpenAI({ apiKey: openaiApiKey.value() });
}
