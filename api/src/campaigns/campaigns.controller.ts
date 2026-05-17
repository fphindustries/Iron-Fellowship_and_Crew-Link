import {
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CampaignMemberGuard } from '../common/guards/campaign-member.guard';
import { CampaignsService } from './campaigns.service';

@Controller('api/campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly svc: CampaignsService) {}

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
  @UseGuards(CampaignMemberGuard)
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  @UseGuards(CampaignMemberGuard)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':campaignId/members')
  @UseGuards(CampaignMemberGuard)
  addMember(@Param('campaignId') cid: string, @Body('userId') userId: string) {
    return this.svc.addMember(cid, userId);
  }

  @Delete(':campaignId/members/:userId')
  @UseGuards(CampaignMemberGuard)
  removeMember(@Param('campaignId') cid: string, @Param('userId') uid: string) {
    return this.svc.removeMember(cid, uid);
  }

  @Post(':campaignId/characters')
  @UseGuards(CampaignMemberGuard)
  addCharacter(@Req() req: any, @Param('campaignId') cid: string, @Body('characterId') charId: string) {
    const user = req.user as { id: string };
    return this.svc.addCharacter(cid, user.id, charId);
  }

  @Delete(':campaignId/characters/:characterId')
  @UseGuards(CampaignMemberGuard)
  removeCharacter(@Param('campaignId') cid: string, @Param('characterId') charId: string) {
    return this.svc.removeCharacter(cid, charId);
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
  addGm(@Param('campaignId') cid: string, @Body('userId') userId: string) {
    return this.svc.addGm(cid, userId);
  }

  @Delete(':campaignId/gms/:userId')
  @UseGuards(CampaignMemberGuard)
  removeGm(@Param('campaignId') cid: string, @Param('userId') uid: string) {
    return this.svc.removeGm(cid, uid);
  }

  @Get(':campaignId/assets')
  @UseGuards(CampaignMemberGuard)
  getAssets(@Param('campaignId') cid: string) {
    return this.svc.getAssets(cid);
  }

  @Post(':campaignId/assets')
  @UseGuards(CampaignMemberGuard)
  addAsset(@Param('campaignId') cid: string, @Body() body: any) {
    return this.svc.addAsset(cid, body);
  }

  @Patch(':campaignId/assets/:id')
  @UseGuards(CampaignMemberGuard)
  updateAsset(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateAsset(id, body);
  }

  @Delete(':campaignId/assets/:id')
  @UseGuards(CampaignMemberGuard)
  removeAsset(@Param('id') id: string) {
    return this.svc.removeAsset(id);
  }

  @Get(':campaignId/tracks')
  @UseGuards(CampaignMemberGuard)
  getTracks(@Param('campaignId') cid: string) {
    return this.svc.getTracks(cid);
  }

  @Post(':campaignId/tracks')
  @UseGuards(CampaignMemberGuard)
  addTrack(@Param('campaignId') cid: string, @Body() body: any) {
    return this.svc.addTrack(cid, body);
  }

  @Patch(':campaignId/tracks/:id')
  @UseGuards(CampaignMemberGuard)
  updateTrack(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateTrack(id, body);
  }

  @Delete(':campaignId/tracks/:id')
  @UseGuards(CampaignMemberGuard)
  removeTrack(@Param('id') id: string) {
    return this.svc.removeTrack(id);
  }
}
