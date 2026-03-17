export interface AiProviderResult {
  text: string;
}

export interface AiProvider {
  /** Simple text generation */
  generateText(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
  }): Promise<AiProviderResult>;

  /** Structured JSON generation */
  generateStructured(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
    schema: Record<string, unknown>;
    schemaName: string;
  }): Promise<AiProviderResult>;
}

export type AiProviderName = "openai" | "anthropic";
