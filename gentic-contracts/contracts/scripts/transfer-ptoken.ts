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
  console.log("💰 Transferring PTOKEN to user wallet...");
  
  // Contract addresses
  const ptokenAddress = "0xb16d4c87e08598ad8af89aeeac2d3734172626da";
  
  // User wallet address from the UI
  const userWalletAddress = "0x1fa2cbAF65132a944BC5FB68C0B2D41278D4311e";
  
  // Amount to transfer (10,000 PTOKEN should be enough for testing)
  const transferAmount = parseEther("10000");
  
  // Get deployer private key (who has all the PTOKEN)
  const privateKey = process.env.SEI_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("SEI_PRIVATE_KEY not found in environment variables");
  }
  
  // Create account and clients
  const deployerAccount = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({
    chain: seiTestnet,
    transport: http(),
  });
  
  const walletClient = createWalletClient({
    account: deployerAccount,
    chain: seiTestnet,
    transport: http(),
  });
  
  console.log("📝 Deployer account:", deployerAccount.address);
  console.log("👤 User wallet:", userWalletAddress);
  console.log("💸 Transfer amount:", formatEther(transferAmount), "PTOKEN");
  
  // Get PTOKEN contract artifact
  const ptokenArtifact = await hre.artifacts.readArtifact("PTOKEN");
  
  // Check current balances
  console.log("\n📊 Current Balances:");
  const deployerBalance = await publicClient.readContract({
    address: ptokenAddress as `0x${string}`,
    abi: ptokenArtifact.abi,
    functionName: "balanceOf",
    args: [deployerAccount.address],
  });
  console.log("💰 Deployer PTOKEN:", formatEther(deployerBalance as bigint), "PTOKEN");
  
  const userBalance = await publicClient.readContract({
    address: ptokenAddress as `0x${string}`,
    abi: ptokenArtifact.abi,
    functionName: "balanceOf",
    args: [userWalletAddress],
  });
  console.log("👤 User PTOKEN:", formatEther(userBalance as bigint), "PTOKEN");
  
  // Transfer PTOKEN to user
  console.log("\n🚀 Executing transfer...");
  
  const transferHash = await walletClient.writeContract({
    address: ptokenAddress as `0x${string}`,
    abi: ptokenArtifact.abi,
    functionName: "transfer",
    args: [userWalletAddress, transferAmount],
  });
  
  console.log("📤 Transfer transaction:", transferHash);
  
  // Wait for transaction confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
  console.log("✅ Transaction confirmed in block:", receipt.blockNumber.toString());
  
  // Check new balances
  console.log("\n📊 New Balances:");
  const newDeployerBalance = await publicClient.readContract({
    address: ptokenAddress as `0x${string}`,
    abi: ptokenArtifact.abi,
    functionName: "balanceOf",
    args: [deployerAccount.address],
  });
  console.log("💰 Deployer PTOKEN:", formatEther(newDeployerBalance as bigint), "PTOKEN");
  
  const newUserBalance = await publicClient.readContract({
    address: ptokenAddress as `0x${string}`,
    abi: ptokenArtifact.abi,
    functionName: "balanceOf",
    args: [userWalletAddress],
  });
  console.log("👤 User PTOKEN:", formatEther(newUserBalance as bigint), "PTOKEN");
  
  console.log("\n🎉 Transfer Summary:");
  console.log("=" .repeat(50));
  console.log("✅ Successfully transferred", formatEther(transferAmount), "PTOKEN");
  console.log("📍 From:", deployerAccount.address);
  console.log("📍 To:", userWalletAddress);
  console.log("📍 Transaction:", `https://seitrace.com/tx/${transferHash}`);
  console.log("\n🎮 You can now use the frontend to create tokens!");
}

main()
  .then(() => {
    console.log("\n✅ PTOKEN transfer completed successfully!");
    console.log("🔄 Refresh your frontend - you should now have PTOKEN balance!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Transfer failed:", error);
    process.exit(1);
  });
