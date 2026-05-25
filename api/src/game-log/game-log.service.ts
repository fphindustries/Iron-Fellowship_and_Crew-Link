import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/database.module';
import * as schema from '../db/schema';

@Injectable()
export class GameLogService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async findAll(entityType: string, entityId: string) {
    if (entityType === 'character') {
      return this.db
        .select()
        .from(schema.characterGameLog)
        .where(eq(schema.characterGameLog.characterId, entityId))
        .orderBy(desc(schema.characterGameLog.createdAt));
    }
    if (entityType === 'campaign') {
      return this.db
        .select()
        .from(schema.campaignGameLog)
        .where(eq(schema.campaignGameLog.campaignId, entityId))
        .orderBy(desc(schema.campaignGameLog.createdAt));
    }
    throw new BadRequestException('Invalid entityType');
  }

  async addEntry(entityType: string, entityId: string, data: any) {
    if (entityType === 'character') {
      const [row] = await this.db
        .insert(schema.characterGameLog)
        .values({ characterId: entityId, dataJson: data })
        .returning();
      return row;
    }
    if (entityType === 'campaign') {
      const [row] = await this.db
        .insert(schema.campaignGameLog)
        .values({ campaignId: entityId, dataJson: data })
        .returning();
      return row;
    }
    throw new BadRequestException('Invalid entityType');
  }

  async updateEntry(id: string, entityType: string, data: any) {
    if (entityType === 'character') {
      const [row] = await this.db
        .update(schema.characterGameLog)
        .set({ dataJson: data })
        .where(eq(schema.characterGameLog.id, id))
        .returning();
      return row;
    }
    if (entityType === 'campaign') {
      const [row] = await this.db
        .update(schema.campaignGameLog)
        .set({ dataJson: data })
        .where(eq(schema.campaignGameLog.id, id))
        .returning();
      return row;
    }
    throw new BadRequestException('Invalid entityType');
  }

  async removeEntry(id: string) {
    await this.db
      .delete(schema.characterGameLog)
      .where(eq(schema.characterGameLog.id, id));
    await this.db
      .delete(schema.campaignGameLog)
      .where(eq(schema.campaignGameLog.id, id));
  }

  async clearLog(entityType: string, entityId: string) {
    if (entityType === 'character') {
      await this.db
        .delete(schema.characterGameLog)
        .where(eq(schema.characterGameLog.characterId, entityId));
      return;
    }
    if (entityType === 'campaign') {
      await this.db
        .delete(schema.campaignGameLog)
        .where(eq(schema.campaignGameLog.campaignId, entityId));
      return;
    }
    throw new BadRequestException('Invalid entityType');
  }
}
