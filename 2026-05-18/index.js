const crypto = require('crypto');

/**
 * Класс транзакции (платежа).
 * Содержит информацию о самом платеже и хеш, который зависит в том числе от предыдущей записи.
 */
class Transaction {
    constructor(from, to, amount, previousHash = '') {
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.timestamp = Date.now();
        this.previousHash = previousHash;
        // Хеш вычисляется на основе всех данных транзакции и хеша предыдущей
        this.hash = this.calculateHash();
    }

    calculateHash() {
        const data = this.from + this.to + this.amount + this.timestamp + this.previousHash;
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}

/**
 * Класс реестра (простейший блокчейн).
 * Хранит цепочку транзакций и проверяет их целостность.
 */
class Ledger {
    constructor() {
        // Инициализируем реестр с первичной (genesis) записью
        this.chain = [this.createGenesisTransaction()];
    }

    createGenesisTransaction() {
        return new Transaction('SYSTEM', 'SYSTEM', 0, '0');
    }

    getLatestTransaction() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Добавление нового платежа
     */
    addTransaction(from, to, amount) {
        const previousTransaction = this.getLatestTransaction();
        const newTransaction = new Transaction(from, to, amount, previousTransaction.hash);
        this.chain.push(newTransaction);
    }

    /**
     * Подсчет баланса пользователя на основе всей истории транзакций
     */
    getBalance(user) {
        let balance = 0;
        for (const tx of this.chain) {
            if (tx.from === user) {
                balance -= tx.amount; // Списание
            }
            if (tx.to === user) {
                balance += tx.amount; // Зачисление
            }
        }
        return balance;
    }

    /**
     * Проверка целостности всей цепочки
     */
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentTx = this.chain[i];
            const previousTx = this.chain[i - 1];

            // 1. Проверяем, не были ли изменены данные внутри самой транзакции
            if (currentTx.hash !== currentTx.calculateHash()) {
                console.log(`[Ошибка] Хеш транзакции ${i} не совпадает с её содержимым!`);
                return false;
            }

            // 2. Проверяем, не была ли нарушена связь (указывает ли текущая на правильную предыдущую)
            if (currentTx.previousHash !== previousTx.hash) {
                console.log(`[Ошибка] Нарушена связь между транзакциями ${i-1} и ${i}!`);
                return false;
            }
        }
        return true;
    }
}

// ==========================================
// ДЕМОНСТРАЦИЯ РАБОТЫ
// ==========================================

const myLedger = new Ledger();

console.log("=== 1. Проводим платежи ===");
myLedger.addTransaction('Alice', 'Bob', 50);
myLedger.addTransaction('Bob', 'Charlie', 20);
myLedger.addTransaction('Alice', 'Charlie', 10);

console.log("\n=== 2. Считаем балансы ===");
// У Алисы ушло 50 и 10 = -60
console.log(`Баланс Alice: ${myLedger.getBalance('Alice')}`);
// У Боба пришло 50, ушло 20 = 30
console.log(`Баланс Bob: ${myLedger.getBalance('Bob')}`);
// У Чарли пришло 20 и 10 = 30
console.log(`Баланс Charlie: ${myLedger.getBalance('Charlie')}`);

console.log("\n=== 3. Проверка целостности данных ===");
console.log("Целостна ли история платежей? -> " + (myLedger.isChainValid() ? "Да" : "Нет"));

console.log("\n=== 4. Попытка взлома (изменение исторических данных) ===");
// Злоумышленник пытается изменить сумму во второй транзакции (перевод от Alice к Bob)
console.log("Взломщик меняет сумму в записи...");
myLedger.chain[1].amount = 5000; 

console.log("Целостна ли история платежей после взлома? -> " + (myLedger.isChainValid() ? "Да" : "Нет"));

console.log("\n=== 5. Попытка 'умного' взлома ===");
console.log("Взломщик пересчитывает хеш измененной транзакции...");
// Допустим, злоумышленник пересчитал хеш для своей измененной транзакции
myLedger.chain[1].hash = myLedger.chain[1].calculateHash();

console.log("Целостна ли история платежей теперь? -> " + (myLedger.isChainValid() ? "Да" : "Нет"));
// Целостность все равно будет нарушена, так как следующая транзакция (chain[2]) 
// хранит в previousHash старый (оригинальный) хеш транзакции chain[1]. 
// Чтобы скрыть следы, взломщику придется пересчитывать хеши ВСЕХ последующих транзакций.
