import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WorldOwnerGuard } from '../common/guards/world-owner.guard';
import { WorldsService } from './worlds.service';

@Controller('api/worlds')
@UseGuards(JwtAuthGuard)
export class WorldsController {
  constructor(private readonly svc: WorldsService) {}

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
  create(@Req() req: any, @Body() body: any) {
    const user = req.user as { id: string };
    return this.svc.create(user.id, body);
  }

  @Patch(':worldId')
  @UseGuards(WorldOwnerGuard)
  update(@Param('worldId') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(':worldId')
  @UseGuards(WorldOwnerGuard)
  remove(@Param('worldId') id: string) {
    return this.svc.remove(id);
  }

  // ─── Locations ────────────────────────────────────────────────────────────

  @Get(':worldId/locations')
  getLocations(@Param('worldId') wid: string) { return this.svc.getLocations(wid); }

  @Post(':worldId/locations')
  @UseGuards(WorldOwnerGuard)
  createLocation(@Param('worldId') wid: string, @Body() body: any) { return this.svc.createLocation(wid, body); }

  @Patch(':worldId/locations/:id')
  @UseGuards(WorldOwnerGuard)
  updateLocation(@Param('id') id: string, @Body() body: any) { return this.svc.updateLocation(id, body); }

  @Delete(':worldId/locations/:id')
  @UseGuards(WorldOwnerGuard)
  removeLocation(@Param('id') id: string) { return this.svc.removeLocation(id); }

  // ─── NPCs ─────────────────────────────────────────────────────────────────

  @Get(':worldId/npcs')
  getNpcs(@Param('worldId') wid: string) { return this.svc.getNpcs(wid); }

  @Post(':worldId/npcs')
  @UseGuards(WorldOwnerGuard)
  createNpc(@Param('worldId') wid: string, @Body() body: any) { return this.svc.createNpc(wid, body); }

  @Patch(':worldId/npcs/:id')
  @UseGuards(WorldOwnerGuard)
  updateNpc(@Param('id') id: string, @Body() body: any) { return this.svc.updateNpc(id, body); }

  @Delete(':worldId/npcs/:id')
  @UseGuards(WorldOwnerGuard)
  removeNpc(@Param('id') id: string) { return this.svc.removeNpc(id); }

  // ─── Lore ─────────────────────────────────────────────────────────────────

  @Get(':worldId/lore')
  getLore(@Param('worldId') wid: string) { return this.svc.getLore(wid); }

  @Post(':worldId/lore')
  @UseGuards(WorldOwnerGuard)
  createLore(@Param('worldId') wid: string, @Body() body: any) { return this.svc.createLore(wid, body); }

  @Patch(':worldId/lore/:id')
  @UseGuards(WorldOwnerGuard)
  updateLore(@Param('id') id: string, @Body() body: any) { return this.svc.updateLore(id, body); }

  @Delete(':worldId/lore/:id')
  @UseGuards(WorldOwnerGuard)
  removeLore(@Param('id') id: string) { return this.svc.removeLore(id); }

  // ─── Sectors ──────────────────────────────────────────────────────────────

  @Get(':worldId/sectors')
  getSectors(@Param('worldId') wid: string) { return this.svc.getSectors(wid); }

  @Post(':worldId/sectors')
  @UseGuards(WorldOwnerGuard)
  createSector(@Param('worldId') wid: string, @Body() body: any) { return this.svc.createSector(wid, body); }

  @Patch(':worldId/sectors/:id')
  @UseGuards(WorldOwnerGuard)
  updateSector(@Param('id') id: string, @Body() body: any) { return this.svc.updateSector(id, body); }

  @Delete(':worldId/sectors/:id')
  @UseGuards(WorldOwnerGuard)
  removeSector(@Param('id') id: string) { return this.svc.removeSector(id); }

  // ─── Sector Notes and Locations ───────────────────────────────────────────

  @Patch(':worldId/sectors/:sectorId/notes')
  @UseGuards(WorldOwnerGuard)
  upsertSectorNotes(@Param('sectorId') sid: string, @Body() body: any) {
    return this.svc.upsertSectorNotes(sid, body.isPrivate ?? false, Buffer.from(body.content));
  }

  @Get(':worldId/sectors/:sectorId/locations')
  getSectorLocations(@Param('sectorId') sid: string) { return this.svc.getSectorLocations(sid); }

  @Post(':worldId/sectors/:sectorId/locations')
  @UseGuards(WorldOwnerGuard)
  createSectorLocation(@Param('sectorId') sid: string, @Body() body: any) {
    return this.svc.createSectorLocation(sid, body);
  }

  @Patch(':worldId/sectors/:sectorId/locations/:locationId')
  @UseGuards(WorldOwnerGuard)
  updateSectorLocation(@Param('locationId') lid: string, @Body() body: any) {
    return this.svc.updateSectorLocation(lid, body);
  }

  @Delete(':worldId/sectors/:sectorId/locations/:locationId')
  @UseGuards(WorldOwnerGuard)
  removeSectorLocation(@Param('locationId') lid: string) { return this.svc.removeSectorLocation(lid); }

  // ─── Location Notes ───────────────────────────────────────────────────────

  @Get(':worldId/locations/:locationId/private-notes')
  getLocationPrivateNotes(@Param('locationId') lid: string) { return this.svc.getLocationPrivateNotes(lid); }

  @Patch(':worldId/locations/:locationId/private-notes')
  @UseGuards(WorldOwnerGuard)
  upsertLocationPrivateNotes(@Param('locationId') lid: string, @Body() body: any) {
    const patch: { dataJson?: object; content?: Buffer } = {};
    if (body.dataJson !== undefined) patch.dataJson = body.dataJson;
    if (body.content !== undefined) patch.content = Buffer.from(body.content);
    return this.svc.upsertLocationPrivateNotes(lid, patch);
  }

  @Get(':worldId/locations/:locationId/notes')
  getLocationPublicNotes(@Param('locationId') lid: string) { return this.svc.getLocationPublicNotes(lid); }

  @Patch(':worldId/locations/:locationId/notes')
  @UseGuards(WorldOwnerGuard)
  upsertLocationPublicNotes(@Param('locationId') lid: string, @Body() body: any) {
    return this.svc.upsertLocationPublicNotes(lid, Buffer.from(body.content));
  }

  // ─── NPC Notes ────────────────────────────────────────────────────────────

  @Get(':worldId/npcs/:npcId/private-notes')
  getNpcPrivateNotes(@Param('npcId') nid: string) { return this.svc.getNpcPrivateNotes(nid); }

  @Patch(':worldId/npcs/:npcId/private-notes')
  @UseGuards(WorldOwnerGuard)
  upsertNpcPrivateNotes(@Param('npcId') nid: string, @Body() body: any) {
    return this.svc.upsertNpcPrivateNotes(nid, body);
  }

  @Get(':worldId/npcs/:npcId/notes')
  getNpcPublicNotes(@Param('npcId') nid: string) { return this.svc.getNpcPublicNotes(nid); }

  @Patch(':worldId/npcs/:npcId/notes')
  @UseGuards(WorldOwnerGuard)
  upsertNpcPublicNotes(@Param('npcId') nid: string, @Body() body: any) {
    return this.svc.upsertNpcPublicNotes(nid, Buffer.from(body.content));
  }

  // ─── Lore Notes ───────────────────────────────────────────────────────────

  @Get(':worldId/lore/:loreId/private-notes')
  getLorePrivateNotes(@Param('loreId') lid: string) { return this.svc.getLorePrivateNotes(lid); }

  @Patch(':worldId/lore/:loreId/private-notes')
  @UseGuards(WorldOwnerGuard)
  upsertLorePrivateNotes(@Param('loreId') lid: string, @Body() body: any) {
    return this.svc.upsertLorePrivateNotes(lid, body);
  }

  @Get(':worldId/lore/:loreId/notes')
  getLorePublicNotes(@Param('loreId') lid: string) { return this.svc.getLorePublicNotes(lid); }

  @Patch(':worldId/lore/:loreId/notes')
  @UseGuards(WorldOwnerGuard)
  upsertLorePublicNotes(@Param('loreId') lid: string, @Body() body: any) {
    return this.svc.upsertLorePublicNotes(lid, Buffer.from(body.content));
  }

  // ─── AI Settings ──────────────────────────────────────────────────────────

  @Get(':worldId/ai-settings')
  getAiSettings(@Param('worldId') wid: string) { return this.svc.getWorldAiSettings(wid); }

  @Patch(':worldId/ai-settings')
  @UseGuards(WorldOwnerGuard)
  upsertAiSettings(@Param('worldId') wid: string, @Body() body: any) {
    return this.svc.upsertWorldAiSettings(wid, body);
  }

  @Post(':worldId/owners')
  @UseGuards(WorldOwnerGuard)
  addOwner(@Param('worldId') wid: string, @Body('userId') userId: string) {
    return this.svc.addOwner(wid, userId);
  }

  @Delete(':worldId/owners/:userId')
  @UseGuards(WorldOwnerGuard)
  removeOwner(@Param('worldId') wid: string, @Param('userId') uid: string) {
    return this.svc.removeOwner(wid, uid);
  }
}
