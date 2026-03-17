import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import OpenAI from "openai";
import { openaiApiKey } from "./openai.client";
import { buildPrompt } from "./promptTemplates";
import { BOOKKEEPER_JSON_SCHEMA } from "./schemas";
import {
  AiCampaignContext,
  AiGuideRequest,
  AiGuideResponse,
  BookkeeperOutput,
} from "./_ai.type";

// Models: use gpt-4o for heavy analytical modes, gpt-4o-mini for generative ones
const HEAVY_MODES = new Set(["sessionRecap", "bookkeeper"]);

function buildContextSnapshot(
  context: AiCampaignContext
): Partial<AiCampaignContext> {
  const snapshot = {
    gameSystem: context.gameSystem,
    campaignName: context.campaignName,
    campaignType: context.campaignType,
    activeVows: context.activeVows,
    characters: context.characters.map((c) => ({
      name: c.name,
      stats: c.stats,
      conditionMeters: c.conditionMeters,
      momentum: c.momentum,
    })),
    currentLocation: context.currentLocation,
    currentNPCs: context.currentNPCs,
  };
  // Firestore rejects undefined values; strip them via JSON roundtrip
  return JSON.parse(JSON.stringify(snapshot));
}

export const callAiGuide = onCall<
  AiGuideRequest,
  Promise<AiGuideResponse | null>
>(
  { secrets: [openaiApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("callAiGuide: unauthenticated request");
      return null;
    }

    const { mode, context, campaignId } = request.data;

    if (!campaignId) {
      logger.warn("callAiGuide: campaignId is required");
      return null;
    }

    logger.info("callAiGuide called", { uid, mode, campaignId });

    const openai = new OpenAI({ apiKey: openaiApiKey.value() });
    const { systemPrompt, userPrompt, useStructuredOutput } = buildPrompt(
      mode,
      context
    );
    const model = HEAVY_MODES.has(mode) ? "gpt-4o" : "gpt-4o-mini";

    let responseData: Omit<AiGuideResponse, "eventId">;

    if (useStructuredOutput) {
      const completion = await openai.responses.create({
        model,
        instructions: systemPrompt,
        input: userPrompt,
        text: {
          format: {
            type: "json_schema",
            name: "bookkeeper_output",
            schema: BOOKKEEPER_JSON_SCHEMA,
            strict: true,
          },
        },
      });
      const bookkeeper = JSON.parse(
        completion.output_text
      ) as BookkeeperOutput;
      responseData = { mode, bookkeeper };
    } else {
      const completion = await openai.responses.create({
        model,
        instructions: systemPrompt,
        input: userPrompt,
      });
      responseData = { mode, text: completion.output_text };
    }

    const eventRef = await getFirestore()
      .collection(`/campaigns/${campaignId}/ai-events`)
      .add({
        type: mode,
        contextSnapshot: buildContextSnapshot(context),
        response: responseData,
        status: "pending",
        canonized: false,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: uid,
      });

    logger.info("callAiGuide: event saved", { eventId: eventRef.id });

    return { ...responseData, eventId: eventRef.id };
  }
);
