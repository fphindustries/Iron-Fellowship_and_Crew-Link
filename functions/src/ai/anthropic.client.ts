import { defineSecret } from "firebase-functions/params";
import Anthropic from "@anthropic-ai/sdk";

export const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

export function createAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: anthropicApiKey.value() });
}
