import express from 'express';
import cors from 'cors';
import Blockchain from './Blockchain.js';
import Block from './Block.js';
import P2PServer from './p2p.js';
import { io } from 'socket.io-client';

// --- ПАРАМЕТРЫ ---
const httpPort = process.env.HTTP_PORT || 3001;
const p2pPort = process.env.P2P_PORT || 6001;
const serverName = process.env.SERVER_NAME || 'Node';
const isMiner = process.env.IS_MINER === 'true';
const initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];
const monitorUrl = process.env.MONITOR_URL || 'http://localhost:8080';

// --- ИНИЦИАЛИЗАЦИЯ ---
const blockchain = new Blockchain();
const p2pServer = new P2PServer(blockchain, p2pPort, serverName);
const app = express();

app.use(cors());
app.use(express.json());

// --- ПОДКЛЮЧЕНИЕ К МОНИТОРУ ---
const monitorSocket = io(monitorUrl, { query: { nodeName: serverName } });
monitorSocket.on('connect', () => {
  console.log(`[${serverName}] Connected to monitor server.`);
  monitorSocket.emit('register', serverName);
  monitorSocket.emit('chain_update', { chain: blockchain.chain });
});
const sendUpdateToMonitor = () => {
  monitorSocket.emit('chain_update', { chain: blockchain.chain });
};
p2pServer.setMonitorUpdater(sendUpdateToMonitor);

// --- ЛОГИКА МАЙНИНГА ---
if (isMiner) {
  // 1. Сразу при старте ищем "особую монету"
  console.log(`[${serverName}] Starting initial search for a special coin...`);
  const specialCoinData = { type: 'special_coin', miner: serverName };
  const specialBlock = new Block(blockchain.getLatestBlock().index + 1, specialCoinData);
  blockchain.mineAndAddBlock(specialBlock);
  console.log(`[${serverName}] 🎉 Found special coin!`);
  p2pServer.broadcastChain();
  sendUpdateToMonitor();

  // 2. Продолжаем майнить обычные монеты раз в минуту
  setInterval(() => {
    const coinData = { type: 'coin', miner: serverName };
    const newBlock = new Block(blockchain.getLatestBlock().index + 1, coinData);
    // Для обычных монет тоже нужен майнинг, но без особой пометки
    blockchain.mineAndAddBlock(newBlock); 
    console.log(`[${serverName}] ⛏️ Mined a new coin block!`);
    p2pServer.broadcastChain();
    sendUpdateToMonitor();
  }, 60000);
}

// --- HTTP API ЭНДПОИНТЫ ---
app.get('/blocks', (req, res) => {
  res.json(blockchain.chain);
});

// Теперь этот эндпоинт тоже использует майнинг
app.post('/mineBlock', (req, res) => {
  if (!req.body.data) {
    return res.status(400).send('Block data is required.');
  }
  const newBlock = new Block(blockchain.getLatestBlock().index + 1, req.body.data);
  blockchain.mineAndAddBlock(newBlock); // Используем майнинг!
  
  console.log(`[${serverName}] Block added via API:`, newBlock.hash);
  res.status(201).send(newBlock);
  
  p2pServer.broadcastChain();
  sendUpdateToMonitor();
});

app.get('/peers', (req, res) => {
  res.json(p2pServer.sockets.map(socket => socket.id));
});

app.post('/addPeer', (req, res) => {
  if (!req.body.peer) {
    return res.status(400).send('Peer address is required.');
  }
  p2pServer.connectToPeer(req.body.peer);
  res.send();
});

// --- ЗАПУСК СЕРВЕРОВ ---
app.listen(httpPort, () => {
  console.log(`[${serverName}] HTTP Server listening on port: ${httpPort}`);
});

p2pServer.listen();
initialPeers.forEach(peer => p2pServer.connectToPeer(peer));