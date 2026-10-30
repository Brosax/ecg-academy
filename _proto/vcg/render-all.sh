#!/usr/bin/env bash
# Render every out/<id>.json with the shared harness (usage: bash render-all.sh [id ...])
D="$(cd "$(dirname "$0")" && pwd)"
IDS="$@"
if [ -z "$IDS" ]; then IDS=$(ls "$D/out" | grep -E '^[a-z0-9-]+\.json$' | sed 's/\.json$//'); fi
for id in $IDS; do
  python -I "$D/../harness/render.py" "$D/out/$id.json" "$D/out/$id" > /dev/null || echo "render failed: $id"
done
