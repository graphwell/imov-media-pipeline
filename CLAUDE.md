# CLAUDE.md — IMOV MEDIA PIPELINE AI
## Instruções para Claude Code

---

## CONTEXTO DO PROJETO

Você está construindo o **IMOV MEDIA PIPELINE AI**, uma plataforma enterprise de importação, organização e publicação de mídia imobiliária para o site `imov.somar.ia.br`.

**Leia o documento `IMOV_MEDIA_PIPELINE_AI.md` completamente antes de iniciar.**

---

## STACK DE TECNOLOGIA

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind, shadcn/ui |
| API | NestJS 10, Fastify adapter, TypeScript |
| Importação | Node.js, googleapis, got, unzipper |
| Processamento | Python 3.11, Pillow, OpenCV, FFmpeg |
| IA | Anthropic SDK (`claude-sonnet-4-20250514`) |
| Banco | PostgreSQL 16 + pgvector, Prisma |
| Fila | Redis 7 + BullMQ |
| Storage | Cloudflare R2 (S3-compatible) |
| Monorepo | pnpm workspaces |

---

## ORDEM DE EXECUÇÃO

### ETAPA 1 — Scaffolding do monorepo
```bash
mkdir imov-media-pipeline && cd imov-media-pipeline
pnpm init
mkdir -p apps/{api,frontend,importer,media-processor,ai-classifier,publisher}
mkdir -p packages/shared
mkdir -p docker/{nginx/sites,postgres,redis}
```

### ETAPA 2 — Shared package (tipos TypeScript)
Criar `packages/shared` com todos os tipos compartilhados entre serviços.

### ETAPA 3 — API NestJS
```bash
cd apps/api
npx @nestjs/cli new . --package-manager pnpm --skip-git
pnpm add @nestjs/platform-fastify fastify
pnpm add @prisma/client prisma bullmq ioredis
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add @aws-sdk/client-s3 @anthropic-ai/sdk
pnpm add socket.io @nestjs/websockets @nestjs/platform-socket.io
pnpm add zod class-validator class-transformer
```

### ETAPA 4 — Schema Prisma + migrations
Usar o schema completo do documento principal. Rodar:
```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

### ETAPA 5 — Serviço de importação (Node.js)
```bash
cd apps/importer
pnpm init
pnpm add googleapis got p-limit unzipper node-7z
pnpm add bullmq ioredis @prisma/client
pnpm add -D typescript @types/node tsx
```

### ETAPA 6 — Media Processor (Python)
```bash
cd apps/media-processor
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn pillow opencv-python-headless
pip install python-ffmpeg pdfplumber pytesseract easyocr
pip install redis anthropic boto3 structlog
```

### ETAPA 7 — AI Classifier (Python)
```bash
cd apps/ai-classifier
python -m venv venv
source venv/bin/activate
pip install anthropic redis pillow fastapi uvicorn structlog
```

### ETAPA 8 — Frontend Next.js
```bash
cd apps/frontend
npx create-next-app@latest . --typescript --tailwind --app --skip-git
pnpm add @anthropic-ai/sdk
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card dialog form input label
pnpm dlx shadcn@latest add progress tabs badge separator toast
pnpm add socket.io-client react-dropzone zustand @tanstack/react-query
pnpm add yet-another-react-lightbox @dnd-kit/core @dnd-kit/sortable
pnpm add lucide-react axios
```

---

## ARQUIVOS DE CONFIGURAÇÃO CRÍTICOS

### `pnpm-workspace.yaml` (raiz)
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### `turbo.json` (raiz)
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

---

## VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS

Criar `.env` na raiz do projeto com:

```env
DATABASE_URL=postgresql://imov:password@localhost:5432/imov_media
DB_PASSWORD=password
REDIS_URL=redis://:password@localhost:6379
REDIS_PASSWORD=password
JWT_SECRET=super_secret_jwt_key_256_bits_minimum
ANTHROPIC_API_KEY=sk-ant-...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=imov-media
R2_PUBLIC_URL=https://media.imov.somar.ia.br
GOOGLE_SERVICE_ACCOUNT_KEY=base64_json
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
MAIN_SITE_URL=https://imov.somar.ia.br
MAIN_SITE_API_KEY=...
```

---

## REGRAS DE DESENVOLVIMENTO

1. **TypeScript strict mode** em todo código Node.js/Next.js
2. **Zod** para validação de dados na API
3. **Prisma** como único ORM (nunca SQL raw, exceto para pgvector)
4. **BullMQ** para TODOS os jobs assíncronos, sem exception
5. **Nunca bloquear** o event loop em Node.js — usar workers para tarefas pesadas
6. **Logs estruturados** com Winston (Node) e structlog (Python)
7. **Error handling** em todos os jobs com retry automático
8. **Progress events** via WebSocket para toda operação longa
9. **Validação MIME** antes de processar qualquer arquivo
10. **Cleanup automático** de arquivos temporários após processamento

---

## ENDPOINTS PRIORITÁRIOS

Implementar nesta ordem:

1. `POST /api/auth/login` — autenticação JWT
2. `POST /api/importacoes` — criar importação (aceita qualquer fonte)
3. `GET /api/importacoes/:id` — status + progresso
4. `WS /ws` — canal de progresso em tempo real
5. `GET /api/empreendimentos` — listar
6. `GET /api/empreendimentos/:id` — detalhes com mídias
7. `POST /api/empreendimentos/:id/publish` — publicar

---

## TESTES PRIORITÁRIOS

```bash
# Testar importação Google Drive
POST /api/importacoes
{
  "sourceType": "GOOGLE_DRIVE",
  "sourceUrl": "https://drive.google.com/drive/folders/FOLDER_ID"
}

# Testar importação ZIP
POST /api/importacoes
{
  "sourceType": "HTTP_URL",
  "sourceUrl": "https://example.com/materiais.zip"
}

# Testar upload direto
POST /api/upload/direct
FormData: files[]
```

---

## PONTOS DE ATENÇÃO

- **Google Drive**: usar Service Account para pastas compartilhadas, OAuth2 para pastas privadas
- **Smart Crop**: sempre detectar focal point antes de cortar — nunca cortar cegamente ao centro
- **FFmpeg**: verificar se está instalado no container antes de processar vídeos
- **pgvector**: necessita extensão instalada no PostgreSQL — usar imagem `pgvector/pgvector:pg16`
- **Claude Vision**: usar `claude-sonnet-4-20250514`, max_tokens 1000 para classificação, 2000 para extração PDF
- **R2 CORS**: configurar CORS no bucket para aceitar uploads diretos do frontend
- **Cleanup**: arquivos em `/tmp/media-processing/{import_id}/` devem ser deletados após upload para R2

---

## ESTRUTURA DE PASTAS FINAL

```
imov-media-pipeline/
├── CLAUDE.md                          ← este arquivo
├── IMOV_MEDIA_PIPELINE_AI.md          ← documento técnico completo
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
├── packages/
│   └── shared/                        ← tipos TypeScript compartilhados
│       ├── src/types/
│       └── package.json
├── apps/
│   ├── api/                           ← NestJS + Fastify
│   ├── frontend/                      ← Next.js 15
│   ├── importer/                      ← Node.js (download de fontes)
│   ├── media-processor/               ← Python (imagens + vídeos)
│   ├── ai-classifier/                 ← Python (Claude Vision)
│   └── publisher/                     ← Node.js (publicação)
└── docker/
    ├── nginx/
    ├── postgres/
    └── redis/
```
