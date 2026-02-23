#!/bin/bash

# ========================================
# Script para lanzar getHostApks.py
# ========================================

PYTHON_PATH="/home/ciber/projects/SafeMountain/api/tools/appcollector/appcollector_env/bin/python3"
SCRIPT_PATH="/home/ciber/projects/SafeMountain/api/tools/appcollector/sources/downloaders/getHostApks.py"
PROJECT_ROOT="/home/ciber/projects/SafeMountain/api/tools/appcollector"
CRON_LOG="/home/ciber/projects/SafeMountain/api/tools/appcollector/logs/cronHostApks.log"
TEMP_LOG_FILE="/home/ciber/projects/SafeMountain/api/tools/appcollector/logs/temp_cronHostApks.log"

mkdir -p "$(dirname "$CRON_LOG")"
NOW=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$NOW] Lanzando descarga de APKs desde cron..." >> "$CRON_LOG"

# Añadir PYTHONPATH para que Python encuentre el paquete 'sources'
PYTHONPATH="$PROJECT_ROOT" "$PYTHON_PATH" "$SCRIPT_PATH" >> "$CRON_LOG" 2>&1

NOW=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$NOW] Ejecución finalizada." >> "$CRON_LOG"
echo "---------------------------------------------" >> "$CRON_LOG"

# Mantener un máximo de 5000 líneas en el log
tail -n 5000 "$CRON_LOG" > "$TEMP_LOG_FILE" && mv "$TEMP_LOG_FILE" "$CRON_LOG"
