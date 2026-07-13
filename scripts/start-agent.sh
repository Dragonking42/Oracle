#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="${SCRIPT_DIR}/../agent"

cd "${AGENT_DIR}"

if [ ! -d node_modules ]; then
  npm install
fi

npm run dev
