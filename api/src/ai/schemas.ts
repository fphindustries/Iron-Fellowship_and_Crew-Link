// JSON Schema for the PriceProposal structured output (AI Guide mode).
export const PRICE_PROPOSAL_JSON_SCHEMA: { [key: string]: unknown } = {
  type: 'object',
  properties: {
    consequenceType: {
      type: 'string',
      enum: ['harm', 'cost', 'complication', 'revelation', 'loss'],
    },
    severity: { type: 'string', enum: ['minor', 'moderate', 'severe'] },
    narrative: { type: 'string' },
    mechanicalEffect: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
    },
  },
  required: ['consequenceType', 'severity', 'narrative', 'mechanicalEffect'],
  additionalProperties: false,
};

// JSON Schema for the ClockAdvance structured output (AI Guide mode).
export const CLOCK_ADVANCE_JSON_SCHEMA: { [key: string]: unknown } = {
  type: 'object',
  properties: {
    clockId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    clockLabel: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    advanceBy: { type: 'number' },
    narrativeSignal: { type: 'string' },
    triggeredConsequence: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
    },
  },
  required: [
    'clockId',
    'clockLabel',
    'advanceBy',
    'narrativeSignal',
    'triggeredConsequence',
  ],
  additionalProperties: false,
};

// JSON Schema for the Bookkeeper structured output.
// All fields use anyOf with null for optional values to satisfy OpenAI strict mode
// requirements (strict mode requires every property to be in the required array).

export const BOOKKEEPER_JSON_SCHEMA: { [key: string]: unknown } = {
  type: 'object',
  properties: {
    vowUpdates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          suggestedProgress: { type: 'number' },
          notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
        required: ['label', 'suggestedProgress', 'notes'],
        additionalProperties: false,
      },
    },
    npcUpdates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          changes: {
            type: 'object',
            properties: {
              role: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              disposition: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              goal: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              revealedAspect: {
                anyOf: [{ type: 'string' }, { type: 'null' }],
              },
            },
            required: ['role', 'disposition', 'goal', 'revealedAspect'],
            additionalProperties: false,
          },
        },
        required: ['name', 'changes'],
        additionalProperties: false,
      },
    },
    locationUpdates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          changes: {
            type: 'object',
            properties: {
              type: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              trouble: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            },
            required: ['type', 'trouble'],
            additionalProperties: false,
          },
        },
        required: ['name', 'changes'],
        additionalProperties: false,
      },
    },
    newNPCs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          disposition: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
        required: ['name', 'role', 'disposition'],
        additionalProperties: false,
      },
    },
    canonFacts: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: [
    'vowUpdates',
    'npcUpdates',
    'locationUpdates',
    'newNPCs',
    'canonFacts',
  ],
  additionalProperties: false,
};

// JSON Schema for actionSuggestions structured output (AI Guide mode).
export const ACTION_SUGGESTIONS_JSON_SCHEMA: { [key: string]: unknown } = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          intentCategory: {
            type: 'string',
            enum: ['investigative', 'risky', 'social', 'meta'],
          },
          moveName: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          stat: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          reason: { type: 'string' },
        },
        required: [
          'id',
          'label',
          'intentCategory',
          'moveName',
          'stat',
          'confidence',
          'reason',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
};

// JSON Schema for intentToMove structured output (AI Guide mode).
export const INTENT_TO_MOVE_JSON_SCHEMA: { [key: string]: unknown } = {
  type: 'object',
  properties: {
    moveName: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    stat: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reason: { type: 'string' },
    assetSuggestions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['moveName', 'stat', 'confidence', 'reason', 'assetSuggestions'],
  additionalProperties: false,
};

// JSON Schema for spotlightNudge structured output (AI Guide mode).
export const SPOTLIGHT_NUDGE_JSON_SCHEMA: { [key: string]: unknown } = {
  type: 'object',
  properties: {
    characterName: { type: 'string' },
    suggestion: { type: 'string' },
  },
  required: ['characterName', 'suggestion'],
  additionalProperties: false,
};
