export type AiProviderName = 'openai' | 'anthropic';

export interface AiProviderResult {
  text: string;
  _debug?: object;
}

export interface AiProvider {
  generateText(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
  }): Promise<AiProviderResult>;

  generateTextStream(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
  }): AsyncGenerator<string>;

  generateStructured(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
    schema: Record<string, unknown>;
    schemaName: string;
  }): Promise<AiProviderResult>;
}
