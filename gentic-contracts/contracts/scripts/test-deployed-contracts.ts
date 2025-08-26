import hre from "hardhat";
import { createPublicClient, http, formatEther } from "viem";
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
  console.log("🧪 Testing deployed contracts on Sei Testnet...\n");
  
  // Contract addresses
  const ptokenAddress = "0xb16d4c87e08598ad8af89aeeac2d3734172626da";
  const tokenFactoryAddress = "0x1d333ed8f416692a49f0b2631f0435f67a610b87";
  const deployerAddress = "0x1fa2cbAF65132a944BC5FB68C0B2D41278D4311e";
  
  const publicClient = createPublicClient({
    chain: seiTestnet,
    transport: http(),
  });
  
  // Test PTOKEN
  console.log("📦 Testing PTOKEN Contract");
  console.log("=" .repeat(40));
  
  const ptokenArtifact = await hre.artifacts.readArtifact("PTOKEN");
  
  try {
    // Test total supply
    const totalSupply = await publicClient.readContract({
      address: ptokenAddress as `0x${string}`,
      abi: ptokenArtifact.abi,
      functionName: "totalSupply",
    });
    console.log("✅ Total Supply:", formatEther(totalSupply as bigint), "PTOKEN");
    
    // Test deployer balance
    const deployerBalance = await publicClient.readContract({
      address: ptokenAddress as `0x${string}`,
      abi: ptokenArtifact.abi,
      functionName: "balanceOf",
      args: [deployerAddress],
    });
    console.log("✅ Deployer Balance:", formatEther(deployerBalance as bigint), "PTOKEN");
    
    // Test token name and symbol
    const name = await publicClient.readContract({
      address: ptokenAddress as `0x${string}`,
      abi: ptokenArtifact.abi,
      functionName: "name",
    });
    console.log("✅ Token Name:", name);
    
    const symbol = await publicClient.readContract({
      address: ptokenAddress as `0x${string}`,
      abi: ptokenArtifact.abi,
      functionName: "symbol",
    });
    console.log("✅ Token Symbol:", symbol);
    
    const decimals = await publicClient.readContract({
      address: ptokenAddress as `0x${string}`,
      abi: ptokenArtifact.abi,
      functionName: "decimals",
    });
    console.log("✅ Decimals:", decimals);
    
  } catch (error) {
    console.error("❌ PTOKEN test failed:", error);
  }
  
  // Test SimpleTokenFactory
  console.log("\n🏭 Testing SimpleTokenFactory Contract");
  console.log("=" .repeat(40));
  
  const factoryArtifact = await hre.artifacts.readArtifact("SimpleTokenFactory");
  
  try {
    // Test PTOKEN address reference
    const factoryPTokenAddress = await publicClient.readContract({
      address: tokenFactoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: "getPTokenAddress",
    });
    console.log("✅ Factory PTOKEN Address:", factoryPTokenAddress);
    console.log("✅ Address Match:", (factoryPTokenAddress as string).toLowerCase() === ptokenAddress.toLowerCase());
    
    // Test PTOKEN validity check
    const isPTokenValid = await publicClient.readContract({
      address: tokenFactoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: "isPTokenValid",
    });
    console.log("✅ PTOKEN Valid:", isPTokenValid);
    
    // Test owner
    const owner = await publicClient.readContract({
      address: tokenFactoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: "owner",
    });
    console.log("✅ Factory Owner:", owner);
    console.log("✅ Owner Match:", (owner as string).toLowerCase() === deployerAddress.toLowerCase());
    
  } catch (error) {
    console.error("❌ SimpleTokenFactory test failed:", error);
  }
  
  // Test network connectivity
  console.log("\n🌐 Network Information");
  console.log("=" .repeat(40));
  
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log("✅ Current Block:", blockNumber.toString());
    
    const gasPrice = await publicClient.getGasPrice();
    console.log("✅ Gas Price:", formatEther(gasPrice), "SEI");
    
    const chainId = await publicClient.getChainId();
    console.log("✅ Chain ID:", chainId);
    
  } catch (error) {
    console.error("❌ Network test failed:", error);
  }
  
  console.log("\n🎉 Contract Testing Summary");
  console.log("=" .repeat(50));
  console.log("📍 PTOKEN Address:", ptokenAddress);
  console.log("📍 SimpleTokenFactory Address:", tokenFactoryAddress);
  console.log("📍 Network: Sei Testnet (Chain ID: 1328)");
  console.log("📍 Explorer: https://seitrace.com");
  console.log("\n📋 View contracts on explorer:");
  console.log(`🔗 PTOKEN: https://seitrace.com/address/${ptokenAddress}`);
  console.log(`🔗 Factory: https://seitrace.com/address/${tokenFactoryAddress}`);
}

main()
  .then(() => {
    console.log("\n✅ All tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Testing failed:", error);
    process.exit(1);
  });
