import {
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get(':id')
  async getUser(@Req() req: any, @Param('id') id: string) {
    const requesterId: string = (req.user as { id: string }).id;
    const profile = await this.svc.findById(id);
    if (requesterId === id) return profile;
    // Return only public fields for other authenticated users
    return {
      id: profile.id,
      displayName: profile.displayName,
      photoUrl: profile.photoUrl,
      hidePhoto: profile.hidePhoto,
    };
  }

  @Patch(':id')
  updateUser(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const user = req.user as { id: string };
    if (user.id !== id) throw new ForbiddenException();
    return this.svc.update(id, body);
  }
}
