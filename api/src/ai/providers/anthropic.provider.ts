import Anthropic from '@anthropic-ai/sdk';
import { AiProvider, AiProviderResult } from '../ai.provider';

export class AnthropicProvider implements AiProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  private buildSystemBlocks(
    staticPrompt: string,
    dynamicPrompt: string,
  ): Anthropic.Messages.TextBlockParam[] {
    const blocks: Anthropic.Messages.TextBlockParam[] = [];
    if (staticPrompt) {
      blocks.push({
        type: 'text',
        text: staticPrompt,
        cache_control: { type: 'ephemeral' } as any,
      });
    }
    if (dynamicPrompt) {
      blocks.push({ type: 'text', text: dynamicPrompt });
    }
    return blocks;
  }

  async generateText(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
  }): Promise<AiProviderResult> {
    const systemBlocks = this.buildSystemBlocks(
      params.systemPromptStatic,
      params.systemPromptDynamic,
    );
    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: 4096,
      system: systemBlocks,
      messages: [{ role: 'user', content: params.userPrompt }],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    return {
      text: (textBlock as any)?.text ?? '',
      _debug: {
        provider: 'anthropic',
        model: params.model,
        systemPromptStatic: params.systemPromptStatic,
        systemPromptDynamic: params.systemPromptDynamic,
        userPrompt: params.userPrompt,
      },
    };
  }

  async *generateTextStream(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
  }): AsyncGenerator<string> {
    const systemBlocks = this.buildSystemBlocks(
      params.systemPromptStatic,
      params.systemPromptDynamic,
    );
    const stream = this.client.messages.stream({
      model: params.model,
      max_tokens: 4096,
      system: systemBlocks,
      messages: [{ role: 'user', content: params.userPrompt }],
    });
    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        yield chunk.delta.text;
      }
    }
  }

  async generateStructured(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
    schema: Record<string, unknown>;
    schemaName: string;
  }): Promise<AiProviderResult> {
    const systemBlocks = this.buildSystemBlocks(
      params.systemPromptStatic,
      params.systemPromptDynamic,
    );
    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: 4096,
      system: systemBlocks,
      messages: [{ role: 'user', content: params.userPrompt }],
      tools: [
        {
          name: params.schemaName,
          description:
            'Return structured data matching this schema. Always use this tool to respond.',
          input_schema:
            params.schema as Anthropic.Messages.Tool['input_schema'],
        },
      ],
      tool_choice: { type: 'tool', name: params.schemaName },
    });

    const toolBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      throw new Error('Anthropic did not return a tool_use block');
    }
    return {
      text: JSON.stringify((toolBlock as any).input),
      _debug: {
        provider: 'anthropic',
        model: params.model,
        systemPromptStatic: params.systemPromptStatic,
        systemPromptDynamic: params.systemPromptDynamic,
        userPrompt: params.userPrompt,
        schemaName: params.schemaName,
      },
    };
  }
}
