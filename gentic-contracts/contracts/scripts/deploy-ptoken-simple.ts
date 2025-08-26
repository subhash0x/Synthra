import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying PTOKEN to Sei Testnet...");
  
  // Deploy using viem's deployContract
  try {
    const ptoken = await hre.viem.deployContract("PTOKEN");
    
    console.log("✅ PTOKEN deployed successfully!");
    console.log("📍 PTOKEN Address:", ptoken.address);
    console.log("📍 Network: Sei Testnet (Chain ID: 1328)");
    
    console.log("\n📋 Update your frontend .env file with:");
    console.log(`VITE_PTOKEN_ADDRESS=${ptoken.address}`);
    
    // Verify the deployment
    const publicClient = await hre.viem.getPublicClient();
    const totalSupply = await publicClient.readContract({
      address: ptoken.address,
      abi: ptoken.abi,
      functionName: "totalSupply",
    });
    
    console.log("📊 Total Supply verified:", totalSupply.toString(), "wei");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("🎉 Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
