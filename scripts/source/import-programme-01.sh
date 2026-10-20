#!/usr/bin/env bash
# Réimporte le Programme 01 depuis le document Word (source éditoriale).
# Prérequis : pandoc et python3.  Usage : bash scripts/source/import-programme-01.sh [chemin/vers/document.docx]
set -euo pipefail
cd "$(dirname "$0")"
DOCX="${1:-programme-01.docx}"
pandoc "$DOCX" -t markdown --wrap=none -o p01nw.md
python3 parse.py
python3 assemble.py
rm -f p01nw.md parsed.json
cd ../.. && node scripts/generate-seed.mjs
echo "src/programme01.js et supabase/seed.sql mis à jour."
