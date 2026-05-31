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
  create(
    @Body() body: { characterId?: string; campaignId?: string; title?: string },
  ) {
    return this.svc.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { summary?: string; isActive?: boolean; title?: string },
  ) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
