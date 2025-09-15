#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${BASE_DIR:-/home/ciber/projects/SafeMountain/nfs/incibe/analisisAplicaciones/datasets/hostApks}"
SUBDIR="${SUBDIR:-social}"

# Endpoint del backend (si corres en helena y escucha en 0.0.0.0:8020, también vale 10.201.54.162)
export API="${API:-http://127.0.0.1:8020/api/analisis/mobsf/analizar}"
export CAT="${CAT:-social}"
export AUTH="${AUTH:-}"      # p.ej.: --user usuario:password
export RETRIES="${RETRIES:-2}"
export SLEEP_BT="${SLEEP_BT:-5}"

OUT_DIR="${OUT_DIR:-scripts/out/http_batch}"
LOG_FILE="${LOG_FILE:-scripts/out/http_batch.log}"
mkdir -p "$OUT_DIR"
: > "$LOG_FILE"

mapfile -t PKG_DIRS < <(find "${BASE_DIR}/${SUBDIR}" -mindepth 1 -maxdepth 1 -type d | sort)
total="${#PKG_DIRS[@]}"
echo "Encontradas $total carpetas de paquete en ${BASE_DIR}/${SUBDIR}"

i=0; ok=0; fail=0; skip=0
for DIR in "${PKG_DIRS[@]}"; do
  i=$((i+1))
  PKG="$(basename "$DIR")"
  TAG="${PKG//[^a-zA-Z0-9_.-]/_}"
  RESP_JSON="${OUT_DIR}/${TAG}.json"

  printf "\n[%d/%d] %s\n" "$i" "$total" "$PKG"
  if [[ -f "$RESP_JSON" ]] && grep -q '"ok":[[:space:]]*true' "$RESP_JSON"; then
    echo "  [SKIP] ya OK → $RESP_JSON" | tee -a "$LOG_FILE"
    ((skip++)) || true
    continue
  fi

  if ./scripts/post_one.sh "$DIR" "$PKG" > "$RESP_JSON" 2>&1; then
    if grep -q '"ok":[[:space:]]*true' "$RESP_JSON"; then
      echo "  [OK] $PKG" | tee -a "$LOG_FILE"
      ((ok++)) || true
    else
      echo "  [WARN] respuesta no-OK, ver $RESP_JSON" | tee -a "$LOG_FILE"
      ((fail++)) || true
    fi
  else
    echo "  [ERROR] ver $RESP_JSON" | tee -a "$LOG_FILE"
    ((fail++)) || true
  fi
done

echo
echo "Resumen: OK=$ok  FAIL=$fail  SKIP=$skip  TOTAL=$total" | tee -a "$LOG_FILE"
