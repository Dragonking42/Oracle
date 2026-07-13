#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="${SCRIPT_DIR}/../server"

cd "${SERVER_DIR}"

if [ ! -d node_modules ]; then
  npm install
fi

npm run dev
