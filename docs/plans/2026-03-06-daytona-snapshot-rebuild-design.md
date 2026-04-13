# Automated Daytona Snapshot Rebuild

## Problem

When `vibestack-template` is updated (new deps, component changes, config updates), the Daytona snapshot (`vibestack-base`) becomes stale. Currently, rebuilding requires manually running `bun snapshot/rebuild.ts` from the `platform` repo. This creates drift between the template and live sandboxes.

## Solution

Automate snapshot rebuilding via GitHub Actions:

1. **This repo** (`vibestack-template`) fires a `repository_dispatch` event on every push to `main`
2. **New repo** (`vibestack-snapshot`) receives the event and rebuilds the snapshot using the Daytona SDK

## Architecture

```
vibestack-template (this repo)
  .github/workflows/rebuild-snapshot.yml
        | repository_dispatch (event: template-updated)
        v
vibestack-snapshot (new repo)
  Dockerfile              <- git clones vibestack-template at build time
  entrypoint.sh           <- tmux dev server + OpenVSCode Server
  bashrc-extra.sh         <- shell helper for tmux attach
  rebuild.ts              <- Daytona SDK: build image + create snapshot
  package.json            <- @daytonaio/sdk dependency
  .github/workflows/
    rebuild.yml            <- receives dispatch, runs rebuild.ts
```

## Repo Responsibilities

| Repo | Role |
|------|------|
| `vibestack-template` | Template content (React, shadcn/ui, etc.). Fires dispatch on push to main. |
| `vibestack-snapshot` | Build infrastructure (Dockerfile, entrypoint). Receives dispatch, rebuilds snapshot `vibestack-base`. |
| `platform-server-py` | Consumes snapshot by name (`vibestack-base`). No changes needed. |
| `platform` | `snapshot/` directory becomes obsolete after migration. |

## Trigger Workflow (vibestack-template)

File: `.github/workflows/rebuild-snapshot.yml`

```yaml
name: Rebuild Daytona Snapshot

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger snapshot rebuild
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.SNAPSHOT_REPO_TOKEN }}
          repository: VibeStackCodes/vibestack-snapshot
          event-type: template-updated
          client-payload: '{"sha": "${{ github.sha }}"}'
```

## Receiver Workflow (vibestack-snapshot)

File: `.github/workflows/rebuild.yml`

```yaml
name: Rebuild Snapshot

on:
  repository_dispatch:
    types: [template-updated]
  workflow_dispatch:

jobs:
  rebuild:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - name: Rebuild snapshot
        run: bun rebuild.ts --name vibestack-base
        env:
          DAYTONA_API_KEY: ${{ secrets.DAYTONA_API_KEY }}
```

## Snapshot Build Process (rebuild.ts)

1. Initialize Daytona SDK with API key
2. Build image from Dockerfile using `Image.fromDockerfile()`
3. Delete existing `vibestack-base` snapshot if it exists
4. Create new snapshot via `daytona.snapshot.create()` with resources: 2 CPU, 4 GiB RAM, 10 GiB disk
5. Log snapshot ID and state

The Dockerfile performs:
- Base: `oven/bun:1-debian`
- System deps: git, curl, tmux
- OpenVSCode Server installation
- OxLint global install
- `git clone --depth 1` of `vibestack-template`
- `bun install --frozen-lockfile`
- Vite dep pre-bundling warmup
- TypeScript cache warmup

## Secrets Required

| Repo | Secret | Purpose |
|------|--------|---------|
| `vibestack-template` | `SNAPSHOT_REPO_TOKEN` | GitHub PAT with repo scope to send repository_dispatch |
| `vibestack-snapshot` | `DAYTONA_API_KEY` | Daytona API key for snapshot CRUD operations |

## Migration from platform repo

After vibestack-snapshot is operational:
1. Remove `platform/snapshot/` directory
2. Remove `platform/scripts/rebuild-snapshot.ts`
3. Update `platform/CLAUDE.md` to reference new snapshot repo

## Files to Create

### In vibestack-template (this repo)
- `.github/workflows/rebuild-snapshot.yml`

### In vibestack-snapshot (new repo)
- `Dockerfile` — adapted from `platform/snapshot/Dockerfile`
- `entrypoint.sh` — from `platform/snapshot/entrypoint.sh`
- `bashrc-extra.sh` — from `platform/snapshot/bashrc-extra.sh`
- `rebuild.ts` — adapted from `platform/snapshot/rebuild.ts`, hardcoded name `vibestack-base`
- `package.json` — minimal: `@daytonaio/sdk`, `typescript`
- `tsconfig.json` — basic Bun TypeScript config
- `.github/workflows/rebuild.yml` — receiver workflow
- `.gitignore` — node_modules, .env
