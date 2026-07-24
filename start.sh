#!/usr/bin/env bash
set -euo pipefail
launcher_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$launcher_dir"
if [[ "${NODE_ENV:-}" == test && -n "${RUNTIME_PROJECT_SOURCE:-}" && -d "$RUNTIME_PROJECT_SOURCE" ]]; then
  project_dir="$(cd "$RUNTIME_PROJECT_SOURCE" && pwd)"
fi
require_setting(){ local name="$1"; if [ -z "${!name:-}" ] && ! grep -Eq "^${name}=.+" "$project_dir/.env" 2>/dev/null; then echo "Missing required setting: $name" >&2; exit 1; fi; }
[ -f "$project_dir/.env" ] || { echo 'Create .env from .env.example first.' >&2; exit 1; }
set -a
# shellcheck disable=SC1091
source "$project_dir/.env"
set +a
[ -d "$project_dir/backend/node_modules" ] && [ -d "$project_dir/frontend/node_modules" ] || { echo 'Dependencies are absent; install them explicitly with npm ci in backend/ and frontend/.' >&2; exit 1; }
for name in JWT_SECRET DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD; do require_setting "$name"; done
cleanup(){ kill "${backend_pid:-}" "${frontend_pid:-}" 2>/dev/null || true; wait "${backend_pid:-}" "${frontend_pid:-}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
[[ "$BACKEND_PORT" != "$FRONTEND_PORT" ]] || { echo 'Backend and frontend ports must differ.' >&2; exit 1; }
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do if command -v lsof >/dev/null 2>&1 && lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $port is already in use." >&2; exit 1; fi; done
if [[ "${MIGRATE_ON_START:-false}" == "true" ]]; then node "$project_dir/backend/scripts/runtime-init.js"; fi
(cd "$project_dir/backend" && BACKEND_PORT="$BACKEND_PORT" npm start) & backend_pid=$!
(cd "$project_dir/frontend" && npm run dev -- --host "${FRONTEND_HOST:-127.0.0.1}" --port "$FRONTEND_PORT" --strictPort) & frontend_pid=$!
echo 'Services started without installing dependencies or mutating the database.'
wait "$backend_pid" "$frontend_pid"
