# DevCareer AI MVP Design Notes

This document mirrors the current MVP implementation and engineering baseline.

## Current Stage

- Monorepo with `web`, `server`, and a `packages/shared` type-only package.
- Vue 3 + Vite + TypeScript client with routed feature pages.
- NestJS modular API with Prisma + SQLite persistence.
- AI calls are isolated behind `AiService` and an OpenAI-compatible provider; feature modules only call the service abstraction.
- SSE streaming is available for resume analysis, project optimization, job matching, interview, and career-chat flows.
- AI result cache is persisted in SQLite with feature/model/prompt hash keys; per-call token usage is logged to `AiUsageLog`.
- File parsing supports PDF, DOCX, TXT, and MD uploads with a 5 MB upload limit.

## Implemented Features

- Login and registration with local token persistence, protected frontend routes, and backend auth guard.
- Resume analysis with score, dimension scores, strengths, weaknesses, suggestions, and optimized examples.
- Project experience optimization with structured project copy and interview follow-up questions.
- Job description matching with match score, keywords, risks, resume suggestions, and interview preparation.
- Mock interview sessions with first question generation, answer feedback, follow-up questions, and final summaries.
- Career advisor chat with per-session resume/JD context and streamed replies.
- Dashboard overview aggregating latest scores across resume, job match, and interview, plus a resume-score trend line (latest N analyses across resumes, chronological).
- Admin-only AI usage summary (totals, by feature, by model, by day, by user).
- Admin-only user management: paginated/searchable list with per-user token totals, role changes, and ban/unban.
- History page for four business record types with filtering, detail view, and deletion.

## User Roles

- Users carry a `role` of `user` or `admin`, and a `status` of `active` or `disabled`.
- The first account to register in an empty system becomes admin; everyone after is a regular user. This bootstrap rule is fixed — admins are otherwise promoted/demoted through the user-management endpoints.
- Admin-only endpoints (AI usage summary, user management) are guarded by `@Roles('admin')`.
- Disabled users are rejected at login and on session validation; banning also deletes their sessions for immediate logout. Self-lock guards prevent an admin from changing their own role, banning themselves, or removing the last active admin.

## Engineering Baseline

- `npm run typecheck` runs frontend and backend type checks.
- `npm run lint` runs ESLint (flat config across both packages) with a zero-warning baseline; `npm run format` runs Prettier.
- `npm run check` runs typecheck, lint, tests, and a full production build.
- husky + lint-staged run `eslint --fix` and `prettier --write` on staged files at commit; commitlint enforces Conventional Commits.
- Request/response types live in `packages/shared`; backend DTOs `implements` the shared request types so contract drift surfaces as a type error on both sides.
- Server startup validates critical environment variables in `server/src/config/env.validation.ts`.
- DTOs enforce length limits, option ranges, and basic id shapes at the API boundary.
- SQLite runs in WAL mode with a busy timeout to ease concurrent writes during long AI requests.
- Server build disables TypeScript incremental output to avoid stale `tsbuildinfo` files after Nest clears `dist`.

## Deferred

- Runtime schema validation for AI JSON responses.
- History list pagination (currently returns all records for a type, newest first).
- Sliding session expiry (expiry is fixed at session creation).
- Production hardening before launch: CORS allow-list, request-id tracing / structured logs, and a migration path off SQLite as data grows.
