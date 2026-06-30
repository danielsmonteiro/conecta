# Conector de Integração HealthMatch — Guia do Fornecedor

Este documento descreve como uma ferramenta de terceiros (ex.: um **omnichannel com IA
própria**) integra-se ao HealthMatch para **consultar dados** (vagas, profissionais,
matching, candidaturas) e **receber eventos** em tempo real.

A integração tem dois sentidos:

1. **Pull (você chama o HealthMatch):** API REST autenticada por **API key**.
2. **Push (o HealthMatch chama você):** **webhooks** de eventos, **assinados com HMAC**.

- **Base URL:** `https://healthmatch.prompthouse.ia.br/api`
- **Prefixo do conector:** `/connector/v1`
- **Formato:** JSON (UTF-8). Datas em ISO-8601 (UTC).

---

## 1. Autenticação

Toda chamada à API do conector exige a **API key** do parceiro no cabeçalho:

```
Authorization: Bearer hm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

(Alternativa equivalente: `X-Api-Key: hm_live_...`.)

- A chave é gerada pela equipe HealthMatch ao cadastrar o parceiro e é **exibida apenas uma
  vez**. Guarde com segurança; em caso de perda, solicite **rotação** (gera nova chave e
  invalida a anterior).
- Sem chave válida → `401 Unauthorized`. Parceiro inativo → `401`.
- Se a chave não tiver o **escopo** exigido pela rota → `403 Forbidden`.

### Escopos

A chave pode ser limitada a escopos. Os disponíveis:

| Escopo | Permite |
|--------|---------|
| `vacancies:read` | listar/consultar vagas |
| `professionals:read` | consultar profissional |
| `professionals:write` | identificar/criar profissional |
| `matching:read` | matching de vagas para um profissional |
| `applications:read` | consultar candidaturas |
| `applications:write` | registrar candidatura |
| `links:write` | gerar magic-links (cadastro/hotsite) |

> Uma chave com escopo `*` (ou sem escopos definidos) tem acesso total.

---

## 2. Fluxo de integração recomendado

Para um omnichannel que conversa com o profissional e quer oferecer vagas:

1. **Identifique o profissional** pelo WhatsApp → `POST /professionals/identify`
   (cria um cadastro mínimo se não existir; retorna o `id` e se o cadastro está completo).
2. **Busque vagas aderentes** → `POST /matching/vacancies-for-professional`.
3. Apresente as vagas na sua interface e, ao interesse claro do profissional:
   - **Registre a candidatura** → `POST /applications` (origem fica `PARTNER`); **ou**
   - **Gere um magic-link** → `POST /links` e envie ao profissional para ele confirmar/cadastrar
     na página do próprio HealthMatch (útil quando faltam dados/documentos).
4. **Acompanhe o andamento** recebendo **webhooks** (`application.status_changed`) ou
   consultando `GET /applications/:id`.

---

## 3. Endpoints da API (Pull)

> Todos sob `https://healthmatch.prompthouse.ia.br/api/connector/v1` e exigem `Authorization`.

### `GET /health`
Verifica a chave. Resposta: `{ "ok": true, "partner": "Nome", "scopes": [...] }`.

### `GET /vacancies`
Lista vagas abertas. Query: `page`, `limit`, `status?`, `city?`, `specialtyId?`.
```bash
curl -H "Authorization: Bearer $KEY" \
  "https://healthmatch.prompthouse.ia.br/api/connector/v1/vacancies?limit=5&city=Fortaleza"
```
Item retornado (resumo): `id, code, title, status, specialty, healthUnit{name,type,city,state},
workModel, startsAt, endsAt, cargaHorariaHoras, requiredDoctors, filledDoctors, doctorAmount,
currency, requiredDocuments[], description`.

### `GET /vacancies/:id`
Detalhe de uma vaga (mesmo shape acima).

### `POST /professionals/identify`  (escopo `professionals:write`)
Localiza o profissional pelo WhatsApp; cria um cadastro mínimo se não existir.
```bash
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"whatsapp":"+5585999990000","fullName":"Maria Silva"}' \
  ".../connector/v1/professionals/identify"
```
Resposta: `{ "created": true|false, "professional": { id, fullName, whatsapp, status,
credentialStatus, cadastroCompleto, ... } }`.

### `GET /professionals/:id`
Perfil completo + memória + candidaturas + status de documentos.

### `POST /matching/vacancies-for-professional`  (escopo `matching:read`)
Vagas mais aderentes ao perfil (matching reverso).
```bash
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"professionalId":"<id>"}' ".../connector/v1/matching/vacancies-for-professional"
```
Resposta: lista de vagas (shape de vaga) + `aderencia` (0–100) e `porQueCombina[]`.

### `POST /applications`  (escopo `applications:write`)
Registra a candidatura. Idempotente por (profissional, vaga).
```bash
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"professionalId":"<id>","vacancyId":"<id>","notes":"via omnichannel"}' \
  ".../connector/v1/applications"
```
Resposta: `{ "id": "...", "status": "PENDING", "origin": "PARTNER", "alreadyExists": false }`.

### `GET /applications/:id` · `GET /applications?professionalId=&vacancyId=`
Consulta status/lista de candidaturas.

### `POST /links`  (escopo `links:write`)
Gera um magic-link do HealthMatch para o profissional concluir na nossa página.
```bash
curl -X POST -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"type":"hotsite","professionalId":"<id>","vacancyId":"<id>"}' ".../connector/v1/links"
```
`type`: `hotsite` (confirmação rápida, profissional já cadastrado) ou `registration`
(cadastro progressivo, profissional novo). Resposta: `{ "url": "...", "expiresAt": "..." }`.

---

## 4. Webhooks de eventos (Push)

Se o parceiro tiver um `webhookUrl` configurado, o HealthMatch envia um `POST` JSON a cada
evento assinado. Cada entrega traz os cabeçalhos:

| Header | Descrição |
|--------|-----------|
| `X-HealthMatch-Event` | tipo do evento |
| `X-HealthMatch-Delivery` | id único da entrega |
| `X-HealthMatch-Signature` | `sha256=<hmac-hex>` do corpo cru |
| `User-Agent` | `HealthMatch-Connector/1` |

### Tipos de evento

| Evento | Quando |
|--------|--------|
| `application.created` | candidatura registrada (qualquer origem: parceiro, IA, hotsite, cadastro) |
| `application.status_changed` | mudança de status da candidatura (ex.: aprovada/rejeitada) |
| `vacancy.status_changed` | mudança de status da vaga (ex.: publicada) |

### Corpo do evento

```json
{
  "id": "5f3c...-uuid",
  "type": "application.created",
  "createdAt": "2026-06-30T17:40:00.000Z",
  "data": {
    "applicationId": "cmqz...",
    "status": "PENDING",
    "origin": "PARTNER",
    "vacancy": { "id": "...", "code": "VAG-2026-0008", "title": "Plantão Clínico" },
    "professional": { "id": "...", "fullName": "Maria Silva", "whatsapp": "+5585999990000" }
  }
}
```

### Verificação da assinatura (obrigatória)

Calcule o HMAC-SHA256 do **corpo cru** com o `webhookSecret` do parceiro e compare com o header
(comparação em tempo constante). **Rejeite** o que não bater.

**Node.js**
```js
const crypto = require('crypto');
function verify(rawBody, signatureHeader, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signatureHeader || ''), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

**Python**
```python
import hmac, hashlib
def verify(raw_body: bytes, signature_header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header or "")
```

### Requisitos do endpoint do parceiro
- Responder **2xx rapidamente** (idealmente < 5s; o timeout padrão é 5s).
- Ser **idempotente** por `X-HealthMatch-Delivery` (uma entrega pode, em casos raros, repetir).
- A entrega é **best-effort** (sem fila de retry garantida nesta versão) — para conciliação,
  combine com *polling* de `GET /applications`.

---

## 5. Erros

| HTTP | Significado |
|------|-------------|
| `400` | payload inválido (campos faltando/!formato) |
| `401` | API key ausente/ inválida / parceiro inativo |
| `403` | escopo insuficiente |
| `404` | recurso não encontrado |
| `5xx` | erro interno — tente novamente com backoff |

Corpo de erro (padrão NestJS): `{ "statusCode": 400, "message": "...", "error": "Bad Request" }`.

---

## 6. Boas práticas e observações

- **Segurança:** trafegue sempre por HTTPS; nunca exponha a API key no cliente/navegador
  (use-a só no seu backend). Rotacione a chave periodicamente.
- **A HealthMatch nunca promete contratação/aprovação** ao profissional — sua IA também não deve.
- **Privacidade/consentimento:** respeite opt-out; o profissional pode pedir para não ser
  contatado (esse estado é honrado pelos fluxos proativos do HealthMatch).
- **Versionamento:** o caminho inclui `/v1`. Mudanças incompatíveis virão em `/v2`.
- **Limites:** uso abusivo pode ser limitado por chave (rate limiting). Combine seu volume
  esperado com a equipe HealthMatch.

---

## 7. Onboarding (equipe HealthMatch)

O cadastro/gestão de parceiros é feito por endpoints administrativos (autenticados por
operador HealthMatch), não pelo parceiro:

- `POST /api/partners` — cria o parceiro e retorna **apiKey** + **webhookSecret** (uma vez).
- `GET /api/partners` · `GET /api/partners/:id` — lista/consulta (sem expor segredos).
- `PATCH /api/partners/:id` — atualiza nome, `scopes`, `webhookUrl`, `events`, `active`.
- `POST /api/partners/:id/rotate-key` — gera nova API key.
- `POST /api/partners/:id/rotate-webhook-secret` — gera novo segredo de webhook.
- `DELETE /api/partners/:id` — remove o parceiro.
- `GET /api/partners/available-scopes` — lista escopos e tipos de evento.
