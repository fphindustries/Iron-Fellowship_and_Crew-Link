import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { anthropicApiKey, createAnthropicClient } from "./ai/anthropic.client";
import { NarrativeRequest, NarrativeResponse } from "./types/aiGuide.types";

const ROLE_BLOCK = `You are the Guide — the narrative voice of a solo or co-op tabletop RPG session in the Ironsworn or Starforged universe. Your role is to respond to player moves and dice outcomes with vivid, immersive story beats that honour the mechanical result while breathing life into the fiction.

Rules you must follow:
- Write in second person ("You...", "Your blade...", "The stars around you...")
- Always honour the outcome: Strong Hit = genuine success, Weak Hit = success with cost/complication, Miss = failure or danger
- Keep responses to 3-5 sentences — tight and evocative
- Avoid clichés; favour specific sensory details over vague descriptions
- Never introduce new plot elements the player hasn't established
- Do not repeat the move name or outcome label verbatim
- Match the tone of the world: Ironsworn is grim Norse-inspired; Starforged is dark science fiction`;

function buildGameContextBlock(req: NarrativeRequest): string {
  const { gameContext } = req;
  const lines: string[] = [];

  lines.push(`Character: ${gameContext.characterName}`);

  if (gameContext.worldTruths.length > 0) {
    lines.push("\nWorld Truths:");
    gameContext.worldTruths.forEach((t) => lines.push(`  - ${t}`));
  }

  if (gameContext.characterAssets.length > 0) {
    lines.push("\nCharacter Assets:");
    gameContext.characterAssets.forEach((a) => lines.push(`  - ${a}`));
  }

  if (
    gameContext.campaignCharacterNames &&
    gameContext.campaignCharacterNames.length > 0
  ) {
    lines.push(
      `\nCampaign companions: ${gameContext.campaignCharacterNames.join(", ")}`
    );
  }

  return lines.join("\n");
}

function buildMoveUserMessage(req: NarrativeRequest): string {
  const { moveEvent, gameContext } = req;
  if (!moveEvent) return "";
  const lines: string[] = [];

  const statPart =
    moveEvent.stat && moveEvent.statValue !== undefined
      ? ` using ${moveEvent.stat} (${moveEvent.statValue})`
      : "";
  const scorePart =
    moveEvent.score !== undefined && moveEvent.challengeDice
      ? ` — action score ${moveEvent.score} vs [${moveEvent.challengeDice[0]}, ${moveEvent.challengeDice[1]}]`
      : "";

  lines.push(`Move: ${moveEvent.moveName}${statPart}${scorePart}`);
  lines.push(`Outcome: ${moveEvent.outcome}`);

  if (moveEvent.playerContext) {
    lines.push(`Player's intent: "${moveEvent.playerContext}"`);
  }

  if (gameContext.recentEvents.length > 0) {
    lines.push("\nRecent session events:");
    gameContext.recentEvents.slice(0, 5).forEach((e) => lines.push(`  - ${e}`));
  }

  lines.push(
    "\nWrite a vivid 3–5 sentence story beat in second person that honours this outcome."
  );

  return lines.join("\n");
}

function buildPromptUserMessage(req: NarrativeRequest): string {
  const { prompt, gameContext } = req;
  const lines: string[] = [];

  if (gameContext.recentEvents.length > 0) {
    lines.push("Recent session events:");
    gameContext.recentEvents.slice(0, 5).forEach((e) => lines.push(`  - ${e}`));
    lines.push("");
  }

  lines.push(
    `Player prompt: "${prompt}"\n\nWrite a vivid 3–5 sentence story beat in second person inspired by this prompt.`
  );

  return lines.join("\n");
}

export const generateNarrative = onCall<
  NarrativeRequest,
  Promise<NarrativeResponse>
>(
  { secrets: [anthropicApiKey] },
  async (request, response) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("generateNarrative: unauthenticated request");
      return { done: false };
    }

    const data = request.data;

    if (!data.sessionId || (!data.moveEvent && !data.prompt)) {
      logger.warn("generateNarrative: missing required fields");
      return { done: false };
    }

    logger.info("generateNarrative called", {
      uid,
      sessionId: data.sessionId,
      mode: data.moveEvent ? "move" : "prompt",
    });

    const client = createAnthropicClient();
    const gameContextText = buildGameContextBlock(data);
    const userMessage = data.moveEvent
      ? buildMoveUserMessage(data)
      : buildPromptUserMessage(data);

    const stream = client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: [
        {
          type: "text",
          text: ROLE_BLOCK,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cache_control: { type: "ephemeral" } as any,
        },
        {
          type: "text",
          text: gameContextText,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cache_control: { type: "ephemeral" } as any,
        },
      ],
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta" &&
        response
      ) {
        await response.sendChunk({ text: event.delta.text });
      }
    }

    logger.info("generateNarrative complete", { sessionId: data.sessionId });
    return { done: true };
  }
);
