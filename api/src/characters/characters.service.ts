import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';
import { DB } from '../db/database.module';
import { SessionsService } from '../sessions/sessions.service';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class CharactersService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly sessions: SessionsService,
  ) {}

  async findAllForUser(userId: string) {
    return this.db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.userId, userId));
  }

  async findOne(id: string, userId?: string) {
    const char = await this.findCharacterOrThrow(id);
    if (userId) await this.assertCanAccessCharacter(char, userId);
    return char;
  }

  async create(userId: string, data: typeof schema.characters.$inferInsert) {
    const [char] = await this.db
      .insert(schema.characters)
      .values({ ...data, userId })
      .returning();
    return char;
  }

  async update(
    id: string,
    userId: string,
    patch: Partial<typeof schema.characters.$inferInsert>,
  ) {
    const char = await this.findCharacterOrThrow(id);
    await this.assertCanAccessCharacter(char, userId);
    const allowedPatchKeys = new Set(Object.keys(schema.characters));
    const sanitizedPatch = Object.fromEntries(
      Object.entries(patch).filter(([key]) => allowedPatchKeys.has(key)),
    ) as Partial<typeof schema.characters.$inferInsert>;
    if (Object.keys(sanitizedPatch).length === 0) return char;
    const [updated] = await this.db
      .update(schema.characters)
      .set(sanitizedPatch)
      .where(eq(schema.characters.id, id))
      .returning();
    return updated;
  }

  async remove(id: string, userId: string) {
    const [char] = await this.db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.id, id))
      .limit(1);
    if (!char) throw new NotFoundException();
    if (char.userId !== userId) throw new ForbiddenException();
    await this.db.delete(schema.characters).where(eq(schema.characters.id, id));
  }

  // Assets
  async getAssets(characterId: string, userId?: string) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    return this.db
      .select()
      .from(schema.characterAssets)
      .where(eq(schema.characterAssets.characterId, characterId));
  }
  async addAsset(characterId: string, dataJson: object, userId?: string) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    const [asset] = await this.db
      .insert(schema.characterAssets)
      .values({ characterId, dataJson })
      .returning();
    return asset;
  }
  async updateAsset(
    characterId: string,
    id: string,
    dataJson: object,
    userId?: string,
  ) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    const [asset] = await this.db
      .update(schema.characterAssets)
      .set({ dataJson })
      .where(
        and(
          eq(schema.characterAssets.id, id),
          eq(schema.characterAssets.characterId, characterId),
        ),
      )
      .returning();
    return asset;
  }
  async removeAsset(characterId: string, id: string, userId?: string) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    await this.db
      .delete(schema.characterAssets)
      .where(
        and(
          eq(schema.characterAssets.id, id),
          eq(schema.characterAssets.characterId, characterId),
        ),
      );
  }

  // Tracks
  async getTracks(characterId: string, userId?: string) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    return this.db
      .select()
      .from(schema.characterTracks)
      .where(eq(schema.characterTracks.characterId, characterId));
  }
  async addTrack(
    characterId: string,
    data: Omit<typeof schema.characterTracks.$inferInsert, 'characterId'>,
    userId?: string,
  ) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    const [track] = await this.db
      .insert(schema.characterTracks)
      .values({ ...data, characterId })
      .returning();
    return track;
  }
  async updateTrack(
    characterId: string,
    id: string,
    dataJson: object,
    userId?: string,
  ) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    const [track] = await this.db
      .update(schema.characterTracks)
      .set({ dataJson })
      .where(
        and(
          eq(schema.characterTracks.id, id),
          eq(schema.characterTracks.characterId, characterId),
        ),
      )
      .returning();
    return track;
  }
  async removeTrack(characterId: string, id: string, userId?: string) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    await this.db
      .delete(schema.characterTracks)
      .where(
        and(
          eq(schema.characterTracks.id, id),
          eq(schema.characterTracks.characterId, characterId),
        ),
      );
  }

  // ─── Sessions ──────────────────────────────────────────────────────────────

  async getSessions(characterId: string, userId?: string) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    return this.sessions.findAllForCharacter(characterId);
  }

  // ─── Combat ────────────────────────────────────────────────────────────────

  async getActiveCombat(characterId: string, userId?: string) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    const rows = await this.db
      .select()
      .from(schema.combats)
      .where(
        and(
          eq(schema.combats.characterId, characterId),
          isNull(schema.combats.campaignId),
          eq(schema.combats.active, true),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async createCombat(characterId: string, dataJson: object, userId?: string) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    const [row] = await this.db
      .insert(schema.combats)
      .values({ characterId, dataJson, active: true })
      .returning();
    return row;
  }

  async updateCombat(
    characterId: string,
    id: string,
    dataJson: object,
    userId?: string,
  ) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    const [row] = await this.db
      .update(schema.combats)
      .set({ dataJson })
      .where(
        and(
          eq(schema.combats.id, id),
          eq(schema.combats.characterId, characterId),
        ),
      )
      .returning();
    return row;
  }

  async endCombat(characterId: string, id: string, userId?: string) {
    if (userId) {
      const char = await this.findCharacterOrThrow(characterId);
      await this.assertCanAccessCharacter(char, userId);
    }
    const [row] = await this.db
      .update(schema.combats)
      .set({ active: false, endedAt: new Date() })
      .where(
        and(
          eq(schema.combats.id, id),
          eq(schema.combats.characterId, characterId),
        ),
      )
      .returning();
    if (!row) throw new NotFoundException('Combat not found');
    return row;
  }

  private async findCharacterOrThrow(id: string) {
    const [char] = await this.db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.id, id))
      .limit(1);
    if (!char) throw new NotFoundException();
    return char;
  }

  private async assertCanAccessCharacter(
    char: typeof schema.characters.$inferSelect,
    userId: string,
  ) {
    if (char.userId === userId) return;
    if (await this.isCampaignMemberForCharacter(char, userId)) return;
    throw new ForbiddenException();
  }

  private async isCampaignMemberForCharacter(
    char: typeof schema.characters.$inferSelect,
    userId: string,
  ) {
    const campaignIds = new Set<string>();
    if (char.campaignId) campaignIds.add(char.campaignId);

    const links = await this.db
      .select({ campaignId: schema.campaignCharacters.campaignId })
      .from(schema.campaignCharacters)
      .where(eq(schema.campaignCharacters.characterId, char.id));
    links.forEach((link) => campaignIds.add(link.campaignId));

    if (campaignIds.size === 0) return false;

    const memberships = await this.db
      .select()
      .from(schema.campaignMembers)
      .where(
        and(
          eq(schema.campaignMembers.userId, userId),
          inArray(schema.campaignMembers.campaignId, [...campaignIds]),
        ),
      );

    return memberships.length > 0;
  }
}
