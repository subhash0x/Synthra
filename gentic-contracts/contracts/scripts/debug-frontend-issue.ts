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
  console.log("🔍 Debugging Frontend Connection Issues...\n");
  
  // Contract addresses
  const ptokenAddress = "0xb16d4c87e08598ad8af89aeeac2d3734172626da";
  const tokenFactoryAddress = "0x1d333ed8f416692a49f0b2631f0435f67a610b87";
  const userWalletAddress = "0x1fa2cbAF65132a944BC5FB68C0B2D41278D4311e";
  
  const publicClient = createPublicClient({
    chain: seiTestnet,
    transport: http(),
  });
  
  console.log("📋 Configuration Check:");
  console.log("=" .repeat(50));
  console.log("🌐 Network: Sei Testnet (Chain ID: 1328)");
  console.log("🔗 RPC URL: https://evm-rpc-testnet.sei-apis.com");
  console.log("📍 PTOKEN Address:", ptokenAddress);
  console.log("📍 TokenFactory Address:", tokenFactoryAddress);
  console.log("👤 User Wallet:", userWalletAddress);
  
  // Check network connectivity
  console.log("\n🌐 Network Status:");
  console.log("=" .repeat(30));
  const chainId = await publicClient.getChainId();
  const blockNumber = await publicClient.getBlockNumber();
  console.log("✅ Chain ID:", chainId);
  console.log("✅ Current Block:", blockNumber.toString());
  
  // Check PTOKEN contract
  console.log("\n📦 PTOKEN Contract Status:");
  console.log("=" .repeat(35));
  
  const ptokenArtifact = await hre.artifacts.readArtifact("PTOKEN");
  
  try {
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
    
    const totalSupply = await publicClient.readContract({
      address: ptokenAddress as `0x${string}`,
      abi: ptokenArtifact.abi,
      functionName: "totalSupply",
    });
    console.log("✅ Total Supply:", formatEther(totalSupply as bigint), "PTOKEN");
    
    const userBalance = await publicClient.readContract({
      address: ptokenAddress as `0x${string}`,
      abi: ptokenArtifact.abi,
      functionName: "balanceOf",
      args: [userWalletAddress],
    });
    console.log("✅ User Balance:", formatEther(userBalance as bigint), "PTOKEN");
    
  } catch (error) {
    console.error("❌ PTOKEN contract error:", error);
  }
  
  // Check TokenFactory contract
  console.log("\n🏭 TokenFactory Contract Status:");
  console.log("=" .repeat(40));
  
  const factoryArtifact = await hre.artifacts.readArtifact("SimpleTokenFactory");
  
  try {
    const factoryPTokenAddress = await publicClient.readContract({
      address: tokenFactoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: "getPTokenAddress",
    });
    console.log("✅ Factory PTOKEN Address:", factoryPTokenAddress);
    
    const isPTokenValid = await publicClient.readContract({
      address: tokenFactoryAddress as `0x${string}`,
      abi: factoryArtifact.abi,
      functionName: "isPTokenValid",
    });
    console.log("✅ PTOKEN Valid:", isPTokenValid);
    
  } catch (error) {
    console.error("❌ TokenFactory contract error:", error);
  }
  
  // Frontend troubleshooting tips
  console.log("\n🔧 Frontend Troubleshooting:");
  console.log("=" .repeat(40));
  console.log("1. ✅ Your wallet has", formatEther(await publicClient.readContract({
    address: ptokenAddress as `0x${string}`,
    abi: ptokenArtifact.abi,
    functionName: "balanceOf",
    args: [userWalletAddress],
  }) as bigint), "PTOKEN");
  
  console.log("2. 🔄 Try refreshing the page");
  console.log("3. 🦊 Add PTOKEN to MetaMask:");
  console.log("   - Token Address:", ptokenAddress);
  console.log("   - Token Symbol: PTOKEN");
  console.log("   - Decimals: 18");
  
  console.log("4. 🌐 Verify MetaMask network:");
  console.log("   - Network Name: Sei Testnet");
  console.log("   - RPC URL: https://evm-rpc-testnet.sei-apis.com");
  console.log("   - Chain ID: 1328");
  console.log("   - Currency Symbol: SEI");
  
  console.log("5. 🔧 Check frontend .env file contains:");
  console.log("   VITE_PTOKEN_ADDRESS=" + ptokenAddress);
  console.log("   VITE_TOKEN_FACTORY_ADDRESS=" + tokenFactoryAddress);
  console.log("   VITE_CHAIN_ID=1328");
  
  console.log("\n📱 Add PTOKEN to MetaMask:");
  console.log("=" .repeat(35));
  console.log("Go to MetaMask → Import tokens → Custom token");
  console.log("Token contract address:", ptokenAddress);
  console.log("Token symbol: PTOKEN");
  console.log("Token decimal: 18");
}

main()
  .then(() => {
    console.log("\n✅ Debug check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Debug failed:", error);
    process.exit(1);
  });
