import React, { useState, useEffect } from 'react';
import './App.css';

// Определяем ноды, к которым можно подключиться
const NODES = {
  Sunny: 'http://localhost:3001',
  Jonny: 'http://localhost:3002',
  Gov: 'http://localhost:3003',
  Bank: 'http://localhost:3004',
};

// Уникальный идентификатор нашего клиента
const CLIENT_ID = 'MyAwesomeClient';

function App() {
  const [selectedNode, setSelectedNode] = useState(Object.keys(NODES)[0]);
  const [chain, setChain] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Загружаем "наши" хэши из localStorage при старте
  const [myBlockHashes, setMyBlockHashes] = useState(() => {
    const saved = localStorage.getItem('myBlockHashes');
    return saved ? JSON.parse(saved) : [];
  });

  // Функция для загрузки блокчейна с выбранной ноды
  const fetchBlockchain = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${NODES[selectedNode]}/blocks`);
      const data = await response.json();
      setChain(data);
    } catch (error) {
      console.error('Failed to fetch blockchain:', error);
      alert('Could not connect to the node. Is the network running?');
    } finally {
      setIsLoading(false);
    }
  };

  // Загружаем блокчейн при смене ноды
  useEffect(() => {
    fetchBlockchain();
  }, [selectedNode]);

  // Сохраняем хэши в localStorage при их изменении
  useEffect(() => {
    localStorage.setItem('myBlockHashes', JSON.stringify(myBlockHashes));
  }, [myBlockHashes]);

  // Обработчик отправки формы
  const handlePublish = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${NODES[selectedNode]}/mineBlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            sender: CLIENT_ID, // Добавляем наш ID
            content: message,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to publish block');

      const newBlock = await response.json();
      // Добавляем хэш нового блока в наш список
      setMyBlockHashes(prev => [...prev, newBlock.hash]);
      setMessage('');
      // Обновляем цепочку, чтобы сразу увидеть результат
      fetchBlockchain();
    } catch (error) {
      console.error('Error publishing block:', error);
      alert('Failed to publish block. The node might be busy.');
    } finally {
      setIsLoading(false);
    }
  };

  const getBlockType = (block) => {
    if (block.index === 0) return 'Genesis';
    if (block.data?.type === 'coin') return 'Coin';
    return 'Data';
  };

  return (
    <div className="client-container">
      <h1>dApp Client</h1>

      <div className="control-panel">
        <form onSubmit={handlePublish}>
          <div className="form-group">
            <label htmlFor="node-select">Connect to Node:</label>
            <select
              id="node-select"
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
              disabled={isLoading}
            >
              {Object.keys(NODES).map(node => (
                <option key={node} value={node}>{node}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="message-input">Your Message:</label>
            <input
              type="text"
              id="message-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter data to store in the blockchain"
              disabled={isLoading}
            />
          </div>
          <button type="submit" disabled={isLoading || !message.trim()}>
            {isLoading ? 'Processing...' : 'Publish to Network'}
          </button>
        </form>
      </div>

      <div className="blockchain-view">
        <h2>Blockchain on {selectedNode}</h2>
        <button onClick={fetchBlockchain} disabled={isLoading}>Refresh</button>
        {chain.slice().reverse().map(block => (
          <div
            key={block.hash}
            className={`block ${getBlockType(block).toLowerCase()} ${myBlockHashes.includes(block.hash) ? 'my-block' : ''}`}
          >
            <div className="block-header">
              <span className="block-index">Block #{block.index}</span>
              <div>
                <span className="block-type">{getBlockType(block)}</span>
                {myBlockHashes.includes(block.hash) && <span className="my-badge">My Block</span>}
              </div>
            </div>
            <pre>
              <code>{JSON.stringify(block.data, null, 2)}</code>
            </pre>
            <small>Hash: {block.hash}</small><br/>
            <small>Prev. Hash: {block.previousHash}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;