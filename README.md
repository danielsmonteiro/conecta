# HealthMatch — Ferramenta de Recuperação Técnica

Toolkit **read-only** em Node.js + Playwright + TypeScript para recuperar o frontend
publicado de uma aplicação web da qual o código-fonte foi perdido, e para **mapear as
APIs** chamadas pelo navegador — de forma automatizada, segura e auditável.

> ⚠️ Use somente em sistemas que são seus ou para os quais você tem autorização
> explícita. A ferramenta **não** tenta burlar autenticação, não faz brute force,
> não explora vulnerabilidades e prioriza navegação passiva (GET).

## O que ela faz

1. Faz **login** com credenciais vindas de variáveis de ambiente (`.env`).
2. Navega (BFS, profundidade configurável) pelas rotas acessíveis ao usuário.
3. Captura **screenshot** e **HTML renderizado** de cada rota.
4. Baixa os **assets públicos** (JS, CSS, imagens, fontes) da mesma origem.
5. Registra todas as chamadas **XHR/Fetch** (método, payload, resposta, headers).
6. Exporta um **HAR** completo da sessão.
7. Gera **inventários** de rotas e de API e um documento de **reconstrução de backend**.

## Segurança e conduta

- Credenciais **nunca** ficam no código — apenas em `.env` (git-ignored).
- Dados sensíveis (tokens, cookies, senhas, CPF, e-mail, cartão) são **mascarados**
  nos relatórios.
- Cliques em controles **destrutivos/mutadores** são bloqueados por palavra-chave:
  `delete, remove, apagar, excluir, deletar, cancelar, finalizar, confirmar, salvar,
  cadastrar, enviar, submit, destroy, editar, atualizar, logout/sair`, etc.
- O crawler clica apenas em **links e elementos de navegação** (menus, tabs, sidebar)
  claramente não destrutivos. Tudo que não pôde ser acessado é registrado em
  `routes-inventory.json` e no log.

## Pré-requisitos

- Node.js ≥ 18

## Instalação

```bash
npm install          # instala deps + baixa o Chromium do Playwright (postinstall)
cp .env.example .env # preencha HEALTHMATCH_URL / USER / PASSWORD
```

## Configuração (`.env`)

| Variável | Obrigatória | Default | Descrição |
|---|---|---|---|
| `HEALTHMATCH_URL` | sim | — | URL da página de login |
| `HEALTHMATCH_USER` | sim | — | Usuário/e-mail |
| `HEALTHMATCH_PASSWORD` | sim | — | Senha |
| `HEALTHMATCH_MAX_DEPTH` | não | `3` | Profundidade máxima do crawl |
| `HEALTHMATCH_MAX_PAGES` | não | `80` | Trava de segurança de nº de páginas |
| `HEALTHMATCH_PAGE_TIMEOUT` | não | `20000` | Timeout por página (ms) |
| `HEALTHMATCH_HEADLESS` | não | `true` | `false` para ver o navegador |
| `HEALTHMATCH_ALLOW_NAV_CLICKS` | não | `true` | Permite cliques em menus/tabs |

## Uso

```bash
npm run recover   # login + crawl + captura + HAR + inventários
npm run report    # gera recovered-healthmatch/BACKEND_RECONSTRUCTION.md
npm run clean     # apaga a pasta de saída
```

## Saída — `recovered-healthmatch/`

```
recovered-healthmatch/
├── screenshots/             # 1 PNG por rota
├── html/                    # HTML renderizado por rota
├── assets/                  # JS, CSS, imagens, fontes (espelho dos paths)
├── logs/recovery.log        # log auditável da execução
├── session.har              # sessão de rede completa
├── api-inventory.json       # endpoints, métodos, payloads, respostas, headers
├── routes-inventory.json    # rotas visitadas, ignoradas e assets
├── summary.json             # resumo executivo
└── BACKEND_RECONSTRUCTION.md # análise técnica (gerada por `npm run report`)
```

## Dicas de execução

- Comece com `HEALTHMATCH_HEADLESS=false` para validar visualmente o login.
- Se o login não for detectado, ajuste os seletores em `src/recover.ts`
  (função `login`) ao layout específico da tela.
- Para um crawl mais agressivo aumente `HEALTHMATCH_MAX_DEPTH` e `HEALTHMATCH_MAX_PAGES`.
