import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    /* Passport redirects */
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: any, @Res() res: any) {
    const user = req.user as { id: string; email: string };
    const { accessToken, refreshToken } = this.authService.issueTokens(
      user.id,
      user.email,
    );
    this.setCookies(res, accessToken, refreshToken);
    res.redirect(this.config.getOrThrow<string>('FRONTEND_URL'));
  }

  @Post('magic-link/send')
  async sendMagicLink(@Body('email') email: string) {
    if (!email) throw new UnauthorizedException('Email required');
    await this.authService.sendMagicLink(email);
    return { ok: true };
  }

  @Get('magic-link/verify')
  async verifyMagicLink(@Query('token') token: string, @Res() res: any) {
    const user = await this.authService.verifyMagicLink(token);
    const { accessToken, refreshToken } = this.authService.issueTokens(
      user.id,
      user.email,
    );
    this.setCookies(res, accessToken, refreshToken);
    res.redirect(this.config.getOrThrow<string>('FRONTEND_URL'));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    const user = req.user as { id: string };
    return this.authService.getMe(user.id);
  }

  @Post('logout')
  logout(@Res() res: any) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.json({ ok: true });
  }

  private setCookies(res: any, accessToken: string, refreshToken: string) {
    const secure = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
