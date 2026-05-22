#!/bin/bash

# =================================================================
# СКРИПТ ДЛЯ ЗАПУСКА СЕТИ ИЗ 4-Х БЛОКЧЕЙН-НОД + МОНИТОРА
# =================================================================

echo "🚀 Starting the dApp network and monitor..."

# Проверяем nvm
if [ -s "$NVM_DIR/nvm.sh" ]; then
  source "$NVM_DIR/nvm.sh"
  nvm use
fi

# 0. Запускаем сервер мониторинга
echo "    -> Starting Monitor Server (Port: 8080)"
cd ./monitor
npm install > /dev/null 2>&1
npm run build > /dev/null 2>&1
npm start &
sleep 4

cd ../node

# 1. Запускаем Sunny (МАЙНЕР)
echo "    -> Starting Sunny Node (HTTP: 3001, P2P: 6001) [MINER]"
SERVER_NAME=Sunny HTTP_PORT=3001 P2P_PORT=6001 IS_MINER=true npm start &
sleep 2

# 2. Запускаем Jonny (МАЙНЕР)
echo "    -> Starting Jonny Node (HTTP: 3002, P2P: 6002) [MINER]"
SERVER_NAME=Jonny HTTP_PORT=3002 P2P_PORT=6002 PEERS=ws://localhost:6001 IS_MINER=true npm start &
sleep 2

# 3. Запускаем Gov (Обычная нода)
echo "    -> Starting Gov Node (HTTP: 3003, P2P: 6003)"
SERVER_NAME=Gov HTTP_PORT=3003 P2P_PORT=6003 PEERS=ws://localhost:6001,ws://localhost:6002 npm start &
sleep 2

# 4. Запускаем Bank (Обычная нода)
echo "    -> Starting Bank Node (HTTP: 3004, P2P: 6004)"
SERVER_NAME=Bank HTTP_PORT=3004 P2P_PORT=6004 PEERS=ws://localhost:6001,ws://localhost:6002,ws://localhost:6003 npm start &

echo ""
echo "✅ All nodes and the monitor have been launched."
echo "🌐 Open your browser at: http://localhost:8080 to view the monitor!"
echo "🛑 To stop all nodes, run: ./stop_nodes.sh"