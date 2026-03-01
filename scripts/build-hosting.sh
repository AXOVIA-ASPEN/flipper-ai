#!/usr/bin/env bash
set -euo pipefail

# Build static export for Firebase Hosting
# Produces the out/ directory with static HTML, JS, CSS, and assets

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🔨 Building static export for Firebase Hosting..."

cd "$ROOT_DIR"

# Run the hosting build (sets NEXT_OUTPUT=export)
pnpm build:hosting

# Validate output
if [ ! -d "$ROOT_DIR/out" ]; then
  echo "❌ ERROR: out/ directory not found. Static export build failed."
  exit 1
fi

if [ -d "$ROOT_DIR/.next/standalone" ]; then
  echo "❌ ERROR: .next/standalone/ directory detected. Wrong output mode — expected 'export', got 'standalone'."
  exit 1
fi

echo "✅ Static export build complete. Output in out/"
echo "   Files: $(find "$ROOT_DIR/out" -type f | wc -l | tr -d ' ')"
