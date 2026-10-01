import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import { Public } from '../../common/guards/access.guard';
import { AuthService } from './auth.service';
import { SettingsService } from '../settings/settings.service';
class LoginDto {
  @IsString() @MinLength(1) @MaxLength(40) username!: string;
  @IsString() @MinLength(1) @MaxLength(100) password!: string;
}
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly settings: SettingsService) {}
  @Public() @Post('login') async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return { user: await this.auth.login(dto.username, dto.password, req, res), ...await this.settings.get() };
  }
  @Get('me') async me(@Req() req: Request) { return { user: await this.auth.user(req), ...await this.settings.get() }; }
  @Public() @Post('logout') async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { await this.auth.logout(req, res); return { loggedOut: true }; }
}
