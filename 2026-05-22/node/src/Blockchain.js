import Block from './Block.js';

export default class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  createGenesisBlock() {
    return new Block(0, 'Genesis Block', '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Простое добавление блока (без майнинга).
   * @param {Block} newBlock 
   */
  addBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.hash = newBlock.calculateHash();
    this.chain.push(newBlock);
  }

  /**
   * Майнинг и добавление блока.
   * Ищет хэш, который делится на 9 без остатка.
   * @param {Block} newBlock 
   */
  mineAndAddBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash;
    
    console.log(`[Mining]... Searching for a hash divisible by 9.`);
    // BigInt необходим, т.к. хэш слишком велик для стандартного Number
    while (BigInt('0x' + newBlock.hash) % 9n !== 0n) {
      newBlock.nonce++;
      newBlock.hash = newBlock.calculateHash();
    }
    
    console.log(`[Mining] Success! Found hash: ${newBlock.hash} (Nonce: ${newBlock.nonce})`);
    this.chain.push(newBlock);
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}