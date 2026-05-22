#!/bin/bash

# =================================================================
# СКРИПТ ДЛЯ ОСТАНОВКИ СЕТИ И ОСВОБОЖДЕНИЯ ПОРТОВ
# =================================================================

echo "🛑 Stopping the dApp network and monitor..."

# 1. Мягкая остановка через pkill (пытаемся завершить корректно)
echo "Killing node processes..."
pkill -f 'node src/main.js'
pkill -f 'node server.js'

# 2. Жесткая очистка портов (на случай если процессы зависли)
echo "Freeing ports (3001-3004, 6001-6004, 8080)..."
ports=(3001 3002 3003 3004 6001 6002 6003 6004 8080)

for port in "${ports[@]}"; do
  # Ищем PID процесса, занимающего порт, и убиваем его
  pid=$(lsof -t -i:$port)
  if [ ! -z "$pid" ]; then
    echo "Killing process $pid on port $port"
    kill -9 $pid
  fi
done

echo "✅ All nodes stopped and ports are free."