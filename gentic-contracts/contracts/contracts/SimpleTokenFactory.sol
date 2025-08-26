// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimpleTokenFactory is Ownable {
    address public pTokenAddress;
    
    event TokenFactoryCreated(address indexed pTokenAddress);
    
    constructor(address _pTokenAddress) Ownable(msg.sender) {
        require(_pTokenAddress != address(0), "Invalid PToken address");
        pTokenAddress = _pTokenAddress;
        emit TokenFactoryCreated(_pTokenAddress);
    }
    
    // Basic function to verify the factory is working
    function getPTokenAddress() external view returns (address) {
        return pTokenAddress;
    }
    
    // Function to check if PToken is valid
    function isPTokenValid() external view returns (bool) {
        try IERC20(pTokenAddress).totalSupply() returns (uint256) {
            return true;
        } catch {
            return false;
        }
    }
}
