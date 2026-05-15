# DevCareer AI

DevCareer AI is a PC web MVP for developer resume analysis, project experience optimization, job JD matching, mock interviews, and history review.

## Tech Stack

- Frontend: Vue 3, Vite, TypeScript, Vue Router, Pinia, Element Plus, Axios, ECharts, markdown-it
- Backend: NestJS, TypeScript, Prisma, SQLite, class-validator, multer
- AI provider: DeepSeek-compatible API through a backend `AiService`

## Structure

```txt
DevCareerAI
|-- web
|-- server
|-- docs
|-- AGENTS.md
`-- README.md
```

## UI Style

The web client uses a modern AI workspace style inspired by Apple, Raycast, Linear, Notion AI, and ChatGPT Web:

- Light radial gradient background
- Glassmorphism sidebar and content cards
- Rounded 24px primary cards and 12px controls
- Soft borders, subtle shadows, and gradient primary actions
- Card-based history and AI chat-style interview page

Main frontend areas:

- `web/src/layout`: app shell, sidebar, and header
- `web/src/styles`: design tokens, global theme, and Element Plus visual overrides
- `web/src/components`: reusable UI components such as glass cards, page headers, empty states, score cards, chat messages, and feedback cards
- `web/src/views`: route pages for home, resume analysis, project optimization, job matching, interview, history, and settings

## Environment

Frontend: `web/.env.development`

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

Backend: `server/.env`

```env
DATABASE_URL="file:./dev.db"
DEEPSEEK_API_KEY="your_api_key_here"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-v4-flash"
PORT=3000
```

DeepSeek API keys must only be configured on the server.

## Install

```bash
npm install
```

## Database

```bash
npm run prisma:migrate
```

This creates the SQLite database under `server/prisma/dev.db`.

## Start

Start both apps:

```bash
npm run dev
```

Start separately:

```bash
npm run dev:web
npm run dev:server
```

Default URLs:

- Web: http://localhost:5173
- API: http://localhost:3000/api

## MVP Scope

This initial foundation provides monorepo setup, frontend routing/layout/components, request wrappers, backend module structure, CORS, environment config, Prisma schema, and placeholder pages/APIs. Complex AI business logic is intentionally left for the next implementation stage.
