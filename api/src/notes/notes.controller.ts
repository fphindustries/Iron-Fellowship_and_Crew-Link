import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotesService } from './notes.service';

@Controller('api/notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly svc: NotesService) {}

  @Get()
  findAll(@Query('entityType') entityType: string, @Query('entityId') entityId: string) {
    return this.svc.findAll(entityType, entityId);
  }

  @Get(':id/content')
  getContent(@Param('id') id: string) {
    return this.svc.getContent(id);
  }

  @Post()
  create(@Query('entityType') entityType: string, @Query('entityId') entityId: string, @Body() body: any) {
    return this.svc.create(entityType, entityId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
