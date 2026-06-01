import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';
import { DB } from '../db/database.module';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class WorldsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  // ─── Worlds ───────────────────────────────────────────────────────────────

  async findAllForUser(userId: string) {
    const ownerships = await this.db
      .select({ worldId: schema.worldOwners.worldId })
      .from(schema.worldOwners)
      .where(eq(schema.worldOwners.userId, userId));
    if (!ownerships.length) return [];
    const ids = ownerships.map((o) => o.worldId);
    const [worlds, allOwners] = await Promise.all([
      this.db
        .select()
        .from(schema.worlds)
        .where(inArray(schema.worlds.id, ids)),
      this.db
        .select()
        .from(schema.worldOwners)
        .where(inArray(schema.worldOwners.worldId, ids)),
    ]);
    return worlds.map((w) => ({
      ...w,
      ownerIds: allOwners
        .filter((o) => o.worldId === w.id)
        .map((o) => o.userId),
    }));
  }

  async findOne(id: string) {
    const [w] = await this.db
      .select()
      .from(schema.worlds)
      .where(eq(schema.worlds.id, id))
      .limit(1);
    if (!w) throw new NotFoundException();
    const owners = await this.db
      .select({ userId: schema.worldOwners.userId })
      .from(schema.worldOwners)
      .where(eq(schema.worldOwners.worldId, id));
    return { ...w, ownerIds: owners.map((o) => o.userId) };
  }

  async create(userId: string, data: typeof schema.worlds.$inferInsert) {
    const [world] = await this.db
      .insert(schema.worlds)
      .values(data)
      .returning();
    await this.db
      .insert(schema.worldOwners)
      .values({ worldId: world.id, userId });
    return world;
  }

  async update(id: string, patch: Partial<typeof schema.worlds.$inferInsert>) {
    const validKeys = Object.keys(
      schema.worlds,
    ) as (keyof typeof schema.worlds.$inferInsert)[];
    const filteredPatch = Object.fromEntries(
      Object.entries(patch).filter(([k]) => validKeys.includes(k as any)),
    ) as Partial<typeof schema.worlds.$inferInsert>;
    if (!Object.keys(filteredPatch).length) {
      return this.findOne(id);
    }
    const [updated] = await this.db
      .update(schema.worlds)
      .set(filteredPatch)
      .where(eq(schema.worlds.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.db.delete(schema.worlds).where(eq(schema.worlds.id, id));
  }

  // ─── Locations ────────────────────────────────────────────────────────────

  async getLocations(worldId: string) {
    return this.db
      .select()
      .from(schema.worldLocations)
      .where(eq(schema.worldLocations.worldId, worldId));
  }

  async createLocation(
    worldId: string,
    data: Partial<typeof schema.worldLocations.$inferInsert>,
  ) {
    const [loc] = await this.db
      .insert(schema.worldLocations)
      .values({ ...data, worldId } as any)
      .returning();
    return loc;
  }

  async updateLocation(
    worldId: string,
    id: string,
    patch: Partial<typeof schema.worldLocations.$inferInsert>,
  ) {
    const [updated] = await this.db
      .update(schema.worldLocations)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(schema.worldLocations.id, id),
          eq(schema.worldLocations.worldId, worldId),
        ),
      )
      .returning();
    return updated;
  }

  async removeLocation(worldId: string, id: string) {
    await this.db
      .delete(schema.worldLocations)
      .where(
        and(
          eq(schema.worldLocations.id, id),
          eq(schema.worldLocations.worldId, worldId),
        ),
      );
  }

  // ─── NPCs ─────────────────────────────────────────────────────────────────

  async getNpcs(worldId: string) {
    return this.db
      .select()
      .from(schema.worldNpcs)
      .where(eq(schema.worldNpcs.worldId, worldId));
  }

  async createNpc(
    worldId: string,
    data: Partial<typeof schema.worldNpcs.$inferInsert>,
  ) {
    const [npc] = await this.db
      .insert(schema.worldNpcs)
      .values({ ...data, worldId } as any)
      .returning();
    return npc;
  }

  async updateNpc(
    worldId: string,
    id: string,
    patch: Partial<typeof schema.worldNpcs.$inferInsert>,
  ) {
    const [updated] = await this.db
      .update(schema.worldNpcs)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(eq(schema.worldNpcs.id, id), eq(schema.worldNpcs.worldId, worldId)),
      )
      .returning();
    return updated;
  }

  async removeNpc(worldId: string, id: string) {
    await this.db
      .delete(schema.worldNpcs)
      .where(
        and(eq(schema.worldNpcs.id, id), eq(schema.worldNpcs.worldId, worldId)),
      );
  }

  // ─── Lore ─────────────────────────────────────────────────────────────────

  async getLore(worldId: string) {
    return this.db
      .select()
      .from(schema.worldLore)
      .where(eq(schema.worldLore.worldId, worldId));
  }

  async createLore(
    worldId: string,
    data: Partial<typeof schema.worldLore.$inferInsert>,
  ) {
    const [lore] = await this.db
      .insert(schema.worldLore)
      .values({ ...data, worldId } as any)
      .returning();
    return lore;
  }

  async updateLore(
    worldId: string,
    id: string,
    patch: Partial<typeof schema.worldLore.$inferInsert>,
  ) {
    const [updated] = await this.db
      .update(schema.worldLore)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(eq(schema.worldLore.id, id), eq(schema.worldLore.worldId, worldId)),
      )
      .returning();
    return updated;
  }

  async removeLore(worldId: string, id: string) {
    await this.db
      .delete(schema.worldLore)
      .where(
        and(eq(schema.worldLore.id, id), eq(schema.worldLore.worldId, worldId)),
      );
  }

  // ─── Sectors ──────────────────────────────────────────────────────────────

  async getSectors(worldId: string) {
    return this.db
      .select()
      .from(schema.worldSectors)
      .where(eq(schema.worldSectors.worldId, worldId));
  }

  async createSector(
    worldId: string,
    data: Partial<typeof schema.worldSectors.$inferInsert>,
  ) {
    const [sector] = await this.db
      .insert(schema.worldSectors)
      .values({ ...data, worldId } as any)
      .returning();
    return sector;
  }

  async updateSector(
    worldId: string,
    id: string,
    patch: Partial<typeof schema.worldSectors.$inferInsert>,
  ) {
    const [updated] = await this.db
      .update(schema.worldSectors)
      .set(patch)
      .where(
        and(
          eq(schema.worldSectors.id, id),
          eq(schema.worldSectors.worldId, worldId),
        ),
      )
      .returning();
    return updated;
  }

  async removeSector(worldId: string, id: string) {
    await this.db
      .delete(schema.worldSectors)
      .where(
        and(
          eq(schema.worldSectors.id, id),
          eq(schema.worldSectors.worldId, worldId),
        ),
      );
  }

  // ─── Sector Notes ─────────────────────────────────────────────────────────

  async upsertSectorNotes(id: string, isPrivate: boolean, content: Buffer) {
    const patch = isPrivate
      ? { privateNotes: content }
      : { publicNotes: content };
    const [row] = await this.db
      .update(schema.worldSectors)
      .set(patch as any)
      .where(eq(schema.worldSectors.id, id))
      .returning();
    return row;
  }

  // ─── Sector Locations ─────────────────────────────────────────────────────

  async getSectorLocations(sectorId: string) {
    return this.db
      .select()
      .from(schema.worldSectorLocations)
      .where(eq(schema.worldSectorLocations.sectorId, sectorId));
  }

  async createSectorLocation(sectorId: string, dataJson: object) {
    const [row] = await this.db
      .insert(schema.worldSectorLocations)
      .values({ sectorId, dataJson })
      .returning();
    return row;
  }

  async updateSectorLocation(id: string, dataJson: object) {
    const [row] = await this.db
      .update(schema.worldSectorLocations)
      .set({ dataJson })
      .where(eq(schema.worldSectorLocations.id, id))
      .returning();
    return row;
  }

  async removeSectorLocation(id: string) {
    await this.db
      .delete(schema.worldSectorLocations)
      .where(eq(schema.worldSectorLocations.id, id));
  }

  // ─── Location Notes ───────────────────────────────────────────────────────

  async getLocationPrivateNotes(locationId: string) {
    const [row] = await this.db
      .select()
      .from(schema.worldLocationPrivateNotes)
      .where(eq(schema.worldLocationPrivateNotes.locationId, locationId))
      .limit(1);
    return row ?? null;
  }

  async upsertLocationPrivateNotes(
    locationId: string,
    patch: { dataJson?: object; content?: Buffer },
  ) {
    const [row] = await this.db
      .insert(schema.worldLocationPrivateNotes)
      .values({ locationId, ...(patch as any) })
      .onConflictDoUpdate({
        target: schema.worldLocationPrivateNotes.locationId,
        set: patch as any,
      })
      .returning();
    return row;
  }

  async getLocationPublicNotes(locationId: string) {
    const [row] = await this.db
      .select()
      .from(schema.worldLocationPublicNotes)
      .where(eq(schema.worldLocationPublicNotes.locationId, locationId))
      .limit(1);
    return row ?? null;
  }

  async upsertLocationPublicNotes(locationId: string, content: Buffer) {
    const [row] = await this.db
      .insert(schema.worldLocationPublicNotes)
      .values({ locationId, content })
      .onConflictDoUpdate({
        target: schema.worldLocationPublicNotes.locationId,
        set: { content },
      })
      .returning();
    return row;
  }

  // ─── NPC Notes ────────────────────────────────────────────────────────────

  async getNpcPrivateNotes(npcId: string) {
    const [row] = await this.db
      .select()
      .from(schema.worldNpcPrivateNotes)
      .where(eq(schema.worldNpcPrivateNotes.npcId, npcId))
      .limit(1);
    return row ?? null;
  }

  async upsertNpcPrivateNotes(npcId: string, dataJson: object) {
    const [row] = await this.db
      .insert(schema.worldNpcPrivateNotes)
      .values({ npcId, dataJson })
      .onConflictDoUpdate({
        target: schema.worldNpcPrivateNotes.npcId,
        set: { dataJson },
      })
      .returning();
    return row;
  }

  async getNpcPublicNotes(npcId: string) {
    const [row] = await this.db
      .select()
      .from(schema.worldNpcPublicNotes)
      .where(eq(schema.worldNpcPublicNotes.npcId, npcId))
      .limit(1);
    return row ?? null;
  }

  async upsertNpcPublicNotes(npcId: string, content: Buffer) {
    const [row] = await this.db
      .insert(schema.worldNpcPublicNotes)
      .values({ npcId, content })
      .onConflictDoUpdate({
        target: schema.worldNpcPublicNotes.npcId,
        set: { content },
      })
      .returning();
    return row;
  }

  // ─── Lore Notes ───────────────────────────────────────────────────────────

  async getLorePrivateNotes(loreId: string) {
    const [row] = await this.db
      .select()
      .from(schema.worldLorePrivateNotes)
      .where(eq(schema.worldLorePrivateNotes.loreId, loreId))
      .limit(1);
    return row ?? null;
  }

  async upsertLorePrivateNotes(loreId: string, dataJson: object) {
    const [row] = await this.db
      .insert(schema.worldLorePrivateNotes)
      .values({ loreId, dataJson })
      .onConflictDoUpdate({
        target: schema.worldLorePrivateNotes.loreId,
        set: { dataJson },
      })
      .returning();
    return row;
  }

  async getLorePublicNotes(loreId: string) {
    const [row] = await this.db
      .select()
      .from(schema.worldLorePublicNotes)
      .where(eq(schema.worldLorePublicNotes.loreId, loreId))
      .limit(1);
    return row ?? null;
  }

  async upsertLorePublicNotes(loreId: string, content: Buffer) {
    const [row] = await this.db
      .insert(schema.worldLorePublicNotes)
      .values({ loreId, content })
      .onConflictDoUpdate({
        target: schema.worldLorePublicNotes.loreId,
        set: { content },
      })
      .returning();
    return row;
  }

  // ─── AI Settings ──────────────────────────────────────────────────────────

  async getWorldAiSettings(worldId: string) {
    const [row] = await this.db
      .select()
      .from(schema.worldAiSettings)
      .where(eq(schema.worldAiSettings.worldId, worldId))
      .limit(1);
    if (!row) return null;
    return (row.configJson as object) ?? {};
  }

  async upsertWorldAiSettings(
    worldId: string,
    configPatch: Record<string, unknown>,
  ) {
    const existing = await this.db
      .select()
      .from(schema.worldAiSettings)
      .where(eq(schema.worldAiSettings.worldId, worldId))
      .limit(1)
      .then(([r]) => r ?? null);

    const newConfig = {
      ...((existing?.configJson ?? {}) as Record<string, unknown>),
      ...configPatch,
    };

    let row: typeof schema.worldAiSettings.$inferSelect;
    if (!existing) {
      [row] = await this.db
        .insert(schema.worldAiSettings)
        .values({ worldId, configJson: newConfig })
        .returning();
    } else {
      [row] = await this.db
        .update(schema.worldAiSettings)
        .set({ configJson: newConfig })
        .where(eq(schema.worldAiSettings.worldId, worldId))
        .returning();
    }
    return (row.configJson as object) ?? {};
  }

  async addOwner(worldId: string, userId: string) {
    await this.db
      .insert(schema.worldOwners)
      .values({ worldId, userId })
      .onConflictDoNothing();
  }

  async removeOwner(worldId: string, userId: string) {
    await this.db
      .delete(schema.worldOwners)
      .where(
        and(
          eq(schema.worldOwners.worldId, worldId),
          eq(schema.worldOwners.userId, userId),
        ),
      );
  }
}
