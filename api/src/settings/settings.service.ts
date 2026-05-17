import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../db/database.module';
import * as schema from '../db/schema';

@Injectable()
export class SettingsService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async getOracleSettings(userId: string) {
    const [row] = await this.db
      .select()
      .from(schema.userOracleSettings)
      .where(eq(schema.userOracleSettings.userId, userId));
    return row ?? { userId, pinnedOracleIdsJson: {} };
  }

  async updateOracleSettings(userId: string, data: any) {
    const [row] = await this.db
      .insert(schema.userOracleSettings)
      .values({ userId, pinnedOracleIdsJson: data })
      .onConflictDoUpdate({
        target: schema.userOracleSettings.userId,
        set: { pinnedOracleIdsJson: data },
      })
      .returning();
    return row;
  }

  async getAccessibilitySettings(userId: string) {
    const [row] = await this.db
      .select()
      .from(schema.userAccessibilitySettings)
      .where(eq(schema.userAccessibilitySettings.userId, userId));
    return row ?? { userId, dataJson: {} };
  }

  async updateAccessibilitySettings(userId: string, data: any) {
    const [row] = await this.db
      .insert(schema.userAccessibilitySettings)
      .values({ userId, dataJson: data })
      .onConflictDoUpdate({
        target: schema.userAccessibilitySettings.userId,
        set: { dataJson: data },
      })
      .returning();
    return row;
  }

  async getCustomMoves(userId: string) {
    return this.db
      .select()
      .from(schema.userCustomMoves)
      .where(eq(schema.userCustomMoves.userId, userId));
  }

  async createCustomMove(userId: string, data: any) {
    const [row] = await this.db
      .insert(schema.userCustomMoves)
      .values({ userId, dataJson: data })
      .returning();
    return row;
  }

  async updateCustomMove(id: string, data: any) {
    const [row] = await this.db
      .update(schema.userCustomMoves)
      .set({ dataJson: data })
      .where(eq(schema.userCustomMoves.id, id))
      .returning();
    return row;
  }

  async deleteCustomMove(id: string) {
    await this.db.delete(schema.userCustomMoves).where(eq(schema.userCustomMoves.id, id));
  }

  async getCustomOracles(userId: string) {
    return this.db
      .select()
      .from(schema.userCustomOracles)
      .where(eq(schema.userCustomOracles.userId, userId));
  }

  async createCustomOracle(userId: string, data: any) {
    const [row] = await this.db
      .insert(schema.userCustomOracles)
      .values({ userId, dataJson: data })
      .returning();
    return row;
  }

  async updateCustomOracle(id: string, data: any) {
    const [row] = await this.db
      .update(schema.userCustomOracles)
      .set({ dataJson: data })
      .where(eq(schema.userCustomOracles.id, id))
      .returning();
    return row;
  }

  async deleteCustomOracle(id: string) {
    await this.db.delete(schema.userCustomOracles).where(eq(schema.userCustomOracles.id, id));
  }

  async getEntitySettings(userId: string, entityId: string, entityType: string) {
    const [row] = await this.db
      .select()
      .from(schema.userEntitySettings)
      .where(
        and(
          eq(schema.userEntitySettings.userId, userId),
          eq(schema.userEntitySettings.entityId, entityId),
          eq(schema.userEntitySettings.entityType, entityType),
        ),
      );
    return row ?? { userId, entityId, entityType, dataJson: {} };
  }

  async updateEntitySettings(userId: string, entityId: string, entityType: string, data: any) {
    const [row] = await this.db
      .insert(schema.userEntitySettings)
      .values({ userId, entityId, entityType, dataJson: data })
      .onConflictDoUpdate({
        target: [schema.userEntitySettings.userId, schema.userEntitySettings.entityId, schema.userEntitySettings.entityType],
        set: { dataJson: data },
      })
      .returning();
    return row;
  }
}
