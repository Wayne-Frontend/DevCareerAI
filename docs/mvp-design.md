# DevCareer AI MVP Design Notes

This document mirrors the current MVP implementation and engineering baseline.

## Current Stage

- Monorepo root with `web` and `server`.
- Vue 3 + Vite + TypeScript client with routed feature pages.
- NestJS modular API with Prisma + SQLite persistence.
- DeepSeek calls are isolated behind `AiService`; feature modules only call the service abstraction.
- SSE streaming is available for resume analysis, project optimization, job matching, and interview flows.
- AI result cache is persisted in SQLite with feature/model/prompt hash keys.
- File parsing supports PDF, DOCX, TXT, and MD uploads with a 5 MB upload limit.

## Implemented Features

- Login and registration with local token persistence, protected frontend routes, and backend auth guard.
- Resume analysis with score, dimension scores, strengths, weaknesses, suggestions, and optimized examples.
- Project experience optimization with structured project copy and interview follow-up questions.
- Job description matching with match score, keywords, risks, resume suggestions, and interview preparation.
- Mock interview sessions with first question generation, answer feedback, follow-up questions, and final summaries.
- History page for four business record types with filtering, detail view, and deletion.

## Engineering Baseline

- `npm run typecheck` runs frontend and backend type checks.
- `npm run lint` currently aliases type checking until a dedicated lint/format stack is introduced.
- `npm run check` runs type checking and a full production build.
- Server startup validates critical environment variables in `server/src/config/env.validation.ts`.
- DTOs enforce length limits, option ranges, and basic id shapes at the API boundary.
- Server build disables TypeScript incremental output to avoid stale `tsbuildinfo` files after Nest clears `dist`.

## Deferred

- Dedicated ESLint and Prettier configuration.
- Runtime schema validation for AI JSON responses.
- Unified history/activity table with pagination and structured detail pages.
- Authentication, user isolation, and production-grade data privacy controls.
