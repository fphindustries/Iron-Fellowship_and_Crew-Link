import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc, asc, and, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/database.module';
import * as schema from '../db/schema';

@Injectable()
export class SessionsService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async findActive(params: { characterId?: string; campaignId?: string }) {
    const conditions = [eq(schema.sessions.isActive, true)];
    if (params.characterId) {
      conditions.push(eq(schema.sessions.characterId, params.characterId));
    }
    if (params.campaignId) {
      conditions.push(eq(schema.sessions.campaignId, params.campaignId));
    }
    const rows = await this.db
      .select()
      .from(schema.sessions)
      .where(and(...conditions))
      .orderBy(desc(schema.sessions.startedAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async findAllForCampaign(campaignId: string) {
    return this.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.campaignId, campaignId))
      .orderBy(desc(schema.sessions.startedAt));
  }

  async findAllForCharacter(characterId: string) {
    return this.db
      .select()
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.characterId, characterId),
          isNull(schema.sessions.campaignId),
        ),
      )
      .orderBy(desc(schema.sessions.startedAt));
  }

  async create(data: {
    characterId?: string;
    campaignId?: string;
    title?: string;
  }) {
    // Deactivate any existing active session for the same entity
    if (data.characterId || data.campaignId) {
      const conditions = [eq(schema.sessions.isActive, true)];
      if (data.characterId)
        conditions.push(eq(schema.sessions.characterId, data.characterId));
      if (data.campaignId)
        conditions.push(eq(schema.sessions.campaignId, data.campaignId));
      await this.db
        .update(schema.sessions)
        .set({ isActive: false, endedAt: new Date() })
        .where(and(...conditions));
    }
    const [row] = await this.db
      .insert(schema.sessions)
      .values({
        characterId: data.characterId ?? null,
        campaignId: data.campaignId ?? null,
        title: data.title ?? null,
        isActive: true,
      })
      .returning();
    return row;
  }

  async update(
    id: string,
    data: { summary?: string; isActive?: boolean; title?: string },
  ) {
    const patch: Partial<typeof schema.sessions.$inferInsert> = {};
    if (data.summary !== undefined) patch.summary = data.summary;
    if (data.title !== undefined) patch.title = data.title;
    if (data.isActive !== undefined) {
      patch.isActive = data.isActive;
      if (!data.isActive) patch.endedAt = new Date();
    }
    const [row] = await this.db
      .update(schema.sessions)
      .set(patch)
      .where(eq(schema.sessions.id, id))
      .returning();
    if (!row) throw new NotFoundException('Session not found');
    return row;
  }

  async findEvents(sessionId: string) {
    return this.db
      .select()
      .from(schema.sessionEvents)
      .where(eq(schema.sessionEvents.sessionId, sessionId))
      .orderBy(asc(schema.sessionEvents.createdAt));
  }

  async addEvent(
    sessionId: string,
    data: {
      characterId?: string | null;
      characterName?: string;
      createdBy?: string;
      type: string;
      dataJson?: any;
    },
  ) {
    const [row] = await this.db
      .insert(schema.sessionEvents)
      .values({
        sessionId,
        characterId: data.characterId ?? null,
        characterName: data.characterName ?? '',
        createdBy: data.createdBy ?? null,
        type: data.type,
        dataJson: data.dataJson ?? {},
      })
      .returning();
    return row;
  }

  async updateEvent(id: string, dataJson: any) {
    const [row] = await this.db
      .update(schema.sessionEvents)
      .set({ dataJson })
      .where(eq(schema.sessionEvents.id, id))
      .returning();
    if (!row) throw new NotFoundException('Event not found');
    return row;
  }

  async removeEvent(id: string) {
    await this.db
      .delete(schema.sessionEvents)
      .where(eq(schema.sessionEvents.id, id));
  }

  async remove(id: string) {
    await this.db.delete(schema.sessions).where(eq(schema.sessions.id, id));
  }
}
