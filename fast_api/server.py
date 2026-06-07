from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from web3 import Web3

app = FastAPI(title="ArtiGame Web3 Backend")

# --- НАСТРОЙКИ WEB3 ---
NODE_URL = "http://127.0.0.1:8545"
w3 = Web3(Web3.HTTPProvider(NODE_URL))

if not w3.is_connected():
    raise RuntimeError("Не удалось подключиться к локальной ноде Hardhat!")

CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

OWNER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
OWNER_ADDRESS = w3.eth.account.from_key(OWNER_PRIVATE_KEY).address

#"creator": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"


# --- ABI КОНТРАКТА ---
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
    },
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "artifacts",
        "outputs": [
            {"internalType": "uint256", "name": "id", "type": "uint256"},
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "uint256", "name": "damage", "type": "uint256"},
            {"internalType": "uint256", "name": "defense", "type": "uint256"},
            {"internalType": "string", "name": "ipfsHash", "type": "string"},
            {"internalType": "address", "name": "creator", "type": "address"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "artifactToOwner",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
]

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)


# --- PYDANTIC МОДЕЛИ ---
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
    try:
        nonce = w3.eth.get_transaction_count(OWNER_ADDRESS)

        tx = contract_function.build_transaction({
            'chainId': 31337,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price,
            'nonce': nonce,
        })

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=OWNER_PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        return tx_receipt.transactionHash.hex()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Web3 Error: {str(e)}")


# --- ЭНДПОИНТЫ FastAPI ---

@app.post("/admin/register-blacksmith")
def register_blacksmith(data: BlacksmithRequest):
    if not w3.is_address(data.blacksmith_address):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")

    checksum_address = w3.to_checksum_address(data.blacksmith_address)
    contract_func = contract.functions.registerBlacksmith(checksum_address)
    tx_hash = send_admin_transaction(contract_func)
    
    return {"status": "success", "message": f"Address {checksum_address} is now a blacksmith", "tx_hash": tx_hash}


@app.post("/blacksmith/craft")
def craft_item(data: CraftRequest):
    if not w3.is_address(data.player_address):
        raise HTTPException(status_code=400, detail="Invalid player address")

    checksum_player = w3.to_checksum_address(data.player_address)
    contract_func = contract.functions.craftArtifact(
        data.name,
        data.damage,
        data.defense,
        data.ipfs_hash,
        checksum_player
    )

    tx_hash = send_admin_transaction(contract_func)
    return {"status": "success", "message": f"Artifact '{data.name}' successfully crafted for {checksum_player}", "tx_hash": tx_hash}


@app.get("/artifacts/all")
def get_all_artifacts():
    """
    Получить все предметы в игре
    """
    all_artifacts = []
    artifact_id = 1

    while True:
        try:
            artifact_data = contract.functions.artifacts(artifact_id).call()

            if not artifact_data or artifact_data[0] == 0:
                break
            
            owner_address = contract.functions.artifactToOwner(artifact_id).call()

            all_artifacts.append({
                "id": artifact_data[0],
                "name": artifact_data[1],
                "damage": artifact_data[2],
                "defense": artifact_data[3],
                "ipfs_hash": artifact_data[4],
                "creator": artifact_data[5],
                "owner": owner_address
            })

            artifact_id += 1

        except Exception:
            break

    return {"total": len(all_artifacts), "artifacts": all_artifacts}

@app.get("/artifacts/player/{player_address}")
def get_player_artifacts(player_address: str):
    """
    Получить предметы конкретного игрока
    """
    if not w3.is_address(player_address):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")

    checksum_player = w3.to_checksum_address(player_address)
    
    player_artifacts = []
    artifact_id = 1

    while True:
        try:
            artifact_data = contract.functions.artifacts(artifact_id).call()

            if not artifact_data or artifact_data[0] == 0:
                break

            owner_address = contract.functions.artifactToOwner(artifact_id).call()
            
            if owner_address == checksum_player:
                player_artifacts.append({
                    "id": artifact_data[0],
                    "name": artifact_data[1],
                    "damage": artifact_data[2],
                    "defense": artifact_data[3],
                    "ipfs_hash": artifact_data[4],
                    "creator": artifact_data[5],
                    "owner": owner_address
                })

            artifact_id += 1

        except Exception:
            break

    return {"total": len(player_artifacts), "artifacts": player_artifacts}
