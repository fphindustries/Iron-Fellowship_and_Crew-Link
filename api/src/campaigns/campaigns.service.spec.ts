import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { SessionsService } from '../sessions/sessions.service';
import { DB } from '../db/database.module';
import { createMockDb, createQueryResult } from '../db/test-helpers';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let mockWhere: ReturnType<typeof createMockDb>['mockWhere'];
  let mockReturning: ReturnType<typeof createMockDb>['mockReturning'];

  const mockSessions = { findAllForCampaign: jest.fn().mockResolvedValue([]) };

  beforeEach(async () => {
    const mocks = createMockDb();
    mockWhere = mocks.mockWhere;
    mockReturning = mocks.mockReturning;

    const module = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: DB, useValue: mocks.db },
        { provide: SessionsService, useValue: mockSessions },
      ],
    }).compile();

    service = module.get(CampaignsService);
  });

  describe('findAllForUser', () => {
    it('returns empty array when user has no memberships', async () => {
      // memberships query returns []
      mockWhere.mockReturnValueOnce(createQueryResult([]));
      const result = await service.findAllForUser('user-1');
      expect(result).toEqual([]);
    });

    it('returns hydrated campaigns when user has memberships', async () => {
      const campaign = {
        id: 'c1',
        name: 'Test Campaign',
        worldId: null,
        expansionIds: null,
        customTracksJson: null,
        conditionMetersJson: null,
        specialTracksJson: null,
        type: 'solo',
        theme: null,
      };

      mockWhere
        .mockReturnValueOnce(createQueryResult([{ campaignId: 'c1' }])) // memberships
        .mockReturnValueOnce(createQueryResult([campaign])) // campaigns inArray
        .mockReturnValueOnce(createQueryResult([{ userId: 'user-1' }])) // members
        .mockReturnValueOnce(createQueryResult([])) // gms
        .mockReturnValueOnce(createQueryResult([])); // chars

      const result = await service.findAllForUser('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('c1');
      expect(result[0].users).toEqual(['user-1']);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when campaign does not exist', async () => {
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([]),
        limit: jest.fn().mockResolvedValue([]),
      });
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns hydrated campaign when found', async () => {
      const campaign = {
        id: 'c1',
        name: 'My Campaign',
        worldId: 'w1',
        expansionIds: ['exp1'],
        customTracksJson: null,
        conditionMetersJson: null,
        specialTracksJson: null,
        type: 'guided',
        theme: 'dark',
      };
      mockWhere
        .mockReturnValueOnce({
          ...createQueryResult([campaign]),
          limit: jest.fn().mockResolvedValue([campaign]),
        }) // findOne
        .mockReturnValueOnce(createQueryResult([{ userId: 'u1' }])) // members
        .mockReturnValueOnce(createQueryResult([])) // gms
        .mockReturnValueOnce(createQueryResult([])); // chars

      const result = await service.findOne('c1');
      expect(result.id).toBe('c1');
      expect(result.worldId).toBe('w1');
      expect(result.type).toBe('guided');
    });
  });

  describe('create', () => {
    it('inserts campaign and makes creator a member and GM', async () => {
      const newCampaign = { id: 'c-new', name: 'New Campaign', type: 'solo' };
      // Only the campaign insert uses .returning(); member/gm inserts are fire-and-forget
      mockReturning.mockResolvedValueOnce([newCampaign]);

      const result = await service.create('user-1', {
        name: 'New Campaign',
        type: 'solo' as any,
      });

      expect(result).toEqual(newCampaign);
    });
  });

  describe('endCombat', () => {
    it('throws NotFoundException when combat does not exist', async () => {
      // update().set().where().returning() → returning returns []
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([]),
        returning: jest.fn().mockResolvedValue([]),
      });
      await expect(service.endCombat('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns ended combat row', async () => {
      const combat = { id: 'combat-1', active: false, endedAt: new Date() };
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([]),
        returning: jest.fn().mockResolvedValue([combat]),
      });
      const result = await service.endCombat('combat-1');
      expect(result.active).toBe(false);
    });
  });

  describe('getSceneEvents', () => {
    it('returns all events (does not restrict visibility) for a GM', async () => {
      const events = [
        { id: 'e1', visibility: 'gm' },
        { id: 'e2', visibility: 'public' },
      ];
      // isGm check returns a row (user is GM)
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([{ userId: 'gm-1' }]),
        limit: jest.fn().mockResolvedValue([{ userId: 'gm-1' }]),
      });
      // scene events query (orderBy terminal)
      mockWhere.mockReturnValueOnce({
        ...createQueryResult(events),
        orderBy: jest.fn().mockResolvedValue(events),
      });

      const result = await service.getSceneEvents('c1', 'gm-1');
      expect(result).toHaveLength(2);
    });

    it('applies public-only filter for a non-GM', async () => {
      const publicEvents = [{ id: 'e2', visibility: 'public' }];
      // isGm check returns nothing (not a GM)
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([]),
        limit: jest.fn().mockResolvedValue([]),
      });
      // scene events query
      mockWhere.mockReturnValueOnce({
        ...createQueryResult(publicEvents),
        orderBy: jest.fn().mockResolvedValue(publicEvents),
      });

      const result = await service.getSceneEvents('c1', 'player-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('upsertAiGuideState', () => {
    it('upserts and returns the state row', async () => {
      const stateRow = {
        campaignId: 'c1',
        stateJson: { currentScene: null },
        updatedAt: new Date(),
      };
      mockReturning.mockResolvedValueOnce([stateRow]);

      const result = await service.upsertAiGuideState('c1', {
        currentScene: null,
      });
      expect(result.campaignId).toBe('c1');
    });
  });
});
