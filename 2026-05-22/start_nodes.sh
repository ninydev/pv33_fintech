#!/bin/bash

# =================================================================
# СКРИПТ ДЛЯ ЗАПУСКА СЕТИ ИЗ 4-Х БЛОКЧЕЙН-НОД
# =================================================================
#
# Этот скрипт запускает 4 ноды в фоновом режиме.
# Каждая нода получает уникальное имя и порты.
#
# Для остановки всех запущенных нод выполните команду:
# pkill -f "node src/main.js"
#
# =================================================================

echo "🚀 Starting the dApp network..."

# Переходим в директорию, где находится код ноды
cd ./node

# Проверяем, установлен ли nvm, и используем нужную версию Node.js
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
  echo "Found nvm. Switching to Node.js version specified in .nvmrc..."
  nvm use
else
  echo "Warning: nvm not found. Using the system's default Node.js version."
fi

# 1. Запускаем первую ноду - Sunny
echo "    -> Starting Sunny Node (HTTP: 3001, P2P: 6001)"
SERVER_NAME=Sunny HTTP_PORT=3001 P2P_PORT=6001 npm start &
sleep 2 # Небольшая пауза, чтобы сервер успел запуститься

# 2. Запускаем вторую ноду - Jonny - и подключаем ее к Sunny
echo "    -> Starting Jonny Node (HTTP: 3002, P2P: 6002), connecting to Sunny"
SERVER_NAME=Jonny HTTP_PORT=3002 P2P_PORT=6002 PEERS=ws://localhost:6001 npm start &
sleep 2

# 3. Запускаем третью ноду - Gov - и подключаем ее к первым двум
echo "    -> Starting Gov Node (HTTP: 3003, P2P: 6003), connecting to Sunny & Jonny"
SERVER_NAME=Gov HTTP_PORT=3003 P2P_PORT=6003 PEERS=ws://localhost:6001,ws://localhost:6002 npm start &
sleep 2

# 4. Запускаем четвертую ноду - Bank - и подключаем ее ко всем остальным
echo "    -> Starting Bank Node (HTTP: 3004, P2P: 6004), connecting to all others"
SERVER_NAME=Bank HTTP_PORT=3004 P2P_PORT=6004 PEERS=ws://localhost:6001,ws://localhost:6002,ws://localhost:6003 npm start &

echo ""
echo "✅ All nodes have been launched in the background."
echo "👀 You can monitor their individual logs if you run them in separate terminals."
echo "🛑 To stop all nodes, run the command: pkill -f 'node src/main.js'"