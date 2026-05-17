import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema';
import { DB } from '../db/database.module';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class CharactersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findAllForUser(userId: string) {
    return this.db.select().from(schema.characters).where(eq(schema.characters.userId, userId));
  }

  async findOne(id: string) {
    const [char] = await this.db.select().from(schema.characters).where(eq(schema.characters.id, id)).limit(1);
    if (!char) throw new NotFoundException();
    return char;
  }

  async create(userId: string, data: typeof schema.characters.$inferInsert) {
    const [char] = await this.db.insert(schema.characters).values({ ...data, userId }).returning();
    return char;
  }

  async update(id: string, userId: string, patch: Partial<typeof schema.characters.$inferInsert>) {
    const [char] = await this.db.select().from(schema.characters).where(eq(schema.characters.id, id)).limit(1);
    if (!char) throw new NotFoundException();
    if (char.userId !== userId) throw new ForbiddenException();
    const [updated] = await this.db.update(schema.characters).set(patch).where(eq(schema.characters.id, id)).returning();
    return updated;
  }

  async remove(id: string, userId: string) {
    const [char] = await this.db.select().from(schema.characters).where(eq(schema.characters.id, id)).limit(1);
    if (!char) throw new NotFoundException();
    if (char.userId !== userId) throw new ForbiddenException();
    await this.db.delete(schema.characters).where(eq(schema.characters.id, id));
  }

  // Assets
  async getAssets(characterId: string) {
    return this.db.select().from(schema.characterAssets).where(eq(schema.characterAssets.characterId, characterId));
  }
  async addAsset(characterId: string, dataJson: object) {
    const [asset] = await this.db.insert(schema.characterAssets).values({ characterId, dataJson }).returning();
    return asset;
  }
  async updateAsset(id: string, dataJson: object) {
    const [asset] = await this.db.update(schema.characterAssets).set({ dataJson }).where(eq(schema.characterAssets.id, id)).returning();
    return asset;
  }
  async removeAsset(id: string) {
    await this.db.delete(schema.characterAssets).where(eq(schema.characterAssets.id, id));
  }

  // Tracks
  async getTracks(characterId: string) {
    return this.db.select().from(schema.characterTracks).where(eq(schema.characterTracks.characterId, characterId));
  }
  async addTrack(characterId: string, data: Omit<typeof schema.characterTracks.$inferInsert, 'characterId'>) {
    const [track] = await this.db.insert(schema.characterTracks).values({ ...data, characterId }).returning();
    return track;
  }
  async updateTrack(id: string, dataJson: object) {
    const [track] = await this.db.update(schema.characterTracks).set({ dataJson }).where(eq(schema.characterTracks.id, id)).returning();
    return track;
  }
  async removeTrack(id: string) {
    await this.db.delete(schema.characterTracks).where(eq(schema.characterTracks.id, id));
  }
}
