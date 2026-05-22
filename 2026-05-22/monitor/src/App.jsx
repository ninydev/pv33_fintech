import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const MONITOR_SERVER_URL = 'http://localhost:8080';

function App() {
  const [nodes, setNodes] = useState({});

  useEffect(() => {
    const socket = io(MONITOR_SERVER_URL);

    // Обработчик для получения полного начального состояния
    socket.on('initial_state', (initialState) => {
      console.log('Received initial state:', initialState);
      setNodes(initialState);
    });

    // Обработчик для получения инкрементальных обновлений
    socket.on('update', (data) => {
      console.log('Received update:', data);
      setNodes(prevNodes => ({
        ...prevNodes,
        [data.name]: {
          chain: data.chain,
          lastUpdate: new Date().toLocaleTimeString()
        }
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="monitor-container">
      <h1>Blockchain Network Monitor</h1>
      <div className="nodes-grid">
        {Object.keys(nodes).length === 0 && <p>Waiting for nodes to connect...</p>}
        {Object.entries(nodes).map(([name, data]) => (
          <div key={name} className="node-card">
            <h2>{name}</h2>
            <p>Blocks: {data.chain.length}</p>
            <p>Last Update: {data.lastUpdate}</p>
            <div className="mini-blockchain">
              {data.chain.map((block, index) => (
                <div
                  key={block.hash}
                  className="mini-block"
                  title={`Hash: ${block.hash}\nPrevHash: ${block.previousHash}`}
                >
                  {index}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;