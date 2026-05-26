import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CharactersService } from './characters.service';
import { CharacterGateway } from '../realtime/character.gateway';

@Controller('api/characters')
@UseGuards(JwtAuthGuard)
export class CharactersController {
  constructor(
    private readonly svc: CharactersService,
    private readonly gateway: CharacterGateway,
  ) {}

  @Get()
  findAll(@Req() req: any) {
    const user = req.user as { id: string };
    return this.svc.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const user = req.user as { id: string };
    const result = await this.svc.create(user.id, body);
    this.gateway.emit('updated', result.id, {});
    return result;
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const user = req.user as { id: string };
    const result = await this.svc.update(id, user.id, body);
    this.gateway.emit('updated', id, {});
    return result;
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const user = req.user as { id: string };
    await this.svc.remove(id, user.id);
    this.gateway.emit('updated', id, {});
  }

  // ─── Assets ───────────────────────────────────────────────────────────────

  @Get(':characterId/assets')
  getAssets(@Param('characterId') cid: string) {
    return this.svc.getAssets(cid);
  }

  @Post(':characterId/assets')
  async addAsset(@Param('characterId') cid: string, @Body() body: any) {
    const result = await this.svc.addAsset(cid, body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Patch(':characterId/assets/:id')
  async updateAsset(
    @Param('characterId') cid: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const result = await this.svc.updateAsset(id, body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Delete(':characterId/assets/:id')
  async removeAsset(
    @Param('characterId') cid: string,
    @Param('id') id: string,
  ) {
    await this.svc.removeAsset(id);
    this.gateway.emit('updated', cid, {});
  }

  // ─── Tracks ───────────────────────────────────────────────────────────────

  @Get(':characterId/tracks')
  getTracks(@Param('characterId') cid: string) {
    return this.svc.getTracks(cid);
  }

  @Post(':characterId/tracks')
  async addTrack(@Param('characterId') cid: string, @Body() body: any) {
    const result = await this.svc.addTrack(cid, body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Patch(':characterId/tracks/:id')
  async updateTrack(
    @Param('characterId') cid: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const result = await this.svc.updateTrack(id, body.dataJson ?? body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Delete(':characterId/tracks/:id')
  async removeTrack(
    @Param('characterId') cid: string,
    @Param('id') id: string,
  ) {
    await this.svc.removeTrack(id);
    this.gateway.emit('updated', cid, {});
  }

  @Get(':characterId/sessions')
  getSessions(@Param('characterId') cid: string) {
    return this.svc.getSessions(cid);
  }

  @Get(':characterId/combat/active')
  getActiveCombat(@Param('characterId') cid: string) {
    return this.svc.getActiveCombat(cid);
  }

  @Post(':characterId/combat')
  async createCombat(@Param('characterId') cid: string, @Body() body: any) {
    const result = await this.svc.createCombat(cid, body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Patch(':characterId/combat/:combatId')
  async updateCombat(
    @Param('characterId') cid: string,
    @Param('combatId') combatId: string,
    @Body() body: any,
  ) {
    const result = await this.svc.updateCombat(combatId, body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Delete(':characterId/combat/:combatId')
  async endCombat(
    @Param('characterId') cid: string,
    @Param('combatId') combatId: string,
  ) {
    const result = await this.svc.endCombat(combatId);
    this.gateway.emit('updated', cid, {});
    return result;
  }
}
