const crypto = require('crypto');

/**
 * ШАГ 3: РАСПРЕДЕЛЕННЫЕ БАЗЫ (Переход к Web 3.0 / Децентрализации)
 * 
 * ИДЕЯ: 
 * Как мы выяснили на Шаге 2, хеши и цепочки блоков сами по себе не спасают,
 * если вся база хранится в одном месте (на одном сервере / в одном отделении банка).
 * Хакер может просто пересчитать все хеши до конца.
 * 
 * РЕШЕНИЕ:
 * Мы делаем базу РАСПРЕДЕЛЕННОЙ (Distributed Ledger). 
 * Копии одной и той же цепочки хранятся в независимых местах (Нодах/Узлах).
 * В нашем примере это "Отделение А" и "Отделение Б".
 * Когда происходит новая транзакция, она записывается в оба отделения.
 * 
 * КОНСЕНСУС:
 * Если хакер взломает "Отделение А" и полностью перепишет там историю с новыми хешами,
 * мы сможем выявить подделку, просто сравнив последнюю запись (или всю цепь) 
 * с независимой копией из "Отделения Б".
 */

class Transaction {
    constructor(id, from, to, amount, previousHash = '') {
        this.id = id;
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.timestamp = "2026-05-18T10:00:00.000Z"; // Фиксируем время для идентичности в примере
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        const dataToHash = this.id + this.from + this.to + this.amount + this.timestamp + this.previousHash;
        return crypto.createHash('sha256').update(dataToHash).digest('hex');
    }
}

class NodeDatabase {
    constructor(nodeName) {
        this.name = nodeName;
        this.transactions = [];
        this.transactionCounter = 1;
        
        // Генезис-блок
        const genesisTx = new Transaction(0, 'SYSTEM', 'SYSTEM', 0, '0');
        this.transactions.push(genesisTx);
    }

    getLatestTransaction() {
        return this.transactions[this.transactions.length - 1];
    }

    // Метод добавления (без вывода в консоль, чтобы не засорять эфир)
    addTransactionLocally(from, to, amount) {
        const previousTx = this.getLatestTransaction();
        const tx = new Transaction(this.transactionCounter++, from, to, amount, previousTx.hash);
        this.transactions.push(tx);
    }

    isDataIntact() {
        for (let i = 1; i < this.transactions.length; i++) {
            const currentTx = this.transactions[i];
            const previousTx = this.transactions[i - 1];

            if (currentTx.hash !== currentTx.calculateHash()) return false;
            if (currentTx.previousHash !== previousTx.hash) return false;
        }
        return true;
    }
}

// Эмуляция сети: центральный распределитель, который рассылает транзакции по всем узлам
class DistributedNetwork {
    constructor() {
        this.nodes = [];
    }

    addNode(node) {
        this.nodes.push(node);
    }

    // Рассылка транзакции всем узлам сети одновременно
    broadcastTransfer(from, to, amount) {
        for (const node of this.nodes) {
            node.addTransactionLocally(from, to, amount);
        }
        console.log(`[Сеть] Транзакция '${amount} от ${from} к ${to}' добавлена во все отделения.`);
    }

    // Сравнение версий между узлами (простейший консенсус)
    verifyConsensus() {
        console.log("\n[Проверка сети] Сверяем версии баз данных...");
        const referenceHash = this.nodes[0].getLatestTransaction().hash;
        let isConsensusReached = true;

        for (const node of this.nodes) {
            const nodeHash = node.getLatestTransaction().hash;
            if (nodeHash !== referenceHash) {
                console.error(`❌ Внимание! Рассинхронизация на узле '${node.name}'. Хеш последнего блока не совпадает с остальной сетью!`);
                isConsensusReached = false;
            } else {
                console.log(`✅ Узел '${node.name}': Синхронизирован.`);
            }
        }
        return isConsensusReached;
    }
}

// ==========================================
// ДЕМОНСТРАЦИЯ: ДЕЦЕНТРАЛИЗАЦИЯ И ЗАЩИТА
// ==========================================

// Создаем два независимых отделения (узла)
const nodeA = new NodeDatabase('Отделение А (Нью-Йорк)');
const nodeB = new NodeDatabase('Отделение Б (Лондон)');

// Подключаем их к единой "сети"
const network = new DistributedNetwork();
network.addNode(nodeA);
network.addNode(nodeB);

console.log("=== 1. Проводим платежи (Синхронно в обоих отделениях) ===");
network.broadcastTransfer('SYSTEM', 'Alice', 1000);
network.broadcastTransfer('SYSTEM', 'Bob', 500);
network.broadcastTransfer('Alice', 'Bob', 200);   // Транзакция ID 3

console.log("\n=== 2. Проверяем консенсус (сходимость) сети ===");
network.verifyConsensus();

console.log("\n=== 3. СУПЕР-ВЗЛОМ ОТДЕЛЕНИЯ 'А' ===");
console.log("Хакер проникает в сервер Отделения 'А'.");
console.log("Он меняет транзакцию ID 3, И ПЕРЕСЧИТЫВАЕТ все хеши до конца базы Отделения А!");

// Хакер меняет данные в Отделении А
nodeA.transactions[3].amount = 5000;
// Хакер "грамотно" пересчитывает хеш самой транзакции 3
nodeA.transactions[3].hash = nodeA.transactions[3].calculateHash();

// Хакер пишет скрипт, чтобы пересчитать все ПОСЛЕДУЮЩИЕ транзакции, чтобы база казалась целой
for (let i = 4; i < nodeA.transactions.length; i++) {
    nodeA.transactions[i].previousHash = nodeA.transactions[i - 1].hash;
    nodeA.transactions[i].hash = nodeA.transactions[i].calculateHash();
}

console.log("\nПроверяем ВНУТРЕННЮЮ целостность Отделения 'А' (как на Шаге 2):");
if (nodeA.isDataIntact()) {
    console.log("⚠️ Локальная база Отделения 'А' сообщает, что она ИДЕАЛЬНА! (Взлом скрыт локально)");
}

console.log("\n=== 4. ВЫЯВЛЕНИЕ ВЗЛОМА ЧЕРЕЗ ДЕЦЕНТРАЛИЗАЦИЮ ===");
console.log("Клиент пытается запросить баланс или провести новую операцию.");
console.log("Сеть сверяет состояния узлов перед работой...");

// Сеть обнаружит взлом, потому что финальный хеш в Отделении А теперь кардинально 
// отличается от финального хеша в нетронутом Отделении Б.
const isSecure = network.verifyConsensus();

if (!isSecure) {
    console.log("\n🚨 СИСТЕМА ЗАЩИТЫ: Обнаружена подделка в одном из отделений!");
    console.log("В реальном Web 3.0 (Блокчейне) сеть отклонила бы версию Отделения А,");
    console.log("и принудительно перезаписала бы её 'правильной' версией из Отделения Б (правило большинства).");
}
