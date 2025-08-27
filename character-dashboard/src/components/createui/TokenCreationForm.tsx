//@ts-nocheck
import React, { useState } from "react";
import {
	useAccount,
	useBalance,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { seiTokenFactoryAbi } from "./seiTokenFactoryAbi";
import { TOKEN_FACTORY_ADDRESS, CREATION_FEE_SEI } from "./constant";
import { TokenData } from "@/types";
import { writeContract } from "@wagmi/core";
interface TokenFormProps {
	onTokenCreated: (tokenData: TokenData) => void;
	characterName: string;
}

const CREATION_FEE = parseEther(CREATION_FEE_SEI); // 0.1 SEI
const MIN_SEI_BALANCE = parseEther("0.15"); // 0.15 SEI (0.1 for creation + 0.05 for gas) // Minimum ETH needed for gas

export function TokenCreationForm({
	onTokenCreated,
	characterName,
}: TokenFormProps) {
	const [formData, setFormData] = useState<
		Omit<TokenData, "address" | "transactionHash">
	>({
		name: `${characterName} Token`,
		symbol: characterName.slice(0, 4).toUpperCase(),
		imageUrl: "",
		description: `Token for ${characterName}`,
	});

	const [error, setError] = useState("");
	const [isPending, setIsPending] = useState(false);
	const [txHash, setTxHash] = useState<string | null>(null);
	const { address } = useAccount();

	// Get SEI balance
	const { data: seiBalance } = useBalance({
		address: address!,
	});

	const handleTxComplete = async (hash: string) => {
		setIsPending(true);
		setTxHash(hash);

		try {
			const provider = await window.ethereum;
			const receipt = await provider.request({
				method: "eth_getTransactionReceipt",
				params: [hash],
			});

			if (receipt) {
				const tokenAddress = receipt.logs[0].address;
				onTokenCreated({
					...formData,
					address: tokenAddress,
					transactionHash: hash,
					// Dummy token metrics
					tokenHolders: 800,
					volume24h: 8000,
					circulatingSupply: 1200000,
					totalSupply: 10000000,
					marketCap: 300000,
					currentPrice: 0.25,
				});
			}
		} catch (err) {
			console.error("Error getting receipt:", err);
			setError("Failed to confirm transaction");
		} finally {
			setIsPending(false);
			setTxHash(null);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!address) {
			setError("Please connect your wallet.");
			return;
		}

		if (!ethBalance || ethBalance.value < MIN_ETH_BALANCE) {
			setError(
				`Insufficient ETH balance. You need at least ${formatEther(MIN_ETH_BALANCE)} ETH for gas fees.`,
			);
			return;
		}

		if (!ptokenBalance || ptokenBalance < CREATION_FEE) {
			setError(
				`Insufficient PTOKEN balance. You need ${CREATION_FEE.toString()} PTOKEN.`,
			);
			return;
		}

		if (
			!formData.name ||
			!formData.symbol ||
			!formData.imageUrl ||
			!formData.description
		) {
			setError("Please fill in all fields.");
			return;
		}

		try {
			if (!allowance || allowance < CREATION_FEE) {
				if (!simulateApprove?.request) {
					throw new Error(
						approveSimError?.message || "Failed to simulate approval",
					);
				}
				const hash = await writeContract(simulateApprove.request);
				await handleTxComplete(hash);
				return;
			}

			if (!simulateCreate?.request) {
				throw new Error(
					createSimError?.message || "Failed to simulate token creation",
				);
			}
			const hash = await writeContract(simulateCreate.request);
			await handleTxComplete(hash);
		} catch (err: any) {
			console.error("Error:", err);
			if (err.message.includes("insufficient funds")) {
				setError(
					"Insufficient ETH for gas fees. Please add more ETH to your wallet.",
				);
			} else {
				setError(err.message || "Transaction failed.");
			}
		}
	};

	const isLoading = isPending || isWritePending;
	const needsApproval = !allowance || allowance < CREATION_FEE;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create Character Token</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Token Name</Label>
						<Input
							id="name"
							value={formData.name}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, name: e.target.value }))
							}
							placeholder="Character Token"
							required
							maxLength={50}
							disabled={isLoading}
							className="bg-background"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="symbol">Token Symbol</Label>
						<Input
							id="symbol"
							value={formData.symbol}
							onChange={(e) => {
								const value = e.target.value.toUpperCase();
								setFormData((prev) => ({ ...prev, symbol: value }));
							}}
							placeholder="TKN"
							required
							maxLength={11}
							className="uppercase bg-background"
							disabled={isLoading}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="imageUrl">Token Image URL</Label>
						<Input
							id="imageUrl"
							value={formData.imageUrl}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))
							}
							placeholder="https://..."
							required
							type="url"
							className="bg-background"
							disabled={isLoading}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Input
							id="description"
							value={formData.description}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									description: e.target.value,
								}))
							}
							placeholder="Describe your character token..."
							required
							maxLength={200}
							className="bg-background"
							disabled={isLoading}
						/>
					</div>

					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{txHash && (
						<Alert>
							<AlertTitle>Transaction Pending</AlertTitle>
							<AlertDescription>Waiting for confirmation...</AlertDescription>
						</Alert>
					)}

					{address && (
						<Alert>
							<AlertTitle>Network Costs</AlertTitle>
							<AlertDescription>
								<div>
									Current ETH Balance:{" "}
									{ethBalance ? formatEther(ethBalance.value) : "0"} ETH
								</div>
								<div>Required PTOKEN: {CREATION_FEE.toString()} PTOKEN</div>
								<div>Estimated Gas: ~{formatEther(MIN_ETH_BALANCE)} ETH</div>
							</AlertDescription>
						</Alert>
					)}

					<Button
						type="submit"
						disabled={
							!address ||
							isLoading ||
							(!!ethBalance && ethBalance.value < MIN_ETH_BALANCE)
						}
						className="w-full"
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{needsApproval ? "Approving PTOKEN..." : "Creating Token..."}
							</>
						) : ethBalance && ethBalance.value < MIN_ETH_BALANCE ? (
							"Insufficient ETH Balance"
						) : needsApproval ? (
							"Approve PTOKEN"
						) : (
							"Create Token"
						)}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
