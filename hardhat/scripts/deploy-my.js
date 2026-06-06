import { ethers } from "hardhat";

async function main() {
    // Получаем фабрику нашего контракта ArtiGame
    const ArtiGame = await ethers.getContractFactory("ArtiGame");

    console.log("Деплоим контракт ArtiGame...");
    const contract = await ArtiGame.deploy();

    // Ждем окончания деплоя (в новых версиях Hardhat)
    await contract.waitForDeployment();

    // Получаем адрес контракта
    const contractAddress = await contract.getAddress();

    console.log("====================================================");
    console.log("Контракт успешно развернут!");
    console.log("АДРЕС КОНТРАКТА:", contractAddress);
    console.log("====================================================");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});