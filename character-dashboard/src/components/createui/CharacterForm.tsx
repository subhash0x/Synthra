//@ts-nocheck
import  { useState, useEffect, useRef } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wand2, AlertCircle, Terminal, Twitter } from "lucide-react";
import { useAccount, useBalance } from "wagmi";

import { formatEther, parseEther } from "viem";
import { seiTokenFactoryAbi } from "./seiTokenFactoryAbi";
import { TOKEN_FACTORY_ADDRESS, CREATION_FEE_SEI } from "./constant";
import { config } from "@/components/evm-provider";
import { writeContract } from "@wagmi/core";
import { waitForTransactionReceipt } from "@wagmi/core";

const CREATION_FEE = parseEther(CREATION_FEE_SEI); // 0.1 SEI
const MIN_SEI_BALANCE = parseEther("0.15"); // 0.15 SEI (0.1 for creation + 0.05 for gas)

interface CharacterData {
	name: string;
	description: string;
	background: string;
	modelProvider: "openai" | "anthropic" | "llama_local";
	traits: string[];
	voice: {
		model: string;
		speed: number;
		pitch: number;
	};
	settings: {
		memoryEnabled: boolean;
		responseStyle: string;
	};
	token?: {
		address: string;
		transactionHash: string;
		name: string;
		symbol: string;
		imageUrl: string;
	} | null;
	twitter_handle?: string;
	autoGenerateAfterToken: boolean;
}

export function CharacterForm({
	onComplete,
}: {
	onComplete: (data: CharacterData) => void;
}) {
	// Character Data State
	const [characterData, setCharacterData] = useState<CharacterData>({
		name: "",
		description: "",
		background: "",
		modelProvider: "openai",
		traits: [],
		voice: {
			model: "en_US-neutral-medium",
			speed: 1.0,
			pitch: 1.0,
		},
		settings: {
			memoryEnabled: true,
			responseStyle: "balanced",
		},
		token: null,
		autoGenerateAfterToken: true,
	});

	// Wallet hooks
	const { address } = useAccount();
	const { data: seiBalance } = useBalance({
		address: address!,
	});

	// UI States
	const [error, setError] = useState("");
	const [txHash, setTxHash] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);
	const terminalRef = useRef<HTMLDivElement>(null);

	// Terminal Logs
	const [terminalLogs, setTerminalLogs] = useState<
		Array<{
			type: "info" | "error" | "success" | "loading";
			message: string;
			timestamp: string;
		}>
	>([]);

	// Wagmi Hooks
	
	//const { data: seiBalance } = useBalance({ address: address! });

	// Terminal scroll effect
	useEffect(() => {
		if (terminalRef.current) {
			terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
		}
	}, [terminalLogs]);

	const addLog = (
		type: "info" | "error" | "success" | "loading",
		message: string,
	) => {
		setTerminalLogs((prev) => [
			...prev,
			{
				type,
				message,
				timestamp: new Date().toLocaleTimeString(),
			},
		]);
	};

	const handleTxComplete = async (hash: string) => {
		setIsPending(true);
		setTxHash(hash);
		addLog("loading", `Waiting for transaction confirmation... (${hash})`);

		try {
			const receipt = await waitForTransactionReceipt(config, {
				hash: hash,
			});

			const tokenCreationLog = receipt.logs.find(
				(log) =>
					log.topics[1] ===
					"0x0000000000000000000000000000000000000000000000000000000000000000",
			);

			if (receipt.status === "success" && tokenCreationLog) {
				const tokenAddress = `0x${tokenCreationLog.topics[2].slice(26)}`;

				// Create token data object with dummy metrics
				const tokenData = {
					address: tokenAddress,
					transactionHash: hash,
					name: characterData.name,
					symbol: characterData.name.slice(0, 4).toUpperCase(),
					imageUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${tokenAddress}`,
					description: characterData.description || `Token for ${characterData.name}`,
					// Dummy token metrics
					tokenHolders: 800,
					volume24h: 8000,
					circulatingSupply: 1200000,
					totalSupply: 10000000,
					marketCap: 300000,
					currentPrice: 0.25,
				};

				// Update state with token data
				setCharacterData((prev) => {
					const updated = {
						...prev,
						token: tokenData  // Set the token object directly
					};
					console.log("Updated character data:", updated);  // Debug log
					return updated;
				});

				addLog("success", `Token created at ${tokenAddress}`);
				return tokenData;
			} else {
				throw new Error("Failed to find token creation event");
			}
		} catch (err) {
			console.error("Error getting receipt:", err);
			addLog("error", "Failed to confirm transaction");
			throw new Error("Failed to confirm transaction");
		} finally {
			setIsPending(false);
			setTxHash(null);
		}
	};

	const handleTokenCreation = async () => {
		if (!address) {
			setError("Please connect your wallet");
			return null;
		}

		setError("");
		addLog("loading", "Starting token creation process...");

		try {
			// Check SEI balance
			if (!seiBalance || seiBalance.value < MIN_SEI_BALANCE) {
				throw new Error(
					`Insufficient SEI balance. Need ${formatEther(MIN_SEI_BALANCE)} SEI`,
				);
			}

			addLog("loading", "Creating token with SEI payment...");
			const hash = await writeContract(config, {
				address: TOKEN_FACTORY_ADDRESS,
				abi: seiTokenFactoryAbi,
				functionName: "createMemeToken",
				args: [
					characterData.name,
					characterData.name.slice(0, 4).toUpperCase(),
					"helloworld",
					characterData.description || `Token for ${characterData.name}`,
				],
				value: CREATION_FEE, // Pay 0.1 SEI
			});

			const tokenData = await handleTxComplete(hash);
			console.log("Token creation completed with data:", tokenData); // Debug log
			return tokenData;
		} catch (err) {
			console.error("Token creation error:", err);
			const errorMessage = err instanceof Error ? err.message : "Token creation failed";
			setError(errorMessage);
			addLog("error", errorMessage);
			return null;
		}
	};

	// Add a ref to track token data
	const tokenDataRef = useRef(null);

	// Update handleCreate
	const handleCreate = async () => {
		if (!characterData.name.trim()) {
			setError("Name is required");
			return;
		}

		setError("");

		try {
			const tokenData = await handleTokenCreation();
			console.log("Token creation result:", tokenData);
			
			if (!tokenData) {
				console.log("Token creation failed or returned no data");
				return;
			}

			// Store token data in ref
			tokenDataRef.current = tokenData;

			// Update state and wait for it using a Promise
			await new Promise<void>((resolve) => {
				setCharacterData(prev => {
					const updated = {
						...prev,
						token: tokenData
					};
					console.log("Updating character data with token:", updated);
					resolve(); // Resolve after state update
					return updated;
				});
			});

			// Add a small delay to ensure state is updated
			await new Promise(resolve => setTimeout(resolve, 100));

			// Use ref to verify token data
			if (characterData.autoGenerateAfterToken && tokenDataRef.current) {
				console.log("Proceeding with character generation, token data:", tokenDataRef.current);
				await generateCharacter();
			}
		} catch (err) {
			console.error("Creation error:", err);
			const errorMessage = err instanceof Error ? err.message : "Creation failed";
			setError(errorMessage);
			addLog("error", errorMessage);
		}
	};

	// Update generateCharacter to use ref as backup
	const generateCharacter = async () => {
		// Check both state and ref for token data
		const tokenData = characterData.token || tokenDataRef.current;
		console.log("Current character data:", characterData);
		console.log("Token data from state:", characterData.token);
		console.log("Token data from ref:", tokenDataRef.current);

		if (!tokenData) {
			console.error("Token data missing at generation time");
			setError("Token must be created first");
			return;
		}

		if (!characterData.description) {
			setError("Description is required before generating character");
			return;
		}

		addLog("loading", "Generating character details...");
		setIsPending(true);

		try {
			// Structure the payload exactly like the game form
			const characterPayload = {
				name: characterData.name,
				description: characterData.description,
				type: 'ai_character',
				modelProvider: "openai",
				settings: {
					secrets: {},
					voice: {
						model: "en_US-male-medium"
					}
				},
				// Structure token data as expected by server
				token: {
					address: tokenData.address,
					name: tokenData.name,
					symbol: tokenData.symbol,
					transactionHash: tokenData.transactionHash,
					imageUrl: tokenData.imageUrl
				},
				twitter_handle: characterData.twitter_handle || null,
				theme: null,
				goal: null,
				antagonist: null
			};

			console.log("Sending payload:", characterPayload);

			const response = await fetch(
				`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/characters/generate`,
				{
					method: "POST",
					headers: { 
						"Content-Type": "application/json"
					},
					body: JSON.stringify(characterPayload),
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Server error:", errorText);
				throw new Error(errorText);
			}

			const data = await response.json();
			console.log("Response data:", data);

			if (data.success) {
				// Update local state with the response data
				setCharacterData((prev) => ({
					...prev,
					...data.data,
					// Convert flat token fields to nested token object for UI
					token: data.data.token_address ? {
						address: data.data.token_address,
						name: data.data.token_name,
						symbol: data.data.token_symbol,
						imageUrl: data.data.token_image_url,
						transactionHash: data.data.token_tx_hash
					} : prev.token
				}));

				addLog("success", "Character generated successfully");
				onComplete(data.data);
			} else {
				throw new Error(data.error || "Character generation failed");
			}
		} catch (err) {
			console.error("Generation error:", err);
			const errorMessage = err instanceof Error ? err.message : "Generation failed";
			addLog("error", errorMessage);
			setError(errorMessage);
		} finally {
			setIsPending(false);
		}
	};

	const handleInputChange = (field: keyof CharacterData, value: any) => {
		setCharacterData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const isLoading = isPending;
	//const needsApproval = !allowance;
	const needsApproval = false;
	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<div className="lg:col-span-2">
				<Card>
					<CardHeader>
						<CardTitle>Create AI Character</CardTitle>
						<CardDescription>
							First, we'll create a token for your character, then generate its
							personality
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="name">Character Name</Label>
							<Input
								id="name"
								value={characterData.name}
								onChange={(e) => handleInputChange("name", e.target.value)}
								placeholder="Enter character name"
								disabled={isLoading || !!characterData.token}
								maxLength={50}
								required
								className="bg-background"
							/>
						</div>

						{!characterData.token && (
							<div className="flex items-center space-x-2">
								<Switch
									checked={characterData.autoGenerateAfterToken}
									onCheckedChange={(checked) =>
										handleInputChange("autoGenerateAfterToken", checked)
									}
									disabled={isLoading}
								/>
								<Label>Auto-generate character after token creation</Label>
							</div>
						)}

						{characterData.token && (
							<div>
								<Label htmlFor="description">Description</Label>
								<Textarea
									id="description"
									value={characterData.description}
									onChange={(e) =>
										handleInputChange("description", e.target.value)
									}
									placeholder="Describe your character"
									rows={4}
									disabled={isLoading}
									maxLength={200}
									required
									className="bg-background"
								/>
							</div>
						)}

						<div>
							<Label htmlFor="twitter">Twitter Handle</Label>
							<div className="relative">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
									@
								</span>
								<Input
									id="twitter"
									value={characterData.twitter_handle || ''}
									onChange={(e) => handleInputChange("twitter_handle", e.target.value)}
									placeholder="twitter_handle"
									className="pl-8 bg-background"
									disabled={isLoading}
								/>
							</div>
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

						{characterData.token && (
							<Alert>
								<AlertTitle>Token Created</AlertTitle>
								<AlertDescription>
									<div>Name: {characterData.token.name}</div>
									<div>Symbol: {characterData.token.symbol}</div>
									<div className="font-mono text-xs truncate">
										Address: {characterData.token.address}
									</div>
								</AlertDescription>
							</Alert>
						)}

						{!characterData.token && address && (
							<Alert>
								<AlertTitle>Network Costs</AlertTitle>
								<AlertDescription>
									<div>
										Current SEI Balance:{" "}
										{seiBalance ? formatEther(seiBalance.value) : "0"} SEI
									</div>
									<div>Required AI Arcade Token: {CREATION_FEE.toString()} AI Arcade Token</div>
									<div>Estimated Gas: ~{formatEther(MIN_SEI_BALANCE)} SEI</div>
								</AlertDescription>
							</Alert>
						)}

						<div className="flex gap-4">
							{!characterData.token ? (
								<Button
									className="w-full"
									onClick={handleCreate}
									disabled={
										!address ||
										isLoading ||
										!characterData.name ||
										(!!seiBalance && seiBalance.value < MIN_SEI_BALANCE)
									}
								>
									{isLoading ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											{needsApproval
												? "Approving PTOKEN..."
												: "Creating Token..."}
										</>
									) : seiBalance && seiBalance.value < MIN_SEI_BALANCE ? (
										"Insufficient ETH Balance"
									) : needsApproval ? (
										"Approve PTOKEN"
									) : (
										"Create Token"
									)}
								</Button>
							) : (
								<Button
									className="w-full"
									onClick={generateCharacter}
									disabled={isLoading}
								>
									{isLoading ? (
										<>
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
											Generating Character...
										</>
									) : (
										<>
											<Wand2 className="w-4 h-4 mr-2" />
											Generate Character
										</>
									)}
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="lg:col-span-1">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Terminal className="w-4 h-4" />
							Creation Progress
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div
							ref={terminalRef}
							className="bg-black rounded-lg p-4 font-mono text-xs space-y-1 h-[400px] overflow-y-auto"
						>
							{terminalLogs.length === 0 ? (
								<div className="text-gray-500">Waiting to start...</div>
							) : (
								terminalLogs.map((log, index) => (
									<div
										key={index}
										className={`
                      ${log.type === "error" ? "text-red-400" : ""}
                      ${log.type === "success" ? "text-green-400" : ""}
                      ${log.type === "info" ? "text-blue-400" : ""}
                      ${log.type === "loading" ? "text-yellow-400" : ""}
                    `}
									>
										<span className="text-gray-500">[{log.timestamp}]</span>{" "}
										{log.message}
									</div>
								))
							)}
						</div>

						{characterData.token && (
							<div className="mt-4 space-y-2">
								<div className="text-sm font-medium">Token Info</div>
								<div className="text-xs space-y-1 text-muted-foreground">
									<div>Name: {characterData.token.name}</div>
									<div>Symbol: {characterData.token.symbol}</div>
									<div className="font-mono truncate">
										Address: {characterData.token.address}
									</div>
									{characterData.token.transactionHash && (
										<div className="font-mono truncate">
											Tx: {characterData.token.transactionHash}
										</div>
									)}
								</div>
							</div>
						)}

						{/* Creation Status */}
						<div className="mt-4 space-y-2">
							<div className="text-sm font-medium">Status</div>
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<div
										className={`w-2 h-2 rounded-full ${characterData.token ? "bg-green-500" : isLoading ? "bg-yellow-500 animate-pulse" : "bg-gray-300"}`}
									/>
									<span className="text-xs">Token Creation</span>
								</div>
								<div className="flex items-center gap-2">
									<div
										className={`w-2 h-2 rounded-full ${characterData.description ? "bg-green-500" : characterData.token && isLoading ? "bg-yellow-500 animate-pulse" : "bg-gray-300"}`}
									/>
									<span className="text-xs">Character Generation</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default CharacterForm;
