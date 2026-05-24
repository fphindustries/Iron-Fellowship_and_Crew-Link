import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorldOwnerGuard } from '../common/guards/world-owner.guard';
import { WorldsService } from './worlds.service';
import { WorldGateway } from '../realtime/world.gateway';

@Controller('api/worlds')
@UseGuards(JwtAuthGuard)
export class WorldsController {
  constructor(
    private readonly svc: WorldsService,
    private readonly gateway: WorldGateway,
  ) {}

  @Get()
  findAll(@Req() req: any) {
    const user = req.user as { id: string };
    return this.svc.findAllForUser(user.id);
  }

  @Get(':worldId')
  findOne(@Param('worldId') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const user = req.user as { id: string };
    const result = await this.svc.create(user.id, body);
    this.gateway.emit('updated', result.id, {});
    return result;
  }

  @Patch(':worldId')
  @UseGuards(WorldOwnerGuard)
  async update(@Param('worldId') id: string, @Body() body: any) {
    const patch: Record<string, unknown> = { ...body };
    // Client sends camelCase aliases; remap to Drizzle schema field names.
    if ('newTruths' in patch) {
      patch.newTruthsJson = patch.newTruths;
      delete patch.newTruths;
    }
    if ('worldDescription' in patch) {
      const raw = patch.worldDescription;
      const values: number[] = Array.isArray(raw)
        ? raw
        : Object.values(raw as Record<string, number>);
      patch.worldDescriptionBytes = Buffer.from(values);
      delete patch.worldDescription;
    }
    const result = await this.svc.update(id, patch as any);
    this.gateway.emit('updated', id, {});
    return result;
  }

  @Delete(':worldId')
  @UseGuards(WorldOwnerGuard)
  async remove(@Param('worldId') id: string) {
    await this.svc.remove(id);
    this.gateway.emit('updated', id, {});
  }

  // ─── Locations ────────────────────────────────────────────────────────────

  @Get(':worldId/locations')
  getLocations(@Param('worldId') wid: string) { return this.svc.getLocations(wid); }

  @Post(':worldId/locations')
  @UseGuards(WorldOwnerGuard)
  async createLocation(@Param('worldId') wid: string, @Body() body: any) {
    const result = await this.svc.createLocation(wid, body);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Patch(':worldId/locations/:id')
  @UseGuards(WorldOwnerGuard)
  async updateLocation(@Param('worldId') wid: string, @Param('id') id: string, @Body() body: any) {
    const result = await this.svc.updateLocation(id, body);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Delete(':worldId/locations/:id')
  @UseGuards(WorldOwnerGuard)
  async removeLocation(@Param('worldId') wid: string, @Param('id') id: string) {
    await this.svc.removeLocation(id);
    this.gateway.emit('updated', wid, {});
  }

  // ─── NPCs ─────────────────────────────────────────────────────────────────

  @Get(':worldId/npcs')
  getNpcs(@Param('worldId') wid: string) { return this.svc.getNpcs(wid); }

  @Post(':worldId/npcs')
  @UseGuards(WorldOwnerGuard)
  async createNpc(@Param('worldId') wid: string, @Body() body: any) {
    const result = await this.svc.createNpc(wid, body);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Patch(':worldId/npcs/:id')
  @UseGuards(WorldOwnerGuard)
  async updateNpc(@Param('worldId') wid: string, @Param('id') id: string, @Body() body: any) {
    const result = await this.svc.updateNpc(id, body);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Delete(':worldId/npcs/:id')
  @UseGuards(WorldOwnerGuard)
  async removeNpc(@Param('worldId') wid: string, @Param('id') id: string) {
    await this.svc.removeNpc(id);
    this.gateway.emit('updated', wid, {});
  }

  // ─── Lore ─────────────────────────────────────────────────────────────────

  @Get(':worldId/lore')
  getLore(@Param('worldId') wid: string) { return this.svc.getLore(wid); }

  @Post(':worldId/lore')
  @UseGuards(WorldOwnerGuard)
  async createLore(@Param('worldId') wid: string, @Body() body: any) {
    const result = await this.svc.createLore(wid, body);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Patch(':worldId/lore/:id')
  @UseGuards(WorldOwnerGuard)
  async updateLore(@Param('worldId') wid: string, @Param('id') id: string, @Body() body: any) {
    const result = await this.svc.updateLore(id, body);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Delete(':worldId/lore/:id')
  @UseGuards(WorldOwnerGuard)
  async removeLore(@Param('worldId') wid: string, @Param('id') id: string) {
    await this.svc.removeLore(id);
    this.gateway.emit('updated', wid, {});
  }

  // ─── Sectors ──────────────────────────────────────────────────────────────

  @Get(':worldId/sectors')
  getSectors(@Param('worldId') wid: string) { return this.svc.getSectors(wid); }

  @Post(':worldId/sectors')
  @UseGuards(WorldOwnerGuard)
  async createSector(@Param('worldId') wid: string, @Body() body: any) {
    const result = await this.svc.createSector(wid, body);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Patch(':worldId/sectors/:id')
  @UseGuards(WorldOwnerGuard)
  async updateSector(@Param('worldId') wid: string, @Param('id') id: string, @Body() body: any) {
    const result = await this.svc.updateSector(id, body);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Delete(':worldId/sectors/:id')
  @UseGuards(WorldOwnerGuard)
  async removeSector(@Param('worldId') wid: string, @Param('id') id: string) {
    await this.svc.removeSector(id);
    this.gateway.emit('updated', wid, {});
  }

  // ─── Sector Notes and Locations ───────────────────────────────────────────

  @Patch(':worldId/sectors/:sectorId/notes')
  @UseGuards(WorldOwnerGuard)
  async upsertSectorNotes(@Param('worldId') wid: string, @Param('sectorId') sid: string, @Body() body: any) {
    const result = await this.svc.upsertSectorNotes(sid, body.isPrivate ?? false, Buffer.from(body.content));
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Get(':worldId/sectors/:sectorId/locations')
  getSectorLocations(@Param('sectorId') sid: string) { return this.svc.getSectorLocations(sid); }

  @Post(':worldId/sectors/:sectorId/locations')
  @UseGuards(WorldOwnerGuard)
  async createSectorLocation(@Param('worldId') wid: string, @Param('sectorId') sid: string, @Body() body: any) {
    const result = await this.svc.createSectorLocation(sid, body);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Patch(':worldId/sectors/:sectorId/locations/:locationId')
  @UseGuards(WorldOwnerGuard)
  async updateSectorLocation(@Param('worldId') wid: string, @Param('locationId') lid: string, @Body() body: any) {
    const result = await this.svc.updateSectorLocation(lid, body);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Delete(':worldId/sectors/:sectorId/locations/:locationId')
  @UseGuards(WorldOwnerGuard)
  async removeSectorLocation(@Param('worldId') wid: string, @Param('locationId') lid: string) {
    await this.svc.removeSectorLocation(lid);
    this.gateway.emit('updated', wid, {});
  }

  // ─── Location Notes ───────────────────────────────────────────────────────

  @Get(':worldId/locations/:locationId/private-notes')
  getLocationPrivateNotes(@Param('locationId') lid: string) { return this.svc.getLocationPrivateNotes(lid); }

  @Patch(':worldId/locations/:locationId/private-notes')
  @UseGuards(WorldOwnerGuard)
  async upsertLocationPrivateNotes(@Param('worldId') wid: string, @Param('locationId') lid: string, @Body() body: any) {
    const patch: { dataJson?: object; content?: Buffer } = {};
    if (body.dataJson !== undefined) patch.dataJson = body.dataJson;
    if (body.content !== undefined) patch.content = Buffer.from(body.content);
    const result = await this.svc.upsertLocationPrivateNotes(lid, patch);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Get(':worldId/locations/:locationId/notes')
  getLocationPublicNotes(@Param('locationId') lid: string) { return this.svc.getLocationPublicNotes(lid); }

  @Patch(':worldId/locations/:locationId/notes')
  @UseGuards(WorldOwnerGuard)
  async upsertLocationPublicNotes(@Param('worldId') wid: string, @Param('locationId') lid: string, @Body() body: any) {
    const result = await this.svc.upsertLocationPublicNotes(lid, Buffer.from(body.content));
    this.gateway.emit('updated', wid, {});
    return result;
  }

  // ─── NPC Notes ────────────────────────────────────────────────────────────

  @Get(':worldId/npcs/:npcId/private-notes')
  getNpcPrivateNotes(@Param('npcId') nid: string) { return this.svc.getNpcPrivateNotes(nid); }

  @Patch(':worldId/npcs/:npcId/private-notes')
  @UseGuards(WorldOwnerGuard)
  async upsertNpcPrivateNotes(@Param('worldId') wid: string, @Param('npcId') nid: string, @Body() body: any) {
    const result = await this.svc.upsertNpcPrivateNotes(nid, body);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Get(':worldId/npcs/:npcId/notes')
  getNpcPublicNotes(@Param('npcId') nid: string) { return this.svc.getNpcPublicNotes(nid); }

  @Patch(':worldId/npcs/:npcId/notes')
  @UseGuards(WorldOwnerGuard)
  async upsertNpcPublicNotes(@Param('worldId') wid: string, @Param('npcId') nid: string, @Body() body: any) {
    const result = await this.svc.upsertNpcPublicNotes(nid, Buffer.from(body.content));
    this.gateway.emit('updated', wid, {});
    return result;
  }

  // ─── Lore Notes ───────────────────────────────────────────────────────────

  @Get(':worldId/lore/:loreId/private-notes')
  getLorePrivateNotes(@Param('loreId') lid: string) { return this.svc.getLorePrivateNotes(lid); }

  @Patch(':worldId/lore/:loreId/private-notes')
  @UseGuards(WorldOwnerGuard)
  async upsertLorePrivateNotes(@Param('worldId') wid: string, @Param('loreId') lid: string, @Body() body: any) {
    const result = await this.svc.upsertLorePrivateNotes(lid, body);
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Get(':worldId/lore/:loreId/notes')
  getLorePublicNotes(@Param('loreId') lid: string) { return this.svc.getLorePublicNotes(lid); }

  @Patch(':worldId/lore/:loreId/notes')
  @UseGuards(WorldOwnerGuard)
  async upsertLorePublicNotes(@Param('worldId') wid: string, @Param('loreId') lid: string, @Body() body: any) {
    const result = await this.svc.upsertLorePublicNotes(lid, Buffer.from(body.content));
    this.gateway.emit('updated', wid, {});
    return result;
  }

  // ─── AI Settings ──────────────────────────────────────────────────────────

  @Get(':worldId/ai-settings')
  getAiSettings(@Param('worldId') wid: string) { return this.svc.getWorldAiSettings(wid); }

  @Patch(':worldId/ai-settings')
  @UseGuards(WorldOwnerGuard)
  async upsertAiSettings(@Param('worldId') wid: string, @Body() body: any) {
    const { provider, ...configPatch } = body;
    const result = await this.svc.upsertWorldAiSettings(wid, { provider, configPatch });
    this.gateway.emit('updated', wid, {});
    return result;
  }

  @Post(':worldId/owners')
  @UseGuards(WorldOwnerGuard)
  async addOwner(@Param('worldId') wid: string, @Body('userId') userId: string) {
    await this.svc.addOwner(wid, userId);
    this.gateway.emit('updated', wid, {});
  }

  @Delete(':worldId/owners/:userId')
  @UseGuards(WorldOwnerGuard)
  async removeOwner(@Param('worldId') wid: string, @Param('userId') uid: string) {
    await this.svc.removeOwner(wid, uid);
    this.gateway.emit('updated', wid, {});
  }
}
