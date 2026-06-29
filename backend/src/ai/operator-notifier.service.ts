import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Avisa os operadores quando uma conversa é transferida para humano (handoff).
 * Best-effort: se OPERATOR_NOTIFY_WEBHOOK_URL estiver setado, faz POST de um JSON
 * compatível com Slack/Teams/Discord (campos `text`/`content`) + dados estruturados;
 * senão, apenas registra em log (o dashboard já mostra o contador "aguardando humano").
 */
@Injectable()
export class OperatorNotifierService {
  private readonly logger = new Logger(OperatorNotifierService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notifyHandoff(conversationId: string, reason: string): Promise<void> {
    const conv = await this.prisma.conversation
      .findUnique({ where: { id: conversationId }, include: { professional: true } })
      .catch(() => null);
    const nome = conv?.professional?.fullName ?? 'profissional';
    const base = (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
    const link = base ? `${base}/conversas/${conversationId}` : conversationId;
    const text = `🙋 Conversa aguardando atendimento humano\nProfissional: ${nome}\nMotivo: ${reason}\n${link}`;

    this.logger.log(`Handoff p/ humano (${conversationId}): ${reason}`);

    const url = process.env.OPERATOR_NOTIFY_WEBHOOK_URL;
    if (!url) return; // sem canal configurado → só log + dashboard

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text, // Slack / Teams
          content: text, // Discord
          event: 'conversation.handoff',
          conversationId,
          professional: nome,
          reason,
          url: link,
        }),
        signal: AbortSignal.timeout(Number(process.env.OPERATOR_NOTIFY_TIMEOUT_MS ?? 5000)),
      });
      if (!res.ok) this.logger.warn(`Notificação de handoff falhou: HTTP ${res.status}`);
    } catch (e: any) {
      this.logger.error(`Notificação de handoff (webhook): ${e?.message}`);
    }
  }
}
