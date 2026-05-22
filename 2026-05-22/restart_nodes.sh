#!/bin/bash

# =================================================================
# СКРИПТ ДЛЯ ПЕРЕЗАПУСКА СЕТИ
# =================================================================

echo "🔄 Restarting the network..."

# Получаем путь к директории, где находится этот скрипт
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# 1. Вызываем скрипт остановки
echo "--- Running stop script ---"
"$DIR/stop_nodes.sh"
echo "---------------------------"

sleep 2 # Пауза, чтобы порты точно освободились

# 2. Вызываем скрипт запуска
echo "--- Running start script ---"
"$DIR/start_nodes.sh"
echo "----------------------------"

echo "✅ Network restart sequence completed."