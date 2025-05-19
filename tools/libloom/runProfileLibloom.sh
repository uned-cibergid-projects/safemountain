#!/bin/bash

# ============================================================================
# Script para automatizar la fase "profile" de LIBLOOM (solo profiling)
# Ejecutado automáticamente mediante cron
# ============================================================================

# CONFIGURACIÓN
LOG_DIR="/home/dblancoaza/SafeMountain/API/tools/libloom/logs"
LOG_FILE="$LOG_DIR/cronLibloomProfile.log"
TEMP_LOG_FILE="$LOG_DIR/temp_cronLibloomProfile.log"
DATE=$(date "+%Y-%m-%d %H:%M:%S")

# Crear carpeta de logs si no existe
mkdir -p "$LOG_DIR"

echo "[$DATE] Iniciando ejecución de perfilado LIBLOOM..." >> "$LOG_FILE"

# Ruta al directorio del código Java de LIBLOOM
LIBLOOM_DIR="/home/dblancoaza/SafeMountain/API/tools/libloom"

# Construir classpath (incluye carpeta out y dependencias)
CLASSPATH="$LIBLOOM_DIR/out/libloom:$LIBLOOM_DIR/lib/*"

# Comando de ejecución del perfilado
CMD="java -cp \"$CLASSPATH\" libloom.LIBLOOM profile"

# Ejecutar
cd "$LIBLOOM_DIR" || {
  echo "[$DATE] ❌ No se pudo acceder al directorio LIBLOOM: $LIBLOOM_DIR" >> "$LOG_FILE"
  exit 1
}

# Ejecutar el comando y redirigir stdout y stderr al log
{
  echo "[$DATE] ▶ Ejecutando: $CMD"
  if eval "$CMD"; then
    echo "[$DATE] ✅ Perfilado completado"
  else
    echo "[$DATE] ❌ Perfilado fallido"
  fi
} >> "$LOG_FILE" 2>&1

# Mantener un máximo de 5000 líneas en el log
tail -n 5000 "$LOG_FILE" > "$TEMP_LOG_FILE" && mv "$TEMP_LOG_FILE" "$LOG_FILE"