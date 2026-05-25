import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as Y from 'yjs';
import * as schema from '../db/schema';
import { DB } from '../db/database.module';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class YjsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async loadState(
    entityType: string,
    entityId: string,
  ): Promise<Uint8Array | null> {
    const [row] = await this.db
      .select()
      .from(schema.yjsDocuments)
      .where(
        and(
          eq(schema.yjsDocuments.entityType, entityType),
          eq(schema.yjsDocuments.entityId, entityId),
        ),
      )
      .limit(1);

    return row?.state ? Buffer.from(row.state) : null;
  }

  async applyUpdate(entityType: string, entityId: string, update: Uint8Array) {
    const existing = await this.loadState(entityType, entityId);

    let merged: Uint8Array;
    if (existing) {
      merged = Y.mergeUpdatesV2([existing, update]);
    } else {
      merged = update;
    }

    await this.db
      .insert(schema.yjsDocuments)
      .values({
        entityType,
        entityId,
        state: Buffer.from(merged),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schema.yjsDocuments.entityType, schema.yjsDocuments.entityId],
        set: { state: Buffer.from(merged), updatedAt: new Date() },
      });
  }
}
