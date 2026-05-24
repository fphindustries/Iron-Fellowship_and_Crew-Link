import OpenAI from 'openai';
import { AiProvider, AiProviderResult } from '../ai.provider';

export class OpenAiProvider implements AiProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateText(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
  }): Promise<AiProviderResult> {
    const instructions = [params.systemPromptStatic, params.systemPromptDynamic]
      .filter(Boolean)
      .join('\n\n');

    const completion = await this.client.responses.create({
      model: params.model,
      instructions,
      input: params.userPrompt,
    });

    return {
      text: completion.output_text,
      _debug: { provider: 'openai', model: params.model, instructions, userPrompt: params.userPrompt },
    };
  }

  async generateStructured(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
    schema: Record<string, unknown>;
    schemaName: string;
  }): Promise<AiProviderResult> {
    const instructions = [params.systemPromptStatic, params.systemPromptDynamic]
      .filter(Boolean)
      .join('\n\n');

    const completion = await this.client.responses.create({
      model: params.model,
      instructions,
      input: params.userPrompt,
      text: {
        format: {
          type: 'json_schema',
          name: params.schemaName,
          schema: params.schema,
          strict: true,
        },
      },
    });

    return {
      text: completion.output_text,
      _debug: { provider: 'openai', model: params.model, instructions, userPrompt: params.userPrompt, schemaName: params.schemaName },
    };
  }

  async generateImage(prompt: string): Promise<string[]> {
    const result = await this.client.images.generate({
      model: 'gpt-image-1',
      prompt,
      n: 3,
      size: '1024x1024',
    });

    return (result.data ?? [])
      .map((d) => (d as any).b64_json)
      .filter((b): b is string => typeof b === 'string');
  }
}
