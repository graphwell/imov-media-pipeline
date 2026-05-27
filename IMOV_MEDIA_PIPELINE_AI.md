# IMOV MEDIA PIPELINE AI
## Master Document — Claude Code Build Guide
### Plataforma: imov.somar.ia.br

---

> **Missão:** Sistema enterprise de importação, organização e publicação inteligente de mídia imobiliária. Qualquer link (Google Drive, Dropbox, OneDrive, WeTransfer, URL direta, ZIP) entra. Empreendimento organizado sai.

---

## 1. VISÃO GERAL

O **IMOV MEDIA PIPELINE AI** é uma plataforma SaaS que:

1. Recebe materiais de construtoras (qualquer fonte: links, uploads diretos, ZIPs)
2. Classifica automaticamente usando IA (Claude Vision + OCR)
3. Processa e otimiza toda a mídia (imagens, vídeos, PDFs)
4. Publica automaticamente no site `imov.somar.ia.br`

---

## 2. ARQUITETURA DE MICROSERVIÇOS

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│              admin.imov.somar.ia.br                      │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS/WS
┌──────────────────────▼──────────────────────────────────┐
│              API GATEWAY (Fastify/NestJS)                │
│                   api.imov.somar.ia.br                   │
└───┬──────────┬──────────┬─────────────┬─────────────────┘
    │          │          │             │
┌───▼──┐  ┌───▼──┐  ┌────▼───┐  ┌─────▼──────┐
│IMPORT│  │ MEDIA│  │   AI   │  │  PUBLISH   │
│  SVC │  │  SVC │  │  SVC   │  │    SVC     │
│(Node)│  │(Py)  │  │(Claude)│  │  (Node)    │
└───┬──┘  └───┬──┘  └────┬───┘  └─────┬──────┘
    │          │          │            │
┌───▼──────────▼──────────▼────────────▼──────┐
│          REDIS + BULLMQ (Job Queue)          │
└──────────────────────────────────────────────┘
    │          │          │            │
┌───▼──┐  ┌───▼──┐  ┌────▼───┐  ┌────▼────┐
│  PG  │  │  R2  │  │VECTOR  │  │  LOGS   │
│ SQL  │  │STORE │  │  DB    │  │(Elastic)│
└──────┘  └──────┘  └────────┘  └─────────┘
```

---

## 3. STACK COMPLETA

### Frontend
```
framework:     Next.js 15 (App Router)
language:      TypeScript 5.x
styling:       Tailwind CSS + shadcn/ui
state:         Zustand + React Query (TanStack)
realtime:      Socket.io-client
file-ui:       react-dropzone
media-viewer:  yet-another-react-lightbox
icons:         Lucide React
```

### Backend API (Node.js)
```
framework:     NestJS 10 + Fastify adapter
language:      TypeScript 5.x
auth:          JWT + Passport (RS256)
validation:    Zod + class-validator
websocket:     Socket.io
api-docs:      Swagger/OpenAPI 3
```

### Importação (Node.js)
```
google-drive:  googleapis v40
http-download: got + p-limit
archive:       node-7z + unzipper
dropbox:       dropbox SDK
s3-compat:     @aws-sdk/client-s3
url-detection: custom parser (detects Google Drive, Dropbox, OneDrive, WeTransfer, S3, URLs diretas, ZIPs)
```

### Processamento de Mídia (Python)
```
images:        Pillow + OpenCV + sharp (via subprocess)
video:         FFmpeg (python-ffmpeg wrapper)
pdf:           pdfplumber + pdf2image + PyMuPDF
ocr:           pytesseract + easyocr
ai-vision:     anthropic SDK (Claude claude-sonnet-4-20250514 Vision)
smart-crop:    face_recognition + object detection (YOLOv8 lightweight)
web:           FastAPI + uvicorn
queue:         BullMQ consumer via redis-py
```

### Banco de Dados
```
primary:       PostgreSQL 16 + pgvector (embeddings)
orm:           Prisma 5 (TypeScript) + SQLAlchemy (Python)
cache:         Redis 7
search:        pgvector (similaridade semântica de mídia)
```

### Storage
```
provider:      Cloudflare R2 (S3-compatible)
sdk:           @aws-sdk/client-s3
cdn:           Cloudflare CDN (fronting R2)
structure:     /empreendimentos/{id}/{categoria}/{versao}
```

### IA (Anthropic)
```
model:         claude-sonnet-4-20250514
features:
  - classificação visual de imagens
  - extração de dados de PDFs
  - geração de descrições comerciais
  - smart crop detection
  - OCR enhancement
sdk:           @anthropic-ai/sdk (Node.js) + anthropic (Python)
```

### Infraestrutura
```
containers:    Docker + Docker Compose
orchestration: Docker Swarm (básico) / Kubernetes (produção)
proxy:         Nginx (reverse proxy + SSL)
ssl:           Let's Encrypt (Certbot)
monitoring:    Prometheus + Grafana
logs:          Winston (Node) + structlog (Python) + ELK Stack
ci/cd:         GitHub Actions
```

---

## 4. ESTRUTURA COMPLETA DO PROJETO

```
imov-media-pipeline/
├── .github/
│   └── workflows/
│       ├── deploy.yml
│       └── test.yml
├── docker/
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── sites/
│   │       ├── api.conf
│   │       ├── admin.conf
│   │       └── media.conf
│   ├── postgres/
│   │   └── init.sql
│   └── redis/
│       └── redis.conf
├── packages/
│   └── shared/                    # Tipos compartilhados (TypeScript)
│       ├── src/
│       │   ├── types/
│       │   │   ├── media.ts
│       │   │   ├── import.ts
│       │   │   ├── empreendimento.ts
│       │   │   └── jobs.ts
│       │   └── index.ts
│       └── package.json
├── apps/
│   ├── frontend/                  # Next.js Admin
│   ├── api/                       # NestJS Backend
│   ├── importer/                  # Node.js Import Service
│   ├── media-processor/           # Python Processing Service
│   ├── ai-classifier/             # Python AI Service
│   └── publisher/                 # Node.js Publish Service
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

---

## 5. MODELAGEM DO BANCO DE DADOS

### Schema Prisma Completo

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

// ─── Organizações / Imobiliárias ────────────────────────────────────────────

model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logo        String?
  settings    Json     @default("{}")
  plan        Plan     @default(FREE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users            User[]
  empreendimentos  Empreendimento[]
  importacoes      Importacao[]
}

// ─── Usuários ────────────────────────────────────────────────────────────────

model User {
  id             String       @id @default(cuid())
  email          String       @unique
  name           String
  passwordHash   String?
  role           Role         @default(EDITOR)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  refreshTokens  RefreshToken[]
  auditLogs      AuditLog[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

// ─── Empreendimentos ─────────────────────────────────────────────────────────

model Empreendimento {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  // Dados básicos
  nome           String
  slug           String       @unique
  construtora    String?
  status         StatusEmpreendimento @default(RASCUNHO)

  // Localização
  bairro         String?
  cidade         String?
  estado         String?
  cep            String?
  endereco       String?
  latitude       Float?
  longitude      Float?

  // Produto
  tipoImovel     String?      // apartamento, casa, comercial, lote
  metragem       Json?        // { min: 40, max: 120, unidade: "m²" }
  quartos        Json?        // { min: 2, max: 4 }
  banheiros      Json?
  vagas          Json?
  andares        Int?
  unidades       Int?

  // Comercial
  precoMin       Float?
  precoMax       Float?
  entrega        DateTime?
  diferenciais   String[]
  descricao      String?      @db.Text
  descricaoIA    String?      @db.Text  // gerada automaticamente

  // Meta
  seoTitle       String?
  seoDescription String?
  tags           String[]

  // Relacionamentos
  medias         Media[]
  galerias       Galeria[]
  documentos     DocumentoEmpreendimento[]
  importacoes    Importacao[]

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  publishedAt    DateTime?

  @@index([organizationId])
  @@index([status])
  @@index([cidade, bairro])
}

// ─── Importações ─────────────────────────────────────────────────────────────

model Importacao {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  empreendimentoId String?
  empreendimento Empreendimento? @relation(fields: [empreendimentoId], references: [id])

  // Fonte
  sourceType     SourceType   // GOOGLE_DRIVE, DROPBOX, ONEDRIVE, WETRANSFER, URL, ZIP, UPLOAD
  sourceUrl      String?
  sourceMeta     Json?        // metadata da fonte (token, pasta_id, etc)

  // Status
  status         ImportStatus @default(AGUARDANDO)
  progresso      Int          @default(0)    // 0-100
  etapaAtual     String?
  totalArquivos  Int          @default(0)
  processados    Int          @default(0)
  erros          Int          @default(0)

  // Resultado
  resumo         Json?        // { images: 42, videos: 3, pdfs: 5, outros: 2 }
  logErros       Json[]       @default([])

  // Jobs
  jobIds         String[]

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  completedAt    DateTime?

  arquivos       Arquivo[]

  @@index([organizationId])
  @@index([status])
}

model Arquivo {
  id             String       @id @default(cuid())
  importacaoId   String
  importacao     Importacao   @relation(fields: [importacaoId], references: [id], onDelete: Cascade)

  // Origem
  nomeOriginal   String
  caminhoOriginal String?     // path relativo na pasta fonte
  extensao       String
  mimeType       String?
  tamanho        BigInt?      // bytes
  checksum       String?      // SHA256

  // Armazenamento
  storageKey     String?      // chave no R2
  storageUrl     String?

  // Classificação
  categoria      CategoriaMedia?
  subcategoria   String?
  confianca      Float?       // 0-1 (confiança da classificação IA)
  classificadoPor ClassificacaoMetodo?

  // Status
  status         StatusArquivo @default(PENDENTE)
  mediaId        String?
  media          Media?       @relation(fields: [mediaId], references: [id])

  // Erros
  erro           String?

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([importacaoId])
  @@index([status])
  @@index([categoria])
}

// ─── Mídias Processadas ───────────────────────────────────────────────────────

model Media {
  id               String       @id @default(cuid())
  empreendimentoId String
  empreendimento   Empreendimento @relation(fields: [empreendimentoId], references: [id])

  // Tipo e categoria
  tipo             TipoMedia    // IMAGE, VIDEO, PDF, DOCUMENT
  categoria        CategoriaMedia
  subcategoria     String?
  ordem            Int          @default(0)
  destaque         Boolean      @default(false)

  // Arquivo original
  originalKey      String       // R2 storage key
  originalUrl      String
  originalNome     String
  originalTamanho  BigInt?
  originalMime     String?

  // Dimensões (imagem/video)
  largura          Int?
  altura           Int?
  duracao          Float?       // segundos (video)
  fps              Float?

  // Versões geradas automaticamente
  versoes          MediaVersao[]

  // Metadados extraídos por IA
  descricaoIA      String?      @db.Text
  altText          String?
  tagsIA           String[]
  embedding        Unsupported("vector(1536)")?  // pgvector

  // Smart crop
  focalPoint       Json?        // { x: 0.5, y: 0.3 }
  sujeitoPrincipal String?      // "fachada", "logo", "pessoa"

  // Relacionamentos
  galerias         GaleriaMedia[]
  arquivos         Arquivo[]

  ativo            Boolean      @default(true)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  @@index([empreendimentoId])
  @@index([categoria])
  @@index([tipo])
}

model MediaVersao {
  id          String    @id @default(cuid())
  mediaId     String
  media       Media     @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  perfil      PerfilVersao  // THUMBNAIL, CARD, BANNER, MOBILE, GALLERY, FULLSCREEN, WEBP_ORIGINAL
  formato     String        // webp, mp4, jpg
  largura     Int?
  altura      Int?
  tamanho     BigInt?
  qualidade   Int?          // 0-100
  storageKey  String
  url         String
  cdn         String?       // URL CDN

  createdAt   DateTime  @default(now())

  @@index([mediaId])
  @@index([perfil])
}

// ─── Galerias ─────────────────────────────────────────────────────────────────

model Galeria {
  id               String         @id @default(cuid())
  empreendimentoId String
  empreendimento   Empreendimento @relation(fields: [empreendimentoId], references: [id])

  nome             String
  slug             String
  tipo             TipoGaleria    // PRINCIPAL, FACHADA, PLANTA, LAZER, VIDEO, etc
  ordem            Int            @default(0)
  publica          Boolean        @default(true)
  capa             String?        // media id

  medias           GaleriaMedia[]

  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@unique([empreendimentoId, slug])
}

model GaleriaMedia {
  id        String   @id @default(cuid())
  galeriaId String
  galeria   Galeria  @relation(fields: [galeriaId], references: [id], onDelete: Cascade)
  mediaId   String
  media     Media    @relation(fields: [mediaId], references: [id], onDelete: Cascade)
  ordem     Int      @default(0)

  @@unique([galeriaId, mediaId])
  @@index([galeriaId])
}

// ─── Documentos ───────────────────────────────────────────────────────────────

model DocumentoEmpreendimento {
  id               String         @id @default(cuid())
  empreendimentoId String
  empreendimento   Empreendimento @relation(fields: [empreendimentoId], references: [id])

  tipo             TipoDocumento  // FOLDER, MEMORIAL, TABELA, PLANTA_PDF, CONTRATO, OUTRO
  nome             String
  storageKey       String
  url              String
  tamanho          BigInt?
  paginas          Int?

  // Conteúdo extraído
  textoBruto       String?        @db.Text
  dadosExtraidos   Json?          // estruturado pela IA

  ativo            Boolean        @default(true)
  createdAt        DateTime       @default(now())
}

// ─── Jobs e Monitoramento ─────────────────────────────────────────────────────

model JobLog {
  id          String    @id @default(cuid())
  jobId       String
  jobType     String
  status      String    // waiting, active, completed, failed
  data        Json?
  result      Json?
  erro        String?
  duracao     Int?      // ms
  tentativa   Int       @default(1)
  createdAt   DateTime  @default(now())

  @@index([jobId])
  @@index([jobType, status])
  @@index([createdAt])
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  user       User?    @relation(fields: [userId], references: [id])
  acao       String
  recurso    String
  recursoId  String?
  dados      Json?
  ip         String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([recurso, recursoId])
  @@index([createdAt])
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Plan {
  FREE
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

enum Role {
  SUPER_ADMIN
  ADMIN
  EDITOR
  VIEWER
}

enum StatusEmpreendimento {
  RASCUNHO
  EM_REVISAO
  PUBLICADO
  ARQUIVADO
}

enum StatusArquivo {
  PENDENTE
  BAIXANDO
  PROCESSANDO
  CLASSIFICANDO
  CONCLUIDO
  ERRO
  IGNORADO
}

enum ImportStatus {
  AGUARDANDO
  VERIFICANDO_FONTE
  BAIXANDO
  EXTRAINDO
  CLASSIFICANDO
  PROCESSANDO_MIDIA
  REVISAO_MANUAL
  CONCLUIDO
  ERRO
  CANCELADO
}

enum SourceType {
  GOOGLE_DRIVE
  DROPBOX
  ONEDRIVE
  WETRANSFER
  S3_URL
  HTTP_URL
  ZIP_UPLOAD
  DIRECT_UPLOAD
  FTP
}

enum TipoMedia {
  IMAGE
  VIDEO
  PDF
  DOCUMENT
  AUDIO
}

enum CategoriaMedia {
  FACHADA
  AREA_DE_LAZER
  PISCINA
  ACADEMIA
  SALAO_DE_FESTAS
  PLAYGROUND
  PLANTA_BAIXA
  PLANTA_HUMANIZADA
  PLANTA_3D
  LOGO
  BANNER
  POST_INSTAGRAM
  POST_FACEBOOK
  VIDEO_TOUR
  VIDEO_DRONE
  VIDEO_APRESENTACAO
  PDF_FOLDER
  PDF_MEMORIAL
  TABELA_PRECO
  DOCUMENTO_COMERCIAL
  QUARTO
  SALA
  COZINHA
  BANHEIRO
  VARANDA
  AREA_GOURMET
  VISTA
  MAPA_LOCALIZACAO
  OBRA
  OUTRO
}

enum ClassificacaoMetodo {
  NOME_ARQUIVO
  ESTRUTURA_PASTA
  IA_VISUAL
  OCR
  METADATA
  MANUAL
  COMBINADO
}

enum PerfilVersao {
  THUMBNAIL        // 200x150
  CARD             // 400x300
  BANNER           // 1200x600
  MOBILE           // 768x512
  GALLERY          // 1024x768
  FULLSCREEN       // 1920x1080
  SQUARE           // 600x600 (Instagram)
  WEBP_ORIGINAL    // original convertido para WebP
  VIDEO_HLS        // .m3u8
  VIDEO_MP4_LQ     // 480p
  VIDEO_MP4_HQ     // 1080p
  VIDEO_THUMB      // frame do video
}

enum TipoGaleria {
  PRINCIPAL
  FACHADA
  PLANTA
  LAZER
  INTERIORES
  VIDEO
  DOCUMENTOS
  OBRA
}

enum TipoDocumento {
  FOLDER
  MEMORIAL_DESCRITIVO
  TABELA_PRECO
  PLANTA_PDF
  CONTRATO
  HABITE_SE
  OUTRO
}
```

---

## 6. FONTE UNIVERSAL DE IMPORTAÇÃO

### Detector de fonte (`apps/importer/src/source-detector.ts`)

```typescript
// Detecta e normaliza QUALQUER tipo de fonte de entrada
export type DetectedSource =
  | { type: 'GOOGLE_DRIVE'; folderId: string; isPublic: boolean }
  | { type: 'DROPBOX'; sharedLink: string }
  | { type: 'ONEDRIVE'; shareUrl: string }
  | { type: 'WETRANSFER'; transferUrl: string }
  | { type: 'S3_URL'; bucket: string; prefix: string; region: string }
  | { type: 'HTTP_URL'; url: string; isZip: boolean }
  | { type: 'ZIP_UPLOAD'; filePath: string }
  | { type: 'DIRECT_UPLOAD'; files: UploadedFile[] }
  | { type: 'FTP'; host: string; path: string }

export function detectSource(input: string | File[]): DetectedSource {
  if (Array.isArray(input)) {
    return { type: 'DIRECT_UPLOAD', files: input }
  }

  const url = input.trim()

  // Google Drive - pasta ou arquivo
  const gdrive = url.match(
    /drive\.google\.com\/(drive\/folders\/|file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/
  )
  if (gdrive) return { type: 'GOOGLE_DRIVE', folderId: gdrive[2], isPublic: true }

  // Dropbox
  if (url.includes('dropbox.com/sh/') || url.includes('dropbox.com/scl/')) {
    return { type: 'DROPBOX', sharedLink: url }
  }

  // OneDrive / SharePoint
  if (url.includes('onedrive.live.com') || url.includes('sharepoint.com')) {
    return { type: 'ONEDRIVE', shareUrl: url }
  }

  // WeTransfer
  if (url.includes('wetransfer.com/downloads/') || url.includes('we.tl/')) {
    return { type: 'WETRANSFER', transferUrl: url }
  }

  // S3 / R2 / MinIO URLs
  const s3 = url.match(/https?:\/\/([^.]+)\.s3\.amazonaws\.com\/(.+)/)
  if (s3) return { type: 'S3_URL', bucket: s3[1], prefix: s3[2], region: 'us-east-1' }

  // URL direta de ZIP
  if (url.match(/\.(zip|tar\.gz|tar|7z|rar)(\?.*)?$/i)) {
    return { type: 'HTTP_URL', url, isZip: true }
  }

  // FTP
  if (url.startsWith('ftp://') || url.startsWith('sftp://')) {
    const ftpUrl = new URL(url)
    return { type: 'FTP', host: ftpUrl.host, path: ftpUrl.pathname }
  }

  // URL HTTP genérica (pasta index, arquivo, etc)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { type: 'HTTP_URL', url, isZip: false }
  }

  throw new Error(`Formato de fonte não reconhecido: ${url}`)
}
```

---

## 7. SISTEMA DE FILAS (BullMQ)

### Filas e Fluxo

```
IMPORTACAO_JOB
├── verify-source        → valida e lista arquivos da fonte
├── download-files       → baixa em lotes paralelos (p-limit: 5)
├── extract-archive      → descompacta ZIPs/RARs
└── → CLASSIFICATION_JOB

CLASSIFICATION_JOB
├── classify-by-name     → regras por nome/extensão (rápido)
├── classify-by-folder   → estrutura de pastas
├── classify-by-ai       → Claude Vision (para imagens ambíguas)
└── → PROCESSING_JOB

PROCESSING_JOB
├── optimize-image       → compressão + WebP + variantes
├── smart-crop           → focal point detection + crop automático
├── process-video        → FFmpeg compressão + HLS + thumb
├── extract-pdf          → OCR + extração de dados
└── → UPLOAD_JOB

UPLOAD_JOB
├── upload-to-r2         → armazenamento final no R2
├── generate-cdn-urls    → URLs Cloudflare CDN
└── → PUBLISH_JOB

PUBLISH_JOB
├── create-empreendimento → cria/atualiza no banco
├── create-galerias       → organiza galerias por categoria
├── link-medias           → vincula mídias processadas
└── publish-to-site       → atualiza cache + notifica frontend
```

### Configuração BullMQ (`apps/api/src/queue/queue.config.ts`)

```typescript
import { Queue, Worker, QueueEvents } from 'bullmq'
import { Redis } from 'ioredis'

const connection = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
})

export const queues = {
  importacao: new Queue('importacao', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  }),
  classification: new Queue('classification', {
    connection,
    defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
  }),
  mediaProcessing: new Queue('media-processing', {
    connection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      timeout: 300000, // 5 min por job
    },
  }),
  upload: new Queue('upload', { connection }),
  publish: new Queue('publish', { connection }),
}

// Progresso em tempo real via WebSocket
export function setupQueueEvents(io: SocketIOServer) {
  const events = new QueueEvents('importacao', { connection })
  
  events.on('progress', ({ jobId, data }) => {
    io.to(`import:${jobId}`).emit('progress', data)
  })
  
  events.on('completed', ({ jobId, returnvalue }) => {
    io.to(`import:${jobId}`).emit('completed', returnvalue)
  })
  
  events.on('failed', ({ jobId, failedReason }) => {
    io.to(`import:${jobId}`).emit('failed', { reason: failedReason })
  })
}
```

---

## 8. SERVIÇO DE IA (Python + Claude)

### Classificador Visual (`apps/ai-classifier/src/classifier.py`)

```python
import anthropic
import base64
import json
from pathlib import Path

client = anthropic.Anthropic()

CATEGORIAS_PROMPT = """
Você é um especialista em classificação de imagens de empreendimentos imobiliários.

Analise a imagem e retorne APENAS um JSON válido com:
{
  "categoria": "<categoria>",
  "subcategoria": "<subcategoria opcional>",
  "confianca": <0.0-1.0>,
  "sujeitoPrincipal": "<o que é o assunto principal>",
  "focalPoint": {"x": <0.0-1.0>, "y": <0.0-1.0>},
  "altText": "<descrição acessível em português>",
  "tags": ["tag1", "tag2"],
  "qualidadeVisual": <1-5>
}

Categorias disponíveis:
FACHADA, AREA_DE_LAZER, PISCINA, ACADEMIA, SALAO_DE_FESTAS, PLAYGROUND,
PLANTA_BAIXA, PLANTA_HUMANIZADA, PLANTA_3D, LOGO, BANNER, POST_INSTAGRAM,
POST_FACEBOOK, VIDEO_TOUR, VIDEO_DRONE, QUARTO, SALA, COZINHA, BANHEIRO,
VARANDA, AREA_GOURMET, VISTA, MAPA_LOCALIZACAO, OBRA, OUTRO

Para focalPoint: identifique o ponto de interesse principal da imagem.
x=0 é esquerda, x=1 é direita, y=0 é topo, y=1 é base.
"""

def classify_image(image_path: str) -> dict:
    """Classifica uma imagem usando Claude Vision."""
    
    # Tenta classificação rápida por nome antes de usar IA
    quick = classify_by_filename(Path(image_path).name)
    if quick and quick['confianca'] > 0.85:
        return quick
    
    # Usa Claude Vision para classificação visual
    with open(image_path, 'rb') as f:
        image_data = base64.standard_b64encode(f.read()).decode('utf-8')
    
    ext = Path(image_path).suffix.lower()
    media_type_map = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.webp': 'image/webp',
        '.gif': 'image/gif'
    }
    media_type = media_type_map.get(ext, 'image/jpeg')
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_data,
                    },
                },
                {
                    "type": "text",
                    "text": CATEGORIAS_PROMPT
                }
            ],
        }]
    )
    
    text = response.content[0].text
    # Remove possível markdown
    text = text.replace('```json', '').replace('```', '').strip()
    return json.loads(text)


EXTRACAO_PDF_PROMPT = """
Você é um especialista em extração de dados de materiais comerciais imobiliários.

Analise o documento e extraia as informações em formato JSON:
{
  "nomeEmpreendimento": "<nome>",
  "construtora": "<nome da construtora>",
  "bairro": "<bairro>",
  "cidade": "<cidade>",
  "estado": "<estado>",
  "metragem": { "min": <numero>, "max": <numero>, "unidade": "m²" },
  "quartos": { "min": <numero>, "max": <numero> },
  "banheiros": { "min": <numero>, "max": <numero> },
  "vagas": { "min": <numero>, "max": <numero> },
  "andares": <numero ou null>,
  "unidades": <numero ou null>,
  "precoMin": <numero ou null>,
  "precoMax": <numero ou null>,
  "entrega": "<data prevista ou null>",
  "diferenciais": ["diferencial1", "diferencial2"],
  "descricaoComercial": "<texto descritivo completo>",
  "tipoDocumento": "FOLDER|MEMORIAL_DESCRITIVO|TABELA_PRECO|OUTRO",
  "confianca": <0.0-1.0>
}

Se algum campo não encontrado, use null.
Retorne APENAS o JSON, sem explicações.
"""

def extract_pdf_data(pdf_text: str, document_name: str) -> dict:
    """Extrai dados estruturados de texto de PDF."""
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"Documento: {document_name}\n\nConteúdo:\n{pdf_text[:8000]}\n\n{EXTRACAO_PDF_PROMPT}"
        }]
    )
    
    text = response.content[0].text
    text = text.replace('```json', '').replace('```', '').strip()
    return json.loads(text)


def classify_by_filename(filename: str) -> dict | None:
    """Classificação rápida por nome do arquivo - sem IA."""
    name = filename.lower()
    
    rules = [
        (['fachada', 'facade', 'externo', 'externa', 'frente'], 'FACHADA', 0.9),
        (['piscina', 'pool', 'aqua'], 'PISCINA', 0.92),
        (['academia', 'gym', 'fitness'], 'ACADEMIA', 0.92),
        (['planta', 'plant', 'floor_plan', 'floorplan'], 'PLANTA_BAIXA', 0.85),
        (['planta_hum', 'humanizada', 'ambientada'], 'PLANTA_HUMANIZADA', 0.92),
        (['logo', 'brand', 'marca'], 'LOGO', 0.95),
        (['video', 'tour', 'drone', 'aerial'], 'VIDEO_TOUR', 0.9),
        (['banner', 'hero', 'destaque'], 'BANNER', 0.88),
        (['insta', 'instagram', 'post'], 'POST_INSTAGRAM', 0.92),
        (['lazer', 'leisure', 'salao', 'churrasq', 'gourmet'], 'AREA_DE_LAZER', 0.88),
        (['quarto', 'suite', 'bedroom', 'dorm'], 'QUARTO', 0.9),
        (['sala', 'living', 'lounge'], 'SALA', 0.9),
        (['cozinha', 'kitchen'], 'COZINHA', 0.92),
        (['banheiro', 'bath', 'lavabo'], 'BANHEIRO', 0.9),
        (['varanda', 'sacada', 'balcony', 'terraço'], 'VARANDA', 0.9),
        (['obra', 'construção', 'andamento'], 'OBRA', 0.88),
        (['folder', 'comercial', 'material'], 'PDF_FOLDER', 0.85),
        (['memorial', 'descritivo'], 'PDF_MEMORIAL', 0.9),
        (['tabela', 'preco', 'price', 'lista'], 'TABELA_PRECO', 0.88),
    ]
    
    for keywords, categoria, confianca in rules:
        if any(k in name for k in keywords):
            return {
                'categoria': categoria,
                'confianca': confianca,
                'classificadoPor': 'NOME_ARQUIVO'
            }
    
    return None
```

---

## 9. PROCESSAMENTO DE IMAGENS (Python)

### Processor (`apps/media-processor/src/image_processor.py`)

```python
from PIL import Image, ImageOps
import cv2
import numpy as np
from pathlib import Path
import subprocess
import json

PROFILES = {
    'THUMBNAIL':     {'width': 200,  'height': 150,  'quality': 75,  'format': 'webp'},
    'CARD':          {'width': 400,  'height': 300,  'quality': 80,  'format': 'webp'},
    'BANNER':        {'width': 1200, 'height': 600,  'quality': 85,  'format': 'webp'},
    'MOBILE':        {'width': 768,  'height': 512,  'quality': 82,  'format': 'webp'},
    'GALLERY':       {'width': 1024, 'height': 768,  'quality': 85,  'format': 'webp'},
    'FULLSCREEN':    {'width': 1920, 'height': 1080, 'quality': 88,  'format': 'webp'},
    'SQUARE':        {'width': 600,  'height': 600,  'quality': 82,  'format': 'webp'},
    'WEBP_ORIGINAL': {'max_width': 3840,             'quality': 90,  'format': 'webp'},
}

def smart_crop(image: Image.Image, target_w: int, target_h: int, focal_point: dict = None) -> Image.Image:
    """
    Smart crop usando ponto focal.
    focal_point: {'x': 0.5, 'y': 0.3} - coordenadas normalizadas (0-1)
    """
    src_w, src_h = image.size
    target_ratio = target_w / target_h
    src_ratio = src_w / src_h
    
    if src_ratio > target_ratio:
        # Imagem mais larga que o target: recortar horizontalmente
        new_w = int(src_h * target_ratio)
        fx = focal_point['x'] if focal_point else 0.5
        x_center = int(src_w * fx)
        x_start = max(0, min(x_center - new_w // 2, src_w - new_w))
        box = (x_start, 0, x_start + new_w, src_h)
    else:
        # Imagem mais alta que o target: recortar verticalmente
        new_h = int(src_w / target_ratio)
        fy = focal_point['y'] if focal_point else 0.4  # bias para cima (fachadas)
        y_center = int(src_h * fy)
        y_start = max(0, min(y_center - new_h // 2, src_h - new_h))
        box = (0, y_start, src_w, y_start + new_h)
    
    cropped = image.crop(box)
    return cropped.resize((target_w, target_h), Image.LANCZOS)


def detect_focal_point(image_path: str) -> dict:
    """Detecta ponto focal usando saliência visual (OpenCV)."""
    img = cv2.imread(image_path)
    if img is None:
        return {'x': 0.5, 'y': 0.4}
    
    # Saliency detection
    saliency = cv2.saliency.StaticSaliencySpectralResidual_create()
    success, saliency_map = saliency.computeSaliency(img)
    
    if not success:
        return {'x': 0.5, 'y': 0.4}
    
    # Encontra centro de massa do mapa de saliência
    saliency_map = (saliency_map * 255).astype(np.uint8)
    M = cv2.moments(saliency_map)
    
    if M['m00'] == 0:
        return {'x': 0.5, 'y': 0.4}
    
    cx = M['m10'] / M['m00']
    cy = M['m01'] / M['m00']
    h, w = img.shape[:2]
    
    return {
        'x': round(cx / w, 3),
        'y': round(cy / h, 3)
    }


def process_image(
    input_path: str,
    output_dir: str,
    focal_point: dict = None,
    profiles: list = None
) -> list[dict]:
    """Processa uma imagem gerando todas as versões necessárias."""
    
    if profiles is None:
        profiles = list(PROFILES.keys())
    
    # Auto-detecta focal point se não fornecido
    if focal_point is None:
        focal_point = detect_focal_point(input_path)
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    original = Image.open(input_path)
    
    # Corrige orientação EXIF
    original = ImageOps.exif_transpose(original)
    
    # Converte para RGB se necessário
    if original.mode not in ('RGB', 'RGBA'):
        original = original.convert('RGB')
    
    results = []
    
    for profile_name in profiles:
        profile = PROFILES[profile_name]
        fmt = profile['format']
        quality = profile['quality']
        
        if profile_name == 'WEBP_ORIGINAL':
            # Mantém proporção, apenas otimiza
            max_w = profile.get('max_width', 3840)
            if original.size[0] > max_w:
                ratio = max_w / original.size[0]
                new_size = (max_w, int(original.size[1] * ratio))
                processed = original.resize(new_size, Image.LANCZOS)
            else:
                processed = original.copy()
        else:
            # Smart crop para dimensões alvo
            processed = smart_crop(
                original,
                profile['width'],
                profile['height'],
                focal_point
            )
        
        output_filename = f"{profile_name.lower()}.{fmt}"
        output_path = output_dir / output_filename
        
        save_kwargs = {'quality': quality, 'optimize': True}
        if fmt == 'webp':
            save_kwargs['method'] = 6  # melhor compressão WebP
        
        processed.save(str(output_path), fmt.upper(), **save_kwargs)
        
        results.append({
            'perfil': profile_name,
            'formato': fmt,
            'largura': processed.size[0],
            'altura': processed.size[1],
            'tamanho': output_path.stat().st_size,
            'path': str(output_path),
        })
    
    return results
```

### Processamento de Vídeo (`apps/media-processor/src/video_processor.py`)

```python
import subprocess
import json
import os
from pathlib import Path

def get_video_info(video_path: str) -> dict:
    """Extrai metadados do vídeo via FFprobe."""
    cmd = [
        'ffprobe', '-v', 'quiet', '-print_format', 'json',
        '-show_streams', '-show_format', video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    data = json.loads(result.stdout)
    
    video_stream = next(
        (s for s in data['streams'] if s['codec_type'] == 'video'), {}
    )
    
    return {
        'duracao': float(data['format'].get('duration', 0)),
        'largura': video_stream.get('width'),
        'altura': video_stream.get('height'),
        'fps': eval(video_stream.get('r_frame_rate', '0/1')),
        'codec': video_stream.get('codec_name'),
        'bitrate': int(data['format'].get('bit_rate', 0)),
        'tamanho': int(data['format'].get('size', 0)),
    }


def process_video(input_path: str, output_dir: str) -> dict:
    """Processa vídeo gerando versões otimizadas."""
    
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    info = get_video_info(input_path)
    results = {}
    
    # 1. Thumbnail (frame em 10% da duração)
    thumb_time = max(1, info['duracao'] * 0.1)
    thumb_path = output_dir / 'thumbnail.webp'
    subprocess.run([
        'ffmpeg', '-y', '-ss', str(thumb_time),
        '-i', input_path, '-vframes', '1',
        '-vf', 'scale=1280:720:force_original_aspect_ratio=decrease',
        '-q:v', '85', str(thumb_path)
    ], capture_output=True)
    results['VIDEO_THUMB'] = str(thumb_path)
    
    # 2. MP4 HQ (1080p H.264)
    mp4_hq_path = output_dir / 'video_hq.mp4'
    subprocess.run([
        'ffmpeg', '-y', '-i', input_path,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '22',
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
        '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart',
        str(mp4_hq_path)
    ], capture_output=True)
    results['VIDEO_MP4_HQ'] = str(mp4_hq_path)
    
    # 3. MP4 LQ (480p - mobile/lento)
    mp4_lq_path = output_dir / 'video_lq.mp4'
    subprocess.run([
        'ffmpeg', '-y', '-i', input_path,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '28',
        '-vf', 'scale=854:480:force_original_aspect_ratio=decrease',
        '-c:a', 'aac', '-b:a', '96k',
        '-movflags', '+faststart',
        str(mp4_lq_path)
    ], capture_output=True)
    results['VIDEO_MP4_LQ'] = str(mp4_lq_path)
    
    # 4. HLS (streaming adaptativo)
    hls_dir = output_dir / 'hls'
    hls_dir.mkdir(exist_ok=True)
    subprocess.run([
        'ffmpeg', '-y', '-i', input_path,
        '-c:v', 'libx264', '-preset', 'fast',
        '-c:a', 'aac',
        '-hls_time', '6',
        '-hls_list_size', '0',
        '-hls_segment_filename', str(hls_dir / 'seg_%03d.ts'),
        str(hls_dir / 'index.m3u8')
    ], capture_output=True)
    results['VIDEO_HLS'] = str(hls_dir / 'index.m3u8')
    
    return {
        'info': info,
        'versoes': results
    }
```

---

## 10. API ENDPOINTS

### Rotas Principais

```
POST   /api/importacoes                    → Criar nova importação
GET    /api/importacoes                    → Listar importações
GET    /api/importacoes/:id                → Detalhes + progresso
DELETE /api/importacoes/:id               → Cancelar

POST   /api/importacoes/:id/retry         → Retentar arquivos com erro
POST   /api/importacoes/:id/publish       → Publicar empreendimento

GET    /api/empreendimentos               → Listar empreendimentos
POST   /api/empreendimentos              → Criar
GET    /api/empreendimentos/:id          → Detalhes
PUT    /api/empreendimentos/:id          → Atualizar
DELETE /api/empreendimentos/:id          → Remover
POST   /api/empreendimentos/:id/publish  → Publicar

GET    /api/empreendimentos/:id/medias   → Listar mídias
PUT    /api/medias/:id                   → Atualizar (categoria, ordem, destaque)
DELETE /api/medias/:id                   → Remover
POST   /api/medias/:id/regenerate        → Regenerar versões

POST   /api/upload/direct                → Upload direto de arquivos
POST   /api/upload/url                   → Import via URL

GET    /api/jobs/stats                   → Estatísticas das filas
GET    /api/jobs/:id                     → Status de job específico

POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

WS     /ws                               → WebSocket (progresso em tempo real)
```

### Exemplo de payload (POST /api/importacoes)

```typescript
// Request
{
  "sourceType": "GOOGLE_DRIVE",  // ou qualquer SourceType
  "sourceUrl": "https://drive.google.com/drive/folders/1XxYyZz...",
  "empreendimentoId": "clp1234...",  // opcional - cria novo se omitido
  "config": {
    "autoPublish": false,
    "autoCreateEmpreendimento": true,
    "processVideos": true,
    "processPdfs": true,
    "generateDescriptions": true
  }
}

// Response
{
  "id": "clp5678...",
  "status": "VERIFICANDO_FONTE",
  "sourceType": "GOOGLE_DRIVE",
  "progresso": 0,
  "socketRoom": "import:clp5678...",
  "estimatedTime": null
}
```

---

## 11. FRONTEND — ESTRUTURA NEXT.JS

```
apps/frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    → Dashboard home
│   │   │   ├── importacoes/
│   │   │   │   ├── page.tsx                → Lista de importações
│   │   │   │   ├── nova/page.tsx           → Nova importação (drop zone)
│   │   │   │   └── [id]/page.tsx           → Detalhes + progresso real-time
│   │   │   ├── empreendimentos/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx            → Editor do empreendimento
│   │   │   │       ├── galeria/page.tsx    → Gerenciar galerias
│   │   │   │       └── publicar/page.tsx   → Preview + publicar
│   │   │   └── configuracoes/page.tsx
│   │   └── api/                            → API routes Next.js (proxies)
│   ├── components/
│   │   ├── import/
│   │   │   ├── ImportDropzone.tsx          → Aceita qualquer coisa (link, arquivo, zip)
│   │   │   ├── ImportProgress.tsx          → Progresso em tempo real com etapas
│   │   │   ├── FileExplorer.tsx            → Árvore de arquivos importados
│   │   │   └── ClassificationReview.tsx   → Revisão manual da classificação IA
│   │   ├── media/
│   │   │   ├── MediaGrid.tsx              → Grid responsivo com categorias
│   │   │   ├── MediaCard.tsx              → Card com preview e ações
│   │   │   ├── MediaLightbox.tsx          → Visualizador full-screen
│   │   │   ├── DragDropSort.tsx           → Reordenar com drag-and-drop
│   │   │   └── CategoryFilter.tsx         → Filtro por categoria
│   │   ├── empreendimento/
│   │   │   ├── EmpreendimentoForm.tsx     → Formulário completo
│   │   │   ├── AIDataPreview.tsx          → Preview dados extraídos por IA
│   │   │   └── PublishPreview.tsx         → Preview do site
│   │   └── ui/                            → shadcn/ui customizado
│   ├── hooks/
│   │   ├── useImportProgress.ts           → WebSocket + progresso
│   │   ├── useMediaUpload.ts              → Upload direto
│   │   └── useEmpreendimento.ts
│   ├── lib/
│   │   ├── api.ts                         → Cliente API (axios + interceptors)
│   │   ├── socket.ts                      → Socket.io client
│   │   └── utils.ts
│   └── types/
│       └── index.ts
```

### ImportDropzone — suporte universal

```typescript
// apps/frontend/src/components/import/ImportDropzone.tsx
// Aceita: links (qualquer fonte), arquivos, ZIPs, drag-and-drop

const ACCEPTED_INPUTS = [
  'https://drive.google.com/...',
  'https://www.dropbox.com/sh/...',
  'https://onedrive.live.com/...',
  'https://wetransfer.com/downloads/...',
  'https://example.com/pasta.zip',
  'Arrastar arquivos aqui',
  'Colar link direto',
]
```

---

## 12. DOCKER COMPOSE

### `docker-compose.yml` (desenvolvimento)

```yaml
version: '3.9'

services:
  # ─── Banco de Dados ──────────────────────────────────────────
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: imov_media
      POSTGRES_USER: imov
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  # ─── API Backend ─────────────────────────────────────────────
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://imov:${DB_PASSWORD}@postgres:5432/imov_media
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
      R2_BUCKET: imov-media
      R2_PUBLIC_URL: https://media.imov.somar.ia.br
      GOOGLE_SERVICE_ACCOUNT_KEY: ${GOOGLE_SERVICE_ACCOUNT_KEY}
    depends_on:
      - postgres
      - redis
    ports:
      - "3001:3001"

  # ─── Frontend ────────────────────────────────────────────────
  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: https://api.imov.somar.ia.br
      NEXT_PUBLIC_WS_URL: wss://api.imov.somar.ia.br
    ports:
      - "3000:3000"

  # ─── Media Processor (Python) ────────────────────────────────
  media-processor:
    build:
      context: ./apps/media-processor
      dockerfile: Dockerfile
    environment:
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
      R2_BUCKET: imov-media
    volumes:
      - processing_tmp:/tmp/media-processing
    depends_on:
      - redis
    deploy:
      replicas: 2  # 2 workers paralelos

  # ─── AI Classifier (Python) ──────────────────────────────────
  ai-classifier:
    build:
      context: ./apps/ai-classifier
      dockerfile: Dockerfile
    environment:
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    depends_on:
      - redis

  # ─── Importer Service (Node.js) ──────────────────────────────
  importer:
    build:
      context: ./apps/importer
      dockerfile: Dockerfile
    environment:
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      DATABASE_URL: postgresql://imov:${DB_PASSWORD}@postgres:5432/imov_media
      GOOGLE_SERVICE_ACCOUNT_KEY: ${GOOGLE_SERVICE_ACCOUNT_KEY}
      DROPBOX_APP_KEY: ${DROPBOX_APP_KEY}
    depends_on:
      - postgres
      - redis

  # ─── Nginx ───────────────────────────────────────────────────
  nginx:
    image: nginx:alpine
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/sites:/etc/nginx/conf.d
      - /etc/letsencrypt:/etc/letsencrypt:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
      - frontend

  # ─── Monitoramento ───────────────────────────────────────────
  bull-board:
    image: deadly0/bull-board:latest
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    ports:
      - "3030:3000"
    depends_on:
      - redis

volumes:
  postgres_data:
  redis_data:
  processing_tmp:
```

---

## 13. VARIÁVEIS DE AMBIENTE

### `.env.example`

```env
# ─── Banco ────────────────────────────────────────────────────
DATABASE_URL=postgresql://imov:password@localhost:5432/imov_media
DB_PASSWORD=change_me_strong_password

# ─── Cache ───────────────────────────────────────────────────
REDIS_URL=redis://:password@localhost:6379
REDIS_PASSWORD=change_me_redis_password

# ─── Auth ────────────────────────────────────────────────────
JWT_SECRET=change_me_jwt_secret_256bit
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# ─── IA Anthropic ────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ─── Storage Cloudflare R2 ──────────────────────────────────
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET=imov-media
R2_PUBLIC_URL=https://media.imov.somar.ia.br

# ─── Google Drive ────────────────────────────────────────────
# Service Account JSON (base64 encoded) OU OAuth2 credentials
GOOGLE_SERVICE_ACCOUNT_KEY=base64_encoded_service_account_json
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret

# ─── Dropbox (opcional) ──────────────────────────────────────
DROPBOX_APP_KEY=your_dropbox_app_key
DROPBOX_APP_SECRET=your_dropbox_app_secret

# ─── URLs ─────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=https://api.imov.somar.ia.br
NEXT_PUBLIC_WS_URL=wss://api.imov.somar.ia.br
NEXT_PUBLIC_SITE_URL=https://imov.somar.ia.br
MEDIA_CDN_URL=https://media.imov.somar.ia.br

# ─── Features ────────────────────────────────────────────────
MAX_CONCURRENT_DOWNLOADS=5
MAX_CONCURRENT_PROCESSING=3
MAX_FILE_SIZE_MB=500
ENABLE_VIDEO_PROCESSING=true
ENABLE_AI_CLASSIFICATION=true
ENABLE_OCR=true
ENABLE_AUTO_PUBLISH=false
```

---

## 14. ESTRUTURA DE STORAGE (Cloudflare R2)

```
imov-media/ (bucket)
├── empreendimentos/
│   └── {empreendimento_id}/
│       ├── original/
│       │   ├── img_001.jpg
│       │   ├── video_tour.mp4
│       │   └── folder.pdf
│       ├── images/
│       │   └── {media_id}/
│       │       ├── webp_original.webp
│       │       ├── fullscreen.webp
│       │       ├── gallery.webp
│       │       ├── banner.webp
│       │       ├── card.webp
│       │       ├── mobile.webp
│       │       ├── square.webp
│       │       └── thumbnail.webp
│       ├── videos/
│       │   └── {media_id}/
│       │       ├── video_hq.mp4
│       │       ├── video_lq.mp4
│       │       ├── hls/
│       │       │   ├── index.m3u8
│       │       │   └── seg_*.ts
│       │       └── thumbnail.webp
│       └── documents/
│           └── {doc_id}/
│               ├── original.pdf
│               └── pages/
│                   ├── page_01.webp
│                   └── page_02.webp
└── tmp/
    └── {import_id}/          # Limpeza automática após 24h
```

---

## 15. FLUXO COMPLETO DE IMPORTAÇÃO

```
1. USUÁRIO COLA LINK (ou arrasta arquivo)
   ↓
2. DETECÇÃO DE FONTE
   - Google Drive? Dropbox? OneDrive? WeTransfer? URL? ZIP? Upload direto?
   ↓
3. VERIFICAÇÃO DA FONTE (Job: verify-source)
   - Lista todos os arquivos recursivamente
   - Calcula total de arquivos e tamanho estimado
   - Cria registro de Importacao no banco
   - Emite progresso via WebSocket
   ↓
4. DOWNLOAD EM PARALELO (Job: download-files)
   - p-limit(5) downloads simultâneos
   - Progresso file-by-file via WebSocket
   - Salva em /tmp/media-processing/{import_id}/
   - Para ZIPs: extrai automaticamente
   ↓
5. PRÉ-CLASSIFICAÇÃO (Job: classify-by-name)
   - Analisa nome e extensão de cada arquivo
   - Aplica regras de classificação rápida
   - Alta confiança (>0.85): classifica direto
   - Baixa confiança: fila para IA visual
   ↓
6. CLASSIFICAÇÃO IA (Job: classify-by-ai)  [somente para imagens ambíguas]
   - Claude claude-sonnet-4-20250514 Vision analisa cada imagem
   - Detecta categoria, focal point, alt text, tags
   - Atualiza classificação com confiança
   ↓
7. PROCESSAMENTO DE IMAGENS (Job: optimize-image) [parallel workers]
   - Detecta focal point (OpenCV saliency)
   - Gera 8 versões WebP para cada imagem
   - Smart crop com focal point
   ↓
8. PROCESSAMENTO DE VÍDEOS (Job: process-video) [parallel workers]
   - Comprime para H.264
   - Gera HLS (streaming)
   - Extrai thumbnail
   ↓
9. PROCESSAMENTO DE PDFs (Job: extract-pdf)
   - Extrai texto com pdfplumber
   - OCR com pytesseract/easyocr
   - Claude extrai dados estruturados
   - Auto-preenche campos do empreendimento
   ↓
10. UPLOAD PARA R2 (Job: upload-to-r2)
    - Upload paralelo de todas as versões
    - Gera URLs CDN Cloudflare
    - Atualiza banco com URLs finais
    ↓
11. CRIAÇÃO DO EMPREENDIMENTO
    - Cria/atualiza empreendimento no banco
    - Cria galerias por categoria
    - Vincula todas as mídias
    - Ordena automaticamente por categoria
    ↓
12. REVISÃO MANUAL (se autoPublish = false)
    - Notifica usuário
    - Dashboard mostra preview completo
    - Usuário revisa, reordena, ajusta
    ↓
13. PUBLICAÇÃO
    - Marca empreendimento como PUBLICADO
    - Purga cache Cloudflare
    - Notifica sistema principal (imov.somar.ia.br)
    - Empreendimento disponível no site
```

---

## 16. INTEGRAÇÃO COM imov.somar.ia.br

### Webhook de publicação

```typescript
// Quando empreendimento é publicado, notifica o site principal
async function notifyMainSite(empreendimentoId: string) {
  const empreendimento = await getEmpreendimentoCompleto(empreendimentoId)
  
  await fetch(`${process.env.MAIN_SITE_WEBHOOK_URL}/api/empreendimentos/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.MAIN_SITE_API_KEY,
    },
    body: JSON.stringify({
      action: 'UPSERT',
      empreendimento: {
        id: empreendimento.id,
        slug: empreendimento.slug,
        nome: empreendimento.nome,
        // ... todos os dados
        medias: empreendimento.medias.map(m => ({
          id: m.id,
          categoria: m.categoria,
          urls: m.versoes.reduce((acc, v) => ({
            ...acc,
            [v.perfil]: v.cdn || v.url
          }), {}),
        })),
      }
    })
  })
}
```

---

## 17. REGRAS DE CLASSIFICAÇÃO POR PASTA

```typescript
// Analisa estrutura de pastas para melhorar classificação
const FOLDER_RULES: Record<string, CategoriaMedia> = {
  'fachada': 'FACHADA',
  'fachadas': 'FACHADA',
  'externo': 'FACHADA',
  'externa': 'FACHADA',
  'piscina': 'PISCINA',
  'academia': 'ACADEMIA',
  'fitness': 'ACADEMIA',
  'gym': 'ACADEMIA',
  'lazer': 'AREA_DE_LAZER',
  'leisure': 'AREA_DE_LAZER',
  'area comum': 'AREA_DE_LAZER',
  'areas comuns': 'AREA_DE_LAZER',
  'plantas': 'PLANTA_BAIXA',
  'planta': 'PLANTA_BAIXA',
  'floor plans': 'PLANTA_BAIXA',
  'logo': 'LOGO',
  'logos': 'LOGO',
  'marca': 'LOGO',
  'brand': 'LOGO',
  'video': 'VIDEO_TOUR',
  'videos': 'VIDEO_TOUR',
  'tour': 'VIDEO_TOUR',
  'drone': 'VIDEO_DRONE',
  'banner': 'BANNER',
  'banners': 'BANNER',
  'social': 'POST_INSTAGRAM',
  'instagram': 'POST_INSTAGRAM',
  'posts': 'POST_INSTAGRAM',
  'interiores': 'SALA',
  'interior': 'SALA',
  'quarto': 'QUARTO',
  'quartos': 'QUARTO',
  'suites': 'QUARTO',
  'cozinha': 'COZINHA',
  'varanda': 'VARANDA',
  'sacada': 'VARANDA',
  'documentos': 'PDF_FOLDER',
  'documents': 'PDF_FOLDER',
  'pdfs': 'PDF_FOLDER',
  'tabela': 'TABELA_PRECO',
  'precos': 'TABELA_PRECO',
}
```

---

## 18. MONITORAMENTO E OBSERVABILIDADE

### Métricas Prometheus

```typescript
// Métricas expostas em /metrics
const metrics = {
  importacoes_total: counter('Importações iniciadas'),
  importacoes_concluidas: counter('Importações concluídas'),
  importacoes_erro: counter('Importações com erro'),
  arquivos_processados: counter('Arquivos processados'),
  ai_classificacoes: counter('Classificações por IA realizadas'),
  ai_latencia_ms: histogram('Latência das chamadas IA'),
  processamento_duracao_ms: histogram('Duração do processamento por tipo'),
  queue_jobs_ativos: gauge('Jobs ativos por fila'),
  storage_bytes_usados: gauge('Bytes usados no R2'),
}
```

### Health Checks

```
GET /health          → Status geral (200 = ok)
GET /health/db       → PostgreSQL
GET /health/redis    → Redis
GET /health/r2       → Cloudflare R2
GET /health/ai       → Anthropic API
GET /health/queues   → BullMQ workers
```

---

## 19. COMANDOS DE DESENVOLVIMENTO

```bash
# Clonar e instalar
git clone https://github.com/somar/imov-media-pipeline
cd imov-media-pipeline
npm install -g pnpm
pnpm install

# Infraestrutura local
docker compose up -d postgres redis

# Banco de dados
cd apps/api
pnpm prisma migrate dev
pnpm prisma db seed

# Desenvolvimento (todos os serviços)
pnpm dev

# Apenas API
pnpm --filter api dev

# Apenas frontend
pnpm --filter frontend dev

# Python services
cd apps/media-processor
pip install -r requirements.txt --break-system-packages
python src/worker.py

# Build produção
pnpm build

# Docker completo
docker compose -f docker-compose.prod.yml up -d --build

# Prisma Studio (gerenciar banco visualmente)
cd apps/api && pnpm prisma studio
```

---

## 20. CHECKLIST DE IMPLEMENTAÇÃO (Claude Code)

### Fase 1 — Infraestrutura Base
- [ ] Criar estrutura de monorepo com pnpm workspaces
- [ ] Setup PostgreSQL + pgvector + Redis via Docker
- [ ] Schema Prisma completo + migrations
- [ ] NestJS API com autenticação JWT
- [ ] BullMQ + Redis connection
- [ ] Cloudflare R2 storage service

### Fase 2 — Importação Universal
- [ ] Source detector (todos os tipos)
- [ ] Google Drive importer (googleapis)
- [ ] HTTP/ZIP downloader
- [ ] Dropbox importer
- [ ] WebSocket progress tracking
- [ ] Job queue completo (verify → download → extract)

### Fase 3 — IA e Classificação
- [ ] Anthropic SDK integration
- [ ] Image classifier (Claude Vision)
- [ ] Filename-based classifier
- [ ] Folder structure classifier
- [ ] PDF data extractor
- [ ] OCR pipeline (pytesseract + easyocr)

### Fase 4 — Processamento de Mídia
- [ ] Image processor (Pillow + variantes WebP)
- [ ] Smart crop (focal point detection)
- [ ] Video processor (FFmpeg)
- [ ] HLS streaming
- [ ] R2 upload service
- [ ] CDN URL generation

### Fase 5 — Frontend Admin
- [ ] Next.js setup + shadcn/ui
- [ ] Login/auth flow
- [ ] Import dropzone (universal)
- [ ] Real-time progress dashboard
- [ ] Media grid com categorias
- [ ] Drag-and-drop sort
- [ ] Empreendimento editor
- [ ] Publish preview + workflow

### Fase 6 — Integração e Publicação
- [ ] Webhook para imov.somar.ia.br
- [ ] Auto-create empreendimento de PDF
- [ ] Galeria auto-organizada
- [ ] Publish workflow completo
- [ ] Cloudflare cache purge

### Fase 7 — Produção
- [ ] Docker compose produção
- [ ] Nginx reverse proxy + SSL
- [ ] GitHub Actions CI/CD
- [ ] Prometheus + Grafana
- [ ] Bull Board monitoring
- [ ] Health checks
- [ ] Backup automático PostgreSQL

---

## NOTAS IMPORTANTES PARA O CLAUDE CODE

1. **Modelo Anthropic a usar:** `claude-sonnet-4-20250514` para todas as chamadas de IA
2. **Site principal:** `imov.somar.ia.br` — o pipeline publica conteúdo aqui
3. **Admin:** `admin.imov.somar.ia.br` — interface de gerenciamento
4. **Media CDN:** `media.imov.somar.ia.br` — servido pelo Cloudflare R2
5. **Aceitar QUALQUER fonte de arquivos** — Google Drive, Dropbox, OneDrive, WeTransfer, URLs diretas, ZIPs, uploads diretos, FTP
6. **Smart crop obrigatório** — nunca cortar conteúdo importante de imagens
7. **Processar em paralelo** — usar concorrência máxima compatível com hardware
8. **Classificação em camadas** — nome → pasta → IA visual (usar IA somente quando necessário para economizar tokens)
9. **Tudo deve funcionar offline da IA** — sistema deve funcionar com regras quando a IA não está disponível
10. **WebSocket obrigatório** — progresso em tempo real para o usuário, nunca deixar sem feedback

---

*Documento gerado para execução pelo Claude Code — IMOV MEDIA PIPELINE AI v1.0*
*Site: imov.somar.ia.br | Organização: Somar IA*
