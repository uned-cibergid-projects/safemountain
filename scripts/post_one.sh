#!/usr/bin/env bash
set -euo pipefail

API="${API:-http://10.201.54.162:8020/api/analisis/mobsf/analizar}"
CAT="${CAT:-social}"
AUTH="${AUTH:-}"   # p.ej.: --user usuario:password

usage() {
  echo "Uso:"
  echo "  $0 <carpeta_del_paquete | ruta_a_apk> [package_name]"
  echo "Ej.:"
  echo "  $0 /home/dblancoaza/nfs/incibe/analisisAplicaciones/datasets/hostApks/social/com.instagram.lite/"
  echo "  $0 /home/.../social/com.instagram.lite/instagram-lite.apk com.instagram.lite"
}

if [[ $# -lt 1 ]]; then usage; exit 1; fi
INPUT_PATH="$1"
PKG="${2:-}"

# 1) Resolver APK a enviar
if [[ -d "$INPUT_PATH" ]]; then
  # Escoge el .apk más reciente (si empata, el mayor)
  mapfile -t CANDS < <(find "$INPUT_PATH" -maxdepth 1 -type f -iname '*.apk' -printf '%T@ %s %p\n' | sort -nr)
  if [[ "${#CANDS[@]}" -eq 0 ]]; then
    echo "No se encontraron .apk en: $INPUT_PATH" >&2
    exit 1
  fi
  APK_PATH="$(echo "${CANDS[0]}" | awk '{ $1=""; $2=""; sub(/^  /,""); print }')"
elif [[ -f "$INPUT_PATH" ]]; then
  APK_PATH="$INPUT_PATH"
else
  echo "No existe: $INPUT_PATH" >&2
  exit 1
fi

# 2) Deducir package si no viene
if [[ -z "$PKG" ]]; then
  PKG="$(basename "$(dirname "$APK_PATH")")"
  # Si quieres, puedes intentar aapt2 para extraer del manifest:
  # if command -v aapt2 >/dev/null 2>&1; then
  #   P2="$(aapt2 dump badging "$APK_PATH" 2>/dev/null | sed -n "s/.*package: name='\([^']*\)'.*/\1/p" | head -n1 || true)"
  #   [[ -n "${P2:-}" ]] && PKG="$P2"
  # fi
fi

echo "[POST] $PKG"
echo "  APK: $APK_PATH"
echo "  API: $API"
echo "  CAT: $CAT"

# IMPORTANTE: el campo del fichero debe llamarse 'archivo' (Multer .single('archivo'))
curl -sS -X POST $AUTH \
  -F "archivo=@${APK_PATH};type=application/vnd.android.package-archive" \
  -F "package=${PKG}" \
  -F "category=${CAT}" \
  -F "name=$(basename "$APK_PATH")" \
  "$API" | tee "/tmp/mobsf_post_${PKG}.json"

echo -e "\nRespuesta en /tmp/mobsf_post_${PKG}.json"
