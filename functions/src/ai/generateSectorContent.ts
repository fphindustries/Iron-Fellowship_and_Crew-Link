import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { openaiApiKey } from "./openai.client";
import { anthropicApiKey } from "./anthropic.client";
import { callStructuredGeneration } from "./callProvider";
import {
  SectorGenerationRequest,
  SectorGenerationOutput,
} from "./_ai.type";

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    settlementDescriptions: {
      type: "array",
      items: { type: "string" },
      description:
        "One atmospheric player-facing description per settlement, in the same order as the input.",
    },
    npcDescription: {
      type: "string",
      description: "A vivid 1–2 sentence player-facing description of the NPC.",
    },
  },
  required: ["settlementDescriptions", "npcDescription"],
  additionalProperties: false,
};

export const generateSectorContent = onCall<
  SectorGenerationRequest,
  Promise<SectorGenerationOutput | null>
>(
  { secrets: [openaiApiKey, anthropicApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("generateSectorContent: unauthenticated request");
      return null;
    }

    const { sectorName, region, trouble, settlements, npc, worldContext } =
      request.data;

    logger.info("generateSectorContent called", { uid });

    const systemLines = [
      "You are a creative writer for Ironsworn: Starforged, a gritty sci-fi tabletop RPG.",
      "Write vivid, atmospheric descriptions for a newly generated sector of the Forge.",
      "Each settlement description should be 1–2 sentences, player-facing, and evoke the settlement's character based on its oracle-generated attributes.",
      "The NPC description should be 1–2 sentences capturing the character's appearance, manner, or reputation in a way that intrigues the players.",
      "Write in present tense. Do not use headers or bullet points. Keep prose tight and evocative.",
    ];

    if (worldContext?.assumptions) {
      systemLines.push("", "Setting assumptions:", worldContext.assumptions);
    }

    if (worldContext?.truths && worldContext.truths.length > 0) {
      const truthsText = worldContext.truths
        .map((t) => `${t.name}: ${t.description}`)
        .join("\n");
      systemLines.push("", "World truths:", truthsText);
    }

    const settlementLines = settlements.map((s, i) => {
      const lines = [
        `Settlement ${i + 1}: ${s.name}`,
        `  Location type: ${s.locationType}`,
        `  Population: ${s.population}`,
        `  Authority: ${s.authority}`,
        `  Projects: ${s.projects}`,
        `  Trouble: ${s.trouble}`,
      ];
      if (s.planet) {
        lines.push(
          `  Planet: ${s.planet.name} (${s.planet.className})${s.planet.atmosphere ? `, Atmosphere: ${s.planet.atmosphere}` : ""}`
        );
      }
      return lines.join("\n");
    });

    const userPrompt = [
      `Sector: ${sectorName} (${region})`,
      `Sector trouble: ${trouble}`,
      "",
      "Settlements:",
      ...settlementLines,
      "",
      `NPC Connection: ${npc.name}, Role: ${npc.role}`,
      "",
      `Generate exactly ${settlements.length} settlement description(s) and 1 NPC description.`,
    ].join("\n");

    const raw = await callStructuredGeneration({
      systemPrompt: systemLines.join("\n"),
      userPrompt,
      schema: OUTPUT_SCHEMA,
      schemaName: "SectorGenerationOutput",
    });

    let parsed: SectorGenerationOutput;
    try {
      parsed = JSON.parse(raw) as SectorGenerationOutput;
    } catch {
      logger.error("generateSectorContent: failed to parse JSON", { raw });
      return null;
    }

    logger.info("generateSectorContent: completed", { uid });

    return parsed;
  }
);
