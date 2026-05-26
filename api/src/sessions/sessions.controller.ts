import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SessionsService } from './sessions.service';

@Controller('api/sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly svc: SessionsService) {}

  @Get('active')
  findActive(
    @Query('characterId') characterId?: string,
    @Query('campaignId') campaignId?: string,
  ) {
    return this.svc.findActive({ characterId, campaignId });
  }

  @Post()
  create(@Body() body: { characterId?: string; campaignId?: string; title?: string }) {
    return this.svc.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { summary?: string; isActive?: boolean; title?: string },
  ) {
    return this.svc.update(id, body);
  }

  @Get(':id/events')
  findEvents(@Param('id') id: string) {
    return this.svc.findEvents(id);
  }

  @Post(':id/events')
  addEvent(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.svc.addEvent(id, { ...body, createdBy: req.user?.id });
  }

  @Patch(':id/events/:eventId')
  updateEvent(
    @Param('eventId') eventId: string,
    @Body() body: { dataJson: any },
  ) {
    return this.svc.updateEvent(eventId, body.dataJson ?? body);
  }

  @Delete(':id/events/:eventId')
  removeEvent(@Param('eventId') eventId: string) {
    return this.svc.removeEvent(eventId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
