import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";
import { openaiApiKey } from "./openai.client";
import {
  PathRecommendationRequest,
  PathRecommendationOutput,
} from "./_ai.type";


const BACKGROUNDS_REFERENCE = `
1–5: Battlefield Medic — HEALER, VETERAN
6–10: Delegate — BANNERSWORN, DIPLOMAT
11–15: Exobiologist — LORE HUNTER, NATURALIST
16–20: Far Trader — NAVIGATOR, TRADER
21–25: Fugitive Hunter — ARMORED, BOUNTY HUNTER
26–30: Hacker — INFILTRATOR, TECH
31–35: Hotshot Pilot — ACE, NAVIGATOR
36–40: Interstellar Scout — EXPLORER, VOIDBORN
41–45: Monster Hunter — GUNNER, SLAYER
46–50: Occultist — OUTCAST, SHADE
51–55: Operative — INFILTRATOR, BLADEMASTER
56–60: Outlaw — FUGITIVE, GUNSLINGER
61–65: Private Investigator — BRAWLER, SLEUTH
66–70: Prophet — DEVOTANT, SEER
71–75: Psionicist — KINETIC, VESTIGE
76–80: Smuggler — COURIER, SCOUNDREL
81–85: Spiritualist — HAUNTED, EMPATH
86–90: Starship Engineer — GEARHEAD, TECH
91–95: Supersoldier — AUGMENTED, MERCENARY
96–100: Tomb Raider — SCAVENGER, SCOUNDREL
`.trim();

const PATH_RECOMMENDATION_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          backgroundName: { type: "string" },
          asset1: { type: "string" },
          asset2: { type: "string" },
          reasoning: { type: "string" },
        },
        required: ["backgroundName", "asset1", "asset2", "reasoning"],
        additionalProperties: false,
      },
    },
  },
  required: ["recommendations"],
  additionalProperties: false,
};

export const recommendCharacterPaths = onCall<
  PathRecommendationRequest,
  Promise<PathRecommendationOutput | null>
>(
  { secrets: [openaiApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("recommendCharacterPaths: unauthenticated request");
      return null;
    }

    const { description } = request.data;
    if (!description?.trim()) {
      logger.warn("recommendCharacterPaths: empty description");
      return null;
    }

    logger.info("recommendCharacterPaths called", { uid });

    const openai = new OpenAI({ apiKey: openaiApiKey.value() });

    const systemPrompt = [
      "You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.",
      "Given a character concept description, recommend exactly 3 backgrounds from the provided table that best fit.",
      "Use ONLY background names and asset names from the table — do not invent new ones.",
      "Return asset names exactly as they appear in the table (e.g. 'ACE', 'LORE HUNTER').",
      "Keep reasoning brief (1-2 sentences) and focused on why the background fits the concept.",
    ].join("\n");

    const userPrompt = [
      `Available backgrounds:\n${BACKGROUNDS_REFERENCE}`,
      "",
      `Character concept: "${description}"`,
      "",
      "Recommend 3 backgrounds that best fit this concept.",
    ].join("\n");

    const completion = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions: systemPrompt,
      input: userPrompt,
      text: {
        format: {
          type: "json_schema",
          name: "path_recommendation_output",
          schema: PATH_RECOMMENDATION_SCHEMA,
          strict: true,
        },
      },
    });

    const output = JSON.parse(
      completion.output_text
    ) as PathRecommendationOutput;

    logger.info("recommendCharacterPaths: completed", {
      uid,
      count: output.recommendations.length,
    });

    return output;
  }
);
