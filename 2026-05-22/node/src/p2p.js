import { Server } from 'socket.io';
import { io } from 'socket.io-client';
import Block from './Block.js';

export default class P2PServer {
  constructor(blockchain, p2pPort, serverName = 'Node') {
    this.blockchain = blockchain;
    this.sockets = [];
    this.p2pPort = p2pPort;
    this.serverName = serverName;
    this.monitorUpdater = null; // Функция для отправки данных на монитор
  }

  setMonitorUpdater(updaterFn) {
    this.monitorUpdater = updaterFn;
  }

  listen() {
    const ioServer = new Server(this.p2pPort, {
      cors: { origin: "*" }
    });
    console.log(`[${this.serverName}] Listening for P2P connections on port: ${this.p2pPort}`);
    ioServer.on('connection', (socket) => {
      this.connectSocket(socket);
    });
  }

  connectToPeer(peer) {
    console.log(`[${this.serverName}] Attempting to connect to peer: ${peer}`);
    const socket = io(peer);
    socket.on('connect', () => this.connectSocket(socket));
    socket.on('connect_error', (error) => console.log(`[${this.serverName}] Error connecting to peer ${peer}:`, error.message));
  }

  connectSocket(socket) {
    this.sockets.push(socket);
    console.log(`[${this.serverName}] New peer connected.`);
    this.messageHandler(socket);
    this.sendChain(socket);
  }

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

  sendChain(socket) {
    socket.emit('message', JSON.stringify(this.blockchain.chain));
  }

  broadcastChain() {
    this.sockets.forEach(socket => this.sendChain(socket));
  }

  replaceChain(newChain) {
    if (newChain.length <= this.blockchain.chain.length) {
      console.log(`[${this.serverName}] Received chain is not longer than current chain. Ignoring.`);
      return;
    }

    console.log(`[${this.serverName}] Received chain is longer. Attempting to validate...`);

    const hydratedChain = newChain.map(plainBlock => {
      const block = new Block(0, '');
      Object.assign(block, plainBlock);
      return block;
    });

    const tempBlockchain = new this.blockchain.constructor();
    tempBlockchain.chain = hydratedChain;

    if (tempBlockchain.isChainValid()) {
      console.log(`[${this.serverName}] Received chain is valid. Replacing current chain.`);
      this.blockchain.chain = hydratedChain;
      this.broadcastChain();
      
      // Если цепочка обновлена и у нас есть функция мониторинга - вызываем ее
      if (this.monitorUpdater) {
          this.monitorUpdater();
      }
    } else {
      console.log(`[${this.serverName}] Received chain is invalid.`);
    }
  }
}