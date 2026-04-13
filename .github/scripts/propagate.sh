#!/usr/bin/env bash
set -euo pipefail

# propagate.sh — Sync base template files into all template directories.
#
# Usage: propagate.sh <SOURCE_DIR> <TEMPLATES_DIR>
#   SOURCE_DIR   — root of the base template repo (vibestack-template)
#   TEMPLATES_DIR — root of the templates repo (vibestack-templates)

SOURCE_DIR="${1:?Usage: propagate.sh <SOURCE_DIR> <TEMPLATES_DIR>}"
TEMPLATES_DIR="${2:?Usage: propagate.sh <SOURCE_DIR> <TEMPLATES_DIR>}"

# Resolve to absolute paths
SOURCE_DIR="$(cd "$SOURCE_DIR" && pwd)"
TEMPLATES_DIR="$(cd "$TEMPLATES_DIR" && pwd)"

# GITHUB_OUTPUT may not be set when running locally
OUTPUT_FILE="${GITHUB_OUTPUT:-/dev/null}"

# ---------------------------------------------------------------------------
# Root files to overwrite
# ---------------------------------------------------------------------------
ROOT_FILES=(
  vite.config.ts
  tsconfig.json
  components.json
  package.json
  index.html
  .gitignore
)

# ---------------------------------------------------------------------------
# Individual src files to overwrite
# ---------------------------------------------------------------------------
SRC_FILES=(
  # Note: src/main.tsx is NOT synced — each template has its own entry point
  src/index.css
  src/vite-env.d.ts
  src/lib/utils.ts
)

# ---------------------------------------------------------------------------
# Source directories to rsync (with --delete)
# ---------------------------------------------------------------------------
SRC_DIRS=(
  src/components/ui
  src/hooks
  src/test
)

# ---------------------------------------------------------------------------
# Dotfile directories to sync
# ---------------------------------------------------------------------------
DOT_DIRS=(
)

# ---------------------------------------------------------------------------
# Discover templates: top-level dirs in TEMPLATES_DIR containing package.json
# ---------------------------------------------------------------------------
templates=()
for dir in "$TEMPLATES_DIR"/*/; do
  [ -f "$dir/package.json" ] && templates+=("$dir")
done

template_count=${#templates[@]}
echo "Found $template_count templates"

if [ "$template_count" -eq 0 ]; then
  echo "No templates found. Nothing to do."
  echo "changed=false" >> "$OUTPUT_FILE"
  exit 0
fi

# ---------------------------------------------------------------------------
# Sync each template
# ---------------------------------------------------------------------------
for tmpl in "${templates[@]}"; do
  name="$(basename "$tmpl")"
  echo "--- Syncing: $name ---"

  # Copy root files
  for file in "${ROOT_FILES[@]}"; do
    src="$SOURCE_DIR/$file"
    if [ ! -f "$src" ]; then
      echo "ERROR: source missing $file" >&2
      exit 1
    fi
    cp "$src" "$tmpl/$file"
  done

  # Copy individual src files
  for file in "${SRC_FILES[@]}"; do
    src="$SOURCE_DIR/$file"
    if [ ! -f "$src" ]; then
      echo "ERROR: source missing $file" >&2
      exit 1
    fi
    mkdir -p "$tmpl/$(dirname "$file")"
    cp "$src" "$tmpl/$file"
  done

  # Rsync source directories (--delete removes files not in base)
  for dir in "${SRC_DIRS[@]}"; do
    src="$SOURCE_DIR/$dir/"
    if [ ! -d "$SOURCE_DIR/$dir" ]; then
      echo "ERROR: source dir missing $dir" >&2
      exit 1
    fi
    mkdir -p "$tmpl/$dir"
    rsync -ac --delete "$src" "$tmpl/$dir/"
  done

  # Rsync dotfile directories
  for dir in "${DOT_DIRS[@]}"; do
    src="$SOURCE_DIR/$dir/"
    if [ ! -d "$SOURCE_DIR/$dir" ]; then
      echo "ERROR: source dir missing $dir" >&2
      exit 1
    fi
    mkdir -p "$tmpl/$dir"
    rsync -ac --delete "$src" "$tmpl/$dir/"
  done
done

# ---------------------------------------------------------------------------
# Diff detection
# ---------------------------------------------------------------------------
cd "$TEMPLATES_DIR"
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "ERROR: $TEMPLATES_DIR is not a git repository" >&2
  exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "changed=false" >> "$OUTPUT_FILE"
  echo "No changes detected."
else
  echo "changed=true" >> "$OUTPUT_FILE"
  echo "Changes detected."
fi
