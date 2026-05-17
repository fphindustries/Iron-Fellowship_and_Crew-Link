import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CharactersService } from './characters.service';

@Controller('api/characters')
@UseGuards(JwtAuthGuard)
export class CharactersController {
  constructor(private readonly svc: CharactersService) {}

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
  create(@Req() req: any, @Body() body: any) {
    const user = req.user as { id: string };
    return this.svc.create(user.id, body);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const user = req.user as { id: string };
    return this.svc.update(id, user.id, body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    const user = req.user as { id: string };
    return this.svc.remove(id, user.id);
  }

  // ─── Assets ───────────────────────────────────────────────────────────────

  @Get(':characterId/assets')
  getAssets(@Param('characterId') cid: string) {
    return this.svc.getAssets(cid);
  }

  @Post(':characterId/assets')
  addAsset(@Param('characterId') cid: string, @Body() body: any) {
    return this.svc.addAsset(cid, body);
  }

  @Patch(':characterId/assets/:id')
  updateAsset(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateAsset(id, body);
  }

  @Delete(':characterId/assets/:id')
  removeAsset(@Param('id') id: string) {
    return this.svc.removeAsset(id);
  }

  // ─── Tracks ───────────────────────────────────────────────────────────────

  @Get(':characterId/tracks')
  getTracks(@Param('characterId') cid: string) {
    return this.svc.getTracks(cid);
  }

  @Post(':characterId/tracks')
  addTrack(@Param('characterId') cid: string, @Body() body: any) {
    return this.svc.addTrack(cid, body);
  }

  @Patch(':characterId/tracks/:id')
  updateTrack(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateTrack(id, body.dataJson ?? body);
  }

  @Delete(':characterId/tracks/:id')
  removeTrack(@Param('id') id: string) {
    return this.svc.removeTrack(id);
  }
}
