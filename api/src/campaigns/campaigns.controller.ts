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
import { CampaignMemberGuard } from '../common/guards/campaign-member.guard';
import { CampaignsService } from './campaigns.service';
import { CampaignGateway } from '../realtime/campaign.gateway';

@Controller('api/campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(
    private readonly svc: CampaignsService,
    private readonly gateway: CampaignGateway,
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
    if (body.type === 'co-op') body.type = 'coop';
    const result = await this.svc.create(user.id, body);
    this.gateway.emit('updated', result.id, {});
    return result;
  }

  @Patch(':id')
  @UseGuards(CampaignMemberGuard)
  async update(@Param('id') id: string, @Body() body: any) {
    if (body.type === 'co-op') body.type = 'coop';
    const result = await this.svc.update(id, body);
    this.gateway.emit('updated', id, {});
    return result;
  }

  @Delete(':id')
  @UseGuards(CampaignMemberGuard)
  async remove(@Param('id') id: string) {
    await this.svc.remove(id);
    this.gateway.emit('updated', id, {});
  }

  @Post(':campaignId/members')
  @UseGuards(CampaignMemberGuard)
  async addMember(
    @Param('campaignId') cid: string,
    @Body('userId') userId: string,
  ) {
    await this.svc.addMember(cid, userId);
    this.gateway.emit('updated', cid, {});
  }

  @Delete(':campaignId/members/:userId')
  @UseGuards(CampaignMemberGuard)
  async removeMember(
    @Param('campaignId') cid: string,
    @Param('userId') uid: string,
  ) {
    await this.svc.removeMember(cid, uid);
    this.gateway.emit('updated', cid, {});
  }

  @Post(':campaignId/characters')
  @UseGuards(CampaignMemberGuard)
  async addCharacter(
    @Req() req: any,
    @Param('campaignId') cid: string,
    @Body('characterId') charId: string,
  ) {
    const user = req.user as { id: string };
    await this.svc.addCharacter(cid, user.id, charId);
    this.gateway.emit('updated', cid, {});
  }

  @Delete(':campaignId/characters/:characterId')
  @UseGuards(CampaignMemberGuard)
  async removeCharacter(
    @Param('campaignId') cid: string,
    @Param('characterId') charId: string,
  ) {
    await this.svc.removeCharacter(cid, charId);
    this.gateway.emit('updated', cid, {});
  }

  @Get(':campaignId/ai-guide-state')
  @UseGuards(CampaignMemberGuard)
  getAiGuideState(@Param('campaignId') cid: string) {
    return this.svc.getAiGuideState(cid);
  }

  @Patch(':campaignId/ai-guide-state')
  @UseGuards(CampaignMemberGuard)
  upsertAiGuideState(@Param('campaignId') cid: string, @Body() body: any) {
    return this.svc.upsertAiGuideState(cid, body);
  }

  @Get(':campaignId/ai-events')
  @UseGuards(CampaignMemberGuard)
  getAiEvents(@Param('campaignId') cid: string) {
    return this.svc.getAiEvents(cid);
  }

  @Patch(':campaignId/ai-events/:eventId')
  @UseGuards(CampaignMemberGuard)
  updateAiEvent(@Param('eventId') eventId: string, @Body() body: any) {
    return this.svc.updateAiEvent(eventId, body);
  }

  @Post(':campaignId/gms')
  @UseGuards(CampaignMemberGuard)
  async addGm(
    @Param('campaignId') cid: string,
    @Body('userId') userId: string,
  ) {
    await this.svc.addGm(cid, userId);
    this.gateway.emit('updated', cid, {});
  }

  @Delete(':campaignId/gms/:userId')
  @UseGuards(CampaignMemberGuard)
  async removeGm(
    @Param('campaignId') cid: string,
    @Param('userId') uid: string,
  ) {
    await this.svc.removeGm(cid, uid);
    this.gateway.emit('updated', cid, {});
  }

  @Get(':campaignId/assets')
  @UseGuards(CampaignMemberGuard)
  getAssets(@Param('campaignId') cid: string) {
    return this.svc.getAssets(cid);
  }

  @Post(':campaignId/assets')
  @UseGuards(CampaignMemberGuard)
  async addAsset(@Param('campaignId') cid: string, @Body() body: any) {
    const result = await this.svc.addAsset(cid, body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Patch(':campaignId/assets/:id')
  @UseGuards(CampaignMemberGuard)
  async updateAsset(
    @Param('campaignId') cid: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const result = await this.svc.updateAsset(id, body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Delete(':campaignId/assets/:id')
  @UseGuards(CampaignMemberGuard)
  async removeAsset(@Param('campaignId') cid: string, @Param('id') id: string) {
    await this.svc.removeAsset(id);
    this.gateway.emit('updated', cid, {});
  }

  @Get(':campaignId/tracks')
  @UseGuards(CampaignMemberGuard)
  getTracks(@Param('campaignId') cid: string) {
    return this.svc.getTracks(cid);
  }

  @Post(':campaignId/tracks')
  @UseGuards(CampaignMemberGuard)
  async addTrack(@Param('campaignId') cid: string, @Body() body: any) {
    const result = await this.svc.addTrack(cid, body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Patch(':campaignId/tracks/:id')
  @UseGuards(CampaignMemberGuard)
  async updateTrack(
    @Param('campaignId') cid: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const result = await this.svc.updateTrack(id, body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Delete(':campaignId/tracks/:id')
  @UseGuards(CampaignMemberGuard)
  async removeTrack(@Param('campaignId') cid: string, @Param('id') id: string) {
    await this.svc.removeTrack(id);
    this.gateway.emit('updated', cid, {});
  }

  @Get(':campaignId/sessions')
  @UseGuards(CampaignMemberGuard)
  getSessions(@Param('campaignId') cid: string) {
    return this.svc.getSessions(cid);
  }

  @Get(':campaignId/combat/active')
  @UseGuards(CampaignMemberGuard)
  getActiveCombat(@Param('campaignId') cid: string) {
    return this.svc.getActiveCombat(cid);
  }

  @Post(':campaignId/combat')
  @UseGuards(CampaignMemberGuard)
  async createCombat(@Param('campaignId') cid: string, @Body() body: any) {
    const result = await this.svc.createCombat(cid, body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Patch(':campaignId/combat/:combatId')
  @UseGuards(CampaignMemberGuard)
  async updateCombat(
    @Param('campaignId') cid: string,
    @Param('combatId') combatId: string,
    @Body() body: any,
  ) {
    const result = await this.svc.updateCombat(combatId, body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Delete(':campaignId/combat/:combatId')
  @UseGuards(CampaignMemberGuard)
  async endCombat(
    @Param('campaignId') cid: string,
    @Param('combatId') combatId: string,
  ) {
    const result = await this.svc.endCombat(combatId);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Get(':campaignId/starship')
  @UseGuards(CampaignMemberGuard)
  getStarship(@Param('campaignId') cid: string) {
    return this.svc.getStarship(cid);
  }

  @Patch(':campaignId/starship')
  @UseGuards(CampaignMemberGuard)
  async upsertStarship(@Param('campaignId') cid: string, @Body() body: any) {
    const result = await this.svc.upsertStarship(cid, body);
    this.gateway.emit('updated', cid, {});
    return result;
  }

  @Delete(':campaignId/starship')
  @UseGuards(CampaignMemberGuard)
  async deleteStarship(@Param('campaignId') cid: string) {
    await this.svc.deleteStarship(cid);
    this.gateway.emit('updated', cid, {});
  }
}
