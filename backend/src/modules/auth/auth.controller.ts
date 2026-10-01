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
  @Public() @Post('login') login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return { user: this.auth.login(dto.username, dto.password, req, res), ...this.settings.get() };
  }
  @Get('me') me(@Req() req: Request) { return { user: this.auth.user(req), ...this.settings.get() }; }
  @Public() @Post('logout') logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { this.auth.logout(req, res); return { loggedOut: true }; }
}
