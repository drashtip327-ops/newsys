import { Controller, Get } from '@nestjs/common';
import { Public } from './common/guards/access.guard';
import { storageCommand, storageConfigured, storageKind } from './common/storage';

@Controller('health')
export class HealthController {
  @Public() @Get() async health() {
    if (process.env.VERCEL && !storageConfigured()) throw new Error('Shared storage is not configured');
    if (storageConfigured()) await storageCommand('PING');
    return { status: 'ok', service: 'payment-approval-backend', storage: storageKind() };
  }
}
