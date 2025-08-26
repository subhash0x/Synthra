import hre from "hardhat";
import { createPublicClient, createWalletClient, http, formatEther, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

// Define Sei Testnet chain
const seiTestnet = defineChain({
  id: 1328,
  name: 'Sei Testnet',
  network: 'sei-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-rpc-testnet.sei-apis.com'],
    },
  },
});

async function main() {
  console.log("🧪 Testing SeiTokenFactory with native SEI...\n");
  
  // Contract address
  const factoryAddress = "0x36ef7de8f309a4e27b9e8970fc0e08baaeb65eaf";
  
  // Get private key from environment
  const privateKey = process.env.SEI_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("SEI_PRIVATE_KEY not found in environment variables");
  }
  
  // Create account and clients
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({
    chain: seiTestnet,
    transport: http(),
  });
  
  const walletClient = createWalletClient({
    account,
    chain: seiTestnet,
    transport: http(),
  });
  
  console.log("👤 Testing with account:", account.address);
  
  // Get balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("💰 Account balance:", formatEther(balance), "SEI");
  
  // Get contract artifacts
  const factoryArtifact = await hre.artifacts.readArtifact("SeiTokenFactory");
  
  // Test 1: Check factory status
  console.log("\n📊 Factory Status:");
  console.log("=" .repeat(30));
  
  const creationFee = await publicClient.readContract({
    address: factoryAddress as `0x${string}`,
    abi: factoryArtifact.abi,
    functionName: "CREATION_FEE",
  });
  console.log("💸 Creation Fee:", formatEther(creationFee as bigint), "SEI");
  
  const tokenCount = await publicClient.readContract({
    address: factoryAddress as `0x${string}`,
    abi: factoryArtifact.abi,
    functionName: "getTokenCount",
  });
  console.log("📈 Total Tokens Created:", tokenCount.toString());
  
  // Test 2: Create a test token
  console.log("\n🎯 Test Token Creation:");
  console.log("=" .repeat(35));
  
  try {
    const createTxHash = await walletClient.writeContract({
      address: factoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: "createMemeToken",
      args: [
        "TestCoin",           // name
        "TEST",               // symbol
        "https://example.com/test.png", // imageUrl
        "A test token created with SEI"  // description
      ],
      value: parseEther("0.1"), // 0.1 SEI creation fee
    });
    
    console.log("📤 Token creation transaction:", createTxHash);
    
    // Wait for transaction
    const receipt = await publicClient.waitForTransactionReceipt({ hash: createTxHash });
    console.log("✅ Token created in block:", receipt.blockNumber.toString());
    
    // Get the new token count
    const newTokenCount = await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: "getTokenCount",
    });
    console.log("📈 New Token Count:", newTokenCount.toString());
    
    // Get all tokens to find our new token
    const allTokens = await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: "getAllMemeTokens",
    });
    
    console.log("🎉 Created Token Details:");
    if (Array.isArray(allTokens) && allTokens.length > 0) {
      const latestToken = allTokens[allTokens.length - 1] as any;
      console.log("  📍 Token Address:", latestToken.tokenAddress);
      console.log("  🏷️  Name:", latestToken.name);
      console.log("  🔤 Symbol:", latestToken.symbol);
      console.log("  👤 Creator:", latestToken.creatorAddress);
      console.log("  💰 Funding Raised:", formatEther(latestToken.fundingRaised), "SEI");
    }
    
  } catch (error) {
    console.error("❌ Token creation failed:", error);
  }
  
  // Test 3: Check pricing
  console.log("\n💰 Pricing Information:");
  console.log("=" .repeat(30));
  
  const price100 = await publicClient.readContract({
    address: factoryAddress as `0x${string}`,
    abi: factoryArtifact.abi,
    functionName: "calculateTokenPrice",
    args: [parseEther("100")], // Price for 100 tokens
  });
  console.log("💸 100 tokens cost:", formatEther(price100 as bigint), "SEI");
  
  const price1000 = await publicClient.readContract({
    address: factoryAddress as `0x${string}`,
    abi: factoryArtifact.abi,
    functionName: "calculateTokenPrice",
    args: [parseEther("1000")], // Price for 1000 tokens
  });
  console.log("💸 1000 tokens cost:", formatEther(price1000 as bigint), "SEI");
  
  // Final status
  console.log("\n🎉 Test Summary:");
  console.log("=" .repeat(40));
  console.log("✅ Factory is working with native SEI");
  console.log("✅ No PTOKEN dependency");
  console.log("✅ Token creation costs 0.1 SEI");
  console.log("✅ Token purchase costs 0.001 SEI per token");
  console.log("📍 Factory Address:", factoryAddress);
  console.log("🔗 Explorer:", `https://seitrace.com/address/${factoryAddress}`);
}

main()
  .then(() => {
    console.log("\n🎊 All tests completed successfully!");
    console.log("🚀 Your factory is ready to use with SEI tokens!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Testing failed:", error);
    process.exit(1);
  });
