//@ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import Navbar from "@/components/Navbar";
import CombinedRightPanel from "../CombinedRight";
import BackgroundMedia, { useNekoBackground } from "./BackgroundMedia";
import Message from "./Message";
import { CharacterDetails, WalletDetails } from "./CharacterDetails";
import { TokenMetrics } from "@/components/TokenMetrics";

const ChatInterface = () => {
	// State management
	const { characterName } = useParams();
	const navigate = useNavigate();
	const [messages, setMessages] = useState([]);
	const [inputMessage, setInputMessage] = useState("");
	const [loading, setLoading] = useState(false);
	const [character, setCharacter] = useState(null);
	const [error, setError] = useState(null);

	// Refs
	const scrollAreaRef = useRef(null);
	const messagesEndRef = useRef(null);

	// Wallet integration
	const { address: userWalletAddress, isConnected } = useAccount();
	const { data: userBalance } = useBalance({
		address: userWalletAddress,
	});
	const { data: characterBalance } = useBalance({
		address: character?.evm_address,
	});

	// Background handling
	const { backgroundUrl, loading: backgroundLoading } =
		useNekoBackground(characterName);

	// Effect hooks
	useEffect(() => {
		if (isConnected) {
			fetchCharacter();
		}
	}, [characterName, isConnected]);

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	// API interactions
	const fetchCharacter = async () => {
		try {
			console.log("Fetching character:", characterName);
			const encodedName = encodeURIComponent(characterName || '');
			const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/characters/${encodedName}`;
			console.log("Fetching from URL:", apiUrl);

			const response = await fetch(apiUrl, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					// Add any additional headers your API requires
				},
				credentials: 'include', // Include credentials if needed
			});

			if (response.status === 502) {
				throw new Error("Server is temporarily unavailable. Please try again later.");
			}
			
			if (!response.ok) {
				const errorText = await response.text();
				console.error("API Error Response:", errorText);
				throw new Error(`Character not found (Status: ${response.status})`);
			}

			const data = await response.json();
			console.log("Received character data:", data.data);
			
			if (!data.data || !data.data.name) {
				console.error("Invalid data structure:", data);
				throw new Error("Invalid character data received");
			}

			setCharacter(data.data);

			// Construct greeting message safely
			const greeting = data.data.greeting || '';
			const specialization = data.data.topics?.length 
				? `I specialize in ${data.data.topics.slice(0, 3).join(", ")}`
				: '';
			const initialMessage = {
				role: "assistant",
				content: `Hello! I'm ${data.data.name}. ${greeting || specialization}. How can I assist you today?`,
				metadata: {
					timestamp: new Date().toISOString(),
					topics: data.data.topics?.slice(0, 3) || [],
				},
			};
			console.log("Setting initial message:", initialMessage);
			setMessages([initialMessage]);
		} catch (err) {
			console.error("Error in fetchCharacter:", err);
			const errorMessage = err instanceof Error ? err.message : "Failed to fetch character";
			setError(errorMessage);
		}
	};

	const handleSendMessage = async () => {
		if (!inputMessage.trim() || !isConnected || !character) return;

		const newMessage = {
			role: "user",
			content: inputMessage,
			metadata: {
				timestamp: new Date().toISOString(),
				walletAddress: userWalletAddress,
			},
		};

		setMessages((prev) => [...prev, newMessage]);
		setInputMessage("");
		setLoading(true);

		try {
			const encodedName = encodeURIComponent(character.name);
			const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/chat/${encodedName}`;
			console.log("Sending message to URL:", apiUrl);

			const response = await fetch(apiUrl, {
				method: "POST",
				headers: { 
					"Content-Type": "application/json",
					// Add any additional headers your API requires
				},
				credentials: 'include', // Include credentials if needed
				body: JSON.stringify({
					message: inputMessage,
					userId: userWalletAddress,
					conversationHistory: messages,
					context: {
						userBalance: userBalance ? formatEther(userBalance.value) : "0",
						characterBalance: characterBalance
							? formatEther(characterBalance.value)
							: "0",
					},
				}),
			});

			if (response.status === 502) {
				throw new Error("Server is temporarily unavailable. Please try again later.");
			}

			if (!response.ok) {
				const errorText = await response.text();
				console.error("API Error Response:", errorText);
				throw new Error(`Failed to get response (Status: ${response.status})`);
			}

			const data = await response.json();
			if (!data.message) {
				console.error("Invalid response data:", data);
				throw new Error("Invalid response from server");
			}

			setMessages((prev) => [
				...prev,
				{
					role: "assistant",
					content: data.message,
					metadata: {
						timestamp: new Date().toISOString(),
						topics: data.topics || [],
						confidence: data.confidence,
					},
				},
			]);
		} catch (err) {
			console.error("Error in handleSendMessage:", err);
			const errorMessage = err instanceof Error ? err.message : "Failed to send message";
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	};

	// Utility functions
	const scrollToBottom = () => {
		if (scrollAreaRef.current) {
			const scrollContainer = scrollAreaRef.current.querySelector(
				"[data-radix-scroll-area-viewport]",
			);
			if (scrollContainer) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
		}
	};

	const handleKeyPress = (e) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	// Error handling render
	if (error) {
		return (
			<div className="container mx-auto p-6">
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
				<Button onClick={fetchCharacter} className="mt-4">
					Retry
				</Button>
			</div>
		);
	}

	// Main render
	return (
		<div className="container mx-auto p-3 h-screen flex flex-col">
			<Navbar />
			<div className="w-full flex-1 flex pt-3 flex-col min-h-0">
				<BackgroundMedia characterName={characterName} />

				{/* SEI-inspired Header */}
				<div className="flex items-center justify-between mb-4 relative z-10">
					<div className="flex items-center gap-4">
						<Button
							variant="outline"
							onClick={() => navigate("/")}
							className="backdrop-blur-sm sei-border-gradient hover:sei-glow transition-all duration-300"
						>
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back
						</Button>
						{isConnected && character?.evmAddress && (
							<Badge variant="secondary" className="font-mono backdrop-blur-sm sei-border-gradient">
								{`${character.evmAddress.slice(0, 6)}...${character.evmAddress.slice(-4)}`}
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-4">
						<CharacterDetails
							character={character}
							backgroundUrl={backgroundUrl}
						/>
						<WalletDetails
							userWalletAddress={userWalletAddress}
							userBalance={userBalance}
							character={character}
							characterBalance={characterBalance}
						/>
						{character && (
							<div className="sei-border-gradient backdrop-blur-sm rounded-lg px-4 py-2">
								<h1 className="text-2xl font-bold sei-text-gradient">
									Chat with {character.name}
								</h1>
							</div>
						)}
					</div>
				</div>

				{/* Main content */}
				{!isConnected ? (
					<Card className="p-4 relative backdrop-blur-sm bg-background/50 sei-border-gradient">
						<CardContent className="text-center relative z-10">
							<h2 className="text-base font-semibold mb-3 sei-text-gradient">
								Connect Your Wallet
							</h2>
							<p className="text-muted-foreground mb-3 text-sm">
								Please connect your wallet to start chatting with characters
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-12 gap-4 flex-1">
						{/* Chat Card */}
						<Card className="col-span-8 flex-1 flex flex-col min-h-0 relative overflow-hidden backdrop-blur-sm bg-background/40 border">
							<CardHeader className="relative z-10">
								<CardTitle>
									{character && (
										<div className="flex items-center gap-4">
											<Avatar className="w-10 h-10">
												<AvatarImage src={backgroundUrl} alt={character.name} />
												<AvatarFallback className="sei-gradient text-primary-foreground">
													{character.name[0]}
												</AvatarFallback>
											</Avatar>
											<div>
												<h3 className="text-base font-semibold sei-text-gradient">
													{character.name}
													{character.token && (
														<Badge variant="outline" className="ml-2 font-mono text-[10px] sei-border-gradient">
															${character.token.symbol}
														</Badge>
													)}
												</h3>
												<p className="text-xs text-white/70">
													{character?.modelProvider}
												</p>
											</div>
										</div>
									)}
								</CardTitle>
							</CardHeader>

							<CardContent className="flex-1 flex flex-col min-h-0 p-4 relative z-10">
								<ScrollArea
									ref={scrollAreaRef}
									className="flex-1 pr-4 mask-linear-gradient"
									type="always"
								>
									<div className="space-y-4">
										{messages.map((msg, idx) => (
											<Message
												key={idx}
												message={msg}
												index={idx}
												totalMessages={messages.length}
												character={character}
												backgroundUrl={backgroundUrl}
											/>
										))}
										{loading && (
											<div className="flex justify-start">
												<div className="bg-muted/80 backdrop-blur-sm rounded-lg p-3">
													<Loader2 className="w-4 h-4 animate-spin" />
												</div>
											</div>
										)}
										<div ref={messagesEndRef} />
									</div>
								</ScrollArea>

								<div className="mt-4 flex gap-2">
									<Input
										value={inputMessage}
										onChange={(e) => setInputMessage(e.target.value)}
										onKeyPress={handleKeyPress}
										placeholder="Type your message..."
										disabled={loading}
										className="flex-1 bg-background/50 backdrop-blur-sm text-white placeholder-white/70"
									/>
									<Button
										onClick={handleSendMessage}
										disabled={loading || !inputMessage.trim()}
										className="bg-primary/80 hover:bg-primary/90 backdrop-blur-sm"
									>
										{loading ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<Send className="w-4 h-4" />
										)}
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Right Panel */}
						<div className="col-span-4 bg-transparent rounded-xl">
							<CombinedRightPanel character={character} />
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default ChatInterface;
