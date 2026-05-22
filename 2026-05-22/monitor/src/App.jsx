import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const MONITOR_SERVER_URL = 'http://localhost:8080';

function App() {
  const [nodes, setNodes] = useState({});

  useEffect(() => {
    const socket = io(MONITOR_SERVER_URL);

    socket.on('initial_state', (initialState) => {
      setNodes(initialState);
    });

    socket.on('update', (data) => {
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

  const getBlockClass = (block) => {
    // Проверяем на особую монету по хэшу
    if (BigInt('0x' + block.hash) % 9n === 0n && block.index > 0) {
      return 'special';
    }
    if (block.index === 0) return 'genesis';
    if (block.data?.type === 'coin') return 'coin';
    return 'data';
  };

  const getBlockTitle = (block) => {
    let info = `Index: ${block.index}\nHash: ${block.hash.substring(0, 15)}...`;
    if (block.data && block.data.message) {
      info += `\nMessage: ${block.data.message}`;
    } else if (typeof block.data === 'string') {
      info += `\nData: ${block.data}`;
    } else if (block.data?.type === 'special_coin') {
      info += `\nType: Special Coin!`;
    }
    return info;
  };

  return (
    <div className="monitor-container">
      <h1>dApp Network Monitor</h1>
      <div className="nodes-grid">
        {Object.keys(nodes).length === 0 && <p>Waiting for nodes to connect...</p>}
        {Object.entries(nodes).map(([name, data]) => (
          <div key={name} className="node-card">
            <div className="node-header">
              <h2>{name}</h2>
              <div className="node-stats">
                <span>Blocks: {data.chain.length}</span>
                <span>Last Update: {data.lastUpdate}</span>
              </div>
            </div>
            <div className="mini-blockchain">
              {data.chain.map((block) => (
                <div
                  key={block.hash}
                  className={`mini-block ${getBlockClass(block)}`}
                  title={getBlockTitle(block)}
                >
                  {block.index}
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