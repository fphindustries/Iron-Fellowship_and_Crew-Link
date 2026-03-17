import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { openaiApiKey } from "./openai.client";
import { anthropicApiKey } from "./anthropic.client";
import { buildPrompt } from "./promptTemplates";
import { BOOKKEEPER_JSON_SCHEMA } from "./schemas";
import { getProvider } from "./providerFactory";
import {
  AiCampaignContext,
  AiGuideRequest,
  AiGuideResponse,
  AiProviderName,
  BookkeeperOutput,
  WorldAiSettings,
} from "./_ai.type";

// Default model mapping per provider
const HEAVY_MODES = new Set(["sessionRecap", "bookkeeper"]);

function getDefaultModel(
  provider: AiProviderName,
  mode: string
): string {
  const isHeavy = HEAVY_MODES.has(mode);
  if (provider === "anthropic") {
    return isHeavy
      ? "claude-sonnet-4-20250514"
      : "claude-haiku-4-5-20251001";
  }
  return isHeavy ? "gpt-4o" : "gpt-4o-mini";
}

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

async function fetchWorldAiSettings(
  worldId: string
): Promise<WorldAiSettings | undefined> {
  const doc = await getFirestore()
    .doc(`/worlds/${worldId}/settings/ai-prompts`)
    .get();
  return doc.exists ? (doc.data() as WorldAiSettings) : undefined;
}

export const callAiGuide = onCall<
  AiGuideRequest,
  Promise<AiGuideResponse | null>
>(
  { secrets: [openaiApiKey, anthropicApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("callAiGuide: unauthenticated request");
      return null;
    }

    const { mode, context, campaignId, worldId } = request.data;

    if (!campaignId) {
      logger.warn("callAiGuide: campaignId is required");
      return null;
    }

    logger.info("callAiGuide called", { uid, mode, campaignId, worldId });

    // Fetch world AI settings if a world is associated
    const worldSettings = worldId
      ? await fetchWorldAiSettings(worldId)
      : undefined;

    // Determine provider and model
    const providerName: AiProviderName = worldSettings?.provider ?? "openai";
    const modeConfig = worldSettings?.modeConfigs?.[mode];

    let model: string;
    if (providerName === "anthropic" && modeConfig?.anthropicModel) {
      model = modeConfig.anthropicModel;
    } else {
      model = getDefaultModel(providerName, mode);
    }

    // Build prompts with custom world tone and mode instructions
    const { systemPromptStatic, systemPromptDynamic, userPrompt, useStructuredOutput } =
      buildPrompt(mode, context, {
        worldTonePrompt: worldSettings?.worldTonePrompt,
        modeCustomInstructions: modeConfig?.customInstructions,
      });

    const provider = getProvider(providerName);

    logger.info("callAiGuide: calling provider", {
      provider: providerName,
      model,
      mode,
    });

    let responseData: Omit<AiGuideResponse, "eventId">;

    if (useStructuredOutput) {
      const result = await provider.generateStructured({
        model,
        systemPromptStatic,
        systemPromptDynamic,
        userPrompt,
        schema: BOOKKEEPER_JSON_SCHEMA,
        schemaName: "bookkeeper_output",
      });
      const bookkeeper = JSON.parse(result.text) as BookkeeperOutput;
      responseData = { mode, bookkeeper };
    } else {
      const result = await provider.generateText({
        model,
        systemPromptStatic,
        systemPromptDynamic,
        userPrompt,
      });
      responseData = { mode, text: result.text };
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
