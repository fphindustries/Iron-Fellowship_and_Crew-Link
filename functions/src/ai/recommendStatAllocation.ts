import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import OpenAI from "openai";
import { openaiApiKey } from "./openai.client";
import {
  StatAllocationRequest,
  StatAllocationOutput,
} from "./_ai.type";


const STAT_ALLOCATION_SCHEMA = {
  type: "object",
  properties: {
    allocations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          statKey: { type: "string" },
          value: { type: "number" },
        },
        required: ["statKey", "value"],
        additionalProperties: false,
      },
    },
    reasoning: { type: "string" },
  },
  required: ["allocations", "reasoning"],
  additionalProperties: false,
};

export const recommendStatAllocation = onCall<
  StatAllocationRequest,
  Promise<StatAllocationOutput | null>
>(
  { secrets: [openaiApiKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("recommendStatAllocation: unauthenticated request");
      return null;
    }

    const { paths, backstory, backgroundVow, stats } = request.data;

    logger.info("recommendStatAllocation called", { uid });

    const openai = new OpenAI({ apiKey: openaiApiKey.value() });

    const statList = stats
      .map((s) => `- ${s.key} (${s.label}): ${s.description}`)
      .join("\n");

    const systemPrompt = [
      "You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.",
      "Allocate the values [3, 2, 2, 1, 1] across exactly the stat keys provided. Each value must be used exactly once.",
      "Choose allocations that best fit the character's paths, backstory, and background vow.",
      "Return the exact stat keys provided — do not rename or omit any.",
      "Give a brief (2-3 sentence) reasoning explaining your choices.",
      "",
      "Available stats:",
      statList,
    ].join("\n");

    const pathsLine =
      paths.length > 0 ? `Chosen paths: ${paths.join(", ")}.` : "";
    const backstoryLine = backstory ? `Backstory: ${backstory}` : "";
    const vowLine = backgroundVow ? `Background vow: ${backgroundVow}` : "";

    const userPrompt = [pathsLine, backstoryLine, vowLine]
      .filter(Boolean)
      .join("\n");

    const completion = await openai.responses.create({
      model: "gpt-4o-mini",
      instructions: systemPrompt,
      input: userPrompt || "Recommend stat allocations for a new Starforged character.",
      text: {
        format: {
          type: "json_schema",
          name: "stat_allocation_output",
          schema: STAT_ALLOCATION_SCHEMA,
          strict: true,
        },
      },
    });

    const output = JSON.parse(
      completion.output_text
    ) as StatAllocationOutput;

    logger.info("recommendStatAllocation: completed", {
      uid,
      count: output.allocations.length,
    });

    return output;
  }
);
