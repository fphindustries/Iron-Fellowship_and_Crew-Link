import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { DB } from '../db/database.module';
import { createMockDb, createQueryResult } from '../db/test-helpers';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

// Prevent real HTTP calls
jest.mock('./providers/openai.provider');
jest.mock('./providers/anthropic.provider');

const MockOpenAiProvider = OpenAiProvider as jest.MockedClass<
  typeof OpenAiProvider
>;
const MockAnthropicProvider = AnthropicProvider as jest.MockedClass<
  typeof AnthropicProvider
>;

describe('AiService', () => {
  let service: AiService;
  let mockReturning: ReturnType<typeof createMockDb>['mockReturning'];
  let mockGenerateText: jest.Mock;
  let mockGenerateStructured: jest.Mock;

  const buildConfig = (provider = 'openai') => ({
    get: jest.fn((key: string) => {
      if (key === 'AI_PROVIDER') return provider;
      if (key === 'AI_PROVIDER_CHARACTER') return provider;
      if (key === 'OPENAI_API_KEY') return 'test-key';
      if (key === 'ANTHROPIC_API_KEY') return 'test-key';
      return undefined;
    }),
    getOrThrow: jest.fn().mockReturnValue(''),
  });

  const mockContext = {
    gameSystem: 'starforged',
    campaignName: 'Test Campaign',
    campaignType: 'ai-guided',
    activeVows: [],
    activeJourneys: [],
    characters: [],
    recentRolls: [],
    currentLocation: undefined,
    currentNPCs: [],
    worldTruths: {},
  };

  beforeEach(async () => {
    const mocks = createMockDb();
    mockReturning = mocks.mockReturning;

    mockGenerateText = jest.fn().mockResolvedValue({ text: 'AI response' });
    mockGenerateStructured = jest.fn().mockResolvedValue({
      text: JSON.stringify({ updates: [] }),
    });

    MockOpenAiProvider.prototype.generateText = mockGenerateText;
    MockOpenAiProvider.prototype.generateStructured = mockGenerateStructured;
    MockAnthropicProvider.prototype.generateText = mockGenerateText;
    MockAnthropicProvider.prototype.generateStructured = mockGenerateStructured;

    const module = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: DB, useValue: mocks.db },
        { provide: ConfigService, useValue: buildConfig() },
      ],
    }).compile();

    service = module.get(AiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('callGuide (text mode)', () => {
    it('calls the provider and stores an AI event', async () => {
      const event = { id: 'evt-1', campaignId: 'c1', type: 'askOrAnswer' };
      mockReturning.mockResolvedValueOnce([event]);

      const result = await service.callGuide('user-1', {
        mode: 'askOrAnswer',
        context: mockContext,
        campaignId: 'c1',
      });

      expect(mockGenerateText).toHaveBeenCalled();
      expect(result.eventId).toBe('evt-1');
      expect(result.text).toBe('AI response');
    });

    it('uses structured output for bookkeeper mode', async () => {
      const parsedBookkeeper = { updates: [{ type: 'track', id: 't1' }] };
      mockGenerateStructured.mockResolvedValueOnce({
        text: JSON.stringify(parsedBookkeeper),
      });
      const event = { id: 'evt-2', campaignId: 'c1', type: 'bookkeeper' };
      mockReturning.mockResolvedValueOnce([event]);

      const result = await service.callGuide('user-1', {
        mode: 'bookkeeper',
        context: mockContext,
        campaignId: 'c1',
      });

      expect(mockGenerateStructured).toHaveBeenCalled();
      expect(mockGenerateText).not.toHaveBeenCalled();
      expect(result.bookkeeper).toEqual(parsedBookkeeper);
    });
  });

  describe('provider selection', () => {
    it('uses OpenAI provider by default', async () => {
      expect(MockOpenAiProvider).toHaveBeenCalled();
    });

    it('uses Anthropic provider when AI_PROVIDER=anthropic', async () => {
      const mocks = createMockDb();
      const module = await Test.createTestingModule({
        providers: [
          AiService,
          { provide: DB, useValue: mocks.db },
          { provide: ConfigService, useValue: buildConfig('anthropic') },
        ],
      }).compile();

      const anthropicService = module.get(AiService);
      expect(anthropicService).toBeDefined();
      expect(MockAnthropicProvider).toHaveBeenCalled();
    });
  });

  describe('model resolution', () => {
    it('uses heavy model for sessionRecap mode', async () => {
      const event = { id: 'evt-3', campaignId: 'c1', type: 'sessionRecap' };
      mockReturning.mockResolvedValueOnce([event]);

      await service.callGuide('user-1', {
        mode: 'sessionRecap',
        context: mockContext,
        campaignId: 'c1',
      });

      const call = mockGenerateText.mock.calls[0];
      // Heavy model for OpenAI defaults to gpt-4o
      expect(call[0].model).toBe('gpt-4o');
    });

    it('uses default model for askOrAnswer mode', async () => {
      const event = { id: 'evt-4', campaignId: 'c1', type: 'askOrAnswer' };
      mockReturning.mockResolvedValueOnce([event]);

      await service.callGuide('user-1', {
        mode: 'askOrAnswer',
        context: mockContext,
        campaignId: 'c1',
      });

      const call = mockGenerateText.mock.calls[0];
      // Default model for OpenAI is gpt-4o-mini
      expect(call[0].model).toBe('gpt-4o-mini');
    });
  });
});
