const crypto = require('crypto');

/**
 * ШАГ 2: СВЯЗЫВАНИЕ ТРАНЗАКЦИЙ (Криптографическая целостность)
 * 
 * ИДЕЯ: 
 * Мы хотим, чтобы исторические данные нельзя было незаметно изменить.
 * Для этого мы используем алгоритм хеширования (например, SHA-256).
 * Хеш — это уникальная "цифровая подпись" данных фиксированной длины. 
 * Если изменить хоть один символ в исходных данных, хеш изменится кардинально.
 * 
 * АЛГОРИТМ СВЯЗЫВАНИЯ:
 * 1. Каждая транзакция при создании берет все свои данные (кто, кому, сколько, когда) 
 *    и прогоняет их через хеш-функцию, получая свой уникальный идентификатор (свой hash).
 * 2. ГЛАВНЫЙ СЕКРЕТ: В данные текущей транзакции обязательно включается 
 *    хеш ПРЕДЫДУЩЕЙ транзакции (previousHash).
 * 3. Образуется непрерывная цепочка (chain): 
 *    Блок 1 <- Блок 2 <- Блок 3 <- Блок 4.
 * 
 * Если злоумышленник изменит Блок 2, его собственный хеш изменится.
 * Значит, Блок 3, который хранит старый хеш Блока 2 в поле previousHash, 
 * больше не будет ссылаться на правильные данные, и цепочка "порвется".
 */

class Transaction {
    constructor(id, from, to, amount, previousHash = '') {
        this.id = id;
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.timestamp = new Date().toISOString();
        
        // Связь с прошлым: мы сохраняем хеш предыдущей записи
        this.previousHash = previousHash;
        
        // Вычисляем собственный хеш на момент создания
        this.hash = this.calculateHash();
    }

    /**
     * Вычисление "цифрового отпечатка" (хеша) транзакции.
     */
    calculateHash() {
        // Собираем все критически важные данные в одну строку, ВКЛЮЧАЯ previousHash
        const dataToHash = this.id + this.from + this.to + this.amount + this.timestamp + this.previousHash;
        return crypto.createHash('sha256').update(dataToHash).digest('hex');
    }
}

class SecureBankDatabase {
    constructor() {
        this.transactions = [];
        this.transactionCounter = 1;
        
        // Создаем самую первую (нулевую) запись, чтобы было от чего строить цепь
        const genesisTx = new Transaction(0, 'SYSTEM', 'SYSTEM', 0, '0');
        this.transactions.push(genesisTx);
    }

    /**
     * Получить последнюю добавленную транзакцию
     */
    getLatestTransaction() {
        return this.transactions[this.transactions.length - 1];
    }

    /**
     * Создание новой транзакции с жесткой привязкой к предыдущей
     */
    transfer(from, to, amount) {
        const previousTx = this.getLatestTransaction();
        
        // Передаем хеш предыдущей записи в новую
        const tx = new Transaction(
            this.transactionCounter++, 
            from, 
            to, 
            amount, 
            previousTx.hash
        );
        
        this.transactions.push(tx);
        console.log(`[Банк] Успешный перевод: ${amount} от ${from} к ${to}`);
    }

    /**
     * АУДИТ: Проверка целостности всей базы данных
     */
    isDataIntact() {
        // Начинаем проверку со второй записи (индекс 1), так как нулевая - системная
        for (let i = 1; i < this.transactions.length; i++) {
            const currentTx = this.transactions[i];
            const previousTx = this.transactions[i - 1];

            // Проверка 1: Не изменили ли данные ВНУТРИ самой записи?
            // Сравниваем заявленный хеш с заново вычисленным хешем на основе текущих данных.
            if (currentTx.hash !== currentTx.calculateHash()) {
                console.error(`❌ ВЗЛОМ ОБНАРУЖЕН: Данные транзакции ID ${currentTx.id} были изменены!`);
                return false;
            }

            // Проверка 2: Не разорвана ли ЦЕПОЧКА?
            // Сравниваем поле previousHash текущей записи с фактическим хешем предыдущей.
            if (currentTx.previousHash !== previousTx.hash) {
                console.error(`❌ ВЗЛОМ ОБНАРУЖЕН: Разорвана связь между транзакциями ID ${previousTx.id} и ${currentTx.id}!`);
                return false;
            }
        }
        
        console.log("✅ База данных в целостности. Изменений не найдено.");
        return true;
    }
}

// ==========================================
// ДЕМОНСТРАЦИЯ: КАК ХЕШИ ЗАЩИЩАЮТ ИНФОРМАЦИЮ
// ==========================================

const bank = new SecureBankDatabase();

console.log("=== 1. Проводим платежи (формируем цепочку) ===");
bank.transfer('SYSTEM', 'Alice', 1000); // tx id 1
bank.transfer('SYSTEM', 'Bob', 500);    // tx id 2
bank.transfer('Alice', 'Bob', 200);     // tx id 3
bank.transfer('Bob', 'Charlie', 50);    // tx id 4

console.log("\n=== 2. Проводим аудит базы данных ===");
bank.isDataIntact(); // Должно быть всё ОК

console.log("\n=== 3. ПОПЫТКА ПРОСТОГО ВЗЛОМА ===");
console.log("Хакер (админ) меняет сумму в транзакции ID 3 (Алиса -> Боб) с 200 на 5000...");
bank.transactions[3].amount = 5000;

console.log("Проверяем базу после вмешательства:");
bank.isDataIntact(); // Выявит взлом на проверке 1 (несовпадение хеша самой записи)

console.log("\n=== 4. ПОПЫТКА УМНОГО ВЗЛОМА (Прячем следы) ===");
console.log("Хакер понимает, что хеш не сходится, и пересчитывает хеш измененной транзакции ID 3...");
// Хакер генерирует новый правильный хеш для измененных данных
bank.transactions[3].hash = bank.transactions[3].calculateHash();

console.log("Проверяем базу после 'умного' вмешательства:");
bank.isDataIntact(); 
// Выявит взлом на проверке 2, так как транзакция ID 4 всё ещё ссылается на СТАРЫЙ хеш транзакции ID 3.

console.log("\n=== 5. ПРОБЛЕМА ЦЕНТРАЛИЗАЦИИ (ПОДХОД К WEB3.0) ===");
console.log("Чтобы скрыть изменение транзакции ID 3 полностью, хакеру придется пересчитать хеши ВСЕХ последующих транзакций (ID 4, 5, 6...).");
console.log("Но если вся эта база данных хранится НА ОДНОМ СЕРВЕРЕ (Web 2.0), хакер с правами доступа может написать скрипт,");
console.log("который за миллисекунду пересчитает всю цепочку до самого конца.");
console.log("ВЫВОД: Сама по себе криптография не спасает, если данные находятся в одних руках.");
console.log("Нам нужно, чтобы копии этой цепочки хранились у независимых людей, чтобы мы могли сверить их между собой (Децентрализация).");
