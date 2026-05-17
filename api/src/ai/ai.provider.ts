export type AiProviderName = 'openai' | 'anthropic';

export interface AiProviderResult {
  text: string;
}

export interface AiProvider {
  generateText(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
  }): Promise<AiProviderResult>;

  generateStructured(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
    schema: Record<string, unknown>;
    schemaName: string;
  }): Promise<AiProviderResult>;
}
