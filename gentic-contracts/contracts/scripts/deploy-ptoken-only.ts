import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
  console.log("🚀 Deploying PTOKEN to Sei Testnet...");
  
  // Get the public client and wallet client
  const publicClient = await hre.viem.getPublicClient();
  const [walletClient] = await hre.viem.getWalletClients();
  console.log("📝 Deploying with account:", walletClient.account.address);
  
  // Get balance
  const balance = await publicClient.getBalance({ address: walletClient.account.address });
  console.log("💰 Account balance:", formatEther(balance), "SEI");

  // Deploy PTOKEN
  console.log("\n📦 Deploying PTOKEN contract...");
  const ptoken = await hre.viem.deployContract("PTOKEN");
  console.log("✅ PTOKEN deployed to:", ptoken.address);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const ptokenBalance = await publicClient.readContract({
    address: ptoken.address,
    abi: ptoken.abi,
    functionName: "balanceOf",
    args: [walletClient.account.address],
  });
  console.log("💰 PTOKEN balance:", formatEther(ptokenBalance as bigint), "PTOKEN");
  
  const totalSupply = await publicClient.readContract({
    address: ptoken.address,
    abi: ptoken.abi,
    functionName: "totalSupply",
  });
  console.log("📊 Total Supply:", formatEther(totalSupply as bigint), "PTOKEN");

  console.log("\n🎉 Deployment Summary:");
  console.log("📍 PTOKEN Address:", ptoken.address);
  console.log("📍 Deployer Address:", walletClient.account.address);
  console.log("📍 Network: Sei Testnet (Chain ID: 1328)");
  
  console.log("\n📋 Update your frontend .env file with:");
  console.log(`VITE_PTOKEN_ADDRESS=${ptoken.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
