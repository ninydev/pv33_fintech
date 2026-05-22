import express from 'express';
import Blockchain from './Blockchain.js';
import Block from './Block.js';
import P2PServer from './p2p.js';

// Получаем порты и имя из переменных окружения или используем значения по умолчанию
const httpPort = process.env.HTTP_PORT || 3001;
const p2pPort = process.env.P2P_PORT || 6001;
const serverName = process.env.SERVER_NAME || 'Node';
const initialPeers = process.env.PEERS ? process.env.PEERS.split(',') : [];

// --- ИНИЦИАЛИЗАЦИЯ ---
const blockchain = new Blockchain();
const p2pServer = new P2PServer(blockchain, p2pPort, serverName); // Передаем имя сервера
const app = express();

app.use(express.json()); // Для парсинга JSON-тел запросов

// --- HTTP API ЭНДПОИНТЫ ---

// 1. Получить все блоки
app.get('/blocks', (req, res) => {
  res.json(blockchain.chain);
});

// 2. Создать (добыть) новый блок
app.post('/mineBlock', (req, res) => {
  if (!req.body.data) {
    return res.status(400).send('Block data is required.');
  }
  const newBlock = new Block(
    blockchain.getLatestBlock().index + 1,
    req.body.data
  );
  
  // В реальном приложении здесь был бы майнинг (PoW)
  blockchain.addBlock(newBlock);

  console.log(`[${serverName}] Block added:`, newBlock);
  res.status(201).send(newBlock);

  // Рассылаем обновленную цепочку всем пирам
  p2pServer.broadcastChain();
});

// 3. Посмотреть список подключенных пиров
app.get('/peers', (req, res) => {
  res.json(p2pServer.sockets.map(socket => socket.id)); // Показываем ID сокетов
});

// 4. Подключиться к новому пиру
app.post('/addPeer', (req, res) => {
  if (!req.body.peer) {
    return res.status(400).send('Peer address is required.');
  }
  p2pServer.connectToPeer(req.body.peer);
  res.send();
});

// --- ЗАПУСК СЕРВЕРОВ ---

// Запускаем HTTP-сервер
app.listen(httpPort, () => {
  console.log(`[${serverName}] HTTP Server listening on port: ${httpPort}`);
});

// Запускаем P2P-сервер
p2pServer.listen();

// Подключаемся к начальным пирам, если они указаны
initialPeers.forEach(peer => p2pServer.connectToPeer(peer));