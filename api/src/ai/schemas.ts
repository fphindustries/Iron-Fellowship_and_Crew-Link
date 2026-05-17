// JSON Schema for the Bookkeeper structured output.
// All fields use anyOf with null for optional values to satisfy OpenAI strict mode
// requirements (strict mode requires every property to be in the required array).

export const BOOKKEEPER_JSON_SCHEMA: { [key: string]: unknown } = {
  type: "object",
  properties: {
    vowUpdates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          suggestedProgress: { type: "number" },
          notes: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: ["label", "suggestedProgress", "notes"],
        additionalProperties: false,
      },
    },
    npcUpdates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          changes: {
            type: "object",
            properties: {
              role: { anyOf: [{ type: "string" }, { type: "null" }] },
              disposition: { anyOf: [{ type: "string" }, { type: "null" }] },
              goal: { anyOf: [{ type: "string" }, { type: "null" }] },
              revealedAspect: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
            },
            required: ["role", "disposition", "goal", "revealedAspect"],
            additionalProperties: false,
          },
        },
        required: ["name", "changes"],
        additionalProperties: false,
      },
    },
    locationUpdates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          changes: {
            type: "object",
            properties: {
              type: { anyOf: [{ type: "string" }, { type: "null" }] },
              trouble: { anyOf: [{ type: "string" }, { type: "null" }] },
            },
            required: ["type", "trouble"],
            additionalProperties: false,
          },
        },
        required: ["name", "changes"],
        additionalProperties: false,
      },
    },
    newNPCs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          role: { anyOf: [{ type: "string" }, { type: "null" }] },
          disposition: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: ["name", "role", "disposition"],
        additionalProperties: false,
      },
    },
    canonFacts: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "vowUpdates",
    "npcUpdates",
    "locationUpdates",
    "newNPCs",
    "canonFacts",
  ],
  additionalProperties: false,
};
