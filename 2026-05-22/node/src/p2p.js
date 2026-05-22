import { Server } from 'socket.io';
import { io } from 'socket.io-client';
import Block from './Block.js'; // Импортируем класс Block

/**
 * P2P-сервер для синхронизации блокчейна между нодами.
 * Использует Socket.IO для двусторонней связи в реальном времени.
 */
export default class P2PServer {
  constructor(blockchain, p2pPort, serverName = 'Node') {
    this.blockchain = blockchain;
    this.sockets = []; // Массив подключенных сокетов (других нод)
    this.p2pPort = p2pPort;
    this.serverName = serverName;
  }

  /**
   * Запускает WebSocket-сервер для приема входящих подключений.
   */
  listen() {
    const ioServer = new Server(this.p2pPort, {
      cors: {
        origin: "*",
      }
    });

    console.log(`[${this.serverName}] Listening for P2P connections on port: ${this.p2pPort}`);

    ioServer.on('connection', (socket) => {
      this.connectSocket(socket);
    });
  }

  /**
   * Подключается к другой ноде (пиру) по её адресу.
   * @param {string} peer Адрес пира (например, 'ws://localhost:6002')
   */
  connectToPeer(peer) {
    console.log(`[${this.serverName}] Attempting to connect to peer: ${peer}`);
    const socket = io(peer);

    socket.on('connect', () => {
      this.connectSocket(socket);
    });

    socket.on('connect_error', (error) => {
      console.log(`[${this.serverName}] Error connecting to peer ${peer}:`, error.message);
    });
  }

  /**
   * Обрабатывает новое подключение (как входящее, так и исходящее).
   * @param {Socket} socket Объект сокета.
   */
  connectSocket(socket) {
    this.sockets.push(socket);
    console.log(`[${this.serverName}] New peer connected.`);

    this.messageHandler(socket);

    // Сразу отправляем новому пиру нашу версию блокчейна
    this.sendChain(socket);
  }

  /**
   * Настраивает обработчик входящих сообщений для сокета.
   * @param {Socket} socket Объект сокета.
   */
  messageHandler(socket) {
    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log(`[${this.serverName}] Received updated chain from a peer.`);
        this.replaceChain(data);
      } catch (error) {
        console.error(`[${this.serverName}] Error parsing incoming message:`, error);
      }
    });
  }

  /**
   * Отправляет текущий блокчейн конкретному сокету.
   * @param {Socket} socket Объект сокета.
   */
  sendChain(socket) {
    socket.emit('message', JSON.stringify(this.blockchain.chain));
  }

  /**
   * Транслирует (рассылает) текущий блокчейн всем подключенным пирам.
   */
  broadcastChain() {
    this.sockets.forEach(socket => this.sendChain(socket));
  }

  /**
   * Логика обновления цепи (простейший консенсус).
   * @param {Array<Object>} newChain Новая цепочка блоков (в виде простых объектов).
   */
  replaceChain(newChain) {
    if (newChain.length <= this.blockchain.chain.length) {
      console.log(`[${this.serverName}] Received chain is not longer than current chain. Ignoring.`);
      return;
    }

    console.log(`[${this.serverName}] Received chain is longer. Attempting to validate...`);

    // "Оживляем" простые объекты, превращая их в экземпляры класса Block
    const hydratedChain = newChain.map(plainBlock => {
      const block = new Block(0, ''); // Создаем временный экземпляр
      Object.assign(block, plainBlock); // Копируем все свойства из объекта в экземпляр
      return block;
    });

    const tempBlockchain = new this.blockchain.constructor();
    tempBlockchain.chain = hydratedChain;

    if (tempBlockchain.isChainValid()) {
      console.log(`[${this.serverName}] Received chain is valid. Replacing current chain.`);
      this.blockchain.chain = hydratedChain;
      // Оповещаем других пиров, что мы обновились
      this.broadcastChain();
    } else {
      console.log(`[${this.serverName}] Received chain is invalid.`);
    }
  }
}