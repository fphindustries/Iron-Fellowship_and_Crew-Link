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
import { HomebrewService } from './homebrew.service';

@Controller('api/homebrew')
@UseGuards(JwtAuthGuard)
export class HomebrewController {
  constructor(private readonly svc: HomebrewService) {}

  @Get()
  findAll(@Req() req: any) {
    const user = req.user as { id: string };
    return this.svc.findAllForUser(user.id);
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

  @Get(':id/content')
  getContent(@Param('id') id: string) {
    return this.svc.getContent(id);
  }

  @Post(':id/content')
  addContent(@Param('id') id: string, @Body() body: any) {
    return this.svc.addContent(id, body.contentType, body.dataJson ?? body);
  }

  @Patch(':id/content/:contentId')
  updateContent(@Param('contentId') cid: string, @Body() body: any) {
    return this.svc.updateContent(cid, body.dataJson ?? body);
  }

  @Delete(':id/content/:contentId')
  removeContent(@Param('contentId') cid: string) {
    return this.svc.removeContent(cid);
  }

  @Post(':id/invite-keys')
  createInviteKey(@Param('id') id: string) {
    return this.svc.createInviteKey(id);
  }

  @Get('invite/:key')
  resolveInviteKey(@Param('key') key: string) {
    return this.svc.resolveInviteKey(key);
  }

  @Post('invite/:key/accept')
  acceptInvite(@Req() req: any, @Param('key') key: string) {
    const user = req.user as { id: string };
    return this.svc.acceptInvite(key, user.id);
  }

  @Post(':id/editors')
  addEditor(@Req() req: any, @Param('id') id: string) {
    const user = req.user as { id: string };
    return this.svc.addEditor(id, user.id);
  }

  @Delete(':id/editors/:userId')
  removeEditor(@Param('id') id: string, @Param('userId') uid: string) {
    return this.svc.removeEditor(id, uid);
  }
}
