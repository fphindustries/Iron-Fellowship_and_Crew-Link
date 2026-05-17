import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/database.module';
import * as schema from '../db/schema';

@Injectable()
export class NotesService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async findAll(entityType: string, entityId: string) {
    if (entityType === 'character') {
      return this.db
        .select()
        .from(schema.characterNotes)
        .where(eq(schema.characterNotes.characterId, entityId));
    }
    if (entityType === 'campaign') {
      return this.db
        .select()
        .from(schema.campaignNotes)
        .where(eq(schema.campaignNotes.campaignId, entityId));
    }
    throw new BadRequestException('Invalid entityType');
  }

  async create(entityType: string, entityId: string, body: any) {
    if (entityType === 'character') {
      const [row] = await this.db
        .insert(schema.characterNotes)
        .values({ characterId: entityId, ...body })
        .returning();
      return row;
    }
    if (entityType === 'campaign') {
      const [row] = await this.db
        .insert(schema.campaignNotes)
        .values({ campaignId: entityId, ...body })
        .returning();
      return row;
    }
    throw new BadRequestException('Invalid entityType');
  }

  async update(id: string, body: any) {
    // Try character notes first, then campaign notes
    const [charRow] = await this.db
      .update(schema.characterNotes)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.characterNotes.id, id))
      .returning();
    if (charRow) return charRow;

    const [campRow] = await this.db
      .update(schema.campaignNotes)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.campaignNotes.id, id))
      .returning();
    return campRow;
  }

  async getContent(id: string) {
    const charNote = await this.db.select().from(schema.characterNotes).where(eq(schema.characterNotes.id, id)).limit(1);
    if (charNote.length) return { content: charNote[0].content };
    const campNote = await this.db.select().from(schema.campaignNotes).where(eq(schema.campaignNotes.id, id)).limit(1);
    if (campNote.length) return { content: campNote[0].content };
    return null;
  }

  async remove(id: string) {
    await this.db.delete(schema.characterNotes).where(eq(schema.characterNotes.id, id));
    await this.db.delete(schema.campaignNotes).where(eq(schema.campaignNotes.id, id));
  }
}
