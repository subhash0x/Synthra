import { network } from "hardhat";

async function main() {
  console.log("🚀 Deploying contracts to Sei Testnet...");
  
  const { viem } = await network.connect({
    network: "seiTestnet",
    chainType: "l1",
  });

  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();
  
  console.log("📝 Deploying contracts with account:", deployer.account.address);
  
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log("💰 Account balance:", balance, "wei");

  // Get contract artifacts
  const ptokenArtifact = await viem.getContractArtifact("PTOKEN");
  const tokenFactoryArtifact = await viem.getContractArtifact("TokenFactory");

  // Deploy PTOKEN first
  console.log("\n📦 Deploying PTOKEN contract...");
  const ptokenHash = await deployer.deployContract({
    abi: ptokenArtifact.abi,
    bytecode: ptokenArtifact.bytecode,
  });
  
  const ptokenReceipt = await publicClient.waitForTransactionReceipt({ hash: ptokenHash });
  const ptokenAddress = ptokenReceipt.contractAddress;
  console.log("✅ PTOKEN deployed to:", ptokenAddress);

  // Deploy TokenFactory with PTOKEN address
  console.log("\n🏭 Deploying TokenFactory contract...");
  const tokenFactoryHash = await deployer.deployContract({
    abi: tokenFactoryArtifact.abi,
    bytecode: tokenFactoryArtifact.bytecode,
    args: [ptokenAddress],
  });
  
  const tokenFactoryReceipt = await publicClient.waitForTransactionReceipt({ hash: tokenFactoryHash });
  const tokenFactoryAddress = tokenFactoryReceipt.contractAddress;
  console.log("✅ TokenFactory deployed to:", tokenFactoryAddress);

  console.log("\n🎉 Deployment Summary:");
  console.log("📍 PTOKEN Address:", ptokenAddress);
  console.log("📍 TokenFactory Address:", tokenFactoryAddress);
  console.log("📍 Deployer Address:", deployer.account.address);
  
  console.log("\n📋 Update your .env file with these addresses:");
  console.log(`VITE_PTOKEN_ADDRESS=${ptokenAddress}`);
  console.log(`VITE_TOKEN_FACTORY_ADDRESS=${tokenFactoryAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });



