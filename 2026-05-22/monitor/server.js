import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', 
  },
});

const PORT = 8080;

// Храним последнее известное состояние сети в памяти сервера
const networkState = {};

app.use(express.static(path.join(__dirname, 'dist')));

io.on('connection', (socket) => {
  const nodeName = socket.handshake.query.nodeName;

  if (nodeName) {
    // Подключилась блокчейн-нода
    console.log(`Node '${nodeName}' connected.`);

    socket.on('chain_update', (data) => {
      // Сохраняем состояние
      networkState[nodeName] = {
        chain: data.chain,
        lastUpdate: new Date().toLocaleTimeString()
      };
      
      // Рассылаем обновление всем подключенным React-клиентам
      io.emit('update', { name: nodeName, chain: data.chain });
    });

    socket.on('disconnect', () => {
      console.log(`Node '${nodeName}' disconnected.`);
    });
  } else {
    // Подключился веб-клиент (React)
    console.log('React web client connected.');
    // Сразу отправляем ему текущее состояние всех нод!
    socket.emit('initial_state', networkState);
  }
});

server.listen(PORT, () => {
  console.log(`Monitor server running on http://localhost:${PORT}`);
});