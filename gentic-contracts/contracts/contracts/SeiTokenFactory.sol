// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Simple ERC20 token for meme tokens
contract MemeToken is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address creator
    ) ERC20(name, symbol) Ownable(creator) {
        _mint(creator, initialSupply);
    }
    
    function mint(uint256 amount, address to) public onlyOwner {
        _mint(to, amount);
    }
    
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}

contract SeiTokenFactory is Ownable {
    struct TokenInfo {
        string name;
        string symbol;
        string description;
        string tokenImageUrl;
        uint256 fundingRaised;
        address tokenAddress;
        address creatorAddress;
        uint256 createdAt;
        // Token metrics
        uint256 tokenHolders;
        uint256 volume24h;
        uint256 circulatingSupply;
        uint256 totalSupply;
        uint256 marketCap;
        uint256 currentPrice;
    }

    address[] public memeTokenAddresses;
    mapping(address => TokenInfo) public addressToTokenMapping;
    
    // Platform fee in SEI (0.1 SEI = 100000000000000000 wei)
    uint256 public constant CREATION_FEE = 0.1 ether;
    
    // Token creation parameters
    uint256 constant DECIMALS = 10 ** 18;
    uint256 constant INITIAL_SUPPLY = 1000000 * DECIMALS; // 1M tokens

    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 timestamp
    );
    
    event TokensPurchased(
        address indexed buyer,
        address indexed tokenAddress,
        uint256 amount,
        uint256 seiPaid
    );

    constructor() Ownable(msg.sender) {}

    function createMemeToken(
        string memory name,
        string memory symbol,
        string memory imageUrl,
        string memory description
    ) public payable returns (address) {
        require(msg.value >= CREATION_FEE, "Insufficient SEI for creation fee");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");

        // Create new meme token
        MemeToken newToken = new MemeToken(name, symbol, INITIAL_SUPPLY, msg.sender);
        address tokenAddress = address(newToken);
        
        // Store token info with dummy metrics
        TokenInfo memory newTokenInfo = TokenInfo({
            name: name,
            symbol: symbol,
            description: description,
            tokenImageUrl: imageUrl,
            fundingRaised: 0,
            tokenAddress: tokenAddress,
            creatorAddress: msg.sender,
            createdAt: block.timestamp,
            // Initialize with dummy metrics
            tokenHolders: 800,
            volume24h: 8000 * 10**18, // $8000 in wei
            circulatingSupply: 1200000 * 10**18, // 1.2M tokens
            totalSupply: 10000000 * 10**18, // 10M tokens
            marketCap: 300000 * 10**18, // $300,000 in wei
            currentPrice: 25 * 10**16 // $0.25 in wei (25 * 10^16 = 0.25 * 10^18)
        });
        
        memeTokenAddresses.push(tokenAddress);
        addressToTokenMapping[tokenAddress] = newTokenInfo;
        
        emit TokenCreated(tokenAddress, msg.sender, name, symbol, block.timestamp);
        
        return tokenAddress;
    }

    function buyMemeToken(address tokenAddress, uint256 tokenAmount) public payable {
        require(addressToTokenMapping[tokenAddress].tokenAddress != address(0), "Token not found");
        require(msg.value > 0, "Must send SEI to buy tokens");
        require(tokenAmount > 0, "Token amount must be greater than 0");
        
        TokenInfo storage tokenInfo = addressToTokenMapping[tokenAddress];
        MemeToken token = MemeToken(tokenAddress);
        
        // Simple pricing: 1 SEI = 1000 tokens
        uint256 requiredSei = tokenAmount * 1e15; // 0.001 SEI per token
        require(msg.value >= requiredSei, "Insufficient SEI sent");
        
        // Check if token creator has enough tokens to sell
        uint256 creatorBalance = token.balanceOf(tokenInfo.creatorAddress);
        require(creatorBalance >= tokenAmount, "Not enough tokens available");
        
        // Transfer tokens from creator to buyer
        token.transferFrom(tokenInfo.creatorAddress, msg.sender, tokenAmount);
        
        // Send SEI to token creator (minus small platform fee)
        uint256 platformFee = msg.value / 20; // 5% platform fee
        uint256 creatorAmount = msg.value - platformFee;
        
        payable(tokenInfo.creatorAddress).transfer(creatorAmount);
        
        // Update funding raised
        tokenInfo.fundingRaised += msg.value;
        
        emit TokensPurchased(msg.sender, tokenAddress, tokenAmount, msg.value);
        
        // Refund excess SEI if any
        if (msg.value > requiredSei) {
            payable(msg.sender).transfer(msg.value - requiredSei);
        }
    }

    function getAllMemeTokens() public view returns (TokenInfo[] memory) {
        TokenInfo[] memory allTokens = new TokenInfo[](memeTokenAddresses.length);
        for (uint256 i = 0; i < memeTokenAddresses.length; i++) {
            allTokens[i] = addressToTokenMapping[memeTokenAddresses[i]];
        }
        return allTokens;
    }
    
    function getTokenInfo(address tokenAddress) public view returns (TokenInfo memory) {
        require(addressToTokenMapping[tokenAddress].tokenAddress != address(0), "Token not found");
        return addressToTokenMapping[tokenAddress];
    }
    
    function getTokenCount() public view returns (uint256) {
        return memeTokenAddresses.length;
    }
    
    function calculateTokenPrice(uint256 tokenAmount) public pure returns (uint256) {
        return tokenAmount * 1e15; // 0.001 SEI per token
    }

    // Owner functions
    function withdrawPlatformFees() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }
    
    function updateCreationFee(uint256 newFee) public onlyOwner {
        // Note: This would require updating the constant in a new deployment
        // For now, this is just a placeholder for future upgrades
    }
}
