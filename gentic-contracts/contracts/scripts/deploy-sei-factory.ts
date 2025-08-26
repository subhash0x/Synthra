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
  console.log("🚀 Deploying SeiTokenFactory to Sei Testnet...");
  console.log("💰 This factory uses native SEI tokens instead of PTOKEN");
  
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
  
  console.log("📝 Deploying with account:", account.address);
  
  // Get balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("💰 Account balance:", formatEther(balance), "SEI");
  
  if (balance < parseEther("0.1")) {
    console.warn("⚠️  Low balance - you may need more SEI for deployment and gas fees");
  }

  // Deploy SeiTokenFactory
  console.log("\n🏭 Deploying SeiTokenFactory contract...");
  
  const factoryArtifact = await hre.artifacts.readArtifact("SeiTokenFactory");
  
  // Deploy SeiTokenFactory (no constructor arguments needed)
  const factoryHash = await walletClient.deployContract({
    abi: factoryArtifact.abi,
    bytecode: factoryArtifact.bytecode as `0x${string}`,
  });
  
  console.log("📤 SeiTokenFactory deployment transaction:", factoryHash);
  
  // Wait for deployment
  const factoryReceipt = await publicClient.waitForTransactionReceipt({ hash: factoryHash });
  const factoryAddress = factoryReceipt.contractAddress!;
  
  console.log("✅ SeiTokenFactory deployed to:", factoryAddress);
  
  // Test the deployment
  console.log("\n🔍 Testing deployment...");
  
  try {
    const creationFee = await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: "CREATION_FEE",
    });
    console.log("💸 Token Creation Fee:", formatEther(creationFee as bigint), "SEI");
    
    const owner = await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: "owner",
    });
    console.log("👤 Factory Owner:", owner);
    
    const tokenCount = await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: "getTokenCount",
    });
    console.log("📊 Current Token Count:", tokenCount.toString());
    
    // Test price calculation
    const samplePrice = await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: "calculateTokenPrice",
      args: [parseEther("1000")], // Price for 1000 tokens
    });
    console.log("💰 Price for 1000 tokens:", formatEther(samplePrice as bigint), "SEI");
    
  } catch (error) {
    console.error("❌ Testing failed:", error);
  }
  
  // Final Summary
  console.log("\n🎉 Deployment Summary:");
  console.log("=" .repeat(60));
  console.log("📍 SeiTokenFactory Address:", factoryAddress);
  console.log("📍 Deployer Address:", account.address);
  console.log("📍 Network: Sei Testnet (Chain ID: 1328)");
  console.log("📍 Block Explorer: https://seitrace.com");
  console.log("💸 Creation Fee: 0.1 SEI per token");
  console.log("💰 Token Price: 0.001 SEI per token");
  
  console.log("\n📋 Frontend Environment Variables:");
  console.log("=" .repeat(60));
  console.log("# Remove PTOKEN references and use these:");
  console.log(`VITE_TOKEN_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`VITE_WALLETCONNECT_PROJECT_ID=0375994bb6bfd058c6b7876ee734e1c5`);
  console.log(`VITE_CHAIN_ID=1328`);
  console.log(`VITE_RPC_URL=https://evm-rpc-testnet.sei-apis.com`);
  console.log(`VITE_NETWORK_NAME=Sei Testnet`);
  console.log(`VITE_NATIVE_CURRENCY_NAME=SEI`);
  console.log(`VITE_NATIVE_CURRENCY_SYMBOL=SEI`);
  console.log(`VITE_BLOCK_EXPLORER_URL=https://seitrace.com`);
  
  console.log("\n🎮 How to Use:");
  console.log("=" .repeat(30));
  console.log("1. Token Creation: Send 0.1 SEI");
  console.log("2. Token Purchase: Send SEI (0.001 SEI per token)");
  console.log("3. No PTOKEN needed - everything uses native SEI!");
  
  return {
    factoryAddress,
    deployerAddress: account.address,
  };
}

main()
  .then((result) => {
    console.log("\n🎊 SeiTokenFactory deployment completed successfully!");
    console.log("✨ No more PTOKEN dependency - everything uses SEI now!");
    console.log("\nNext steps:");
    console.log("1. Update your frontend to remove PTOKEN references");
    console.log("2. Use the new factory address in your frontend");
    console.log("3. Test token creation with 0.1 SEI fee");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  });
