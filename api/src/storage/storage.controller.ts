import { Controller, Post, Get, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StorageService } from './storage.service';

@Controller('api/storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly svc: StorageService) {}

  @Post('upload-url')
  createUploadUrl(@Body('key') key: string, @Body('contentType') contentType: string) {
    return this.svc.createUploadUrl(key, contentType);
  }

  @Get('url')
  getDownloadUrl(@Query('key') key: string) {
    return this.svc.getDownloadUrl(key);
  }

  @Delete('objects')
  deleteObject(@Body('key') key: string) {
    return this.svc.deleteObject(key);
  }
}
