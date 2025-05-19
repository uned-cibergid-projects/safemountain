#!/bin/bash

# =============================
# Script para lanzar getTpls.py
# =============================

PYTHON_PATH="/home/dblancoaza/SafeMountain/API/tools/appcollector/appcollector_env/bin/python3"
SCRIPT_PATH="/home/dblancoaza/SafeMountain/API/tools/appcollector/sources/downloaders/getTpls.py"
PROJECT_ROOT="/home/dblancoaza/SafeMountain/API/tools/appcollector"
CRON_LOG="/home/dblancoaza/SafeMountain/API/tools/appcollector/logs/cronOutput.log"
TEMP_LOG_FILE="/home/dblancoaza/SafeMountain/API/tools/appcollector/logs/temp_cronOutput.log"

mkdir -p "$(dirname "$CRON_LOG")"
NOW=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$NOW] Lanzando descarga de TPLs desde cron..." >> "$CRON_LOG"

# Añadir PYTHONPATH para que Python encuentre el paquete 'sources'
PYTHONPATH="$PROJECT_ROOT" "$PYTHON_PATH" "$SCRIPT_PATH" >> "$CRON_LOG" 2>&1

NOW=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$NOW] Ejecución finalizada." >> "$CRON_LOG"
echo "---------------------------------------------" >> "$CRON_LOG"

# Mantener un máximo de 5000 líneas en el log
tail -n 5000 "$CRON_LOG" > "$TEMP_LOG_FILE" && mv "$TEMP_LOG_FILE" "$CRON_LOG"