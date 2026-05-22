import { Server } from 'socket.io';
import { io } from 'socket.io-client';

/**
 * P2P-сервер для синхронизации блокчейна между нодами.
 * Использует Socket.IO для двусторонней связи в реальном времени.
 */
export default class P2PServer {
  constructor(blockchain, p2pPort) {
    this.blockchain = blockchain;
    this.sockets = []; // Массив подключенных сокетов (других нод)
    this.p2pPort = p2pPort;
  }

  /**
   * Запускает WebSocket-сервер для приема входящих подключений.
   */
  listen() {
    const ioServer = new Server(this.p2pPort, {
      cors: {
        origin: "*", // Разрешаем подключения отовсюду (в реальном мире нужно настроить строже)
      }
    });

    console.log(`Listening for P2P connections on port: ${this.p2pPort}`);

    ioServer.on('connection', (socket) => {
      this.connectSocket(socket);
    });
  }

  /**
   * Подключается к другой ноде (пиру) по её адресу.
   * @param {string} peer Адрес пира (например, 'ws://localhost:6002')
   */
  connectToPeer(peer) {
    console.log(`Attempting to connect to peer: ${peer}`);
    const socket = io(peer);

    socket.on('connect', () => {
      this.connectSocket(socket);
    });

    socket.on('connect_error', (error) => {
      console.log(`Error connecting to peer ${peer}:`, error.message);
    });
  }

  /**
   * Обрабатывает новое подключение (как входящее, так и исходящее).
   * @param {Socket} socket Объект сокета.
   */
  connectSocket(socket) {
    this.sockets.push(socket);
    console.log('New peer connected.');

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
        console.log('Received updated chain from a peer.');

        // Заменяем нашу цепочку, если полученная валидна и длиннее
        this.replaceChain(data);
      } catch (error) {
        console.error('Error parsing incoming message:', error);
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
   * @param {Array} newChain Новая цепочка блоков.
   */
  replaceChain(newChain) {
    if (newChain.length > this.blockchain.chain.length) {
      console.log('Received chain is longer. Attempting to validate...');
      
      // Создаем временный экземпляр Blockchain для валидации новой цепи
      const tempChain = new this.blockchain.constructor();
      tempChain.chain = newChain;

      if (tempChain.isChainValid()) {
        console.log('Received chain is valid. Replacing current chain.');
        this.blockchain.chain = newChain;
      } else {
        console.log('Received chain is invalid.');
      }
    } else {
      console.log('Received chain is not longer than current chain. Ignoring.');
    }
  }
}