import { deploy } from "@nomicfoundation/hardhat-ignition/helpers";

async function main() {
  console.log("🚀 Deploying contracts to Sei Testnet...");
  
  // Deploy using Ignition
  const result = await deploy("SeiDeployment", {
    network: "seiTestnet",
  });

  console.log("\n🎉 Deployment Summary:");
  console.log("📍 PTOKEN Address:", result.ptoken);
  console.log("📍 TokenFactory Address:", result.tokenFactory);
  
  console.log("\n📋 Update your .env file with these addresses:");
  console.log(`VITE_PTOKEN_ADDRESS=${result.ptoken}`);
  console.log(`VITE_TOKEN_FACTORY_ADDRESS=${result.tokenFactory}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
