import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from '../db/schema';
import { DB } from '../db/database.module';
import { SessionsService } from '../sessions/sessions.service';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class CampaignsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly sessions: SessionsService,
  ) {}

  private async hydrate(campaign: typeof schema.campaigns.$inferSelect) {
    const [members, gms, chars] = await Promise.all([
      this.db
        .select({ userId: schema.campaignMembers.userId })
        .from(schema.campaignMembers)
        .where(eq(schema.campaignMembers.campaignId, campaign.id)),
      this.db
        .select({ userId: schema.campaignGms.userId })
        .from(schema.campaignGms)
        .where(eq(schema.campaignGms.campaignId, campaign.id)),
      this.db
        .select()
        .from(schema.campaignCharacters)
        .where(eq(schema.campaignCharacters.campaignId, campaign.id)),
    ]);
    return {
      id: campaign.id,
      name: campaign.name,
      users: members.map((m) => m.userId),
      gmIds: gms.map((g) => g.userId),
      characters: chars.map((c) => ({
        uid: c.userId,
        characterId: c.characterId,
      })),
      worldId: campaign.worldId ?? undefined,
      expansionIds: campaign.expansionIds ?? [],
      customTracks: campaign.customTracksJson ?? {},
      conditionMeters: campaign.conditionMetersJson ?? {},
      specialTracks: campaign.specialTracksJson ?? {},
      type: campaign.type,
      theme: campaign.theme ?? undefined,
    };
  }

  async findAllForUser(userId: string) {
    const memberships = await this.db
      .select({ campaignId: schema.campaignMembers.campaignId })
      .from(schema.campaignMembers)
      .where(eq(schema.campaignMembers.userId, userId));

    if (!memberships.length) return [];
    const ids = memberships.map((m) => m.campaignId);
    const campaigns = await this.db
      .select()
      .from(schema.campaigns)
      .where(inArray(schema.campaigns.id, ids));
    return Promise.all(campaigns.map((c) => this.hydrate(c)));
  }

  async findOne(id: string) {
    const [c] = await this.db
      .select()
      .from(schema.campaigns)
      .where(eq(schema.campaigns.id, id))
      .limit(1);
    if (!c) throw new NotFoundException();
    return this.hydrate(c);
  }

  async create(userId: string, data: typeof schema.campaigns.$inferInsert) {
    const [campaign] = await this.db
      .insert(schema.campaigns)
      .values(data)
      .returning();
    await this.db
      .insert(schema.campaignMembers)
      .values({ campaignId: campaign.id, userId });
    await this.db
      .insert(schema.campaignGms)
      .values({ campaignId: campaign.id, userId });
    return campaign;
  }

  async update(
    id: string,
    patch: Partial<typeof schema.campaigns.$inferInsert>,
  ) {
    const [updated] = await this.db
      .update(schema.campaigns)
      .set(patch)
      .where(eq(schema.campaigns.id, id))
      .returning();
    return updated;
  }

  async remove(id: string) {
    await this.db.delete(schema.campaigns).where(eq(schema.campaigns.id, id));
  }

  async addMember(campaignId: string, userId: string) {
    await this.db
      .insert(schema.campaignMembers)
      .values({ campaignId, userId })
      .onConflictDoNothing();
  }

  async removeMember(campaignId: string, userId: string) {
    await this.db
      .delete(schema.campaignMembers)
      .where(
        and(
          eq(schema.campaignMembers.campaignId, campaignId),
          eq(schema.campaignMembers.userId, userId),
        ),
      );
  }

  async addCharacter(campaignId: string, userId: string, characterId: string) {
    await this.db
      .insert(schema.campaignCharacters)
      .values({ campaignId, userId, characterId })
      .onConflictDoNothing();
  }

  async removeCharacter(campaignId: string, characterId: string) {
    await this.db
      .delete(schema.campaignCharacters)
      .where(
        and(
          eq(schema.campaignCharacters.campaignId, campaignId),
          eq(schema.campaignCharacters.characterId, characterId),
        ),
      );
  }

  async getAiEvents(campaignId: string) {
    return this.db
      .select()
      .from(schema.campaignAiEvents)
      .where(eq(schema.campaignAiEvents.campaignId, campaignId))
      .orderBy(schema.campaignAiEvents.createdAt);
  }

  async updateAiEvent(
    eventId: string,
    patch: Partial<typeof schema.campaignAiEvents.$inferInsert>,
  ) {
    const [updated] = await this.db
      .update(schema.campaignAiEvents)
      .set(patch)
      .where(eq(schema.campaignAiEvents.id, eventId))
      .returning();
    return updated;
  }

  // GMs
  async addGm(campaignId: string, userId: string) {
    await this.db
      .insert(schema.campaignGms)
      .values({ campaignId, userId })
      .onConflictDoNothing();
    await this.addMember(campaignId, userId);
  }

  async removeGm(campaignId: string, userId: string) {
    await this.db
      .delete(schema.campaignGms)
      .where(
        and(
          eq(schema.campaignGms.campaignId, campaignId),
          eq(schema.campaignGms.userId, userId),
        ),
      );
  }

  // Assets
  async getAssets(campaignId: string) {
    return this.db
      .select()
      .from(schema.campaignAssets)
      .where(eq(schema.campaignAssets.campaignId, campaignId));
  }

  async addAsset(campaignId: string, dataJson: object) {
    const [asset] = await this.db
      .insert(schema.campaignAssets)
      .values({ campaignId, dataJson })
      .returning();
    return asset;
  }

  async updateAsset(id: string, dataJson: object) {
    const [asset] = await this.db
      .update(schema.campaignAssets)
      .set({ dataJson })
      .where(eq(schema.campaignAssets.id, id))
      .returning();
    return asset;
  }

  async removeAsset(id: string) {
    await this.db
      .delete(schema.campaignAssets)
      .where(eq(schema.campaignAssets.id, id));
  }

  // Tracks
  async getTracks(campaignId: string) {
    return this.db
      .select()
      .from(schema.campaignTracks)
      .where(eq(schema.campaignTracks.campaignId, campaignId));
  }

  async addTrack(
    campaignId: string,
    data: Omit<typeof schema.campaignTracks.$inferInsert, 'campaignId'>,
  ) {
    const [track] = await this.db
      .insert(schema.campaignTracks)
      .values({ ...data, campaignId })
      .returning();
    return track;
  }

  async updateTrack(id: string, dataJson: object) {
    const [track] = await this.db
      .update(schema.campaignTracks)
      .set({ dataJson })
      .where(eq(schema.campaignTracks.id, id))
      .returning();
    return track;
  }

  async removeTrack(id: string) {
    await this.db
      .delete(schema.campaignTracks)
      .where(eq(schema.campaignTracks.id, id));
  }

  // ─── Sessions ──────────────────────────────────────────────────────────────

  getSessions(campaignId: string) {
    return this.sessions.findAllForCampaign(campaignId);
  }

  // ─── Combat ────────────────────────────────────────────────────────────────

  async getActiveCombat(campaignId: string) {
    const rows = await this.db
      .select()
      .from(schema.combats)
      .where(
        and(
          eq(schema.combats.campaignId, campaignId),
          eq(schema.combats.active, true),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async createCombat(campaignId: string, dataJson: object) {
    const [row] = await this.db
      .insert(schema.combats)
      .values({ campaignId, dataJson, active: true })
      .returning();
    return row;
  }

  async updateCombat(id: string, dataJson: object) {
    const [row] = await this.db
      .update(schema.combats)
      .set({ dataJson })
      .where(eq(schema.combats.id, id))
      .returning();
    return row;
  }

  async endCombat(id: string) {
    const [row] = await this.db
      .update(schema.combats)
      .set({ active: false, endedAt: new Date() })
      .where(eq(schema.combats.id, id))
      .returning();
    if (!row) throw new NotFoundException('Combat not found');
    return row;
  }

  // ─── AI Guide State ────────────────────────────────────────────────────────

  async getAiGuideState(campaignId: string) {
    const [row] = await this.db
      .select()
      .from(schema.campaignAiGuideState)
      .where(eq(schema.campaignAiGuideState.campaignId, campaignId))
      .limit(1);
    return row ?? null;
  }

  async upsertAiGuideState(campaignId: string, stateJson: object) {
    const [row] = await this.db
      .insert(schema.campaignAiGuideState)
      .values({ campaignId, stateJson, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.campaignAiGuideState.campaignId,
        set: { stateJson, updatedAt: new Date() },
      })
      .returning();
    return row;
  }

  // ─── Starship ──────────────────────────────────────────────────────────────

  async getStarship(campaignId: string) {
    const [row] = await this.db
      .select()
      .from(schema.campaignStarship)
      .where(eq(schema.campaignStarship.campaignId, campaignId))
      .limit(1);
    return row ?? null;
  }

  async upsertStarship(campaignId: string, patch: { name?: string | null; history?: string | null; quirks?: string[]; image?: object | null }) {
    const [row] = await this.db
      .insert(schema.campaignStarship)
      .values({ campaignId, ...patch })
      .onConflictDoUpdate({
        target: schema.campaignStarship.campaignId,
        set: patch,
      })
      .returning();
    return row;
  }

  async deleteStarship(campaignId: string) {
    await this.db
      .delete(schema.campaignStarship)
      .where(eq(schema.campaignStarship.campaignId, campaignId));
  }
}
