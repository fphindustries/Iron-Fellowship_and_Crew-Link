import Anthropic from "@anthropic-ai/sdk";
import { anthropicApiKey } from "../anthropic.client";
import { AiProvider, AiProviderResult } from "../provider";

export class AnthropicProvider implements AiProvider {
  private getClient(): Anthropic {
    return new Anthropic({ apiKey: anthropicApiKey.value() });
  }

  private buildSystemBlocks(
    staticPrompt: string,
    dynamicPrompt: string
  ): Anthropic.Messages.TextBlockParam[] {
    const blocks: Anthropic.Messages.TextBlockParam[] = [];

    if (staticPrompt) {
      blocks.push({
        type: "text" as const,
        text: staticPrompt,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cache_control: { type: "ephemeral" } as any,
      });
    }

    if (dynamicPrompt) {
      blocks.push({
        type: "text" as const,
        text: dynamicPrompt,
      });
    }

    return blocks;
  }

  async generateText(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
  }): Promise<AiProviderResult> {
    const client = this.getClient();

    const response = await client.messages.create({
      model: params.model,
      max_tokens: 4096,
      system: this.buildSystemBlocks(
        params.systemPromptStatic,
        params.systemPromptDynamic
      ),
      messages: [{ role: "user", content: params.userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return { text: textBlock?.text ?? "" };
  }

  async generateStructured(params: {
    model: string;
    systemPromptStatic: string;
    systemPromptDynamic: string;
    userPrompt: string;
    schema: Record<string, unknown>;
    schemaName: string;
  }): Promise<AiProviderResult> {
    const client = this.getClient();

    const response = await client.messages.create({
      model: params.model,
      max_tokens: 4096,
      system: this.buildSystemBlocks(
        params.systemPromptStatic,
        params.systemPromptDynamic
      ),
      messages: [{ role: "user", content: params.userPrompt }],
      tools: [
        {
          name: params.schemaName,
          description:
            "Return structured data matching this schema. Always use this tool to respond.",
          input_schema: params.schema as Anthropic.Messages.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: params.schemaName },
    });

    const toolBlock = response.content.find(
      (block) => block.type === "tool_use"
    );
    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("Anthropic did not return a tool_use block");
    }

    return { text: JSON.stringify(toolBlock.input) };
  }
}
