import { Test } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { MailService } from '../common/mail.service';
import { DB } from '../db/database.module';
import { createMockDb, createQueryResult } from '../db/test-helpers';

describe('AuthService', () => {
  let service: AuthService;
  let mockWhere: ReturnType<typeof createMockDb>['mockWhere'];
  let mockReturning: ReturnType<typeof createMockDb>['mockReturning'];

  const mockJwt = { sign: jest.fn().mockReturnValue('signed-token') };
  const mockConfig = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      if (key === 'APP_URL') return 'http://localhost:3001';
      return '';
    }),
    get: jest.fn((key: string) => {
      if (key === 'MAGIC_LINK_AUTH_ENABLED') return 'true';
      return '';
    }),
  };
  const mockMail = { sendMagicLink: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const mocks = createMockDb();
    mockWhere = mocks.mockWhere;
    mockReturning = mocks.mockReturning;

    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DB, useValue: mocks.db },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('findOrCreateUser', () => {
    it('returns existing user when found', async () => {
      const existingUser = { id: 'u1', email: 'test@example.com' };
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([existingUser]),
        limit: jest.fn().mockResolvedValue([existingUser]),
      });
      const result = await service.findOrCreateUser('test@example.com', 'Test');
      expect(result).toEqual(existingUser);
      expect(mockReturning).not.toHaveBeenCalled();
    });

    it('creates a new user when not found', async () => {
      const newUser = { id: 'u-new', email: 'new@example.com' };
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([]),
        limit: jest.fn().mockResolvedValue([]),
      });
      mockReturning.mockResolvedValueOnce([newUser]);
      const result = await service.findOrCreateUser('new@example.com', 'New');
      expect(result).toEqual(newUser);
    });
  });

  describe('issueTokens', () => {
    it('returns both access and refresh tokens', () => {
      mockJwt.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      const { accessToken, refreshToken } = service.issueTokens(
        'user-1',
        'test@example.com',
      );
      expect(accessToken).toBe('access-token');
      expect(refreshToken).toBe('refresh-token');
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
    });

    it('signs refresh token with the refresh secret', () => {
      service.issueTokens('user-1', 'test@example.com');
      const refreshCall = mockJwt.sign.mock.calls[1];
      expect(refreshCall[1]).toMatchObject({ secret: 'refresh-secret' });
    });
  });

  describe('verifyMagicLink', () => {
    it('throws NotFoundException when magic link auth is disabled', async () => {
      mockConfig.get.mockImplementationOnce((key: string) => {
        if (key === 'MAGIC_LINK_AUTH_ENABLED') return 'false';
        return '';
      });

      await expect(service.verifyMagicLink('token')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws UnauthorizedException for an invalid or expired token', async () => {
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([]),
        limit: jest.fn().mockResolvedValue([]),
      });
      await expect(service.verifyMagicLink('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('marks the token as used and returns the user', async () => {
      const tokenRow = {
        id: 'token-1',
        userId: 'u1',
        tokenHash: 'hash',
        used: false,
        expiresAt: new Date(Date.now() + 10000),
      };
      const user = { id: 'u1', email: 'test@example.com' };

      // token lookup
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([tokenRow]),
        limit: jest.fn().mockResolvedValue([tokenRow]),
      });
      // update token.used = true (update().set().where() → returning)
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([]),
        returning: jest.fn().mockResolvedValue([]),
      });
      // user lookup
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([user]),
        limit: jest.fn().mockResolvedValue([user]),
      });

      const result = await service.verifyMagicLink('raw-token-value');
      expect(result).toEqual(user);
    });
  });

  describe('sendMagicLink', () => {
    it('throws NotFoundException when magic link auth is disabled', async () => {
      mockConfig.get.mockImplementationOnce((key: string) => {
        if (key === 'MAGIC_LINK_AUTH_ENABLED') return 'false';
        return '';
      });

      await expect(service.sendMagicLink('test@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates a token and sends the email', async () => {
      const user = { id: 'u1', email: 'test@example.com' };
      // findOrCreateUser → limit query
      mockWhere.mockReturnValueOnce({
        ...createQueryResult([user]),
        limit: jest.fn().mockResolvedValue([user]),
      });
      // magicLinkToken insert → returning
      mockReturning.mockResolvedValueOnce([]);

      await service.sendMagicLink('test@example.com');
      expect(mockMail.sendMagicLink).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('/api/auth/magic-link/verify?token='),
      );
    });
  });
});
