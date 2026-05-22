import express from 'express';
import Blockchain from './Blockchain.js';
import Block from './Block.js';
import P2PServer from './p2p.js';
import { io } from 'socket.io-client';

// --- ПАРАМЕТРЫ ---
const httpPort = process.env.HTTP_PORT || 3001;
const p2pPort = process.env.P2P_PORT || 6001;
const serverName = process.env.SERVER_NAME || 'Node';
const initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];
const monitorUrl = process.env.MONITOR_URL || 'http://localhost:8080';

// --- ИНИЦИАЛИЗАЦИЯ ---
const blockchain = new Blockchain();
const p2pServer = new P2PServer(blockchain, p2pPort, serverName);
const app = express();

app.use(express.json());

// --- ПОДКЛЮЧЕНИЕ К МОНИТОРУ ---
const monitorSocket = io(monitorUrl, {
  query: { nodeName: serverName }
});

monitorSocket.on('connect', () => {
  console.log(`[${serverName}] Connected to monitor server.`);
  monitorSocket.emit('register', serverName);
  // Отправляем начальное состояние
  monitorSocket.emit('chain_update', { chain: blockchain.chain });
});

// Обертка для отправки обновлений на монитор
const sendUpdateToMonitor = () => {
  monitorSocket.emit('chain_update', { chain: blockchain.chain });
};

// Передаем функцию обновления в P2P-сервер
p2pServer.setMonitorUpdater(sendUpdateToMonitor);


// --- HTTP API ЭНДПОИНТЫ ---
app.get('/blocks', (req, res) => {
  res.json(blockchain.chain);
});

app.post('/mineBlock', (req, res) => {
  if (!req.body.data) {
    return res.status(400).send('Block data is required.');
  }
  const newBlock = new Block(
    blockchain.getLatestBlock().index + 1,
    req.body.data
  );
  
  blockchain.addBlock(newBlock);

  console.log(`[${serverName}] Block added:`, newBlock);
  res.status(201).send(newBlock);

  p2pServer.broadcastChain();
  sendUpdateToMonitor(); // Отправляем обновление после майнинга
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