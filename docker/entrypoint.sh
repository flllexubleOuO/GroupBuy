#!/bin/sh
set -eu

mkdir -p /app/public/uploads /app/logs

if [ -n "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] Running prisma migrate deploy..."
  npx prisma migrate deploy
else
  echo "[entrypoint] DATABASE_URL is empty; skipping prisma migrate deploy."
fi

SEED_ON_START_VAL="$(printf '%s' "${SEED_ON_START:-}" | tr '[:upper:]' '[:lower:]')"
SEED_ALWAYS_VAL="$(printf '%s' "${SEED_ALWAYS:-}" | tr '[:upper:]' '[:lower:]')"
SEED_MARKER="${SEED_MARKER_FILE:-/data/.seeded}"

if [ "${SEED_ON_START_VAL}" = "1" ] || [ "${SEED_ON_START_VAL}" = "true" ] || [ "${SEED_ON_START_VAL}" = "yes" ] || [ "${SEED_ON_START_VAL}" = "on" ]; then
  if [ -f "${SEED_MARKER}" ] && ! { [ "${SEED_ALWAYS_VAL}" = "1" ] || [ "${SEED_ALWAYS_VAL}" = "true" ] || [ "${SEED_ALWAYS_VAL}" = "yes" ] || [ "${SEED_ALWAYS_VAL}" = "on" ]; }; then
    echo "[entrypoint] SEED_ON_START enabled but marker exists (${SEED_MARKER}); skipping seed."
  else
    echo "[entrypoint] Seeding mock data (npm run seed)..."
    npm run seed
    mkdir -p "$(dirname "${SEED_MARKER}")"
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "${SEED_MARKER}"
    echo "[entrypoint] Seed complete; wrote marker ${SEED_MARKER}."
  fi
fi

echo "[entrypoint] Starting app..."
exec npm start

