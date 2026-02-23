#!/bin/bash

# ===========================================
# Script para lanzar getHostAppsList y luego getHostAppsMetadata
# ===========================================

# Rutas y configuración
PYTHON_PATH="/home/ciber/projects/SafeMountain/api/tools/appcollector/appcollector_env/bin/python3"
PROJECT_ROOT="/home/ciber/projects/SafeMountain/api/tools/appcollector"
SCRIPT_LIST_PATH="$PROJECT_ROOT/sources/dataCollectors/getHostAppsList.py"
SCRIPT_META_PATH="$PROJECT_ROOT/sources/dataCollectors/getHostAppsMetadata.py"

LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/cronHostAppsMetadata.log"
TEMP_LOG_FILE="$LOG_DIR/temp_cronHostApps.log"

mkdir -p "$LOG_DIR"
NOW=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$NOW] Lanzando recolección de apps y metadata desde cron..." >> "$LOG_FILE"

# Establecer PYTHONPATH para que Python encuentre los módulos locales
export PYTHONPATH="$PROJECT_ROOT"

# Ejecutar el primer script: getHostAppsList.py
echo "[$NOW] Ejecutando getHostAppsList.py..." >> "$LOG_FILE"
"$PYTHON_PATH" "$SCRIPT_LIST_PATH" >> "$LOG_FILE" 2>&1

# Ejecutar el segundo script: getHostAppsMetadata.py
NOW=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$NOW] Ejecutando getHostAppsMetadata.py..." >> "$LOG_FILE"
"$PYTHON_PATH" "$SCRIPT_META_PATH" >> "$LOG_FILE" 2>&1

NOW=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$NOW] Ejecución completa." >> "$LOG_FILE"
echo "---------------------------------------------" >> "$LOG_FILE"

# Limitar tamaño del log a 5000 líneas
tail -n 5000 "$LOG_FILE" > "$TEMP_LOG_FILE" && mv "$TEMP_LOG_FILE" "$LOG_FILE"
