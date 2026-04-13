# VibeStack Template

Base React + Vite + shadcn/ui template that is cloned into every new Daytona sandbox. This is the starting point for every AI-generated website.

## VibeStack Platform — Big Picture

VibeStack is an AI-powered website builder. Users describe what they want in natural language, AI agents build it in a live sandbox, and the result deploys to production.

### System Flow

```
User → platform-client (React SPA, Cloudflare Pages)
     → platform-server (FastAPI, Railway)
     → platform-agents (LangGraph Cloud — AI builds the website)
     → Daytona sandbox (starts from vibestack-snapshot, which includes this template) ← YOU ARE HERE
     → GitHub (VibeStackCodes-Generated org)
     → Vercel (production hosting at *.app.vibestack.site)
```

### All Repos

| Repo | Role | Deploys To |
|------|------|------------|
| `platform-client` | React 19 SPA — builder UI (chat + live preview) | Cloudflare Pages |
| `platform-server` | FastAPI API — auth, billing, project CRUD, deploy, LangGraph proxy | Railway (Docker) |
| `platform-agents` | LangGraph multi-agent graph — analyst → designer → architect → coder → build | LangGraph Cloud |
| `cloudflare-workers` | Edge workers — preview-proxy, image-resolver, badge-injector | Cloudflare Workers |
| `vibestack-snapshot` | Daytona snapshot builder — pre-warmed Docker image with dev tooling | GitHub Actions |
| **vibestack-template** | Base React+Vite+shadcn template cloned into every new sandbox | Cloned at snapshot build |
| `vibestack-templates` | 60+ pre-built website templates with metadata + screenshots | Seeded into LangGraph store |
| `vibestack-badge-worker` | Injects "Made with VibeStack" badge on deployed sites | Cloudflare Workers |
| `e2e-full` | Comprehensive E2E test suite (pytest) — API, auth, billing, pipeline, UI | CI only |

### How This Repo Fits In

This template is the scaffold that every generated website starts from. It's cloned into the `vibestack-snapshot` Docker image at build time. When `platform-agents` creates a Daytona sandbox, the sandbox boots from that snapshot with this template already installed, deps pre-warmed, and Vite/TS caches populated. The AI coder agent then modifies the template files to build the user's requested website.

Changes to this repo trigger a `vibestack-snapshot` rebuild via `repository_dispatch`.

### Key Infrastructure

- **Domains**: `vibestackhq.com` (platform), `vibestack.site` (user deployments + previews)
- **CI/CD**: Push to this repo → triggers `vibestack-snapshot` rebuild → new Daytona snapshot

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS v4
- shadcn/ui (Radix UI primitives)
- React Router v7
- TanStack Query, Framer Motion, Recharts, Zod
- Bun as package manager / runtime

## Key Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite config — React, Tailwind, optimizeDeps |
| `src/dev/visual-preview-bridge.ts` | Dev-only: builder preview ↔ iframe `postMessage` (source mapping) |
| `package.json` | Dependencies — the full component library available to generated sites |
| `src/` | Template source code that agents modify |
| `vercel.json` | Vercel deployment config (SPA rewrites) |

## Conventions

- Dev server on port 3000 (`--host` for container access)
- `@/` alias → `src/`
- Vite cache at `/tmp/.vite` (avoids sandbox filesystem issues)
- All Radix UI packages pre-optimized in `optimizeDeps.include` for fast cold starts
- Builder visual preview uses `postMessage` + React fiber mapping (`src/dev/`), not Penpal
