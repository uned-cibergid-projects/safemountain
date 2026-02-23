#!/usr/bin/env bash
set -euo pipefail

PROJ="/home/ciber/projects/ePalSafer/api"
LOCK="/home/ciber/projects/ePalSafer/api/scripts/.batch.lock"
LOGDIR="/home/ciber/projects/ePalSafer/api/scripts/out"
LOG="$LOGDIR/batch_cron.log"

mkdir -p "$LOGDIR"
cd "$PROJ"

# (opcional) si usas nvm, descomenta:
# source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true

STAMP() { date '+%F %T'; }

# Intenta ejecutar con lock no bloqueante (-n). Si ya está corriendo, no hace nada.
if /usr/bin/flock -n "$LOCK" bash -lc '
  echo "['"$(date +%F\ %T)"'] ===== batch start ====="
  echo "PWD=$PWD"
  echo "node=$(command -v node || true)"

  LIMIT=5 \
  BASE_DIR="/home/ciber/projects/ePalSafer/nfs/incibe/analisisAplicaciones/datasets/hostApks" \
  SUBDIR="social" \
  API="http://127.0.0.1:8020/api/analisis/mobsf/analizar" \
  CAT="social" \
  RETRIES=2 SLEEP_BT=5 \
  CURL_MAX_TIME=900 CURL_CONN_TO=10 \
  node scripts/batch_post_apks.js

  RC=$?
  echo "['"$(date +%F\ %T)"'] ===== batch end (rc=$RC) ====="
  exit $RC
' >> "$LOG" 2>&1; then
  echo "[$(STAMP)] Lanzado batch (lock adquirido)" >> "$LOG"
else
  echo "[$(STAMP)] Saltado: ya hay una ejecución en curso (lock en $LOCK)" >> "$LOG"
fi
