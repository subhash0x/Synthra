import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CharacterDashboard from "@/components/CharacterDashboard";
import CreateCharacterPage from "@/components/CreateCharacterPage";
import ChatInterface from "@/components/chatui/ChatInterface";
import GameChatInterface from "@/components/chatui/GameChatInterface";
import { ThemeProvider } from "@/components/theme-provider";
import { EVMProvider } from "@/components/evm-provider";
function App() {
	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<EVMProvider>
				<div className="min-h-screen">
					<Router>
						<Routes>
							<Route path="/" element={<CharacterDashboard />} />
							<Route path="/create" element={<CreateCharacterPage />} />
							<Route path="/chat/:characterName" element={<ChatInterface />} />
							<Route path="/game/:characterName" element={<GameChatInterface />} />

						</Routes>
					</Router>
				</div>
			</EVMProvider>
		</ThemeProvider>
	);
}

export default App;
