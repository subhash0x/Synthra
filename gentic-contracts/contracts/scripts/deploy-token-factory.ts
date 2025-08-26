import hre from "hardhat";
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
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
    public: {
      http: ['https://evm-rpc-testnet.sei-apis.com'],
    },
  },
});

async function main() {
  console.log("🏭 Deploying SimpleTokenFactory to Sei Testnet...");
  
  // PTOKEN address from previous deployment
  const ptokenAddress = "0xb16d4c87e08598ad8af89aeeac2d3734172626da";
  
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
  console.log("🔗 Using PTOKEN address:", ptokenAddress);
  
  // Get balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("💰 Account balance:", formatEther(balance), "SEI");

  // Deploy SimpleTokenFactory
  console.log("\n🏭 Deploying SimpleTokenFactory contract...");
  
  const tokenFactoryArtifact = await hre.artifacts.readArtifact("SimpleTokenFactory");
  
  // Deploy SimpleTokenFactory with PTOKEN address
  const tokenFactoryHash = await walletClient.deployContract({
    abi: tokenFactoryArtifact.abi,
    bytecode: tokenFactoryArtifact.bytecode as `0x${string}`,
    args: [ptokenAddress],
  });
  
  console.log("📤 SimpleTokenFactory deployment transaction:", tokenFactoryHash);
  
  // Wait for deployment
  const tokenFactoryReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenFactoryHash });
  const tokenFactoryAddress = tokenFactoryReceipt.contractAddress!;
  
  console.log("✅ SimpleTokenFactory deployed to:", tokenFactoryAddress);
  
  // Test the deployment
  console.log("\n🔍 Testing deployment...");
  
  const factoryPTokenAddress = await publicClient.readContract({
    address: tokenFactoryAddress,
    abi: tokenFactoryArtifact.abi,
    functionName: "getPTokenAddress",
  });
  
  const isPTokenValid = await publicClient.readContract({
    address: tokenFactoryAddress,
    abi: tokenFactoryArtifact.abi,
    functionName: "isPTokenValid",
  });
  
  console.log("🔗 Factory PTOKEN reference:", factoryPTokenAddress);
  console.log("✅ PTOKEN reference matches:", factoryPTokenAddress === ptokenAddress);
  console.log("✅ PTOKEN is valid:", isPTokenValid);
  
  // Final Summary
  console.log("\n🎉 Deployment Summary:");
  console.log("=" .repeat(60));
  console.log("📍 PTOKEN Address:", ptokenAddress);
  console.log("📍 SimpleTokenFactory Address:", tokenFactoryAddress);
  console.log("📍 Deployer Address:", account.address);
  console.log("📍 Network: Sei Testnet (Chain ID: 1328)");
  console.log("📍 Block Explorer: https://seitrace.com");
  
  console.log("\n📋 Frontend Environment Variables:");
  console.log("=" .repeat(60));
  console.log(`VITE_PTOKEN_ADDRESS=${ptokenAddress}`);
  console.log(`VITE_TOKEN_FACTORY_ADDRESS=${tokenFactoryAddress}`);
  console.log(`VITE_WALLETCONNECT_PROJECT_ID=0375994bb6bfd058c6b7876ee734e1c5`);
  console.log(`VITE_CHAIN_ID=1328`);
  console.log(`VITE_RPC_URL=https://evm-rpc-testnet.sei-apis.com`);
  
  return {
    ptokenAddress,
    tokenFactoryAddress,
    deployerAddress: account.address,
  };
}

main()
  .then((result) => {
    console.log("\n🎊 TokenFactory deployment completed successfully!");
    console.log("Next steps:");
    console.log("1. Update your frontend .env file with the addresses above");
    console.log("2. Test the contracts using the frontend");
    console.log("3. Verify contracts on Seitrace explorer if needed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Deployment failed:", error);
    process.exit(1);
  });
