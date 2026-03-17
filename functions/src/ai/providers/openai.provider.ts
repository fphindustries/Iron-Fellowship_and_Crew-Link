import OpenAI from "openai";
import { openaiApiKey } from "../openai.client";
import { AiProvider, AiProviderResult } from "../provider";

export class OpenAiProvider implements AiProvider {
  private getClient(): OpenAI {
    return new OpenAI({ apiKey: openaiApiKey.value() });
  }

  async generateText(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
  }): Promise<AiProviderResult> {
    const openai = this.getClient();
    const instructions = [params.systemPromptStatic, params.systemPromptDynamic]
      .filter(Boolean)
      .join("\n\n");

    const completion = await openai.responses.create({
      model: params.model,
      instructions,
      input: params.userPrompt,
    });

    return { text: completion.output_text };
  }

  async generateStructured(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
    schema: Record<string, unknown>;
    schemaName: string;
  }): Promise<AiProviderResult> {
    const openai = this.getClient();
    const instructions = [params.systemPromptStatic, params.systemPromptDynamic]
      .filter(Boolean)
      .join("\n\n");

    const completion = await openai.responses.create({
      model: params.model,
      instructions,
      input: params.userPrompt,
      text: {
        format: {
          type: "json_schema",
          name: params.schemaName,
          schema: params.schema,
          strict: true,
        },
      },
    });

    return { text: completion.output_text };
  }
}
