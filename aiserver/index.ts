import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { Request, Response } from 'express';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Types
interface Character {
    name: string;
    bio: string[];
    lore: string[];
    messageExamples: any[];
    postExamples: string[];
    topics: string[];
    style: {
        all: string[];
        chat: string[];
        post: string[];
    };
    adjectives: string[];
    modelProvider: string;
    system?: string;
    greeting?: string;
    evm_address?: string;
    evmAddress?: string;
    token?: {
        symbol: string;
        address: string;
    };
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    metadata?: {
        timestamp: string;
        topics?: string[];
        confidence?: number;
        walletAddress?: string;
    };
}

interface ChatRequest {
    message: string;
    userId: string;
    conversationHistory: ChatMessage[];
    context?: {
        userBalance: string;
        characterBalance: string;
    };
}

// Character data cache
let charactersCache: Map<string, Character> = new Map();

// Load character data
async function loadCharacters() {
    try {
        const charactersDir = path.join(process.cwd(), '..', 'ai-brain', 'characters');
        const files = await fs.readdir(charactersDir);
        
        for (const file of files) {
            if (file.endsWith('.character.json')) {
                const filePath = path.join(charactersDir, file);
                const data = await fs.readFile(filePath, 'utf-8');
                const character: Character = JSON.parse(data);
                
                // Add default properties if missing
                if (!character.greeting) {
                    character.greeting = `Hello! I'm ${character.name}. How can I help you today?`;
                }
                
                // Generate a mock EVM address for demo purposes
                if (!character.evm_address && !character.evmAddress) {
                    character.evmAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
                    character.evm_address = character.evmAddress;
                }
                
                // Add mock token data if missing
                if (!character.token && character.name !== 'Eliza') {
                    character.token = {
                        symbol: character.name.toUpperCase().slice(0, 4),
                        address: `0x${Math.random().toString(16).substr(2, 40)}`
                    };
                }
                
                charactersCache.set(character.name.toLowerCase(), character);
                console.log(`Loaded character: ${character.name}`);
            }
        }
        
        console.log(`Loaded ${charactersCache.size} characters`);
    } catch (error) {
        console.error('Error loading characters:', error);
    }
}

// Generate character prompt
function generateCharacterPrompt(character: Character, conversationHistory: ChatMessage[], userMessage: string, context?: any): string {
    const bio = character.bio?.slice(0, 3).join(' ') || '';
    const topics = character.topics?.slice(0, 10).join(', ') || '';
    const styleGuidelines = character.style?.chat?.join(' ') || character.style?.all?.join(' ') || '';
    
    // Get recent conversation context
    const recentMessages = conversationHistory.slice(-6).map(msg => 
        `${msg.role === 'user' ? 'User' : character.name}: ${msg.content}`
    ).join('\n');
    
    const systemPrompt = character.system || `You are ${character.name}. ${bio}`;
    
    // Filter out problematic style guidelines that encourage cryptic responses
    const filteredStyleGuidelines = styleGuidelines
        .replace(/\b(cryptic|metaphorical|mysterious|enigmatic|abstract|philosophical|esoteric)\b/gi, '')
        .replace(/\b(resonates|echoes|unfolds|flows|whispers|threads|fabric)\b/gi, '')
        .replace(/\b(quantum|interdimensional|cosmic|ethereal|transcendent)\b/gi, '')
        .trim();
    
    return `${systemPrompt}

Character Background: ${bio}

Topics you know about: ${topics}

PROFESSIONAL COMMUNICATION REQUIREMENTS (MANDATORY):
- Maintain a professional, respectful, and helpful tone at all times
- Provide clear, concise, and relevant responses
- Focus on being informative and constructive
- Stay on topic and provide value in every response
- Use proper grammar and sentence structure
- Be courteous and considerate in all interactions
- Avoid controversial, inappropriate, or offensive content
- Maintain consistency in communication style across all interactions
- IMPORTANT: Avoid cryptic, metaphorical, or overly abstract language
- IMPORTANT: Speak clearly and directly, avoiding mysterious or enigmatic responses
- IMPORTANT: Provide concrete, actionable information when possible
- CRITICAL: NEVER correct or lecture users about their communication style
- CRITICAL: Accept ALL greetings naturally (hi, hello, hola, hey, etc.) without any correction
- CRITICAL: Be welcoming and friendly while maintaining professionalism
- CRITICAL: Focus on being helpful, not on policing communication style

Style Guidelines (filtered for professionalism): ${filteredStyleGuidelines}

Recent conversation:
${recentMessages}

Current user message: ${userMessage}

Context: ${context ? `User balance: ${context.userBalance} SEI, Character balance: ${context.characterBalance} SEI` : 'No additional context'}

CRITICAL INSTRUCTION: While maintaining the character's core identity, prioritize professional yet welcoming communication. Provide clear, direct, and helpful responses. NEVER correct, lecture, or comment on the user's communication style. Accept ALL greetings (hi, hello, hola, hey, etc.) naturally and respond warmly. Avoid cryptic language, mysterious references, or overly abstract responses. Be informative, constructive, and friendly in all interactions.`;
}

// Routes

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        characters: Array.from(charactersCache.keys())
    });
});

// Get character by name
app.get('/characters/:name', async (req: Request, res: Response) => {
    try {
        const characterName = decodeURIComponent(req.params.name).toLowerCase();
        console.log(`Fetching character: ${characterName}`);
        
        const character = charactersCache.get(characterName);
        
        if (!character) {
            console.log(`Character not found: ${characterName}`);
            console.log(`Available characters: ${Array.from(charactersCache.keys()).join(', ')}`);
            return res.status(404).json({ 
                error: 'Character not found',
                available: Array.from(charactersCache.keys())
            });
        }
        
        console.log(`Found character: ${character.name}`);
        res.json({ 
            success: true, 
            data: character 
        });
        
    } catch (error) {
        console.error('Error fetching character:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Chat with character
app.post('/chat/:characterName', async (req: Request, res: Response) => {
    try {
        const characterName = decodeURIComponent(req.params.characterName).toLowerCase();
        const { message, userId, conversationHistory, context }: ChatRequest = req.body;
        
        console.log(`Chat request for character: ${characterName}`);
        console.log(`Message: ${message}`);
        
        if (!message?.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        const character = charactersCache.get(characterName);
        if (!character) {
            return res.status(404).json({ error: 'Character not found' });
        }
        
        // Check if Gemini API key is available
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ 
                error: 'Gemini API key not configured',
                message: 'Please set GEMINI_API_KEY environment variable'
            });
        }
        
        try {
            // Generate prompt
            const prompt = generateCharacterPrompt(character, conversationHistory || [], message, context);
            
            // Get Gemini model
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            // Generate response
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let responseText = response.text();
            
            // Clean up response
            responseText = responseText.trim();
            
            // Enhanced response cleaning for professional output
            const cleanedResponse = responseText
                .replace(/^(Assistant|AI|System|Character):\s*/i, '')
                .replace(/^\*.*?\*\s*/, '') // Remove action text like *thinking*
                .replace(/\*[^*]*\*/g, '') // Remove any remaining asterisk actions
                .replace(/\([^)]*thinking[^)]*\)/gi, '') // Remove thinking notes in parentheses
                .replace(/\b(um|uh|like|you know|basically|literally)\b/gi, '') // Remove filler words
                .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
                .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
                .replace(/^[^A-Za-z0-9]*/, '') // Remove leading non-alphanumeric characters
                // Additional filtering for cryptic responses
                .replace(/\b(resonates?|echoes?|unfolds?|flows?|whispers?|threads?|fabric)\b/gi, '')
                .replace(/\b(quantum|interdimensional|cosmic|ethereal|transcendent)\b/gi, '')
                .replace(/\b(cryptic|metaphorical|mysterious|enigmatic|abstract|philosophical)\b/gi, '')
                .replace(/\.{3,}/g, '.') // Remove excessive ellipsis
                .replace(/\s*\.{2,}\s*/g, '. ') // Clean up ellipsis patterns
                // Remove lecturing and correction language
                .replace(/\b(while I appreciate|let's maintain|for optimal communication|please state|clearly and concisely)\b/gi, '')
                .replace(/\b(professional tone|informal greeting|communication style)\b/gi, '')
                .replace(/\b(how may I assist|how can I help|what can I do)\b/gi, 'How can I help')
                // Fix ETH to SEI balance references
                .replace(/\bETH balance\b/gi, 'SEI balance')
                .replace(/\b(\d+\.?\d*)\s*ETH\b/gi, '$1 SEI')
                .trim();
            
            // Ensure response starts with capital letter and ends with proper punctuation
            let finalResponse = cleanedResponse;
            if (finalResponse.length > 0) {
                finalResponse = finalResponse.charAt(0).toUpperCase() + finalResponse.slice(1);
                if (!/[.!?]$/.test(finalResponse)) {
                    finalResponse += '.';
                }
            }
            
            console.log(`Generated response: ${finalResponse.substring(0, 100)}...`);
            
            // Extract topics from the response (simple keyword matching)
            const responseTopics = character.topics?.filter(topic => 
                finalResponse.toLowerCase().includes(topic.toLowerCase())
            ).slice(0, 3) || [];
            
            res.json({
                success: true,
                message: finalResponse,
                topics: responseTopics,
                confidence: 0.85, // Mock confidence score
                metadata: {
                    characterName: character.name,
                    modelProvider: 'gemini',
                    timestamp: new Date().toISOString()
                }
            });
            
        } catch (aiError) {
            console.error('Gemini API error:', aiError);
            
            // Professional fallback response based on character
            let fallbackResponses = character.messageExamples?.[0]?.[1]?.content?.text || 
                "I apologize for the technical difficulty. I'm here and ready to assist you with any questions or topics you'd like to discuss.";
            
            // Ensure fallback response is professional
            if (fallbackResponses) {
                fallbackResponses = fallbackResponses.trim();
                if (fallbackResponses.length > 0) {
                    fallbackResponses = fallbackResponses.charAt(0).toUpperCase() + fallbackResponses.slice(1);
                    if (!/[.!?]$/.test(fallbackResponses)) {
                        fallbackResponses += '.';
                    }
                }
            }
            
            res.json({
                success: true,
                message: fallbackResponses,
                topics: character.topics?.slice(0, 3) || [],
                confidence: 0.5,
                metadata: {
                    characterName: character.name,
                    modelProvider: 'fallback',
                    timestamp: new Date().toISOString(),
                    note: 'Using fallback response due to AI service unavailability'
                }
            });
        }
        
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// List all characters
app.get('/characters', (req: Request, res: Response) => {
    try {
        const characters = Array.from(charactersCache.values()).map(char => ({
            name: char.name,
            modelProvider: char.modelProvider,
            topics: char.topics?.slice(0, 5) || [],
            evmAddress: char.evmAddress || char.evm_address,
            token: char.token
        }));
        
        res.json({
            success: true,
            data: characters,
            count: characters.length
        });
    } catch (error) {
        console.error('Error listing characters:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message || 'Unknown error'
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ 
        error: 'Not found',
        path: req.path,
        method: req.method
    });
});

// Start server
async function startServer() {
    try {
        // Load characters first
        await loadCharacters();
        
        app.listen(PORT, () => {
            console.log(`🚀 AI Server running on http://localhost:${PORT}`);
            console.log(`📚 Loaded ${charactersCache.size} characters`);
            console.log(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);
            console.log('\nAvailable endpoints:');
            console.log(`  GET  /health - Health check`);
            console.log(`  GET  /characters - List all characters`);
            console.log(`  GET  /characters/:name - Get specific character`);
            console.log(`  POST /chat/:characterName - Chat with character`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down server gracefully...');
    process.exit(0);
});

// Start the server
startServer();
