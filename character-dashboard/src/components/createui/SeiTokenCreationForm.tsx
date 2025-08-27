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
import { config } from "@/components/evm-provider";

interface TokenFormProps {
	onTokenCreated: (tokenData: TokenData) => void;
	characterName: string;
}

const CREATION_FEE = parseEther(CREATION_FEE_SEI); // 0.1 SEI
const MIN_SEI_BALANCE = parseEther("0.15"); // 0.15 SEI (0.1 for creation + 0.05 for gas)

export function SeiTokenCreationForm({
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
			// Wait for transaction confirmation
			const receipt = await config.publicClient.waitForTransactionReceipt({
				hash: hash as `0x${string}`,
			});

			if (receipt.status === "success") {
				// Extract token address from logs
				const tokenCreatedLog = receipt.logs.find(
					(log) => log.topics[0] === "0x..." // TokenCreated event signature
				);

				const tokenData: TokenData = {
					...formData,
					address: tokenCreatedLog?.address || "0x...",
					transactionHash: hash,
					// Dummy token metrics
					tokenHolders: 800,
					volume24h: 8000,
					circulatingSupply: 1200000,
					totalSupply: 10000000,
					marketCap: 300000,
					currentPrice: 0.25,
				};

				return tokenData;
			} else {
				throw new Error("Transaction failed");
			}
		} catch (err) {
			console.error("Transaction completion error:", err);
			throw err;
		} finally {
			setIsPending(false);
			setTxHash(null);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!address) {
			setError("Please connect your wallet");
			return;
		}

		setError("");

		// Validate form data
		if (
			!formData.name ||
			!formData.symbol ||
			!formData.imageUrl ||
			!formData.description
		) {
			setError("Please fill in all fields.");
			return;
		}

		// Check SEI balance
		if (!seiBalance || seiBalance.value < MIN_SEI_BALANCE) {
			setError(
				`Insufficient SEI balance. Need ${formatEther(MIN_SEI_BALANCE)} SEI (${CREATION_FEE_SEI} for creation + gas fees)`
			);
			return;
		}

		setIsPending(true);

		try {
			// Create token with SEI payment
			const hash = await writeContract(config, {
				address: TOKEN_FACTORY_ADDRESS,
				abi: seiTokenFactoryAbi,
				functionName: "createMemeToken",
				args: [
					formData.name,
					formData.symbol,
					formData.imageUrl,
					formData.description,
				],
				value: CREATION_FEE, // Pay 0.1 SEI
			});

			const tokenData = await handleTxComplete(hash);
			if (tokenData) {
				onTokenCreated(tokenData);
			}
		} catch (err: any) {
			console.error("Transaction error:", err);
			if (err.message.includes("insufficient funds")) {
				setError(
					"Insufficient SEI for transaction. Please add more SEI to your wallet."
				);
			} else {
				setError(err.message || "Transaction failed.");
			}
		} finally {
			setIsPending(false);
		}
	};

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
							disabled={isPending}
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
							disabled={isPending}
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
							placeholder="https://example.com/token.png"
							required
							disabled={isPending}
							className="bg-background"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Token Description</Label>
						<Input
							id="description"
							value={formData.description}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, description: e.target.value }))
							}
							placeholder="Describe your token"
							required
							maxLength={200}
							disabled={isPending}
							className="bg-background"
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
							<AlertDescription>
								Transaction hash: {txHash}
								<br />
								Waiting for confirmation...
							</AlertDescription>
						</Alert>
					)}

					{address && (
						<Alert>
							<AlertTitle>Network Costs</AlertTitle>
							<AlertDescription>
								<div>
									Current SEI Balance:{" "}
									{seiBalance ? formatEther(seiBalance.value) : "0"} SEI
								</div>
								<div>Creation Fee: {CREATION_FEE_SEI} SEI</div>
								<div>Estimated Gas: ~0.05 SEI</div>
								<div>Total Needed: ~{formatEther(MIN_SEI_BALANCE)} SEI</div>
							</AlertDescription>
						</Alert>
					)}

					<Button
						type="submit"
						disabled={
							!address ||
							isPending ||
							(!!seiBalance && seiBalance.value < MIN_SEI_BALANCE)
						}
						className="w-full"
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Creating Token...
							</>
						) : seiBalance && seiBalance.value < MIN_SEI_BALANCE ? (
							"Insufficient SEI Balance"
						) : (
							`Create Token (${CREATION_FEE_SEI} SEI)`
						)}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
