#!/bin/sh
set -eu

mkdir -p /app/public/uploads /app/logs

has_migrations() {
  # returns 0 (true) if prisma/migrations contains at least one migration.sql
  [ -d /app/prisma/migrations ] && find /app/prisma/migrations -maxdepth 2 -type f -name migration.sql | grep -q .
}

if [ -n "${DATABASE_URL:-}" ]; then
  if has_migrations; then
    echo "[entrypoint] Running prisma migrate deploy..."
    npx prisma migrate deploy
  else
    echo "[entrypoint] No migrations found; running prisma db push to sync schema..."
    # For SQLite in Docker, this keeps the schema in sync even if migrations were not shipped.
    npx prisma db push --skip-generate
  fi
else
  echo "[entrypoint] DATABASE_URL is empty; skipping prisma schema sync."
fi

SEED_ON_START_VAL="$(printf '%s' "${SEED_ON_START:-}" | tr '[:upper:]' '[:lower:]')"
SEED_ALWAYS_VAL="$(printf '%s' "${SEED_ALWAYS:-}" | tr '[:upper:]' '[:lower:]')"
SEED_STRICT_VAL="$(printf '%s' "${SEED_STRICT:-}" | tr '[:upper:]' '[:lower:]')"
SEED_MARKER="${SEED_MARKER_FILE:-/data/.seeded}"

if [ "${SEED_ON_START_VAL}" = "1" ] || [ "${SEED_ON_START_VAL}" = "true" ] || [ "${SEED_ON_START_VAL}" = "yes" ] || [ "${SEED_ON_START_VAL}" = "on" ]; then
  if [ -f "${SEED_MARKER}" ] && ! { [ "${SEED_ALWAYS_VAL}" = "1" ] || [ "${SEED_ALWAYS_VAL}" = "true" ] || [ "${SEED_ALWAYS_VAL}" = "yes" ] || [ "${SEED_ALWAYS_VAL}" = "on" ]; }; then
    echo "[entrypoint] SEED_ON_START enabled but marker exists (${SEED_MARKER}); skipping seed."
  else
    echo "[entrypoint] Seeding mock data (npm run seed)..."
    # Seeding should not take down the whole container by default.
    # Opt-in strict mode: SEED_STRICT=true will fail the container on seed error.
    if [ "${SEED_STRICT_VAL}" = "1" ] || [ "${SEED_STRICT_VAL}" = "true" ] || [ "${SEED_STRICT_VAL}" = "yes" ] || [ "${SEED_STRICT_VAL}" = "on" ]; then
      npm run seed
      mkdir -p "$(dirname "${SEED_MARKER}")"
      date -u +"%Y-%m-%dT%H:%M:%SZ" > "${SEED_MARKER}"
      echo "[entrypoint] Seed complete; wrote marker ${SEED_MARKER}."
    else
      if npm run seed; then
        mkdir -p "$(dirname "${SEED_MARKER}")"
        date -u +"%Y-%m-%dT%H:%M:%SZ" > "${SEED_MARKER}"
        echo "[entrypoint] Seed complete; wrote marker ${SEED_MARKER}."
      else
        echo "[entrypoint] Seed failed; continuing startup (set SEED_STRICT=true to fail on seed errors)."
      fi
    fi
  fi
fi

echo "[entrypoint] Starting app..."
exec npm start

