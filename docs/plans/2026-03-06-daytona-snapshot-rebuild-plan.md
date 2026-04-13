# Daytona Snapshot Rebuild — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically rebuild the Daytona snapshot (`vibestack-base`) whenever `vibestack-template` is pushed to main, using a dedicated `vibestack-snapshot` repo.

**Architecture:** `vibestack-template` fires a `repository_dispatch` event to `vibestack-snapshot` on push to main. The snapshot repo receives the event, builds a Docker image via the Daytona SDK (which `git clone`s the latest template), and registers it as the `vibestack-base` snapshot.

**Tech Stack:** GitHub Actions, `@daytonaio/sdk`, Bun, Docker (built remotely by Daytona)

**Design doc:** `docs/plans/2026-03-06-daytona-snapshot-rebuild-design.md`

---

### Task 1: Create the dispatch trigger workflow in vibestack-template

**Files:**
- Create: `.github/workflows/rebuild-snapshot.yml`

**Step 1: Create the workflow file**

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
          client-payload: '{"sha": "${{ github.sha }}", "ref": "${{ github.ref }}"}'
```

**Step 2: Verify YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/rebuild-snapshot.yml'))"`
Expected: No output (valid YAML)

**Step 3: Commit**

```bash
git add .github/workflows/rebuild-snapshot.yml
git commit -m "feat: add workflow to trigger Daytona snapshot rebuild on push to main"
```

---

### Task 2: Create the vibestack-snapshot repo on GitHub

**Step 1: Create the repo**

Run: `gh repo create VibeStackCodes/vibestack-snapshot --private --description "Daytona snapshot build infrastructure for VibeStack sandboxes" --clone`

**Step 2: Verify**

Run: `cd /Users/ammishra/VibeStack/vibestack-snapshot && git remote -v`
Expected: Shows `VibeStackCodes/vibestack-snapshot` remote

---

### Task 3: Add .gitignore to vibestack-snapshot

**Files:**
- Create: `/Users/ammishra/VibeStack/vibestack-snapshot/.gitignore`

**Step 1: Create .gitignore**

```
node_modules/
.env
.env.local
bun.lock
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore"
```

---

### Task 4: Add package.json and tsconfig.json to vibestack-snapshot

**Files:**
- Create: `/Users/ammishra/VibeStack/vibestack-snapshot/package.json`
- Create: `/Users/ammishra/VibeStack/vibestack-snapshot/tsconfig.json`

**Step 1: Create package.json**

```json
{
  "name": "vibestack-snapshot",
  "private": true,
  "type": "module",
  "dependencies": {
    "@daytonaio/sdk": "^0.141.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["*.ts"]
}
```

**Step 3: Install dependencies**

Run: `cd /Users/ammishra/VibeStack/vibestack-snapshot && bun install`
Expected: `@daytonaio/sdk` installed successfully

**Step 4: Commit**

```bash
git add package.json tsconfig.json
git commit -m "chore: add package.json with @daytonaio/sdk"
```

---

### Task 5: Add Dockerfile to vibestack-snapshot

**Files:**
- Create: `/Users/ammishra/VibeStack/vibestack-snapshot/Dockerfile`

**Step 1: Create Dockerfile**

Adapted from `platform/snapshot/Dockerfile`. Identical content:

```dockerfile
FROM oven/bun:1-debian

# System deps: git, curl, tmux (entrypoint uses tmux for dev server session)
RUN apt-get update && apt-get install -y git curl tmux && rm -rf /var/lib/apt/lists/*

# Install OpenVSCode Server (VS Code in the browser)
ARG OPENVSCODE_RELEASE=v1.106.3
RUN curl -fsSL "https://github.com/gitpod-io/openvscode-server/releases/download/openvscode-server-${OPENVSCODE_RELEASE}/openvscode-server-${OPENVSCODE_RELEASE}-linux-x64.tar.gz" \
    | tar xz -C /opt \
    && mv "/opt/openvscode-server-${OPENVSCODE_RELEASE}-linux-x64" /opt/openvscode-server

# Install OxLint globally — single Rust binary, much lighter than ESLint + plugins
RUN bun install -g oxlint

# Git identity for agent commits
RUN git config --global user.email "agent@vibestack.app" \
    && git config --global user.name "VibeStack Agent"

WORKDIR /workspace

# Clone template repo — proper git history, not git init
# All scaffold code (46 shadcn/ui components, React 19, Vite 7, Tailwind v4) lives here
ARG TEMPLATE_REPO=https://github.com/VibeStackCodes/vibestack-template.git
RUN git clone --depth 1 ${TEMPLATE_REPO} . \
    && rm -rf .git \
    && git init -b main \
    && git add -A \
    && git commit -m "Initial commit"

# Install dependencies from committed lockfile (deterministic, no resolution needed)
RUN bun install --frozen-lockfile

# Warm Vite cache by running a dev build
# Creates .vite/ dep pre-bundle — saves ~5-10s on first dev server start
# optimizeDeps.include in vite.config.ts ensures ALL deps are pre-bundled here
RUN timeout 30 bun run dev &>/dev/null & sleep 10 && kill %1 2>/dev/null || true

# Warm TypeScript cache
RUN bunx tsc --noEmit 2>/dev/null || true

# Set up entrypoint and bashrc extras
COPY entrypoint.sh /entrypoint.sh
COPY bashrc-extra.sh /root/.bashrc-extra
RUN chmod +x /entrypoint.sh && echo '. /root/.bashrc-extra' >> /root/.bashrc

EXPOSE 3000 13337

ENTRYPOINT ["/entrypoint.sh"]
```

**Step 2: Commit**

```bash
git add Dockerfile
git commit -m "feat: add Dockerfile for vibestack-base snapshot"
```

---

### Task 6: Add entrypoint.sh and bashrc-extra.sh to vibestack-snapshot

**Files:**
- Create: `/Users/ammishra/VibeStack/vibestack-snapshot/entrypoint.sh`
- Create: `/Users/ammishra/VibeStack/vibestack-snapshot/bashrc-extra.sh`

**Step 1: Create entrypoint.sh**

```bash
#!/bin/bash
# VibeStack sandbox entrypoint
# Starts OpenVSCode Server (IDE) + bun dev server in tmux

# Start bun dev server in a tmux session with auto-restart on crash
# During generation, file writes can cause Vite to crash temporarily
tmux new-session -d -s dev -c /workspace 'while true; do bun run dev --host 0.0.0.0 2>&1 | tee /tmp/dev.log; echo "[entrypoint] dev server exited, restarting in 2s..."; sleep 2; done'

# Start OpenVSCode Server on port 13337 (foreground — keeps container alive)
exec /opt/openvscode-server/bin/openvscode-server \
  --host 0.0.0.0 \
  --port 13337 \
  --without-connection-token \
  --default-folder /workspace
```

**Step 2: Create bashrc-extra.sh**

```bash
# Auto-attach to dev server tmux session if it exists and we're not already in tmux
if [ -z "$TMUX" ] && tmux has-session -t dev 2>/dev/null; then
  exec tmux attach -t dev
fi
```

**Step 3: Make entrypoint executable**

Run: `chmod +x /Users/ammishra/VibeStack/vibestack-snapshot/entrypoint.sh`

**Step 4: Commit**

```bash
git add entrypoint.sh bashrc-extra.sh
git commit -m "feat: add entrypoint and bashrc-extra scripts"
```

---

### Task 7: Add rebuild.ts to vibestack-snapshot

**Files:**
- Create: `/Users/ammishra/VibeStack/vibestack-snapshot/rebuild.ts`

**Step 1: Create rebuild.ts**

Adapted from `platform/snapshot/rebuild.ts`. Key changes:
- Default snapshot name is `vibestack-base` (not timestamp-based)
- Deletes existing snapshot before creating (idempotent for CI)
- Removes .env.local update logic (not needed in CI)

```typescript
#!/usr/bin/env bun
/**
 * Rebuild Daytona Snapshot
 *
 * Builds the snapshot Docker image via Daytona's SDK (no local Docker needed)
 * and registers it as a new snapshot.
 *
 * Usage:
 *   bun rebuild.ts                        # Build + register as vibestack-base
 *   bun rebuild.ts --name my-snap         # Custom snapshot name
 *   bun rebuild.ts --dry-run              # Show Dockerfile only
 */

import { Daytona, Image } from '@daytonaio/sdk'
import { resolve } from 'node:path'

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const nameIdx = args.indexOf('--name')
const snapshotName = nameIdx !== -1 ? args[nameIdx + 1] : 'vibestack-base'

if (!snapshotName) {
  console.error('Error: --name requires a value')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Env check
// ---------------------------------------------------------------------------

if (!dryRun && !process.env.DAYTONA_API_KEY) {
  console.error('Error: DAYTONA_API_KEY is required')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Build image from Dockerfile
// ---------------------------------------------------------------------------

const snapshotDir = resolve(import.meta.dirname!, '.')
const dockerfilePath = resolve(snapshotDir, 'Dockerfile')

console.log(`\n━━━ Snapshot Rebuild ━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`Name:       ${snapshotName}`)
console.log(`Dockerfile: ${dockerfilePath}`)
console.log(`Dry run:    ${dryRun}`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

const image = Image.fromDockerfile(dockerfilePath)

if (dryRun) {
  console.log('Generated Dockerfile:')
  console.log('─'.repeat(60))
  console.log(image.dockerfile)
  console.log('─'.repeat(60))
  console.log('\nContext files:')
  for (const ctx of image.contextList) {
    console.log(`  ${ctx.sourcePath} → ${ctx.archivePath}`)
  }
  console.log('\nDry run complete. No snapshot created.')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Delete existing snapshot (idempotent rebuild)
// ---------------------------------------------------------------------------

const daytona = new Daytona()

try {
  const existing = await daytona.snapshot.get(snapshotName)
  console.log(`Deleting existing snapshot: ${snapshotName}`)
  await daytona.snapshot.delete(existing)
  console.log('Waiting for snapshot deletion to propagate...')
  await new Promise((resolve) => setTimeout(resolve, 15000))
} catch {
  // Snapshot doesn't exist yet, that's fine
}

// ---------------------------------------------------------------------------
// Create snapshot via Daytona SDK
// ---------------------------------------------------------------------------

console.log('Building snapshot (this may take 2-5 minutes)...\n')

const startTime = Date.now()

const snapshot = await daytona.snapshot.create(
  {
    name: snapshotName,
    image,
    resources: {
      cpu: 2,
      memory: 4,
      disk: 10,
    },
    entrypoint: ['/entrypoint.sh'],
  },
  {
    onLogs: (chunk: string) => {
      process.stdout.write(chunk)
    },
    timeout: 600,
  },
)

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

console.log(`\n━━━ Snapshot Created ━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
console.log(`ID:      ${snapshot.id}`)
console.log(`Name:    ${snapshot.name}`)
console.log(`State:   ${snapshot.state}`)
console.log(`Elapsed: ${elapsed}s`)
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

console.log('Done! New sandboxes will use this snapshot.')
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/ammishra/VibeStack/vibestack-snapshot && bunx tsc --noEmit`
Expected: No errors

**Step 3: Verify dry-run works**

Run: `cd /Users/ammishra/VibeStack/vibestack-snapshot && bun rebuild.ts --dry-run`
Expected: Prints generated Dockerfile and context files

**Step 4: Commit**

```bash
git add rebuild.ts
git commit -m "feat: add rebuild.ts for Daytona snapshot creation"
```

---

### Task 8: Add receiver workflow to vibestack-snapshot

**Files:**
- Create: `/Users/ammishra/VibeStack/vibestack-snapshot/.github/workflows/rebuild.yml`

**Step 1: Create the workflow**

```yaml
name: Rebuild Snapshot

on:
  repository_dispatch:
    types: [template-updated]
  workflow_dispatch:

jobs:
  rebuild:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install

      - name: Rebuild snapshot
        run: bun rebuild.ts --name vibestack-base
        env:
          DAYTONA_API_KEY: ${{ secrets.DAYTONA_API_KEY }}

      - name: Summary
        if: always()
        run: |
          if [ "${{ job.status }}" = "success" ]; then
            echo "### Snapshot rebuilt successfully" >> $GITHUB_STEP_SUMMARY
            echo "Template commit: \`${{ github.event.client_payload.sha || 'manual' }}\`" >> $GITHUB_STEP_SUMMARY
          else
            echo "### Snapshot rebuild failed" >> $GITHUB_STEP_SUMMARY
          fi
```

**Step 2: Verify YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('/Users/ammishra/VibeStack/vibestack-snapshot/.github/workflows/rebuild.yml'))"`
Expected: No output (valid YAML)

**Step 3: Commit**

```bash
git add .github/workflows/rebuild.yml
git commit -m "feat: add GitHub Actions workflow to receive dispatch and rebuild snapshot"
```

---

### Task 9: Add README to vibestack-snapshot

**Files:**
- Create: `/Users/ammishra/VibeStack/vibestack-snapshot/README.md`

**Step 1: Create README**

```markdown
# vibestack-snapshot

Daytona snapshot build infrastructure for VibeStack sandboxes.

## How it works

1. `vibestack-template` is pushed to `main`
2. A `repository_dispatch` event triggers `.github/workflows/rebuild.yml`
3. The workflow runs `rebuild.ts` which:
   - Builds a Docker image via Daytona SDK (the Dockerfile `git clone`s the latest template)
   - Deletes the existing `vibestack-base` snapshot
   - Creates a new `vibestack-base` snapshot

## Manual rebuild

```bash
export DAYTONA_API_KEY=your-key
bun install
bun rebuild.ts --name vibestack-base
```

## Dry run

```bash
bun rebuild.ts --dry-run
```

## Secrets

| Secret | Where | Purpose |
|--------|-------|---------|
| `DAYTONA_API_KEY` | This repo | Daytona API key for snapshot operations |
| `SNAPSHOT_REPO_TOKEN` | `vibestack-template` repo | GitHub PAT to send repository_dispatch here |
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```

---

### Task 10: Push vibestack-snapshot and configure secrets

**Step 1: Push all commits**

Run: `cd /Users/ammishra/VibeStack/vibestack-snapshot && git push -u origin main`

**Step 2: Add DAYTONA_API_KEY secret to vibestack-snapshot**

Run: `gh secret set DAYTONA_API_KEY --repo VibeStackCodes/vibestack-snapshot`
(Will prompt for value — paste the Daytona API key)

**Step 3: Add SNAPSHOT_REPO_TOKEN secret to vibestack-template**

Run: `gh secret set SNAPSHOT_REPO_TOKEN --repo VibeStackCodes/vibestack-template`
(Will prompt for value — paste a GitHub PAT with `repo` scope that can dispatch to `vibestack-snapshot`)

**Step 4: Verify dispatch works**

Run: `gh api repos/VibeStackCodes/vibestack-snapshot/dispatches -f event_type=template-updated -f 'client_payload[sha]=test'`
Expected: 204 No Content

**Step 5: Check workflow ran**

Run: `gh run list --repo VibeStackCodes/vibestack-snapshot --limit 1`
Expected: Shows a "Rebuild Snapshot" run in progress or completed

---

### Task 11: Commit and push the trigger workflow in vibestack-template

**Step 1: Commit (if not already done in Task 1)**

```bash
cd /Users/ammishra/VibeStack/vibestack-template
git add .github/workflows/rebuild-snapshot.yml docs/plans/2026-03-06-daytona-snapshot-rebuild-design.md docs/plans/2026-03-06-daytona-snapshot-rebuild-plan.md
git commit -m "feat: add automated Daytona snapshot rebuild on push to main"
```

**Step 2: Push**

Run: `git push`
Expected: Push succeeds AND triggers the rebuild-snapshot workflow, which dispatches to vibestack-snapshot

**Step 3: Verify end-to-end**

Run: `gh run list --repo VibeStackCodes/vibestack-template --workflow rebuild-snapshot.yml --limit 1`
Expected: Shows a completed "Rebuild Daytona Snapshot" run

Run: `gh run list --repo VibeStackCodes/vibestack-snapshot --limit 1`
Expected: Shows a "Rebuild Snapshot" run triggered by repository_dispatch
