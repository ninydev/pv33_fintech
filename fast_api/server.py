from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from web3 import Web3

app = FastAPI(title="ArtiGame Web3 Backend")

# --- НАСТРОЙКИ WEB3 ---
# Подключаемся к твоей запущенной ноде Hardhat
NODE_URL = "http://127.0.0.1:8545"
w3 = Web3(Web3.HTTPProvider(NODE_URL))

# Проверяем подключение
if not w3.is_connected():
    raise RuntimeError("Не удалось подключиться к локальной ноде Hardhat!")

# !!! ЗАПОЛНИ ЭТИ ДАННЫЕ ПОСЛЕ ДЕПЛОЯ КОНТРАКТА !!!
CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
# Приватный ключ Owner (Account #0 из консоли Hardhat)
OWNER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
OWNER_ADDRESS = w3.eth.account.from_key(OWNER_PRIVATE_KEY).address

# --- ABI КОНТРАКТА ---
# Паспорт твоего смарт-контракта, чтобы Python знал его функции
CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "_blacksmith", "type": "address"}],
        "name": "registerBlacksmith",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_name", "type": "string"},
            {"internalType": "uint256", "name": "_damage", "type": "uint256"},
            {"internalType": "uint256", "name": "_defense", "type": "uint256"},
            {"internalType": "string", "name": "_ipfsHash", "type": "string"},
            {"internalType": "address", "name": "_player", "type": "address"}
        ],
        "name": "craftArtifact",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# Инициализируем объект контракта в Python
contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)


# --- PYDANTIC МОДЕЛИ (ДЛЯ ВАЛИДАЦИИ ENPOINT'ОВ) ---
class BlacksmithRequest(BaseModel):
    blacksmith_address: str


class CraftRequest(BaseModel):
    name: str
    damage: int
    defense: int
    ipfs_hash: str
    player_address: str


# --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОДПИСИ ТРАНЗАКЦИЙ ---
def send_admin_transaction(contract_function):
    """Строит, подписывает ключом Owner и отправляет транзакцию в блокчейн"""
    try:
        # Получаем актуальный nonce для аккаунта Owner
        nonce = w3.eth.get_transaction_count(OWNER_ADDRESS)

        # Строим транзакцию
        tx = contract_function.build_transaction({
            'chainId': 31337,  # ID сети Hardhat
            'gas': 300000,  # Лимит газа
            'gasPrice': w3.eth.gas_price,
            'nonce': nonce,
        })

        # Подписываем транзакцию приватным ключом администратора
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=OWNER_PRIVATE_KEY)

        # Отправляем в сеть
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

        # Ждем подтверждения транзакции в блоке
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        return tx_receipt.transactionHash.hex()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Web3 Error: {str(e)}")


# --- ЭНДПОИНТЫ FastAPI ---

@app.post("/admin/register-blacksmith")
def register_blacksmith(data: BlacksmithRequest):
    """Шаг 1: Сделать игрока кузнецом (Вызывает Owner)"""
    # Валидируем адрес через web3
    if not w3.is_address(data.blacksmith_address):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")

    checksum_address = w3.to_checksum_address(data.blacksmith_address)

    # Готовим вызов функции контракта registerBlacksmith
    contract_func = contract.functions.registerBlacksmith(checksum_address)

    # Отправляем
    tx_hash = send_admin_transaction(contract_func)
    return {"status": "success", "message": f"Address {checksum_address} is now a blacksmith", "tx_hash": tx_hash}


@app.post("/blacksmith/craft")
def craft_item(data: CraftRequest):
    """Шаг 2: Создать предмет и выдать игроку (Пока вызывает Owner от лица системы)"""
    if not w3.is_address(data.player_address):
        raise HTTPException(status_code=400, detail="Invalid player address")

    checksum_player = w3.to_checksum_address(data.player_address)

    # Готовим вызов функции контракта craftArtifact
    contract_func = contract.functions.craftArtifact(
        data.name,
        data.damage,
        data.defense,
        data.ipfs_hash,
        checksum_player
    )

    tx_hash = send_admin_transaction(contract_func)
    return {"status": "success", "message": f"Artifact '{data.name}' successfully crafted for {checksum_player}",
            "tx_hash": tx_hash}