import { Controller, Get, Injectable, Module, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto, paginate } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/integrations/messaging/status — config do provedor (Twilio), igual à produção.
  messagingStatus() {
    const e = process.env;
    const hasAccountSid = !!e.TWILIO_ACCOUNT_SID;
    const hasAuthToken = !!e.TWILIO_AUTH_TOKEN;
    const hasPhoneNumber = !!e.TWILIO_PHONE_NUMBER;
    return {
      provider: e.MESSAGING_PROVIDER ?? 'twilio',
      hasAccountSid,
      hasAuthToken,
      hasPhoneNumber,
      hasWhatsappFrom: !!e.TWILIO_WHATSAPP_FROM,
      hasTestWhatsappTo: !!e.TWILIO_TEST_WHATSAPP_TO,
      validateSignatureEnabled: e.TWILIO_VALIDATE_SIGNATURE !== 'false',
      isConfigured: hasAccountSid && hasAuthToken && hasPhoneNumber,
      twilioMessagingServiceConfigured: !!e.TWILIO_MESSAGING_SERVICE_SID,
    };
  }

  // GET /api/integrations/messaging/providers — descritores de canal.
  providers() {
    const status = this.messagingStatus();
    return [
      { provider: 'twilio', channel: 'WHATSAPP', enabled: true, configured: status.isConfigured },
      { provider: 'twilio', channel: 'SMS', enabled: false, configured: status.isConfigured },
    ];
  }

  async outboundLogs(q: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.outboundMessageLog.findMany({
        orderBy: { createdAt: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.outboundMessageLog.count(),
    ]);
    return paginate(items, total, q.page, q.limit);
  }

  async webhookLogs(q: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.webhookLog.findMany({
        orderBy: { createdAt: q.sortOrder },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.webhookLog.count(),
    ]);
    return paginate(items, total, q.page, q.limit);
  }
}

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get('messaging/providers')
  providers() {
    return this.service.providers();
  }

  @Get('messaging/status')
  status() {
    return this.service.messagingStatus();
  }

  @Get('outbound-message-logs')
  outbound(@Query() q: PaginationDto) {
    return this.service.outboundLogs(q);
  }

  @Get('webhook-logs')
  webhooks(@Query() q: PaginationDto) {
    return this.service.webhookLogs(q);
  }
}

@Module({
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
})
export class IntegrationsModule {}
