import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PaymentsModule } from './modules/payments/payments.module';
import { AuthService } from './modules/auth/auth.service';
import { AuthController } from './modules/auth/auth.controller';
import { SettingsService } from './modules/settings/settings.service';
import { SettingsController } from './modules/settings/settings.controller';
import { AccessGuard } from './common/guards/access.guard';

@Global()
@Module({ imports: [PaymentsModule], controllers: [AuthController, SettingsController], providers: [AuthService, SettingsService, { provide: APP_GUARD, useClass: AccessGuard }], exports: [SettingsService] })
export class AppModule {}
