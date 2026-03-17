import { AiProviderName } from "./provider";
import { getProvider } from "./providerFactory";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

function resolveModel(
  provider: AiProviderName,
  model?: string
): string {
  if (model) return model;
  return provider === "anthropic"
    ? DEFAULT_ANTHROPIC_MODEL
    : DEFAULT_OPENAI_MODEL;
}

/**
 * Shared helper for simple text generation.
 * Used by character creation functions.
 */
export async function callTextGeneration(params: {
  systemPrompt: string;
  userPrompt: string;
  provider?: AiProviderName;
  model?: string;
}): Promise<string> {
  const providerName = params.provider ?? "openai";
  const model = resolveModel(providerName, params.model);
  const provider = getProvider(providerName);

  const result = await provider.generateText({
    model,
    systemPromptStatic: params.systemPrompt,
    systemPromptDynamic: "",
    userPrompt: params.userPrompt,
  });

  return result.text;
}

/**
 * Shared helper for structured JSON generation.
 * Used by character creation functions that need JSON schema output.
 */
export async function callStructuredGeneration(params: {
  systemPrompt: string;
  userPrompt: string;
  schema: Record<string, unknown>;
  schemaName: string;
  provider?: AiProviderName;
  model?: string;
}): Promise<string> {
  const providerName = params.provider ?? "openai";
  const model = resolveModel(providerName, params.model);
  const provider = getProvider(providerName);

  const result = await provider.generateStructured({
    model,
    systemPromptStatic: params.systemPrompt,
    systemPromptDynamic: "",
    userPrompt: params.userPrompt,
    schema: params.schema,
    schemaName: params.schemaName,
  });

  return result.text;
}
