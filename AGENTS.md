# DevCareer AI Agent Guide

## Scope

This repository is a monorepo:

- `web`: Vue 3 + Vite + TypeScript client.
- `server`: NestJS + Prisma + SQLite API.
- `docs`: product and implementation notes.

## Working Rules

- Keep frontend API calls inside `web/src/api`.
- Keep shared frontend types inside `web/src/types`.
- Use `<script setup lang="ts">` and scoped SCSS in Vue components.
- Keep Nest controllers thin; put business logic in services.
- Keep AI calls behind `AiService`; never call DeepSeek directly from feature modules or the frontend.
- Never commit real API keys. Use `.env` locally and `.env.example` for documentation.
- This stage is foundation-only: prefer placeholders over complex business logic.

## Verification

- Frontend build: `npm --prefix web run build`
- Backend build: `npm --prefix server run build`
- Prisma migration: `npm --prefix server run prisma:migrate`
- Local dev: `npm run dev`

## UI Design Guidelines

This project uses a modern AI workspace visual style.

Design keywords:
- Clean
- Spacious
- Apple-like
- Glassmorphism
- Soft shadows
- Rounded cards
- Light gradients
- Minimal dashboard feel

Avoid:
- Traditional admin dashboard style
- Heavy dark sidebar
- Dense tables
- Sharp borders
- Overly saturated colors

Preferred layout:
- Light gradient background
- Glass sidebar
- Card-based content
- Large page titles
- Soft muted descriptions
- Gradient primary actions
- Clear empty/loading/error states

Core reusable classes:
- glass-card
- section-card
- page-header
- page-title
- page-subtitle
- primary-gradient-btn
- soft-tag