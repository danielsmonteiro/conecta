import { Controller, Get, Module } from '@nestjs/common';

@Controller('settings')
export class SettingsController {
  // GET /api/settings/branding — público (carregado antes do login na produção).
  @Get('branding')
  branding() {
    return { hasCustomLogo: false, logoAttachmentId: null, logoUrl: null, updatedAt: null };
  }
}

@Module({ controllers: [SettingsController] })
export class SettingsModule {}
