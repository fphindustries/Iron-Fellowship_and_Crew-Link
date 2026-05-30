import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { SessionsService } from '../sessions/sessions.service';
import { DB } from '../db/database.module';
import { createMockDb, createQueryResult } from '../db/test-helpers';

describe('CharactersService', () => {
  let service: CharactersService;
  let mockWhere: ReturnType<typeof createMockDb>['mockWhere'];
  let mockReturning: ReturnType<typeof createMockDb>['mockReturning'];

  const mockSessions = {
    findAllForCharacter: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const mocks = createMockDb();
    mockWhere = mocks.mockWhere;
    mockReturning = mocks.mockReturning;

    const module = await Test.createTestingModule({
      providers: [
        CharactersService,
        { provide: DB, useValue: mocks.db },
        { provide: SessionsService, useValue: mockSessions },
      ],
    }).compile();

    service = module.get(CharactersService);
  });

  describe('findOne', () => {
    it('throws NotFoundException when character does not exist', async () => {
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([]),
        limit: jest.fn().mockResolvedValue([]),
      });
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the character when found', async () => {
      const char = { id: 'char-1', userId: 'user-1', name: 'Hero' };
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([char]),
        limit: jest.fn().mockResolvedValue([char]),
      });
      const result = await service.findOne('char-1');
      expect(result).toEqual(char);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when character does not exist', async () => {
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([]),
        limit: jest.fn().mockResolvedValue([]),
      });
      await expect(service.update('bad-id', 'user-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when userId does not match', async () => {
      const char = { id: 'char-1', userId: 'owner-1' };
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([char]),
        limit: jest.fn().mockResolvedValue([char]),
      });
      await expect(
        service.update('char-1', 'intruder-2', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns updated character when user is the owner', async () => {
      const char = { id: 'char-1', userId: 'user-1' };
      const updated = { id: 'char-1', userId: 'user-1', name: 'Updated' };
      // findOne query
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([char]),
        limit: jest.fn().mockResolvedValue([char]),
      });
      // update...where().returning()
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([updated]),
        returning: jest.fn().mockResolvedValue([updated]),
      });

      const result = await service.update('char-1', 'user-1', {
        name: 'Updated' as any,
      });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when character does not exist', async () => {
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([]),
        limit: jest.fn().mockResolvedValue([]),
      });
      await expect(service.remove('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when userId does not match', async () => {
      const char = { id: 'char-1', userId: 'owner-1' };
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([char]),
        limit: jest.fn().mockResolvedValue([char]),
      });
      await expect(service.remove('char-1', 'intruder-2')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes the character when user is the owner', async () => {
      const char = { id: 'char-1', userId: 'user-1' };
      // findOne query
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([char]),
        limit: jest.fn().mockResolvedValue([char]),
      });
      // delete().where() — returns empty queryResult
      mockWhere.mockReturnValueOnce(createQueryResult([]));
      await expect(service.remove('char-1', 'user-1')).resolves.toBeUndefined();
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
});
