import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsInt, IsNumber, IsObject, Max, Min } from 'class-validator';
import type { Permissions } from '../../../../shared/access.types';
import { RequirePage } from '../../common/guards/access.guard';
import { SettingsService } from './settings.service';
class ConfigDto {
  @IsNumber() @Min(0) @Max(1000000000) mdApprovalThreshold!: number;
  @IsInt() @Min(0) @Max(10) maxResubmissions!: number;
  @IsInt() @Min(1) @Max(2000) minRejectionCommentLength!: number;
}
class PermissionsDto { @IsObject() permissions!: Permissions; }
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}
  @RequirePage('config') @Get('config') config() { return this.service.get().config; }
  @RequirePage('config') @Post('config') saveConfig(@Body() dto: ConfigDto) { return this.service.updateConfig(dto); }
  @RequirePage('permissions') @Get('permissions') permissions() { return this.service.get().permissions; }
  @RequirePage('permissions') @Post('permissions') savePermissions(@Body() dto: PermissionsDto) { return this.service.updatePermissions(dto.permissions); }
}
