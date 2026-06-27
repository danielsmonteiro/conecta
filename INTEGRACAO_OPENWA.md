# Integração OpenWA (canal de WhatsApp não-oficial)

> **Decisão de arquitetura:** o [OpenWA](https://github.com/rmyndharis/OpenWA) roda como
> **aplicação separada** (compose/diretório próprios em `/root/openwa`), conectada ao
> HealthMatch por uma **rede Docker compartilhada** (`openwa-network`). Não fica dentro
> do compose do app. Motivos: a sessão do WhatsApp Web tem estado (QR) e seu ciclo de
> vida deve ser independente dos deploys do app; perfil de recursos diferente (Chromium
> headless); isolamento de segurança; e é software de terceiros com infra própria.
>
> ⚠️ **Não-oficial:** automação do WhatsApp Web viola o ToS do WhatsApp e expõe o número
> a **banimento**. Use número **dedicado**. O default de envio do piloto continua **Twilio**;
> OpenWA é opt-in. Ver [ROADMAP_TECNICO.md](ROADMAP_TECNICO.md).

## Topologia

```
┌─ projeto: healthmatch-dev ─┐         ┌─ projeto: openwa ──────────┐
│ db · backend · frontend    │         │ openwa-api (:2785)         │
│                            │         │ openwa-docker-proxy        │
│   backend ─────────────────┼──┐   ┌──┼─ openwa-api                │
└────────────────────────────┘  │   │  └────────────────────────────┘
                       rede compartilhada: openwa-network
   backend → http://openwa-api:2785   |   openwa → http://backend:3000
```

## Subir o OpenWA (uma vez)

```bash
cd /root/openwa
# .env já contém API_MASTER_KEY gerada
docker compose up -d --build      # perfil padrão: sqlite, sem redis/minio
```
- Dashboard/API: http://localhost:2785 (bind em localhost) · health: `/api/health/ready`
- Autenticação da API: header `X-API-Key: <API_MASTER_KEY>`

## Wiring no HealthMatch (já configurado)

- `docker-compose.yml`: backend anexado à rede externa `openwa-network`; vars `OPENWA_*`.
- `.env` (git-ignored) guarda `OPENWA_API_KEY`. Subir normalmente: `docker compose up -d`.
- A tela **Integrações → Canais de WhatsApp** mostra `openwa` como `configured`.

## Acesso pela LAN (ex.: do MacBook)

Servidor Ubuntu na rede local (sem firewall). Use o IP da LAN do Ubuntu
(detectado: `192.168.1.147`). Todos os serviços ouvem em `0.0.0.0`:

| Serviço | URL (do Mac) |
|---|---|
| App HealthMatch | http://192.168.1.147:3001 (login `admin@healthmatch.local` / `changeme123`) |
| API backend | http://192.168.1.147:3000/api |
| Dashboard OpenWA (QR) | http://192.168.1.147:2785 |

- O frontend é **proxy same-origin** (`/api`), então login/cookies funcionam do Mac
  sem CORS. As origens da LAN também estão liberadas no CORS do backend por garantia.
- **Ajuste feito no OpenWA:** o bind da porta passou de `127.0.0.1:2785` para
  `0.0.0.0:2785` em `/root/openwa/docker-compose.yml` (para abrir o dashboard/QR do Mac).
  A API segue protegida por `X-API-Key`.

## Troubleshooting: dashboard "não abre" / página em branco no Mac

**Sintoma:** `curl` retorna 200, mas no browser do Mac (`http://192.168.1.147:2785`)
a página fica em branco.

**Causa-raiz:** o OpenWA (helmet, em `NODE_ENV=production`) envia o header
`Content-Security-Policy: ... upgrade-insecure-requests`. Essa diretiva faz o browser
re-buscar os assets (`/assets/*.js`) em **https**://192.168.1.147:2785 — que não tem
TLS → falha → tela branca. `localhost` é isento (loopback é "secure context"), por isso
funciona no servidor mas não no Mac. (O HSTS recebido via http é ignorado por spec; o
vilão é só o `upgrade-insecure-requests`.) Origem no código: `src/main.ts:186`
(`upgradeInsecureRequests: NODE_ENV==='production' ? [] : null`).

**Correção aplicada (LAN/piloto):** rodar o OpenWA fora de produção, o que remove a
diretiva. Em `/root/openwa/.env`:

```ini
NODE_ENV=development
```
…e `cd /root/openwa && docker compose up -d openwa-api`. Verifique:
```bash
curl -sD - -o /dev/null http://192.168.1.147:2785/ | grep -i content-security-policy
# NÃO deve mais conter "upgrade-insecure-requests"
```
No Mac, dê um **hard refresh** (Cmd+Shift+R) para descartar a página em branco em cache.

**Alternativas mais seguras (hardening, recomendadas p/ produção):**
- **Túnel SSH** (não expõe nada na LAN, e `localhost` é isento do upgrade):
  ```bash
  ssh -L 2785:localhost:2785 usuario@192.168.1.147   # no Mac; depois abra http://localhost:2785
  ```
  Aqui pode manter `NODE_ENV=production` e o bind em `127.0.0.1`.
- **Proxy reverso TLS** (Caddy/nginx) na frente do OpenWA → origem https satisfaz o CSP.

## Passos manuais (exigem o celular — não automatizáveis)

1. **Criar sessão + QR:** abra http://localhost:2785, crie a sessão `default` e
   **escaneie o QR com o número dedicado** do WhatsApp.
2. **Registrar webhook** apontando para o backend (mesma rede):
   ```bash
   curl -X POST http://localhost:2785/api/sessions/default/webhooks \
     -H "X-API-Key: $OPENWA_API_KEY" -H 'Content-Type: application/json' \
     -d '{"url":"http://backend:3000/api/integrations/webhooks/openwa",
          "events":["message.received","session.status"],
          "secret":"<defina-e-coloque-em-OPENWA_WEBHOOK_SECRET>"}'
   ```
3. **Rotear envios pelo OpenWA:** definir `MESSAGING_PROVIDER=openwa` (global) ou
   passar `provider: "openwa"` no `test-send` / por conversa.

## Validado automaticamente (2026-06-27)

- ✅ OpenWA sobe e fica `healthy` (`/api/health/ready` 200).
- ✅ `API_MASTER_KEY` autentica (`/api/sessions`: sem key 401, com key 200).
- ✅ backend → `http://openwa-api:2785` (HTTP 200).
- ✅ OpenWA → `http://backend:3000/api/integrations/webhooks/openwa` → `{ok:true}` e
  mensagem INBOUND persistida.
- ✅ adapter `openwa` reporta `configured: true`.
- ⏳ Envio/recebimento real depende do **QR** (passo manual acima).

## Pendência técnica (hardening)

O webhook do OpenWA usa **assinatura HMAC**; o adapter hoje valida por segredo simples
e por isso o bring-up roda com `OPENWA_VALIDATE_WEBHOOK=false`. Alinhar o esquema HMAC
exato do OpenWA (com `rawBody`) é follow-up antes de produção. O Twilio já valida
assinatura (HMAC-SHA1) corretamente.
