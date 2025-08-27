import "@rainbow-me/rainbowkit/styles.css";
import {
	getDefaultConfig,
	RainbowKitProvider,
	midnightTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { type Chain } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
const queryClient = new QueryClient();

// Sei EVM chains (ref: https://docs.sei.io/)
const seiMainnet: Chain = {
	id: 1329,
	name: "Sei EVM",
	nativeCurrency: { name: "Sei", symbol: "SEI", decimals: 18 },
	rpcUrls: {
		default: { http: [import.meta.env.VITE_SEI_RPC_MAINNET || "https://evm-rpc.sei-apis.com"] },
		public: { http: [import.meta.env.VITE_SEI_RPC_MAINNET || "https://evm-rpc.sei-apis.com"] },
	},
	blockExplorers: {
		default: { name: "SeiTrace", url: import.meta.env.VITE_SEI_EXPLORER_URL || "https://seitrace.com" },
	},
};

const seiTestnet: Chain = {
	id: 1328,
	name: "Sei Testnet",
	nativeCurrency: { name: "Sei", symbol: "SEI", decimals: 18 },
	rpcUrls: {
		default: { http: [import.meta.env.VITE_SEI_RPC_TESTNET || "https://evm-rpc-testnet.sei-apis.com"] },
		public: { http: [import.meta.env.VITE_SEI_RPC_TESTNET || "https://evm-rpc-testnet.sei-apis.com"] },
	},
	blockExplorers: {
		default: { name: "SeiTrace", url: import.meta.env.VITE_SEI_EXPLORER_URL || "https://seitrace.com" },
	},
};

const network = (import.meta.env.VITE_SEI_NETWORK || "testnet").toLowerCase();
const selectedChain = network === "mainnet" ? seiMainnet : seiTestnet;
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "0375994bb6bfd058c6b7876ee734e1c5";

export const config = getDefaultConfig({
	appName: "Synthra",
	projectId,
	chains: [selectedChain],
	ssr: true, // If your dApp uses server side rendering (SSR)
});
//0xD80DC42a1c0AD05CCF2f95Ee7831B4225b356e7D
//TokenFactory v1
export const EVMProvider = ({ children }: { children: React.ReactNode }) => {
	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider theme={midnightTheme()}>
					{children}
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
};
