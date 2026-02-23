#!/usr/bin/env bash
set -euo pipefail

PROJ="/home/ciber/projects/ePalSafer/api"
LOCK="$PROJ/scripts/.batch.lock"
LOGDIR="$PROJ/scripts/out"
LOG="$LOGDIR/batch_cron.log"

mkdir -p "$LOGDIR"

# === Localiza un Node >=18 de verdad ===
NODE_BIN=""

# Si tienes nvm, úsalo para resolver un Node moderno (22->20->18)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
  for v in 22 20 18; do
    CANDIDATE="$(nvm which "$v" 2>/dev/null || true)"
    if [ -n "$CANDIDATE" ] && [ "$CANDIDATE" != "N/A" ] && [ -x "$CANDIDATE" ]; then
      NODE_BIN="$CANDIDATE"
      break
    fi
  done
fi

# Fallback: lo que haya en el PATH del sistema
NODE_BIN="${NODE_BIN:-$(command -v node || true)}"

# Si seguimos sin binario válido, aborta con mensaje claro
if [ -z "${NODE_BIN:-}" ] || ! "$NODE_BIN" -v >/dev/null 2>&1; then
  echo "[${EPOCHREALTIME}] ERROR: No se ha encontrado un Node válido (>=18). Instala con nvm: 'nvm install 22'." >> "$LOG"
  exit 1
fi

# Prioriza el directorio del NODE_BIN hallado
export PATH="$(dirname "$NODE_BIN"):$PATH"

STAMP() { date '+%F %T'; }

{
  echo "[$(STAMP)] ===== batch wrapper start ===== (whoami=$(whoami))"
  echo "NODE_BIN=$NODE_BIN"
  "$NODE_BIN" -v
  cd "$PROJ" && echo "PWD=$PWD"

  # Ejecuta con flock usando el Node correcto (sin abrir otra shell)
  if /usr/bin/flock -n "$LOCK" \
    env LIMIT=5 \
        BASE_DIR="/home/ciber/projects/ePalSafer/nfs/incibe/analisisAplicaciones/datasets/hostApks" \
        SUBDIR="social" \
        API="http://127.0.0.1:8020/api/analisis/mobsf/analizar" \
        CAT="social" \
        RETRIES=2 SLEEP_BT=5 \
        CURL_MAX_TIME=900 CURL_CONN_TO=10 \
        "$NODE_BIN" "$PROJ/scripts/batch_post_apks.js" ; then
    RC=$?
    echo "[$(STAMP)] ===== batch end (rc=$RC) ====="
  else
    echo "[$(STAMP)] Saltado: lock en uso ($LOCK)"
  fi

  echo "[$(STAMP)] ===== batch wrapper end ====="
} >> "$LOG" 2>&1
