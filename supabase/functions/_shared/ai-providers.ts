import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.79.0";
import OpenAI from "https://esm.sh/openai@6.29.0";

export function createAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
}

export function createOpenAiClient(): OpenAI {
  return new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
}

export type AiProviderName = "anthropic" | "openai";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const HEAVY_MODES = new Set(["sessionRecap", "bookkeeper"]);

export function getDefaultModel(provider: AiProviderName, mode: string): string {
  const isHeavy = HEAVY_MODES.has(mode);
  if (provider === "anthropic") return isHeavy ? "claude-sonnet-4-20250514" : DEFAULT_ANTHROPIC_MODEL;
  return isHeavy ? "gpt-4o" : DEFAULT_OPENAI_MODEL;
}

export async function callTextGeneration(params: {
  systemPrompt: string;
  userPrompt: string;
  provider?: AiProviderName;
  model?: string;
}): Promise<string> {
  const provider = params.provider ?? "openai";
  const model = params.model ?? (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_OPENAI_MODEL);

  if (provider === "anthropic") {
    const client = createAnthropicClient();
    const msg = await client.messages.create({
      model,
      max_tokens: 1024,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userPrompt }],
    });
    const block = msg.content[0];
    return block.type === "text" ? block.text : "";
  } else {
    const client = createOpenAiClient();
    const res = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }
}

export async function callStructuredGeneration(params: {
  systemPrompt: string;
  userPrompt: string;
  schema: Record<string, unknown>;
  schemaName: string;
  provider?: AiProviderName;
  model?: string;
}): Promise<string> {
  const provider = params.provider ?? "openai";
  const model = params.model ?? (provider === "anthropic" ? DEFAULT_ANTHROPIC_MODEL : DEFAULT_OPENAI_MODEL);

  if (provider === "anthropic") {
    const client = createAnthropicClient();
    const msg = await client.messages.create({
      model,
      max_tokens: 2048,
      system: params.systemPrompt,
      messages: [
        { role: "user", content: params.userPrompt },
        { role: "assistant", content: "{" },
      ],
    });
    const block = msg.content[0];
    const raw = block.type === "text" ? block.text : "{}";
    return "{" + raw;
  } else {
    const client = createOpenAiClient();
    const res = await client.chat.completions.create({
      model,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: params.schemaName,
          schema: params.schema as Record<string, unknown>,
          strict: true,
        },
      } as Parameters<typeof client.chat.completions.create>[0]["response_format"],
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    });
    return res.choices[0]?.message?.content ?? "{}";
  }
}
