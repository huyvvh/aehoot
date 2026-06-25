# AEHoot

> Real-time, Kahoot-style quiz platform for education and corporate training, with an **AI agent that generates standardized question sets from business documents**.

<p align="left">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma" />
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Data Model](#data-model)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [NPM Scripts](#npm-scripts)
- [AI Question Generator](#ai-question-generator)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## Overview

AEHoot is a multiplayer quiz platform where a **host** launches a live game room and
**players** join with a code to answer timed questions in real time, scored by speed and
streaks. Beyond manual authoring, AEHoot ships an **AI question-generation agent** that
turns internal documents (regulations, financial-product specs, operating procedures) into
review-ready quiz sets — purpose-built for **corporate training in regulated domains**.

The application runs as a **single Node process** that serves the Next.js app and a
Socket.IO real-time layer on the same port (`server.ts`).

## Key Features

- **Authentication** — JWT-based register / login / profile / password change.
- **Question authoring** — create, edit, organize sets into folders, mark favorites.
- **Content discovery** — browse and play public question sets.
- **Media** — cover-image upload via Cloudinary.
- **Real-time gameplay** — host/player rooms over Socket.IO, live leaderboard and podium,
  speed- and streak-based scoring.
- **Multiple game modes** — Classic, Race, Battle Royale, Challenge.
- **Homework mode** — assignable sets with deadlines.
- **AI question generation** — generate standardized question sets from `.docx` / `.xlsx`
  business documents, with source grounding, PII redaction, and a mandatory human-review
  gate. See [AI Question Generator](#ai-question-generator).

## System Architecture

```
                       ┌──────────────────────────────────────────┐
                       │  Node process (server.ts)                 │
   Browser  ◄────────► │  ┌────────────┐   ┌────────────────────┐ │
   (Next.js UI)        │  │ Next.js    │   │ Socket.IO          │ │
                       │  │ App Router │   │ (real-time game)   │ │
                       │  └─────┬──────┘   └─────────┬──────────┘ │
                       └────────┼────────────────────┼────────────┘
                                │                     │
                ┌───────────────┼─────────────┐      │
                ▼               ▼             ▼       ▼
          PostgreSQL         Redis        Cloudinary  In-memory game state
          (Prisma 7)      (sessions/        (media)   (GameManager)
                           caching)
                                │
                                ▼
                         GLM 5.2 (Z.ai)
                   OpenAI-compatible LLM API
                  (AI question generation only)
```

## Technology Stack

| Layer            | Technology                                              |
| ---------------- | ------------------------------------------------------- |
| Framework        | Next.js 16 (App Router), React 19                       |
| Language         | TypeScript 5                                            |
| Runtime server   | Custom Node server (`tsx server.ts`) + Socket.IO        |
| Database         | PostgreSQL 16 via Prisma 7 (`@prisma/adapter-pg`)       |
| Cache / sessions | Redis (Upstash REST client)                             |
| Auth             | JWT (`jsonwebtoken`) + `bcryptjs`                        |
| Media            | Cloudinary                                              |
| Validation       | Zod                                                     |
| UI               | Tailwind CSS 4, shadcn/Radix, lucide-react, sonner      |
| AI               | GLM 5.2 (Z.ai) via the OpenAI SDK (OpenAI-compatible)   |
| Doc parsing      | `mammoth` (DOCX), `exceljs` (XLSX)                       |

## Data Model

Core entities (see [`prisma/schema.prisma`](prisma/schema.prisma)):

- **User** → owns QuestionSets, Folders, GameSessions, Favorites.
- **QuestionSet** → **Question** → **Answer** (public/private, play count).
- **Folder**, **Favorite** — content organization.
- **GameSession** → **GamePlayer** → **PlayerAnswer** (game mode, status, homework/deadline).
- **SourceDocument** → **DocumentChunk**, **GenerationJob** — AI generation pipeline and
  full traceability from generated questions back to the source document.

Enums: `GameMode`, `GameStatus`, `DocStatus`, `JobStatus`.

## Getting Started

### Prerequisites

- Node.js **≥ 20**
- Docker (for local PostgreSQL + Redis)

### Installation

```bash
# 1. Start PostgreSQL + Redis
docker compose up -d

# 2. Install dependencies
npm install

# 3. Configure environment (see next section)
cp .env.example .env.local   # then fill in the values

# 4. Apply database migrations
npx prisma migrate dev

# 5. Run the dev server (Next.js + Socket.IO on http://localhost:3000)
npm run dev
```

For a production-like run (e.g. testing over a tunnel/reverse proxy):

```bash
npm run build && npm run start
```

## Environment Variables

Copy `.env.example` to `.env.local` and set:

| Variable                                       | Description                              |
| ---------------------------------------------- | ---------------------------------------- |
| `DATABASE_URL`                                 | PostgreSQL connection string             |
| `UPSTASH_REDIS_REST_URL` / `..._REST_TOKEN`    | Redis (Upstash) REST credentials         |
| `JWT_SECRET`                                   | Secret for signing JWTs (≥ 32 chars)     |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Cloudinary media upload             |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SOCKET_URL` | Public app & Socket.IO URLs            |
| `ZAI_API_KEY`                                  | Z.ai API key (AI generation)             |
| `ZAI_BASE_URL`                                 | `https://api.z.ai/api/paas/v4`           |
| `ZAI_MODEL`                                    | `glm-5.2`                                |

> Secrets belong in `.env.local`, which is git-ignored. Never commit real keys.

## NPM Scripts

| Script            | Description                                            |
| ----------------- | ----------------------------------------------------- |
| `npm run dev`     | Start dev server (Next.js + Socket.IO)                |
| `npm run build`   | `prisma generate` + `next build`                      |
| `npm run start`   | Start the production server                           |
| `npm run migrate` | Apply migrations in production (`prisma migrate deploy`) |
| `npm run lint`    | Run ESLint                                            |
| `npm test`        | Run unit tests (`node:test` via `tsx`)                |

## AI Question Generator

The AI agent converts business documents into review-ready quiz sets through a
deterministic, auditable pipeline:

```
Upload (.docx / .xlsx)
  → Text extraction (mammoth / exceljs)
  → Chunking (paragraph-aware, with overlap)
  → PII redaction (before any data leaves the system)
  → Generation (GLM 5.2 function calling → strict JSON)
  → Grounding check (reject/flag unsupported questions)
  → Standardization (taxonomy, difficulty → score/time)
  → Draft + citations → human REVIEW → Publish → QuestionSet
```

Design principles for regulated content:

- **Source grounding** — every question carries a verbatim `sourceQuote`; questions whose
  citation does not sufficiently match the source are dropped or flagged.
- **PII redaction** — emails, phone numbers, national IDs and account numbers are masked
  before the document is sent to the cloud LLM.
- **Human-in-the-loop** — generated sets remain drafts; the server **rejects publishing**
  until a reviewer approves (`JobStatus: QUEUED → PROCESSING → REVIEW → DONE`).
- **Cost controls** — bounded chunks per job, one concurrent job per user, token logging.

Relevant API routes:

| Method & Route                       | Purpose                                  |
| ------------------------------------ | ---------------------------------------- |
| `POST /api/documents`                | Upload, extract and chunk a document     |
| `POST /api/generate`                 | Start an async generation job            |
| `GET /api/generate/:id`              | Poll job status / progress / draft       |
| `PATCH /api/generate/:id`            | Save reviewer edits to the draft         |
| `POST /api/generate/:id/publish`     | Approve a draft and create a QuestionSet |

Core logic lives in [`src/lib/ai/`](src/lib/ai). Sample documents for testing are in
[`samples/`](samples).

## Project Structure

```
src/
├── app/
│   ├── api/            # Route handlers (auth, sets, folders, documents, generate, ...)
│   ├── dashboard/      # Authoring, discovery, hosting, AI generator UI
│   └── play/           # Player game client
├── components/         # UI components (sets, layout, ui primitives)
├── hooks/              # use-socket, etc.
├── lib/
│   ├── ai/             # AI generation pipeline (client, extract, chunk, generator,
│   │                   #   validate, standardize, pii, tests)
│   ├── auth.ts         # JWT helpers, API response helpers
│   ├── prisma.ts       # Prisma client
│   ├── redis.ts        # Redis client
│   └── validations.ts  # Zod schemas
├── socket/             # Socket.IO handlers + in-memory GameManager
└── stores/             # Client state (zustand)
prisma/                 # schema.prisma + migrations
server.ts               # Custom Next.js + Socket.IO server
```

## Testing

```bash
npm test            # unit tests for the AI pipeline (chunking, PII, grounding)
npx tsc --noEmit    # type-check the whole project
npm run lint        # lint
```

## Deployment

- Local infrastructure (PostgreSQL + Redis) is provided via [`docker-compose.yml`](docker-compose.yml).
- The app is a long-lived Node process and is **not** serverless-compatible
  (it owns the Socket.IO server).
- Full deployment guides are available under [`docs/`](docs):
  [`07-DEPLOYMENT-GUIDE.md`](docs/07-DEPLOYMENT-GUIDE.md) and
  [`09-VPS-DEPLOYMENT-GUIDE.md`](docs/09-VPS-DEPLOYMENT-GUIDE.md).

## Documentation

Design and specification documents live in [`docs/`](docs):

| File | Topic |
| ---- | ----- |
| `00-IMPLEMENTATION-PLAN.md` | Implementation plan |
| `01-PROJECT-OVERVIEW.md`    | Project overview |
| `02-DATABASE-SCHEMA.md`     | Database schema |
| `03-API-SPECIFICATION.md`   | API specification |
| `04-GAME-ENGINE.md`         | Real-time game engine |
| `05-PAGE-STRUCTURE.md`      | Page structure |
| `06-FOLDER-STRUCTURE.md`    | Folder structure |
| `07-DEPLOYMENT-GUIDE.md`    | Deployment guide |
| `08-INFRASTRUCTURE-COST-ANALYSIS.md` | Infrastructure cost analysis |
| `09-VPS-DEPLOYMENT-GUIDE.md` | VPS deployment guide |
