/**
 * ТРАДИЦИОННАЯ СИСТЕМА (Web 2.0 / Классические базы данных)
 * 
 * В этом примере мы не используем криптографию и хеши.
 * Данные просто записываются в массив (аналог таблицы в базе данных).
 * Если кто-то получит доступ к базе, он сможет незаметно изменить любую запись.
 */

// Класс, описывающий один платеж (транзакцию)
class Transaction {
    constructor(id, from, to, amount) {
        this.id = id;               // Уникальный номер транзакции (например, автоинкремент в БД)
        this.from = from;           // Отправитель (номер счета или имя)
        this.to = to;               // Получатель
        this.amount = amount;       // Сумма перевода
        this.timestamp = new Date(); // Время проведения платежа
    }
}

// Класс Банка (или процессингового центра), который хранит историю всех платежей
class BankDatabase {
    constructor() {
        this.transactions = []; // "Таблица" с историей всех переводов
        this.transactionCounter = 1;
    }

    /**
     * Создание новой транзакции (перевод денег)
     */
    transfer(from, to, amount) {
        const tx = new Transaction(this.transactionCounter++, from, to, amount);
        this.transactions.push(tx);
        console.log(`[Банк] Успешный перевод: ${amount} от ${from} к ${to}`);
    }

    /**
     * Получить все транзакции по конкретному счету (пользователю)
     */
    getTransactionsByAccount(accountName) {
        // Ищем все записи, где пользователь выступает либо отправителем, либо получателем
        return this.transactions.filter(tx => tx.from === accountName || tx.to === accountName);
    }

    /**
     * Вычисление текущего баланса пользователя
     * Считается на лету, проходясь по всей истории (так работают многие реальные банковские системы)
     */
    getBalance(accountName) {
        let balance = 0;
        const accountTransactions = this.getTransactionsByAccount(accountName);

        for (const tx of accountTransactions) {
            if (tx.to === accountName) {
                balance += tx.amount; // Если деньги пришли - прибавляем
            }
            if (tx.from === accountName) {
                balance -= tx.amount; // Если деньги ушли - отнимаем
            }
        }
        return balance;
    }
}

// ==========================================
// ДЕМОНСТРАЦИЯ РАБОТЫ ТРАДИЦИОННОЙ СИСТЕМЫ
// ==========================================

const bank = new BankDatabase();

// Изначально можно представить, что система начисляет пользователям стартовый капитал
console.log("=== 1. Проводим начальные платежи (пополнение) ===");
bank.transfer('SYSTEM', 'Alice', 1000); // Алиса внесла 1000 наличными
bank.transfer('SYSTEM', 'Bob', 500);    // Боб внес 500 наличными

console.log("\n=== 2. Пользователи делают переводы друг другу ===");
bank.transfer('Alice', 'Bob', 200);     // Алиса перевела Бобу 200
bank.transfer('Bob', 'Charlie', 300);   // Боб перевел Чарли 300
bank.transfer('Alice', 'Charlie', 50);  // Алиса перевела Чарли 50

console.log("\n=== 3. Вывод транзакций по счету Алисы ===");
const aliceHistory = bank.getTransactionsByAccount('Alice');
console.table(aliceHistory);

console.log("\n=== 4. Вывод баланса пользователей ===");
console.log(`Баланс Алисы: ${bank.getBalance('Alice')}`);     // 1000 - 200 - 50 = 750
console.log(`Баланс Боба: ${bank.getBalance('Bob')}`);         // 500 + 200 - 300 = 400
console.log(`Баланс Чарли: ${bank.getBalance('Charlie')}`);   // 0 + 300 + 50 = 350

console.log("\n=== 5. ГЛАВНАЯ ПРОБЛЕМА (Уязвимость к изменению) ===");
console.log("Допустим, системный администратор БД (или хакер) решил помочь Бобу и меняет старую запись в базе...");

// Прямой доступ к "базе данных"
bank.transactions[2].amount = 5000; // Вместо 200 от Алисы Бобу, ставит 5000

console.log("\nСмотрим новые балансы после взлома:");
console.log(`Баланс Алисы (жертва): ${bank.getBalance('Alice')}`); // Ушла в дикий минус!
console.log(`Баланс Боба (взломщик): ${bank.getBalance('Bob')}`);   // Озолотился!

console.log("\n[!] Система даже не поняла, что данные были подменены, так как записи между собой никак не связаны.");
