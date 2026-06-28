# Deploy — ambiente com IP válido + DNS (teste real Twilio/OpenWA)

Checklist para subir o HealthMatch num host público e testar os webhooks reais
(inbound bidirecional). Pré-requisitos de hardening (#2/#3/#4) **já implementados**:
- webhook responde rápido e roda a IA em background (não estoura timeout do Twilio);
- inbound deduplicado por `externalEventId` (reentregas não duplicam);
- validação de assinatura: Twilio (HMAC-SHA1) e OpenWA (HMAC configurável).

## 1. DNS + TLS (obrigatório)
- Aponte um domínio (ex.: `app.seudominio.com.br`) para o IP do host.
- Coloque um **reverse proxy com HTTPS** na frente (Caddy/nginx/Traefik):
  - `https://app.seudominio.com.br` → frontend (`:3001`)
  - `https://app.seudominio.com.br/api` → backend (`:3000`) (ou subdomínio `api.`)
- WhatsApp/Twilio **exigem HTTPS** no webhook.

## 2. Variáveis de ambiente (.env do host — NUNCA commitar)
```ini
# Núcleo
PUBLIC_BASE_URL=https://app.seudominio.com.br   # usado p/ validar assinatura Twilio
CORS_ORIGIN=https://app.seudominio.com.br
COOKIE_SECURE=true
JWT_ACCESS_SECRET=<segredo forte>
JWT_REFRESH_SECRET=<segredo forte>

# Twilio (oficial) — LIGAR a validação em produção
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=+...
TWILIO_DEFAULT_CONTENT_SID=HX...        # template aprovado p/ abordagem proativa
TWILIO_VALIDATE_SIGNATURE=true

# OpenWA (não-oficial) — confirmar header/algoritmo do HMAC na instância
OPENWA_BASE_URL=http://openwa-api:2785
OPENWA_API_KEY=...
OPENWA_WEBHOOK_SECRET=<segredo>
OPENWA_SIGNATURE_HEADER=x-webhook-hmac
OPENWA_HMAC_ALGO=sha512

# IA
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=...
AI_AUTO_REPLY=true
AI_DRY_RUN=false        # true p/ validar sem enviar; false p/ responder de verdade
AI_REQUIRE_HUMAN=true
```

## 3. Registrar os webhooks
- **Twilio** (Console → WhatsApp sender/sandbox):
  - "When a message comes in": `https://app.seudominio.com.br/api/integrations/webhooks/twilio` (POST)
  - "Status callback URL": a mesma rota (recebe delivered/failed)
- **OpenWA** (por sessão):
  ```bash
  curl -X POST https://OPENWA_HOST/api/sessions/default/webhooks \
    -H "X-API-Key: $OPENWA_API_KEY" -H 'Content-Type: application/json' \
    -d '{"url":"https://app.seudominio.com.br/api/integrations/webhooks/openwa",
         "events":["message.received","session.status"],
         "secret":"'"$OPENWA_WEBHOOK_SECRET"'"}'
  ```

## 4. Subir
```bash
docker compose -f docker-compose.prod.yml up --build -d   # backend/frontend prod
# OpenWA: app separado (ver INTEGRACAO_OPENWA.md), atrás de TLS, NODE_ENV=production
```
Primeiro deploy: `SEED_ON_START=true` uma vez (seed idempotente e não-destrutivo).

## 5. Validar
- Login em `https://app.seudominio.com.br` (admin do seed).
- Envie um WhatsApp real → deve chegar no webhook → IA responde (se `aiEnabled` e dentro da janela 24h / via template).
- Confira `Integrações → Canais` (provedor ativo) e `I.A. → runs`.

## Ainda pendente para produção plena (não bloqueia o teste)
- **Fila durável** (BullMQ/Redis) no lugar do drain em memória — necessário com 2+ réplicas.
- **Rate limiting** (`@nestjs/throttler`) nos webhooks + cooldown de IA por conversa.
- **LGPD**: criptografia/máscara de PII, retenção, consentimento (Épico 5).
- **Observabilidade**: `/api/health`, logs estruturados, métricas/KPIs (Épico 6).
- **Multi-tenancy** antes da 2ª cooperativa (Épico 7).
- Reativar **firewall** do host (expor só 443).
