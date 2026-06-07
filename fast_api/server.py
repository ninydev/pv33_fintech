from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from web3 import Web3

app = FastAPI(title="ArtiGame Web3 Backend")

# --- НАСТРОЙКИ WEB3 ---
NODE_URL = "http://127.0.0.1:8545"
w3 = Web3(Web3.HTTPProvider(NODE_URL))

if not w3.is_connected():
    raise RuntimeError("Не вдалося підключитися до локальної ноди Hardhat!")

CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
ADMIN_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ADMIN_ADDRESS = w3.eth.account.from_key(ADMIN_PRIVATE_KEY).address

# --- ABI КОНТРАКТА ---
# Повний "паспорт" вашого смарт-контракту, щоб Python знав усі його функції
CONTRACT_ABI = [
    {"inputs": [{"internalType": "address", "name": "_blacksmith", "type": "address"}], "name": "registerBlacksmith", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"internalType": "string", "name": "_name", "type": "string"}, {"internalType": "uint256", "name": "_damage", "type": "uint256"}, {"internalType": "uint256", "name": "_defense", "type": "uint256"}, {"internalType": "string", "name": "_ipfsHash", "type": "string"}, {"internalType": "address", "name": "_player", "type": "address"}], "name": "craftArtifact", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "name": "artifacts", "outputs": [{"internalType": "uint256", "name": "id", "type": "uint256"}, {"internalType": "string", "name": "name", "type": "string"}, {"internalType": "uint256", "name": "damage", "type": "uint256"}, {"internalType": "uint256", "name": "defense", "type": "uint256"}, {"internalType": "string", "name": "ipfsHash", "type": "string"}, {"internalType": "address", "name": "creator", "type": "address"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "name": "artifactToOwner", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"internalType": "address", "name": "_to", "type": "address"}, {"internalType": "uint256", "name": "_artifactId", "type": "uint256"}], "name": "transferArtifact", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"internalType": "uint256", "name": "_artifactId", "type": "uint256"}, {"internalType": "uint256", "name": "_price", "type": "uint256"}], "name": "addForSale", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [{"internalType": "uint256", "name": "_artifactId", "type": "uint256"}], "name": "buyArtifact", "outputs": [], "stateMutability": "payable", "type": "function"},
    {"inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "name": "artifactPrices", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}
]

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)


# --- PYDANTIC МОДЕЛІ ---
class BlacksmithRequest(BaseModel):
    blacksmith_address: str

class CraftRequest(BaseModel):
    name: str
    damage: int
    defense: int
    ipfs_hash: str
    player_address: str

# --- Моделі для дій гравця ---
class PlayerActionBase(BaseModel):
    # УВАГА: Передавати приватний ключ в запиті - вкрай небезпечно!
    # Це зроблено лише для демонстрації в локальному середовищі Hardhat.
    # У реальному проекті підпис транзакцій має відбуватися на клієнті.
    private_key: str = Field(..., description="Приватний ключ гравця (НЕБЕЗПЕЧНО!)")

class TransferRequest(PlayerActionBase):
    artifact_id: int
    to_address: str

class AddForSaleRequest(PlayerActionBase):
    artifact_id: int
    price_wei: int = Field(..., description="Ціна в wei (1 ETH = 1,000,000,000,000,000,000 wei)")

class BuyRequest(PlayerActionBase):
    artifact_id: int
    # Сума, яку відправляє покупець, буде взята з `msg.value` в контракті,
    # тому її потрібно передати в самій транзакції, а не в параметрах функції.


# --- УНІВЕРСАЛЬНА ФУНКЦІЯ ДЛЯ ВІДПРАВКИ ТРАНЗАКЦІЙ ---
def send_transaction(contract_function, user_private_key: str, value_wei: int = 0):
    """
    Універсальна функція, що будує, підписує та відправляє транзакцію від імені будь-якого користувача.
    """
    try:
        user_address = w3.eth.account.from_key(user_private_key).address
        nonce = w3.eth.get_transaction_count(user_address)

        tx_params = {
            'chainId': 31337,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price,
            'nonce': nonce,
        }
        if value_wei > 0:
            tx_params['value'] = value_wei

        transaction = contract_function.build_transaction(tx_params)
        signed_tx = w3.eth.account.sign_transaction(transaction, private_key=user_private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return tx_receipt.transactionHash.hex()
    except Exception as e:
        # Спроба "розшифрувати" помилку контракту
        try:
            # Revert-повідомлення часто знаходяться в `e.args[0]['message']`
            error_message = e.args[0].get('message', str(e))
        except (IndexError, KeyError, AttributeError):
            error_message = str(e)
        raise HTTPException(status_code=500, detail=f"Web3 Error: {error_message}")


# --- АДМІН-ПАНЕЛЬ ---
@app.post("/admin/register-blacksmith")
def register_blacksmith(data: BlacksmithRequest):
    """(Адмін) Реєструє нового коваля, який може створювати предмети."""
    if not w3.is_address(data.blacksmith_address):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")
    
    checksum_address = w3.to_checksum_address(data.blacksmith_address)
    contract_func = contract.functions.registerBlacksmith(checksum_address)
    # Адмінські дії підписуються ключем адміністратора
    tx_hash = send_transaction(contract_func, ADMIN_PRIVATE_KEY)
    
    return {"status": "success", "message": f"Address {checksum_address} is now a blacksmith", "tx_hash": tx_hash}

@app.post("/blacksmith/craft")
def craft_item(data: CraftRequest):
    """(Коваль) Створює новий предмет і видає його гравцеві."""
    if not w3.is_address(data.player_address):
        raise HTTPException(status_code=400, detail="Invalid player address")

    checksum_player = w3.to_checksum_address(data.player_address)
    contract_func = contract.functions.craftArtifact(data.name, data.damage, data.defense, data.ipfs_hash, checksum_player)
    # За замовчуванням, предмети створює адмін (як системний коваль)
    tx_hash = send_transaction(contract_func, ADMIN_PRIVATE_KEY)
    return {"status": "success", "message": f"Artifact '{data.name}' successfully crafted for {checksum_player}", "tx_hash": tx_hash}


# --- МЕТОДИ ДЛЯ ЧИТАННЯ ДАНИХ (view) ---
@app.get("/artifacts/all")
def get_all_artifacts():
    """Отримати абсолютно всі предмети, що існують у грі."""
    all_artifacts = []
    artifact_id = 1
    while True:
        try:
            artifact_data = contract.functions.artifacts(artifact_id).call()
            if not artifact_data or artifact_data[0] == 0: break

            owner_address = contract.functions.artifactToOwner(artifact_id).call()
            price = contract.functions.artifactPrices(artifact_id).call()

            all_artifacts.append({
                "id": artifact_data[0], "name": artifact_data[1], "damage": artifact_data[2],
                "defense": artifact_data[3], "ipfs_hash": artifact_data[4], "creator": artifact_data[5],
                "owner": owner_address, "price_wei": price
            })
            artifact_id += 1
        except Exception: break
    return {"total": len(all_artifacts), "artifacts": all_artifacts}

@app.get("/artifacts/player/{player_address}")
def get_player_artifacts(player_address: str):
    """Отримати всі предмети, що належать конкретному гравцеві."""
    if not w3.is_address(player_address):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")

    checksum_player = w3.to_checksum_address(player_address)
    player_artifacts = []
    artifact_id = 1
    while True:
        try:
            artifact_data = contract.functions.artifacts(artifact_id).call()
            if not artifact_data or artifact_data[0] == 0: break

            owner_address = contract.functions.artifactToOwner(artifact_id).call()
            if owner_address == checksum_player:
                price = contract.functions.artifactPrices(artifact_id).call()
                player_artifacts.append({
                    "id": artifact_data[0], "name": artifact_data[1], "damage": artifact_data[2],
                    "defense": artifact_data[3], "ipfs_hash": artifact_data[4], "creator": artifact_data[5],
                    "owner": owner_address, "price_wei": price
                })
            artifact_id += 1
        except Exception: break
    return {"total": len(player_artifacts), "artifacts": player_artifacts}


# --- МЕТОДИ ДЛЯ ДІЙ ГРАВЦІВ (транзакції) ---

@app.post("/player/transfer")
def transfer_artifact_endpoint(data: TransferRequest):
    """
    (Гравець) Передає свій предмет іншому гравцеві.
    Вимагає приватний ключ поточного власника предмета для підпису.
    """
    if not w3.is_address(data.to_address):
        raise HTTPException(status_code=400, detail="Invalid 'to' address")
    
    checksum_to = w3.to_checksum_address(data.to_address)
    contract_func = contract.functions.transferArtifact(checksum_to, data.artifact_id)
    
    tx_hash = send_transaction(contract_func, data.private_key)
    return {"status": "success", "message": f"Artifact {data.artifact_id} transferred to {checksum_to}", "tx_hash": tx_hash}

@app.post("/player/add-for-sale")
def add_for_sale_endpoint(data: AddForSaleRequest):
    """
    (Гравець) Виставляє свій предмет на продаж за вказану ціну в wei.
    Вимагає приватний ключ поточного власника предмета для підпису.
    """
    if data.price_wei <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than 0")

    contract_func = contract.functions.addForSale(data.artifact_id, data.price_wei)
    
    tx_hash = send_transaction(contract_func, data.private_key)
    return {"status": "success", "message": f"Artifact {data.artifact_id} is now for sale at {data.price_wei} wei", "tx_hash": tx_hash}

@app.post("/player/buy")
def buy_artifact_endpoint(data: BuyRequest):
    """
    (Гравець) Купує предмет, виставлений на продаж.
    Вимагає приватний ключ покупця для підпису.
    Сума для оплати (в wei) передається в самій транзакції.
    """
    # Дізнаємося ціну, щоб передати її в `value` транзакції
    price_wei = contract.functions.artifactPrices(data.artifact_id).call()
    if price_wei == 0:
        raise HTTPException(status_code=400, detail="This item is not for sale")

    contract_func = contract.functions.buyArtifact(data.artifact_id)
    
    # `value_wei` - це сума в wei, яку ми прикріплюємо до транзакції для payable функції
    tx_hash = send_transaction(contract_func, data.private_key, value_wei=price_wei)
    return {"status": "success", "message": f"Artifact {data.artifact_id} bought successfully", "tx_hash": tx_hash}
