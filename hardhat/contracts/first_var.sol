// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

contract  ArtiGame {

    struct Artifact {
        uint256 id;          // Уникальный ID предмета
        string name;         // Название (например, "Меч Тысячи Истин")
        uint256 damage;      // Боевой параметр: Сила атаки
        uint256 defense;     // Боевой параметр: Защита
        string ipfsHash;     // Ссылка на картинку предмета
        address creator;     // Кем был скрафчен предмет
    }

    address public owner; // Творец ігри

    mapping (uint256 => Artifact) public artifacts; // All Items
    mapping(uint256 => address) public artifactToOwner; // ID предмета => Адрес текущего владельца
    // Внутренний счетчик для генерации уникальных ID (инкремент)
    uint256 private _nextArtifactId = 1;

    constructor() {
        owner = msg.sender;
    }

    // Модификатор: только создатель игры (owner) может пройти дальше
    modifier onlyOwner() {
        require(msg.sender == owner, "ArtiGame: Only owner can call this");
        _; // Указывает Solidity продолжить выполнение функции, к которой применен модификатор
    }
    // Модификатор: крафтить могут только утвержденные кузнецы или сам создатель
    modifier onlyBlacksmith() {
        require(blacksmiths[msg.sender] || msg.sender == owner, "ArtiGame: Only blacksmith or owner can craft");
        _;
    }
 // Модификатор: может только владелец артифакта
    modifier onlyArtifactOwner(uint256 _artifactId) {
        require(artifactToOwner[_artifactId] == msg.sender, "ArtiGame: You do not own this artifact");
        _;
    }

    mapping(address => bool) public blacksmiths;

    function registerBlacksmith(address _blacksmith) external onlyOwner {
        require(_blacksmith != address(0), "ArtiGame: Invalid address");
        require(!blacksmiths[_blacksmith], "ArtyGame: Already");
        blacksmiths[_blacksmith] = true;
    }


    /**
    * @notice Создание (минт) нового уникального предмета во вселенной игры
    * @param _name Название артефакта (например, "Меч Тысячи Истин")
    * @param _damage Сила атаки
    * @param _defense Показатель защиты
    * @param _ipfsHash Ссылка на картинку/метаданные предмета в IPFS
    * @param _player Кому в инвентарь положить этот предмет сразу после создания
    */
    function craftArtifact(
        string calldata _name,
        uint256 _damage,
        uint256 _defense,
        string calldata _ipfsHash,
        address _player
    ) external onlyBlacksmith returns (uint256) {
        require(_player != address(0), "ArtiGame: Cannot craft to zero address");

        // 1. Берем текущий свободный ID
        uint256 currentId = _nextArtifactId;
        
        // 2. Увеличиваем счетчик для следующего предмета
        _nextArtifactId++;

        // 3. Записываем структуру предмета в глобальный реестр (artifacts)
        artifacts[currentId] = Artifact({
            id: currentId,
            name: _name,
            damage: _damage,
            defense: _defense,
            ipfsHash: _ipfsHash,
            creator: msg.sender // Фиксируем, какой именно кузнец его создал
        });

        // 4. Привязываем предмет к инвентарю игрока
        artifactToOwner[currentId] = _player;

        return currentId; // Возвращаем ID созданной вещи
    }


    /**
    * @notice Безопасная передача предмета другому игроку (Трейд / Подарок)
    * @param _to Адрес кошелька получателя
    * @param _artifactId Уникальный ID передаваемого предмета
    */
    function transferArtifact(address _to, uint256 _artifactId) external onlyArtifactOwner(_artifactId) {
        require(_to != address(0), "ArtiGame: Cannot transfer to zero address");
        require(_to != msg.sender, "ArtiGame: Cannot transfer to yourself");

        // Меняем владельца предмета в нашей базе данных инвентарей
        artifactToOwner[_artifactId] = _to;
    }


    mapping(uint256 => uint256) public artifactPrices;

    /**
    * @notice Выставить предмет на продажу за фиксированную цену
    * @param _artifactId ID артефакта
    * @param _price Цена предмета в wei (например, 1000000000000000000 wei = 1 ETH)
    */
    function addForSale(uint256 _artifactId, uint256 _price) external onlyArtifactOwner(_artifactId) {
        require(_price > 0, "ArtiGame: Price must be greater than 0");
        
        // Записываем цену в нашу базу данных цен
        artifactPrices[_artifactId] = _price;
    }

    /**
    * @notice Купить предмет, выставленный на продажу
    * @param _artifactId ID покупаемого артефакта
    */
    function buyArtifact(uint256 _artifactId) external payable {
        uint256 price = artifactPrices[_artifactId];
        
        // Проверки (вышибалы)
        require(price > 0, "ArtiGame: This item is not for sale");
        require(msg.value == price, "ArtiGame: Incorrect ETH amount sent");
        
        // Находим текущего продавца (владельца) предмета
        address seller = artifactToOwner[_artifactId];
        require(msg.sender != seller, "ArtiGame: You cannot buy your own item");

        // ЛОГИКА СДЕЛКИ:
        // 1. Обнуляем цену в базе (предмет больше не продается)
        artifactPrices[_artifactId] = 0;

        // 2. Переписываем владельца на покупателя (msg.sender)
        artifactToOwner[_artifactId] = msg.sender;

        // 3. Отправляем деньги продавцу
        // Используем low-level call, при этом адрес продавца принудительно делаем payable
        (bool success, ) = payable(seller).call{value: price}("");
        require(success, "ArtiGame: Failed to send ETH to seller");
    }

}