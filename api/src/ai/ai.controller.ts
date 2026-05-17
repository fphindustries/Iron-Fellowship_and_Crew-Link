import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@Controller('api/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly svc: AiService) {}

  @Post('guide')
  callGuide(@Req() req: any, @Body() body: any) {
    return this.svc.callGuide((req.user as { id: string }).id, body);
  }

  @Get('events')
  getEvents(@Query('campaignId') campaignId: string) {
    return this.svc.getEvents(campaignId);
  }

  @Patch('events/:id')
  updateEventStatus(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateEventStatus(id, body);
  }

  @Post('character/paths')
  recommendPaths(@Body() body: any) {
    return this.svc.recommendPaths(body);
  }

  @Post('character/backstory')
  generateBackstory(@Body() body: any) {
    return this.svc.generateBackstory(body);
  }

  @Post('character/vow')
  generateVow(@Body() body: any) {
    return this.svc.generateVow(body);
  }

  @Post('character/asset')
  recommendFinalAsset(@Body() body: any) {
    return this.svc.recommendFinalAsset(body);
  }

  @Post('character/stats')
  recommendStatAllocation(@Body() body: any) {
    return this.svc.recommendStatAllocation(body);
  }

  @Post('character/appearance')
  randomizeAppearance(@Body() body: any) {
    return this.svc.randomizeAppearance(body);
  }

  @Post('character/portraits')
  generatePortraits(@Body() body: any) {
    return this.svc.generatePortraits(body);
  }

  @Post('character/summary')
  generateCharacterSummary(@Body() body: any) {
    return this.svc.generateCharacterSummary(body);
  }

  @Post('world/description')
  generateWorldDescription(@Body() body: any) {
    return this.svc.generateWorldDescription(body);
  }

  @Post('sector/content')
  generateSectorContent(@Body() body: any) {
    return this.svc.generateSectorContent(body);
  }
}
