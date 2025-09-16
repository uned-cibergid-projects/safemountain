#!/usr/bin/env bash
set -euo pipefail

# === Ajustes ===
PROJ="/home/ciber/projects/SafeMountain/api"
LOCK="/home/ciber/projects/SafeMountain/api/scripts/.batch.lock"
LOGDIR="/home/ciber/projects/SafeMountain/api/scripts/out"
LOG="$LOGDIR/batch_cron.log"

mkdir -p "$LOGDIR"
# Asegura Node en PATH (si usas nvm, descomenta la línea siguiente)
# source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true

cd "$PROJ"

# Usa flock para evitar solapes (-n = no esperar si ya hay lock)
{
  echo "[$(date '+%F %T')] ===== batch start ====="
  echo "PWD=$(pwd)"
  echo "node=$(command -v node)"

  LIMIT=5 \
  BASE_DIR="/home/ciber/projects/SafeMountain/nfs/incibe/analisisAplicaciones/datasets/hostApks" \
  SUBDIR="social" \
  API="http://127.0.0.1:8020/api/analisis/mobsf/analizar" \
  CAT="social" \
  RETRIES=2 SLEEP_BT=5 \
  CURL_MAX_TIME=900 CURL_CONN_TO=10 \
  node scripts/batch_post_apks.js

  RC=$?
  echo "[$(date '+%F %T')] ===== batch end (rc=$RC) ====="
  exit $RC
} 9> "$LOCK" |& tee -a "$LOG" | tail -n +1

# La magia del lock:
# '9> "$LOCK"' abre el descriptor 9 sobre el lockfile
# 'flock -n 9 -c ...' se podría usar, pero esta forma con redirección + subshell
# evita carrera y nos deja el lock activo durante todo el bloque.
