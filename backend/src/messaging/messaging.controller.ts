import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsIn } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagingService } from './messaging.service';

class SetActiveProviderDto {
  @IsIn(['twilio', 'openwa']) provider: 'twilio' | 'openwa';
}

// Webhooks são PÚBLICOS (o provedor chama sem JWT) — a autenticidade é
// garantida pela validação de assinatura/secret dentro de cada adapter.
@Controller('integrations/webhooks')
export class WebhooksController {
  constructor(private readonly messaging: MessagingService) {}

  @Post(':provider')
  receive(
    @Param('provider') provider: string,
    @Body() body: Record<string, any>,
    @Headers() headers: Record<string, any>,
    @Req() req: Request,
  ) {
    const url = process.env.PUBLIC_BASE_URL
      ? `${process.env.PUBLIC_BASE_URL.replace(/\/$/, '')}${req.originalUrl}`
      : `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    return this.messaging.handleWebhook(provider, { body: body ?? {}, headers, url });
  }
}

// Endpoint autenticado para envio de teste durante a implantação do piloto.
@Controller('integrations/messaging')
@UseGuards(JwtAuthGuard)
export class MessagingAdminController {
  constructor(private readonly messaging: MessagingService) {}

  // Lista os adapters disponíveis (oficial/não-oficial, configurado, ativo).
  @Get('adapters')
  adapters() {
    return this.messaging.describeProviders();
  }

  // Flag: define o provedor ativo (twilio | openwa). Persistido.
  @Post('active')
  setActive(@Body() dto: SetActiveProviderDto) {
    return this.messaging.setActiveProvider(dto.provider);
  }

  @Post('test-send')
  test(
    @Body()
    body: {
      conversationId: string;
      body?: string;
      provider?: string;
      contentSid?: string;
      contentVariables?: Record<string, string>;
    },
  ) {
    return this.messaging.sendFromConversation(body.conversationId, body.body ?? '', {
      providerKey: body.provider,
      templateSid: body.contentSid,
      templateVars: body.contentVariables,
    });
  }
}
