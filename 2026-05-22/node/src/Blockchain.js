import Block from './Block.js';

/**
 * ============================================================================
 * БЛОКЧЕЙН (BLOCKCHAIN)
 * ============================================================================
 * 
 * Класс Blockchain представляет собой децентрализованный распределенный реестр 
 * (цепочку блоков), который является основой для любой криптовалюты или dApp.
 * 
 * Зачем нужен этот класс:
 * 1. Инициализация цепочки (создание Genesis-блока - самого первого блока в сети).
 * 2. Управление добавлением новых блоков (addBlock).
 * 3. Валидация цепочки (isChainValid). Класс проверяет, что никто не подменил
 *    данные в прошлых блоках, проверяя соответствие хэшей.
 * 4. В будущем здесь также могут находиться механизмы достижения консенсуса,
 *    механизмы сложности майнинга (Proof of Work/Proof of Stake) и управления 
 *    наградами.
 * 
 * Этот класс - это "движок" ноды, который хранит всю историю транзакций 
 * и гарантирует её неизменяемость.
 * ============================================================================
 */
export default class Blockchain {
  constructor() {
    /**
     * @type {Block[]} Массив, хранящий все блоки в цепочке.
     */
    this.chain = [this.createGenesisBlock()];
  }

  /**
   * Создает первый (генезис) блок в цепочке.
   * У этого блока нет предыдущего хэша.
   * @returns {Block} Генезис-блок.
   */
  createGenesisBlock() {
    return new Block(0, 'Genesis Block', '0');
  }

  /**
   * Возвращает последний добавленный блок в цепочку.
   * @returns {Block} Последний блок.
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Добавляет новый блок в цепочку.
   * @param {Block} newBlock Новый блок, который нужно добавить.
   */
  addBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash;
    // Обязательно пересчитываем хэш после изменения previousHash
    newBlock.hash = newBlock.calculateHash(); 
    this.chain.push(newBlock);
  }

  /**
   * Проверяет целостность и валидность цепочки блоков.
   * Проходится по всем блокам и проверяет корректность хэшей.
   * @returns {boolean} True, если цепочка валидна, иначе False.
   */
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Проверяем, не изменились ли данные в текущем блоке
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      // Проверяем, указывает ли текущий блок на правильный предыдущий хэш
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}