import { AiProvider, AiProviderName } from "./provider";
import { OpenAiProvider } from "./providers/openai.provider";
import { AnthropicProvider } from "./providers/anthropic.provider";

const openaiProvider = new OpenAiProvider();
const anthropicProvider = new AnthropicProvider();

export function getProvider(name: AiProviderName): AiProvider {
  switch (name) {
  case "openai":
    return openaiProvider;
  case "anthropic":
    return anthropicProvider;
  default: {
    const exhaustiveCheck: never = name;
    throw new Error(`Unknown AI provider: ${exhaustiveCheck}`);
  }
  }
}
