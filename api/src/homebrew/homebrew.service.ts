import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, or, sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import * as schema from '../db/schema';
import { DB } from '../db/database.module';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class HomebrewService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async findAllForUser(userId: string) {
    return this.db
      .select()
      .from(schema.homebrewCollections)
      .where(
        or(
          eq(schema.homebrewCollections.creator, userId),
          sql`${userId} = ANY(${schema.homebrewCollections.editors})`,
          sql`${userId} = ANY(${schema.homebrewCollections.viewers})`,
        ),
      );
  }

  async findOne(id: string) {
    const [c] = await this.db.select().from(schema.homebrewCollections).where(eq(schema.homebrewCollections.id, id)).limit(1);
    if (!c) throw new NotFoundException();
    return c;
  }

  async create(userId: string, data: Partial<typeof schema.homebrewCollections.$inferInsert>) {
    const [collection] = await this.db
      .insert(schema.homebrewCollections)
      .values({ ...data, creator: userId } as any)
      .returning();
    return collection;
  }

  async update(id: string, userId: string, patch: Partial<typeof schema.homebrewCollections.$inferInsert>) {
    const c = await this.findOne(id);
    if (c.creator !== userId && !c.editors.includes(userId)) throw new ForbiddenException();
    const [updated] = await this.db.update(schema.homebrewCollections).set(patch).where(eq(schema.homebrewCollections.id, id)).returning();
    return updated;
  }

  async remove(id: string, userId: string) {
    const c = await this.findOne(id);
    if (c.creator !== userId) throw new ForbiddenException();
    await this.db.delete(schema.homebrewCollections).where(eq(schema.homebrewCollections.id, id));
  }

  async getContent(collectionId: string) {
    return this.db.select().from(schema.homebrewContent).where(eq(schema.homebrewContent.collectionId, collectionId));
  }

  async addContent(collectionId: string, contentType: typeof schema.homebrewContentTypeEnum.enumValues[number], dataJson: object) {
    const [item] = await this.db.insert(schema.homebrewContent).values({ collectionId, contentType, dataJson }).returning();
    return item;
  }

  async updateContent(id: string, dataJson: object) {
    const [item] = await this.db.update(schema.homebrewContent).set({ dataJson }).where(eq(schema.homebrewContent.id, id)).returning();
    return item;
  }

  async removeContent(id: string) {
    await this.db.delete(schema.homebrewContent).where(eq(schema.homebrewContent.id, id));
  }

  async createInviteKey(collectionId: string) {
    const key = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [invite] = await this.db
      .insert(schema.homebrewInviteKeys)
      .values({ collectionId, key, expiresAt })
      .returning();
    return invite;
  }

  async resolveInviteKey(key: string) {
    const [invite] = await this.db
      .select()
      .from(schema.homebrewInviteKeys)
      .where(eq(schema.homebrewInviteKeys.key, key))
      .limit(1);
    if (!invite || invite.expiresAt < new Date()) throw new NotFoundException('Invalid or expired invite key');
    return invite;
  }

  async acceptInvite(key: string, userId: string) {
    const invite = await this.resolveInviteKey(key);
    await this.addEditor(invite.collectionId, userId);
    return { collectionId: invite.collectionId, success: true };
  }

  async addEditor(collectionId: string, userId: string) {
    const c = await this.findOne(collectionId);
    if (!c.editors.includes(userId)) {
      await this.db
        .update(schema.homebrewCollections)
        .set({ editors: [...c.editors, userId] })
        .where(eq(schema.homebrewCollections.id, collectionId));
    }
  }

  async removeEditor(collectionId: string, userId: string) {
    const c = await this.findOne(collectionId);
    await this.db
      .update(schema.homebrewCollections)
      .set({ editors: c.editors.filter((e) => e !== userId) })
      .where(eq(schema.homebrewCollections.id, collectionId));
  }
}
