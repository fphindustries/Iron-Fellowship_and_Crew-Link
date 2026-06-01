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
  findOne(@Req() req: any, @Param('id') id: string) {
    const user = req.user as { id: string };
    return this.svc.findOne(id, user.id);
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
  getAssets(@Req() req: any, @Param('characterId') cid: string) {
    const user = req.user as { id: string };
    return this.svc.getAssets(cid, user.id);
  }

  @Post(':characterId/assets')
  async addAsset(
    @Req() req: any,
    @Param('characterId') cid: string,
    @Body() body: any,
  ) {
    const user = req.user as { id: string };
    const result = await this.svc.addAsset(cid, body, user.id);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Patch(':characterId/assets/:id')
  async updateAsset(
    @Req() req: any,
    @Param('characterId') cid: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const user = req.user as { id: string };
    const result = await this.svc.updateAsset(cid, id, body, user.id);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Delete(':characterId/assets/:id')
  async removeAsset(
    @Req() req: any,
    @Param('characterId') cid: string,
    @Param('id') id: string,
  ) {
    const user = req.user as { id: string };
    await this.svc.removeAsset(cid, id, user.id);
    this.gateway.emit('updated', cid, {});
  }

  // ─── Tracks ───────────────────────────────────────────────────────────────

  @Get(':characterId/tracks')
  getTracks(@Req() req: any, @Param('characterId') cid: string) {
    const user = req.user as { id: string };
    return this.svc.getTracks(cid, user.id);
  }

  @Post(':characterId/tracks')
  async addTrack(
    @Req() req: any,
    @Param('characterId') cid: string,
    @Body() body: any,
  ) {
    const user = req.user as { id: string };
    const result = await this.svc.addTrack(cid, body, user.id);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Patch(':characterId/tracks/:id')
  async updateTrack(
    @Req() req: any,
    @Param('characterId') cid: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const user = req.user as { id: string };
    const result = await this.svc.updateTrack(
      cid,
      id,
      body.dataJson ?? body,
      user.id,
    );
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Delete(':characterId/tracks/:id')
  async removeTrack(
    @Req() req: any,
    @Param('characterId') cid: string,
    @Param('id') id: string,
  ) {
    const user = req.user as { id: string };
    await this.svc.removeTrack(cid, id, user.id);
    this.gateway.emit('updated', cid, {});
  }

  @Get(':characterId/sessions')
  getSessions(@Req() req: any, @Param('characterId') cid: string) {
    const user = req.user as { id: string };
    return this.svc.getSessions(cid, user.id);
  }

  @Get(':characterId/combat/active')
  getActiveCombat(@Req() req: any, @Param('characterId') cid: string) {
    const user = req.user as { id: string };
    return this.svc.getActiveCombat(cid, user.id);
  }

  @Post(':characterId/combat')
  async createCombat(
    @Req() req: any,
    @Param('characterId') cid: string,
    @Body() body: any,
  ) {
    const user = req.user as { id: string };
    const result = await this.svc.createCombat(cid, body, user.id);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Patch(':characterId/combat/:combatId')
  async updateCombat(
    @Req() req: any,
    @Param('characterId') cid: string,
    @Param('combatId') combatId: string,
    @Body() body: any,
  ) {
    const user = req.user as { id: string };
    const result = await this.svc.updateCombat(cid, combatId, body, user.id);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Delete(':characterId/combat/:combatId')
  async endCombat(
    @Req() req: any,
    @Param('characterId') cid: string,
    @Param('combatId') combatId: string,
  ) {
    const user = req.user as { id: string };
    const result = await this.svc.endCombat(cid, combatId, user.id);
    this.gateway.emit('updated', cid, {});
    return result;
  }
}
