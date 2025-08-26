import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying contracts to Sei Testnet...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "SEI");

  // Deploy PTOKEN first
  console.log("\n📦 Deploying PTOKEN contract...");
  const PTOKEN = await ethers.getContractFactory("PTOKEN");
  const ptoken = await PTOKEN.deploy();
  await ptoken.waitForDeployment();
  const ptokenAddress = await ptoken.getAddress();
  console.log("✅ PTOKEN deployed to:", ptokenAddress);

  // Deploy TokenFactory with PTOKEN address
  console.log("\n🏭 Deploying TokenFactory contract...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  const tokenFactory = await TokenFactory.deploy(ptokenAddress);
  await tokenFactory.waitForDeployment();
  const tokenFactoryAddress = await tokenFactory.getAddress();
  console.log("✅ TokenFactory deployed to:", tokenFactoryAddress);

  // Verify contracts
  console.log("\n🔍 Verifying deployment...");
  const ptokenBalance = await ptoken.balanceOf(deployer.address);
  console.log("💰 PTOKEN balance:", ethers.formatEther(ptokenBalance), "PTOKEN");

  console.log("\n🎉 Deployment Summary:");
  console.log("📍 PTOKEN Address:", ptokenAddress);
  console.log("📍 TokenFactory Address:", tokenFactoryAddress);
  console.log("📍 Deployer Address:", deployer.address);
  
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



