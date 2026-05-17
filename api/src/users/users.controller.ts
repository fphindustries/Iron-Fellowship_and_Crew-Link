import { Controller, Get, Patch, Body, Param, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get(':id')
  getUser(@Req() req: any, @Param('id') id: string) {
    const user = req.user as { id: string };
    if (user.id !== id) throw new ForbiddenException();
    return this.svc.findById(id);
  }

  @Patch(':id')
  updateUser(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const user = req.user as { id: string };
    if (user.id !== id) throw new ForbiddenException();
    return this.svc.update(id, body);
  }
}
