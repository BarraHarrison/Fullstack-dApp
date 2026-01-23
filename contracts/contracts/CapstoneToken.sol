// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CapstoneToken
 * @author Barra Harrison
 * @notice ERC-20 token used in the Week 12 fullstack dApp capstone
 *
 * This contract is intentionally simple and audit-friendly.
 * It will be interacted with by:
 *  - a React frontend
 *  - a Node/Express backend
 *
 * Backend services will index events emitted from this contract.
 */
contract CapstoneToken is ERC20, Ownable {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }
}