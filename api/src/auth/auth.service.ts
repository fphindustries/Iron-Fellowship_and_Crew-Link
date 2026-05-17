import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gt } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import * as schema from '../db/schema';
import { DB } from '../db/database.module';
import { MailService } from '../common/mail.service';
import { toUserProfile } from '../users/users.service';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async findOrCreateUser(email: string, displayName: string, photoUrl?: string) {
    const [existing] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existing) return existing;

    const [created] = await this.db
      .insert(schema.users)
      .values({ email, displayName, photoUrl })
      .returning();

    return created;
  }

  issueTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: '7d',
      secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
    return { accessToken, refreshToken };
  }

  async sendMagicLink(email: string) {
    const user = await this.findOrCreateUser(email, email.split('@')[0]);
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.db.insert(schema.magicLinkTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const baseUrl = this.config.getOrThrow<string>('APP_URL');
    const link = `${baseUrl}/api/auth/magic-link/verify?token=${rawToken}`;

    await this.mail.sendMagicLink(email, link);
  }

  async verifyMagicLink(rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const now = new Date();

    const [tokenRow] = await this.db
      .select()
      .from(schema.magicLinkTokens)
      .where(
        and(
          eq(schema.magicLinkTokens.tokenHash, tokenHash),
          eq(schema.magicLinkTokens.used, false),
          gt(schema.magicLinkTokens.expiresAt, now),
        ),
      )
      .limit(1);

    if (!tokenRow) throw new UnauthorizedException('Invalid or expired magic link');

    await this.db
      .update(schema.magicLinkTokens)
      .set({ used: true })
      .where(eq(schema.magicLinkTokens.id, tokenRow.id));

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, tokenRow.userId))
      .limit(1);

    return user;
  }

  async getMe(userId: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    return user ? toUserProfile(user) : null;
  }
}
