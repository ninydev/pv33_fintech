// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ItStepMkPv33{

    string public name = "ITStep.Mk  Pv 33";
    string public symbol = "ITMKPV";

    mapping (address => uint) public balances;



    uint256 public totalSupply;

    function mint(address _to, uint256 _amount) {
        // TODO - Докинути грошей
    }




    address public owner;

    constructor() {
        owner =msg.sender;
    }


}