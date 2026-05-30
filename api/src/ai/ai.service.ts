import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/database.module';
import * as schema from '../db/schema';
import { AiProvider, AiProviderName } from './ai.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { buildPrompt } from './prompt-templates';
import {
  BOOKKEEPER_JSON_SCHEMA,
  PRICE_PROPOSAL_JSON_SCHEMA,
  CLOCK_ADVANCE_JSON_SCHEMA,
  ACTION_SUGGESTIONS_JSON_SCHEMA,
  INTENT_TO_MOVE_JSON_SCHEMA,
  SPOTLIGHT_NUDGE_JSON_SCHEMA,
} from './schemas';
import { appendWorldContextLines } from './world-context';

const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_OPENAI_HEAVY_MODEL = 'gpt-4o';
const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_ANTHROPIC_HEAVY_MODEL = 'claude-sonnet-4-6';
const HEAVY_MODES = new Set([
  'sessionRecap',
  'bookkeeper',
  'priceProposal',
  'outcomeNarration',
  'sceneFrame',
  'bookkeepingProposal',
  'sectorGeneration',
]);

interface SectorGenerationBody {
  sectorName: string;
  region: string;
  trouble: string;
  passageCount?: number;
  focusSettlementIndex?: number;
  settlements: Array<{
    name: string;
    locationType: string;
    population: string;
    authority: string;
    projects: string;
    trouble?: string;
    firstLook?: string;
    isFocus?: boolean;
    planet?: {
      name: string;
      className: string;
      atmosphere?: string;
      observedFromSpace?: string;
      feature?: string;
      life?: string;
      diversity?: string;
      biomes?: string;
    };
  }>;
  npc: {
    name: string;
    role: string;
    rank?: string;
    homeSettlementName?: string;
  };
  stars?: Array<{ settlementName: string; stellarObject: string }>;
  worldContext?: {
    assumptions?: string;
    truths?: Array<{ name: string; description: string }>;
  };
}

function resolveStructuredOutputSchema(
  mode: string,
): { schema: Record<string, unknown>; schemaName: string } | null {
  switch (mode) {
    case 'bookkeeper':
    case 'bookkeepingProposal':
      return {
        schema: BOOKKEEPER_JSON_SCHEMA,
        schemaName: 'bookkeeper_output',
      };
    case 'priceProposal':
      return {
        schema: PRICE_PROPOSAL_JSON_SCHEMA,
        schemaName: 'price_proposal',
      };
    case 'clockAdvance':
      return {
        schema: CLOCK_ADVANCE_JSON_SCHEMA,
        schemaName: 'clock_advance',
      };
    case 'actionSuggestions':
      return {
        schema: ACTION_SUGGESTIONS_JSON_SCHEMA,
        schemaName: 'action_suggestions',
      };
    case 'intentToMove':
      return {
        schema: INTENT_TO_MOVE_JSON_SCHEMA,
        schemaName: 'intent_to_move',
      };
    case 'spotlightNudge':
      return {
        schema: SPOTLIGHT_NUDGE_JSON_SCHEMA,
        schemaName: 'spotlight_nudge',
      };
    default:
      return null;
  }
}

@Injectable()
export class AiService {
  private openai: OpenAiProvider;
  private anthropic: AnthropicProvider;

  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly config: ConfigService,
  ) {
    this.openai = new OpenAiProvider(
      config.get<string>('OPENAI_API_KEY') ?? '',
    );
    this.anthropic = new AnthropicProvider(
      config.get<string>('ANTHROPIC_API_KEY') ?? '',
    );
  }

  private getProvider(name: AiProviderName): AiProvider {
    return name === 'anthropic' ? this.anthropic : this.openai;
  }

  private get guideProvider(): AiProvider {
    const name = (this.config.get<string>('AI_PROVIDER') ??
      'openai') as AiProviderName;
    return this.getProvider(name);
  }

  private get guideProviderName(): AiProviderName {
    return (this.config.get<string>('AI_PROVIDER') ??
      'openai') as AiProviderName;
  }

  private get characterProvider(): AiProvider {
    const name = (this.config.get<string>('AI_PROVIDER_CHARACTER') ??
      'openai') as AiProviderName;
    return this.getProvider(name);
  }

  private get characterProviderName(): AiProviderName {
    return (this.config.get<string>('AI_PROVIDER_CHARACTER') ??
      'openai') as AiProviderName;
  }

  private resolveModel(provider: AiProviderName, mode: string): string {
    if (provider === 'anthropic') {
      return HEAVY_MODES.has(mode)
        ? (this.config.get<string>('ANTHROPIC_HEAVY_MODEL') ??
            DEFAULT_ANTHROPIC_HEAVY_MODEL)
        : (this.config.get<string>('ANTHROPIC_DEFAULT_MODEL') ??
            DEFAULT_ANTHROPIC_MODEL);
    }
    return HEAVY_MODES.has(mode)
      ? (this.config.get<string>('OPENAI_HEAVY_MODEL') ??
          DEFAULT_OPENAI_HEAVY_MODEL)
      : (this.config.get<string>('OPENAI_DEFAULT_MODEL') ??
          DEFAULT_OPENAI_MODEL);
  }

  private async getWorldAiSettings(worldId: string) {
    const [row] = await this.db
      .select()
      .from(schema.worldAiSettings)
      .where(eq(schema.worldAiSettings.worldId, worldId));
    return row;
  }

  async callGuide(userId: string, body: any) {
    const { mode, context, campaignId, worldId } = body;

    const worldSettings = worldId
      ? await this.getWorldAiSettings(worldId)
      : null;
    const providerName = this.guideProviderName;
    const modeConfig = (worldSettings?.configJson as any)?.modeConfigs?.[mode];
    const model = this.resolveModel(providerName, mode);

    const {
      systemPromptStatic,
      systemPromptDynamic,
      userPrompt,
      useStructuredOutput,
    } = buildPrompt(mode, context, {
      worldTonePrompt: (worldSettings?.configJson as any)?.worldTonePrompt,
      assumptions: (worldSettings?.configJson as any)?.assumptions,
      modeCustomInstructions: modeConfig?.customInstructions,
    });

    const provider = this.guideProvider;
    let responseData: any;

    let _debug: object | undefined;
    if (useStructuredOutput) {
      const schemaInfo = resolveStructuredOutputSchema(mode) ?? {
        schema: BOOKKEEPER_JSON_SCHEMA,
        schemaName: 'bookkeeper_output',
      };
      const result = await provider.generateStructured({
        model,
        systemPromptStatic,
        systemPromptDynamic,
        userPrompt,
        schema: schemaInfo.schema,
        schemaName: schemaInfo.schemaName,
      });
      _debug = result._debug;
      const parsed = JSON.parse(result.text);
      if (mode === 'bookkeeper' || mode === 'bookkeepingProposal') {
        responseData = { mode, bookkeeper: parsed };
      } else {
        responseData = { mode, structured: parsed };
      }
    } else {
      const result = await provider.generateText({
        model,
        systemPromptStatic,
        systemPromptDynamic,
        userPrompt,
      });
      _debug = result._debug;
      responseData = { mode, text: result.text };
    }

    const contextSnapshot = {
      gameSystem: context.gameSystem,
      campaignName: context.campaignName,
      campaignType: context.campaignType,
      activeVows: context.activeVows,
      characters: context.characters.map((c: any) => ({
        name: c.name,
        stats: c.stats,
        conditionMeters: c.conditionMeters,
        momentum: c.momentum,
      })),
      currentLocation: context.currentLocation,
      currentNPCs: context.currentNPCs,
    };

    const [event] = await this.db
      .insert(schema.campaignAiEvents)
      .values({
        campaignId,
        type: mode,
        contextSnapshotJson: JSON.parse(JSON.stringify(contextSnapshot)),
        responseJson: responseData,
        createdBy: userId,
      })
      .returning();

    return { ...responseData, eventId: event.id, _debug };
  }

  async updateEventStatus(id: string, body: any) {
    const [row] = await this.db
      .update(schema.campaignAiEvents)
      .set({ status: body.status, canonized: body.canonized ?? false })
      .where(eq(schema.campaignAiEvents.id, id))
      .returning();
    return row;
  }

  async getEvents(campaignId: string) {
    return this.db
      .select()
      .from(schema.campaignAiEvents)
      .where(eq(schema.campaignAiEvents.campaignId, campaignId));
  }

  async recommendPaths(body: any) {
    const PATH_RECOMMENDATION_SCHEMA = {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              backgroundName: { type: 'string' },
              asset1: { type: 'string' },
              asset2: { type: 'string' },
              reasoning: { type: 'string' },
            },
            required: ['backgroundName', 'asset1', 'asset2', 'reasoning'],
            additionalProperties: false,
          },
        },
      },
      required: ['recommendations'],
      additionalProperties: false,
    };

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
96–100: Tomb Raider — SCAVENGER, SCOUNDREL`.trim();

    const systemPrompt = [
      'You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.',
      'Given a character concept description, recommend exactly 3 backgrounds from the provided table that best fit.',
      'Use ONLY background names and asset names from the table — do not invent new ones.',
      'Return asset names exactly as they appear in the table (e.g. "ACE", "LORE HUNTER").',
      'Keep reasoning brief (1-2 sentences) and focused on why the background fits the concept.',
    ].join('\n');

    const userParts = [
      `Available backgrounds:\n${BACKGROUNDS_REFERENCE}`,
      '',
      `Character concept: "${body.description}"`,
      '',
      'Recommend 3 backgrounds that best fit this concept.',
    ];
    appendWorldContextLines(userParts, body.worldContext);
    const userPrompt = userParts.join('\n');

    const result = await this.characterProvider.generateStructured({
      model: this.resolveModel(this.characterProviderName, 'default'),
      systemPromptStatic: systemPrompt,
      systemPromptDynamic: '',
      userPrompt,
      schema: PATH_RECOMMENDATION_SCHEMA,
      schemaName: 'path_recommendation_output',
    });

    return { ...JSON.parse(result.text), _debug: result._debug };
  }

  private buildBackstoryPrompts(body: any) {
    const { prompt, paths, worldContext } = body;
    const systemPrompt = [
      'You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.',
      'Write a concise character backstory (2–3 short paragraphs) based on the given prompt.',
      "The backstory should reflect the character's paths and leave room for their vow to emerge naturally.",
      'Match the tone: hopeful space opera, personal struggle against a vast and dangerous cosmos.',
      'Keep it simple and evocative — leave room for the story to unfold in play.',
      'Do not mention game mechanics or asset names.',
      'Write in second person ("you").',
      'If world truths or assumptions are provided, honor them: the backstory must be consistent with those truths and set in that specific version of the Forge.',
    ].join('\n');
    const userParts = [
      paths?.length ? `Chosen paths: ${paths.join(', ')}.` : '',
      prompt,
    ].filter(Boolean);
    appendWorldContextLines(userParts, worldContext);
    return { systemPrompt, userPrompt: userParts.join('\n') };
  }

  async generateBackstory(body: any) {
    const { systemPrompt, userPrompt } = this.buildBackstoryPrompts(body);
    const result = await this.characterProvider.generateText({
      model: this.resolveModel(this.characterProviderName, 'default'),
      systemPromptStatic: systemPrompt,
      systemPromptDynamic: '',
      userPrompt,
    });
    return { backstory: result.text, _debug: result._debug };
  }

  async *generateBackstoryStream(
    body: any,
  ): AsyncGenerator<{ text: string } | { _debug: object }> {
    const { systemPrompt, userPrompt } = this.buildBackstoryPrompts(body);
    const model = this.resolveModel(this.characterProviderName, 'default');
    yield {
      _debug: {
        provider: this.characterProviderName,
        model,
        systemPromptStatic: systemPrompt,
        systemPromptDynamic: '',
        userPrompt,
      },
    };
    for await (const chunk of this.characterProvider.generateTextStream({
      model,
      systemPromptStatic: systemPrompt,
      systemPromptDynamic: '',
      userPrompt,
    })) {
      yield { text: chunk };
    }
  }

  private buildVowPrompts(body: any) {
    const { paths, backstory, prompt, worldContext } = body;
    const systemPrompt = [
      'You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.',
      'Write a single background vow in first person for the character.',
      'The vow must start with "I will" or "I vow to".',
      'It represents an epic, lifelong commitment — a primary motivation or sacred goal sworn months or years ago.',
      'Keep it to one sentence, evocative and personal but simple enough to leave room for the story to develop.',
      'Do not mention game mechanics, asset names, or difficulty ratings.',
      'Match the tone: personal struggle against a vast, dangerous cosmos.',
      "The vow should feel like a natural continuation of the backstory and reflect the character's paths.",
    ].join('\n');
    const userParts = [
      paths?.length ? `Character paths: ${paths.join(', ')}.` : '',
      backstory ? `Character backstory: ${backstory}` : '',
      prompt ? `Additional context: ${prompt}` : '',
    ].filter(Boolean);
    appendWorldContextLines(userParts, worldContext);
    return {
      systemPrompt,
      userPrompt: userParts.join('\n') || 'Generate a fitting background vow.',
    };
  }

  async generateVow(body: any) {
    const { systemPrompt, userPrompt } = this.buildVowPrompts(body);
    const result = await this.characterProvider.generateText({
      model: this.resolveModel(this.characterProviderName, 'default'),
      systemPromptStatic: systemPrompt,
      systemPromptDynamic: '',
      userPrompt,
    });
    return { vow: result.text.trim(), _debug: result._debug };
  }

  async *generateVowStream(
    body: any,
  ): AsyncGenerator<{ text: string } | { _debug: object }> {
    const { systemPrompt, userPrompt } = this.buildVowPrompts(body);
    const model = this.resolveModel(this.characterProviderName, 'default');
    yield {
      _debug: {
        provider: this.characterProviderName,
        model,
        systemPromptStatic: systemPrompt,
        systemPromptDynamic: '',
        userPrompt,
      },
    };
    for await (const chunk of this.characterProvider.generateTextStream({
      model,
      systemPromptStatic: systemPrompt,
      systemPromptDynamic: '',
      userPrompt,
    })) {
      yield { text: chunk };
    }
  }

  async recommendFinalAsset(body: any) {
    const { paths, backstory, backgroundVow, availableAssets, worldContext } =
      body;
    const SCHEMA = {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              assetName: { type: 'string' },
              reasoning: { type: 'string' },
            },
            required: ['assetName', 'reasoning'],
            additionalProperties: false,
          },
        },
      },
      required: ['recommendations'],
      additionalProperties: false,
    };
    const systemPrompt = [
      'You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.',
      'The player has already chosen 2 path assets. Now recommend exactly 3 additional assets from the provided list.',
      'You MUST only choose asset names from the "Available assets" list provided in the user message. Do not invent or guess asset names.',
      'For each recommendation, provide the exact asset name (copied verbatim from the list) and a single sentence explaining why it fits.',
      "Base your reasoning on the character's paths, backstory, and background vow.",
      'Keep reasoning concise and personal.',
    ].join('\n');
    const userParts = [
      paths?.length ? `Chosen paths: ${paths.join(', ')}.` : '',
      backstory ? `Backstory: ${backstory}` : '',
      backgroundVow ? `Background vow: ${backgroundVow}` : '',
      availableAssets?.length
        ? `Available assets: ${availableAssets.join(', ')}`
        : '',
    ].filter(Boolean);
    appendWorldContextLines(userParts, worldContext);
    const result = await this.characterProvider.generateStructured({
      model: this.resolveModel(this.characterProviderName, 'default'),
      systemPromptStatic: systemPrompt,
      systemPromptDynamic: '',
      userPrompt: userParts.join('\n'),
      schema: SCHEMA,
      schemaName: 'asset_recommendation_output',
    });
    return { ...JSON.parse(result.text), _debug: result._debug };
  }

  async recommendStatAllocation(body: any) {
    const { paths, backstory, backgroundVow, stats, finalAsset, worldContext } =
      body;
    const SCHEMA = {
      type: 'object',
      properties: {
        allocations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              statKey: { type: 'string' },
              value: { type: 'number' },
            },
            required: ['statKey', 'value'],
            additionalProperties: false,
          },
        },
        reasoning: { type: 'string' },
      },
      required: ['allocations', 'reasoning'],
      additionalProperties: false,
    };
    const statList = stats
      .map((s: any) => `- ${s.key} (${s.label}): ${s.description}`)
      .join('\n');
    const systemPrompt = [
      'You are a character creation assistant for Ironsworn: Starforged, a sci-fi narrative RPG.',
      'Allocate the values [3, 2, 2, 1, 1] across exactly the stat keys provided. Each value must be used exactly once.',
      "Choose allocations that best fit the character's paths, backstory, and background vow.",
      'Return the exact stat keys provided — do not rename or omit any.',
      'Give a brief (2-3 sentence) reasoning explaining your choices.',
      '',
      'Available stats:',
      statList,
    ].join('\n');
    const userParts = [
      paths?.length ? `Chosen paths: ${paths.join(', ')}.` : '',
      backstory ? `Backstory: ${backstory}` : '',
      backgroundVow ? `Background vow: ${backgroundVow}` : '',
      finalAsset ? `Final asset: ${finalAsset}.` : '',
    ].filter(Boolean);
    appendWorldContextLines(userParts, worldContext);
    const result = await this.characterProvider.generateStructured({
      model: this.resolveModel(this.characterProviderName, 'default'),
      systemPromptStatic: systemPrompt,
      systemPromptDynamic: '',
      userPrompt: userParts.join('\n'),
      schema: SCHEMA,
      schemaName: 'stat_allocation_output',
    });
    return { ...JSON.parse(result.text), _debug: result._debug };
  }

  async randomizeAppearance(body: any) {
    const { paths, backstory, backgroundVow, worldContext } = body;
    const SCHEMA = {
      type: 'object',
      properties: {
        look: { type: 'string' },
        act: { type: 'string' },
        wear: { type: 'string' },
      },
      required: ['look', 'act', 'wear'],
      additionalProperties: false,
    };
    const systemPrompt = [
      'You are a Starforged character creation assistant for a sci-fi narrative RPG.',
      "Generate one or two vivid short phrases (10 words or less each) for a character's:",
      '- look: distinctive physical features or appearance',
      '- act: personality traits or behavioral tendencies',
      '- wear: clothing, gear, or equipment they typically carry',
      'Be creative and genre-appropriate for a gritty sci-fi setting. Avoid clichés.',
    ].join('\n');
    const userParts = [
      paths?.length ? `Chosen paths: ${paths.join(', ')}.` : '',
      backstory ? `Backstory: ${backstory}` : '',
      backgroundVow ? `Background vow: ${backgroundVow}` : '',
    ].filter(Boolean);
    appendWorldContextLines(userParts, worldContext);
    const result = await this.characterProvider.generateStructured({
      model: this.resolveModel(this.characterProviderName, 'default'),
      systemPromptStatic: systemPrompt,
      systemPromptDynamic: '',
      userPrompt:
        userParts.join('\n') ||
        'Generate appearance for a new Starforged character.',
      schema: SCHEMA,
      schemaName: 'appearance_output',
    });
    return { ...JSON.parse(result.text), _debug: result._debug };
  }

  async generateStarshipImages(body: any) {
    const { description } = body;
    const prompt = [
      'Ironsworn Starforged sci-fi RPG starship illustration.',
      'Full exterior view of the starship, dramatically lit against a star field or nebula.',
      description ? `Ship description: ${description}.` : '',
      'Digital art, cinematic composition, no text, no watermarks, no crew visible.',
    ]
      .filter(Boolean)
      .join(' ');
    const images = await this.openai.generateImage(prompt);
    return { images };
  }

  async generatePortraits(body: any) {
    const { look, act, wear, pronouns, paths, portraitStyleAnchor } = body;
    const pathsLine = paths?.length
      ? ` Character roles: ${paths.join(', ')}.`
      : '';
    const pronounsLine = pronouns ? ` Pronouns: ${pronouns}.` : '';
    const styleAnchorLine = portraitStyleAnchor
      ? ` Art style: ${portraitStyleAnchor}.`
      : '';
    const prompt = [
      'Ironsworn Starforged sci-fi RPG character portrait.',
      'Close-up portrait, face clearly visible and centered, head and shoulders only.',
      `Appearance: ${look}.`,
      `Personality: ${act}.`,
      `Wearing: ${wear}.`,
      pathsLine,
      pronounsLine,
      styleAnchorLine,
      'Digital art, dramatic lighting, square composition, no text, no watermarks.',
    ]
      .filter(Boolean)
      .join(' ');
    const images = await this.openai.generateImage(prompt);
    return {
      images,
      _debug: { provider: 'openai', model: 'gpt-image-1', prompt },
    };
  }

  private buildCharacterSummaryPrompts(body: any) {
    const {
      name,
      paths,
      backstory,
      backgroundVow,
      look,
      act,
      wear,
      pronouns,
      worldContext,
    } = body;
    const systemPrompt = [
      'You are a narrative writer for Ironsworn: Starforged, a gritty sci-fi tabletop RPG.',
      'Write a vivid 1-2 paragraph character introduction in the third person.',
      "Weave together the character's name, paths, backstory, background vow, appearance, personality, and gear into a cohesive narrative.",
      'Be evocative and atmospheric, matching the tone of a dark science-fiction setting.',
      'Do not use headers, bullet points, or lists. Write flowing prose only.',
      `The character uses ${pronouns} pronouns.`,
    ].join('\n');
    const userParts = [
      `Character name: ${name}`,
      paths?.length ? `Paths: ${paths.join(', ')}.` : '',
      backstory ? `Backstory: ${backstory}` : '',
      backgroundVow ? `Background vow: ${backgroundVow}` : '',
      look ? `Look: ${look}` : '',
      act ? `Act: ${act}` : '',
      wear ? `Wear: ${wear}` : '',
    ].filter(Boolean);
    appendWorldContextLines(userParts, worldContext);
    return { systemPrompt, userPrompt: userParts.join('\n') };
  }

  async generateCharacterSummary(body: any) {
    const { systemPrompt, userPrompt } =
      this.buildCharacterSummaryPrompts(body);
    const result = await this.characterProvider.generateText({
      model: this.resolveModel(this.characterProviderName, 'default'),
      systemPromptStatic: systemPrompt,
      systemPromptDynamic: '',
      userPrompt,
    });
    return { summary: result.text, _debug: result._debug };
  }

  async *generateCharacterSummaryStream(
    body: any,
  ): AsyncGenerator<{ text: string } | { _debug: object }> {
    const { systemPrompt, userPrompt } =
      this.buildCharacterSummaryPrompts(body);
    const model = this.resolveModel(this.characterProviderName, 'default');
    yield {
      _debug: {
        provider: this.characterProviderName,
        model,
        systemPromptStatic: systemPrompt,
        systemPromptDynamic: '',
        userPrompt,
      },
    };
    for await (const chunk of this.characterProvider.generateTextStream({
      model,
      systemPromptStatic: systemPrompt,
      systemPromptDynamic: '',
      userPrompt,
    })) {
      yield { text: chunk };
    }
  }

  async generateWorldDescription(body: any) {
    const { worldName, truths, assumptions, worldTonePrompt } = body;
    const systemLines = [
      'You are a world-building writer for Ironsworn: Starforged, a gritty sci-fi tabletop RPG set in a distant galaxy called the Forge.',
      'Write 2-3 evocative paragraphs describing this specific world based on its chosen truths.',
      'The description should give players a visceral sense of what makes this version of the Forge unique.',
      'Focus on atmosphere, dangers, culture, and the tensions created by the chosen truths.',
      'Do not use headers, bullet points, or lists. Write flowing prose only.',
      'Do not repeat the truth names verbatim — weave their meaning into the narrative.',
    ];
    if (assumptions) systemLines.push('', 'Setting assumptions:', assumptions);
    if (worldTonePrompt)
      systemLines.push('', `Additional tone: ${worldTonePrompt}`);
    const truthsText = truths
      .map((t: any) => `${t.name}: ${t.description}`)
      .join('\n');
    const userPrompt = [
      `World name: ${worldName}`,
      '',
      'Chosen truths for this world:',
      truthsText,
    ].join('\n');
    const result = await this.guideProvider.generateText({
      model: this.resolveModel(this.guideProviderName, 'default'),
      systemPromptStatic: systemLines.join('\n'),
      systemPromptDynamic: '',
      userPrompt,
    });
    return { description: result.text, _debug: result._debug };
  }

  async generateSectorContent(body: SectorGenerationBody) {
    const {
      sectorName,
      region,
      trouble,
      passageCount,
      focusSettlementIndex,
      settlements,
      npc,
      stars,
      worldContext,
    } = body;

    const OUTPUT_SCHEMA = {
      type: 'object',
      properties: {
        settlementOutputs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              publicDescription: { type: 'string' },
              gmNotes: { type: 'string' },
              planetDescription: {
                anyOf: [{ type: 'string' }, { type: 'null' }],
              },
            },
            required: ['publicDescription', 'gmNotes', 'planetDescription'],
            additionalProperties: false,
          },
        },
        npcPublicDescription: { type: 'string' },
        npcFirstLook: { type: 'string' },
        npcGoal: { type: 'string' },
        npcRevealedAspect: { type: 'string' },
        sectorPublicSummary: { type: 'string' },
        sectorGMNotes: { type: 'string' },
        launchPacket: {
          type: 'object',
          properties: {
            openingScene: { type: 'string' },
            visibleTrouble: { type: 'string' },
            rumors: {
              type: 'array',
              items: { type: 'string' },
              minItems: 3,
              maxItems: 3,
            },
            questStarters: {
              type: 'array',
              items: { type: 'string' },
              minItems: 3,
              maxItems: 3,
            },
            firstSessionQuestions: {
              type: 'array',
              items: { type: 'string' },
              minItems: 3,
              maxItems: 3,
            },
          },
          required: [
            'openingScene',
            'visibleTrouble',
            'rumors',
            'questStarters',
            'firstSessionQuestions',
          ],
          additionalProperties: false,
        },
      },
      required: [
        'settlementOutputs',
        'npcPublicDescription',
        'npcFirstLook',
        'npcGoal',
        'npcRevealedAspect',
        'sectorPublicSummary',
        'sectorGMNotes',
        'launchPacket',
      ],
      additionalProperties: false,
    };

    const systemLines = [
      'You are a creative writer for Ironsworn: Starforged, a gritty sci-fi tabletop RPG set in a dark, perilous galaxy called the Forge.',
      'Generate story-ready content for a starting sector created with the Starforged campaign launch procedure on rulebook pages 114-127.',
      'Respect that procedure: most settlements get only launch-sheet detail, while one focus settlement and its planet get deeper first-session detail.',
      '',
      'SETTLEMENT OUTPUTS (one per settlement):',
      '  publicDescription — For non-focus settlements, write 1-2 player-facing sentences in present tense using only the listed launch-sheet attributes. For the focus settlement, write 3-4 player-facing sentences that include first look and visible signs of trouble.',
      '  gmNotes — For non-focus settlements, write one restrained GM-only sentence that preserves room for play. For the focus settlement, write 2-3 GM-only sentences with a concrete cause of the settlement trouble and one specific secret or opportunity.',
      '  planetDescription — Set to null for non-focus planets. For the focus planet only, write 2-3 sentences using its atmosphere, observed-from-space, feature, life, and any Vital World biome results. Set to null if the focus settlement has no planet.',
      '',
      'NPC CONNECTION:',
      '  This NPC is an automatic strong-hit connection from the campaign launch procedure. Treat them as based in their home settlement and able to offer aid, information, and introductions.',
      '  npcPublicDescription — 2–3 sentences of player-facing impression: physical presence, how they carry themselves, one detail that sticks in the memory.',
      '  npcFirstLook — A single sharp sentence: the one thing players notice the moment they see this person.',
      '  npcGoal — One sentence: what this person is actively trying to make happen right now.',
      '  npcRevealedAspect — One sentence: what players discover about this person as trust deepens — something that reframes who they are.',
      '',
      'SECTOR GM NOTES:',
      '  sectorPublicSummary — 1-2 player-facing sentences that can introduce the sector without revealing GM-only truths.',
      '  sectorGMNotes — 4-6 GM-only sentences. Explain how the sector trouble manifests, name who or what is concretely behind it, identify a likely controlling power or faction if one fits, state what happens if players do nothing, and give two specific escalation paths.',
      '  launchPacket — Make this immediately usable at the table: an opening scene at or near the focus settlement, the visible trouble in that scene, exactly three rumors, exactly three quest starters suitable for vows, and exactly three first-session questions the GM can ask or answer through play.',
      '',
      'Write in present tense. No headers, bullet points, or markdown in output strings. Prose only.',
    ];

    if (worldContext?.assumptions)
      systemLines.push('', 'Setting assumptions:', worldContext.assumptions);
    if (worldContext?.truths?.length) {
      const truthsText = worldContext.truths
        .map((t) => `${t.name}: ${t.description}`)
        .join('\n');
      systemLines.push(
        '',
        'World truths (let these shape the tone and details):',
        truthsText,
      );
    }

    const settlementLines = settlements.map((s, i) => {
      const lines = [
        `Settlement ${i + 1}: ${s.name}`,
        `  Location type: ${s.locationType}`,
        `  Population: ${s.population}`,
        `  Authority: ${s.authority}`,
        `  Active projects: ${s.projects}`,
        `  Focus settlement: ${s.isFocus ? 'yes' : 'no'}`,
        s.firstLook ? `  First look: ${s.firstLook}` : undefined,
        s.trouble ? `  Settlement trouble: ${s.trouble}` : undefined,
        `  Has planet: ${s.planet ? 'yes' : 'no'}`,
      ].filter(Boolean);
      if (s.planet) {
        lines.push(
          [
            `  Planet: ${s.planet.name} (${s.planet.className})`,
            s.planet.atmosphere
              ? `Atmosphere: ${s.planet.atmosphere}`
              : undefined,
            s.planet.observedFromSpace
              ? `Observed from space: ${s.planet.observedFromSpace}`
              : undefined,
            s.planet.feature ? `Feature: ${s.planet.feature}` : undefined,
            s.planet.life ? `Life: ${s.planet.life}` : undefined,
            s.planet.diversity ? `Diversity: ${s.planet.diversity}` : undefined,
            s.planet.biomes ? `Biomes: ${s.planet.biomes}` : undefined,
          ]
            .filter(Boolean)
            .join(', '),
        );
      }
      return lines.join('\n');
    });

    const starLines = stars?.length
      ? stars.map((s) => `${s.settlementName}: ${s.stellarObject}`)
      : ['No stellar objects provided.'];

    const userPrompt = [
      `Sector: ${sectorName} (${region} region)`,
      `Sector trouble: ${trouble}`,
      `Passages: ${passageCount ?? 'unknown'} known route(s) on the sector map`,
      `Focus settlement: Settlement ${(focusSettlementIndex ?? 0) + 1}`,
      '',
      'Settlements:',
      ...settlementLines,
      '',
      'Nearby stellar objects:',
      ...starLines,
      '',
      `NPC Connection: ${npc.name}, Role: ${npc.role}, Rank: ${npc.rank ?? 'troublesome or dangerous'}, Home settlement: ${npc.homeSettlementName ?? 'focus settlement'}`,
      '',
      `Generate exactly ${settlements.length} settlementOutput object(s) (in the same order as the settlements above), plus all NPC and sector fields.`,
    ].join('\n');

    const raw = await this.guideProvider.generateStructured({
      model: this.resolveModel(this.guideProviderName, 'sectorGeneration'),
      systemPromptStatic: systemLines.join('\n'),
      systemPromptDynamic: '',
      userPrompt,
      schema: OUTPUT_SCHEMA,
      schemaName: 'SectorGenerationOutput',
    });
    return { ...JSON.parse(raw.text), _debug: raw._debug };
  }

  // ─── AI Guide Narrative ────────────────────────────────────────────────────

  async *generateNarrativeStream(
    body: any,
  ): AsyncGenerator<{ text: string } | { _debug: object }> {
    const { moveEvent, gameContext, prompt, debugOverride } = body;
    const systemLines = [
      'You are a narrative guide for Ironsworn: Starforged, a sci-fi tabletop RPG.',
      'Write 2-4 sentences of vivid, immersive narrative describing what just happened in the story.',
      'Use second-person present tense ("You ..."). Match the tone: gritty, desperate, hopeful.',
      `Character: ${gameContext?.characterName ?? 'the character'}.`,
      gameContext?.characteristics
        ? `Character description: ${gameContext.characteristics}`
        : '',
      gameContext?.characterPronouns
        ? `Pronouns: ${gameContext.characterPronouns}`
        : '',
      gameContext?.callsign ? `Callsign: ${gameContext.callsign}` : '',
      gameContext?.activeCombat
        ? `Active combat — objective: ${gameContext.activeCombat.objective}, enemies: ${gameContext.activeCombat.enemies?.join(', ')}, position: ${gameContext.activeCombat.position}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    const userParts: string[] = [];
    if (gameContext?.recentEvents?.length) {
      userParts.push(
        `Recent events:\n${gameContext.recentEvents.slice(-5).join('\n')}`,
      );
    }
    if (moveEvent) {
      userParts.push(
        `Move: ${moveEvent.moveName} — outcome: ${moveEvent.outcome ?? 'unknown'}.${moveEvent.playerContext ? ` Context: ${moveEvent.playerContext}` : ''}`,
      );
    }
    if (prompt) userParts.push(`Additional context: ${prompt}`);
    const userPrompt = userParts.join('\n\n') || 'Describe what happens next.';
    const model =
      debugOverride?.model ??
      this.resolveModel(this.guideProviderName, 'default');
    yield {
      _debug: {
        provider: this.guideProviderName,
        model,
        systemPromptStatic: systemLines,
        userPrompt,
      },
    };
    for await (const chunk of this.guideProvider.generateTextStream({
      model,
      systemPromptStatic: systemLines,
      systemPromptDynamic: '',
      userPrompt,
    })) {
      yield { text: chunk };
    }
  }
}
