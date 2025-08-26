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
    public: {
      http: ['https://evm-rpc-testnet.sei-apis.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Seitrace', url: 'https://seitrace.com' },
  },
});

async function main() {
  console.log("🚀 Starting complete deployment to Sei Testnet...");
  
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
  
  if (balance < parseEther("0.01")) {
    console.warn("⚠️  Low balance - you may need more SEI for gas fees");
  }

  // Step 1: Deploy PTOKEN
  console.log("\n📦 Step 1: Deploying PTOKEN contract...");
  
  // Get contract artifacts
  const ptokenArtifact = await hre.artifacts.readArtifact("PTOKEN");
  
  // Deploy PTOKEN
  const ptokenHash = await walletClient.deployContract({
    abi: ptokenArtifact.abi,
    bytecode: ptokenArtifact.bytecode as `0x${string}`,
  });
  
  console.log("📤 PTOKEN deployment transaction:", ptokenHash);
  
  // Wait for deployment
  const ptokenReceipt = await publicClient.waitForTransactionReceipt({ hash: ptokenHash });
  const ptokenAddress = ptokenReceipt.contractAddress!;
  
  console.log("✅ PTOKEN deployed to:", ptokenAddress);
  
  // Verify PTOKEN deployment
  const totalSupply = await publicClient.readContract({
    address: ptokenAddress,
    abi: ptokenArtifact.abi,
    functionName: "totalSupply",
  });
  
  const deployerBalance = await publicClient.readContract({
    address: ptokenAddress,
    abi: ptokenArtifact.abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  
  console.log("📊 PTOKEN Total Supply:", formatEther(totalSupply as bigint), "PTOKEN");
  console.log("💰 Deployer PTOKEN Balance:", formatEther(deployerBalance as bigint), "PTOKEN");
  
  // Step 2: Deploy TokenFactory
  console.log("\n🏭 Step 2: Deploying TokenFactory contract...");
  
  const tokenFactoryArtifact = await hre.artifacts.readArtifact("TokenFactory");
  
  // Deploy TokenFactory with PTOKEN address
  const tokenFactoryHash = await walletClient.deployContract({
    abi: tokenFactoryArtifact.abi,
    bytecode: tokenFactoryArtifact.bytecode as `0x${string}`,
    args: [ptokenAddress],
  });
  
  console.log("📤 TokenFactory deployment transaction:", tokenFactoryHash);
  
  // Wait for deployment
  const tokenFactoryReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenFactoryHash });
  const tokenFactoryAddress = tokenFactoryReceipt.contractAddress!;
  
  console.log("✅ TokenFactory deployed to:", tokenFactoryAddress);
  
  // Verify TokenFactory deployment
  const factoryPTokenAddress = await publicClient.readContract({
    address: tokenFactoryAddress,
    abi: tokenFactoryArtifact.abi,
    functionName: "pTokenAddress",
  });
  
  console.log("🔗 TokenFactory PTOKEN reference:", factoryPTokenAddress);
  console.log("✅ PTOKEN reference matches:", factoryPTokenAddress === ptokenAddress);
  
  // Final Summary
  console.log("\n🎉 Deployment Summary:");
  console.log("=" .repeat(50));
  console.log("📍 PTOKEN Address:", ptokenAddress);
  console.log("📍 TokenFactory Address:", tokenFactoryAddress);
  console.log("📍 Deployer Address:", account.address);
  console.log("📍 Network: Sei Testnet (Chain ID: 1328)");
  console.log("📍 Block Explorer: https://seitrace.com");
  
  console.log("\n📋 Frontend Environment Variables:");
  console.log("=" .repeat(50));
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
    console.log("\n🎊 All deployments completed successfully!");
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
