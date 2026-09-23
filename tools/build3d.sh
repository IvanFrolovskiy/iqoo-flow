#!/usr/bin/env bash
# Сборка 3D-модуля: three.js 0.186.0 + src/phone3d.js → assets/js/phone3d.js (ESM, минифицирован).
# three.js скачивается в кэш вне репозитория; путь можно переопределить переменной TOOLS_DIR.
set -euo pipefail
cd "$(dirname "$0")/.."
T="${TOOLS_DIR:-$HOME/.cache/iqoo-flow-tools}"
if [ ! -f "$T/node_modules/three/package.json" ]; then
  mkdir -p "$T/node_modules"
  curl -sL https://registry.npmjs.org/three/-/three-0.186.0.tgz | tar -xz -C "$T"
  mv "$T/package" "$T/node_modules/three"
fi
NODE_PATH="$T/node_modules" npx -y esbuild@0.25.10 src/phone3d.js --bundle --format=esm --minify --target=es2020 \
  --legal-comments=eof --outfile=assets/js/phone3d.js
