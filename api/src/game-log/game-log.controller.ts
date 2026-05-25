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
import { GameLogService } from './game-log.service';

@Controller('api/game-log')
@UseGuards(JwtAuthGuard)
export class GameLogController {
  constructor(private readonly svc: GameLogService) {}

  @Get()
  findAll(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.svc.findAll(entityType, entityId);
  }

  @Post()
  addEntry(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Body() body: any,
  ) {
    return this.svc.addEntry(entityType, entityId, body);
  }

  @Patch(':id')
  updateEntry(
    @Param('id') id: string,
    @Query('entityType') entityType: string,
    @Body() body: any,
  ) {
    return this.svc.updateEntry(id, entityType, body);
  }

  @Delete(':id')
  removeEntry(@Param('id') id: string) {
    return this.svc.removeEntry(id);
  }

  @Delete()
  clearLog(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.svc.clearLog(entityType, entityId);
  }
}
