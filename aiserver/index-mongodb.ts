import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { Character, ICharacter } from './models/Character.js';

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

// Types for chat functionality
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

// Helper function to generate character prompt
function generateCharacterPrompt(character: ICharacter, conversationHistory: ChatMessage[], userMessage: string, context?: any): string {
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
app.get('/health', async (req, res) => {
    try {
        const characterCount = await Character.countDocuments();
        res.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            database: 'connected',
            characterCount
        });
    } catch (error) {
        res.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            characterCount: 0
        });
    }
});

// List all characters
app.get('/characters', async (req, res) => {
    try {
        const characters = await Character.find({})
            .select('name description type modelProvider topics evmAddress evm_address token_address token_name token_symbol twitter_handle created_at updated_at token')
            .sort({ created_at: -1 });
        
        // Transform data to match frontend expectations
        const transformedCharacters = characters.map(char => ({
            id: char._id,
            name: char.name,
            description: char.description,
            evm_address: char.evmAddress || char.evm_address,
            type: char.type,
            twitter_handle: char.twitter_handle,
            token_address: char.token_address || char.token?.address,
            token_name: char.token_name || char.token?.name,
            token_symbol: char.token_symbol || char.token?.symbol,
            token_image_url: char.token?.image_url,
            theme: char.theme,
            goal: char.goal,
            antagonist: char.antagonist,
            created_at: char.created_at,
            updated_at: char.updated_at,
            ipfs_url: char.ipfs_url,
            modelProvider: char.modelProvider,
            topics: char.topics?.slice(0, 5) || [],
            token: char.token
        }));

        res.json({
            success: true,
            characters: transformedCharacters,
            count: transformedCharacters.length
        });
    } catch (error) {
        console.error('Error listing characters:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get character by name
app.get('/characters/:name', async (req, res) => {
    try {
        const characterName = decodeURIComponent(req.params.name);
        console.log(`Fetching character: ${characterName}`);
        
        const character = await Character.findOne({ 
            name: { $regex: new RegExp(`^${characterName}$`, 'i') } 
        });
        
        if (!character) {
            console.log(`Character not found: ${characterName}`);
            return res.status(404).json({ 
                error: 'Character not found',
                message: `Character '${characterName}' does not exist`
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

// Create new character
app.post('/characters', async (req, res) => {
    try {
        const characterData = req.body;
        
        // Check if character already exists
        const existingCharacter = await Character.findOne({ 
            name: { $regex: new RegExp(`^${characterData.name}$`, 'i') } 
        });
        
        if (existingCharacter) {
            return res.status(409).json({ 
                error: 'Character already exists',
                message: `Character '${characterData.name}' already exists`
            });
        }
        
        // Create new character
        const character = new Character(characterData);
        await character.save();
        
        console.log(`Created character: ${character.name}`);
        res.status(201).json({ 
            success: true, 
            data: character,
            message: 'Character created successfully'
        });
        
    } catch (error) {
        console.error('Error creating character:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update character
app.put('/characters/:name', async (req, res) => {
    try {
        const characterName = decodeURIComponent(req.params.name);
        const updateData = req.body;
        
        const character = await Character.findOneAndUpdate(
            { name: { $regex: new RegExp(`^${characterName}$`, 'i') } },
            { ...updateData, updated_at: new Date() },
            { new: true, runValidators: true }
        );
        
        if (!character) {
            return res.status(404).json({ 
                error: 'Character not found',
                message: `Character '${characterName}' does not exist`
            });
        }
        
        console.log(`Updated character: ${character.name}`);
        res.json({ 
            success: true, 
            data: character,
            message: 'Character updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating character:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete character
app.delete('/characters/:name', async (req, res) => {
    try {
        const characterName = decodeURIComponent(req.params.name);
        
        const character = await Character.findOneAndDelete({ 
            name: { $regex: new RegExp(`^${characterName}$`, 'i') } 
        });
        
        if (!character) {
            return res.status(404).json({ 
                error: 'Character not found',
                message: `Character '${characterName}' does not exist`
            });
        }
        
        console.log(`Deleted character: ${character.name}`);
        res.json({ 
            success: true, 
            message: 'Character deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting character:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Generate character details with AI
app.post('/characters/generate', async (req, res) => {
    try {
        const characterData = req.body;
        console.log('Generate character request:', characterData);
        
        if (!characterData.name || !characterData.description) {
            return res.status(400).json({ 
                error: 'Name and description are required',
                message: 'Both name and description must be provided for character generation'
            });
        }

        // Check if Gemini API key is available for enhanced generation
        if (!process.env.GEMINI_API_KEY) {
            // Return basic generated data without AI enhancement
            const basicGeneratedData = {
                description: characterData.description,
                background: `${characterData.name} is an AI character with unique personality traits.`,
                traits: ['intelligent', 'helpful', 'creative'],
                bio: [characterData.description],
                lore: [`${characterData.name} was created to assist and engage with users.`],
                topics: ['general conversation', 'assistance', 'creativity'],
                style: {
                    all: ['be helpful', 'be engaging', 'stay in character'],
                    chat: ['respond naturally', 'ask follow-up questions'],
                    post: ['be informative', 'use examples']
                },
                adjectives: ['intelligent', 'helpful', 'creative', 'engaging']
            };

            return res.json({
                success: true,
                data: basicGeneratedData,
                message: 'Character generated with basic template',
                enhanced: false
            });
        }

        try {
            // Use Gemini to generate enhanced character details
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const prompt = `Generate detailed character information for an AI character named "${characterData.name}" with the description: "${characterData.description}".

Please provide a JSON response with the following structure:
{
  "description": "Enhanced description (2-3 sentences)",
  "background": "Character background story (3-4 sentences)",
  "traits": ["trait1", "trait2", "trait3", "trait4", "trait5"],
  "bio": ["bio paragraph 1", "bio paragraph 2", "bio paragraph 3"],
  "lore": ["lore item 1", "lore item 2", "lore item 3"],
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "style": {
    "all": ["style guideline 1", "style guideline 2", "style guideline 3"],
    "chat": ["chat guideline 1", "chat guideline 2", "chat guideline 3"],
    "post": ["post guideline 1", "post guideline 2", "post guideline 3"]
  },
  "adjectives": ["adjective1", "adjective2", "adjective3", "adjective4", "adjective5"],
  "greeting": "A greeting message this character would say",
  "messageExamples": [
    [
      {"user": "{{user1}}", "content": {"text": "example user message"}},
      {"user": "${characterData.name}", "content": {"text": "example character response"}}
    ]
  ]
}

Make sure the character personality is consistent with the name "${characterData.name}" and description "${characterData.description}". Be creative but appropriate.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let responseText = response.text();
            
            // Clean up the response to extract JSON
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            let generatedData;
            try {
                generatedData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse Gemini response:', responseText);
                throw new Error('Failed to parse AI response');
            }

            // Create the complete character object
            const enhancedCharacterData = {
                name: characterData.name,
                description: generatedData.description || characterData.description,
                background: generatedData.background,
                traits: generatedData.traits || [],
                bio: generatedData.bio || [characterData.description],
                lore: generatedData.lore || [],
                messageExamples: generatedData.messageExamples || [],
                postExamples: [],
                topics: generatedData.topics || [],
                style: generatedData.style || {
                    all: ['be helpful', 'stay in character'],
                    chat: ['be conversational', 'be engaging'],
                    post: ['be informative', 'be creative']
                },
                adjectives: generatedData.adjectives || [],
                modelProvider: characterData.modelProvider || 'gemini',
                system: `You are ${characterData.name}. ${generatedData.background || characterData.description}`,
                greeting: generatedData.greeting || `Hello! I'm ${characterData.name}. How can I help you?`,
                type: characterData.type || 'ai_character',
                evmAddress: characterData.token?.address,
                token: characterData.token || null,
                twitter_handle: characterData.twitter_handle,
                theme: characterData.theme,
                goal: characterData.goal,
                antagonist: characterData.antagonist
            };

            // Save the generated character to database
            const character = new Character(enhancedCharacterData);
            await character.save();

            console.log(`Generated and saved character: ${character.name}`);
            
            res.json({
                success: true,
                data: enhancedCharacterData,
                message: 'Character generated and saved successfully',
                enhanced: true,
                characterId: character._id
            });

        } catch (aiError) {
            console.error('Gemini API error during generation:', aiError);
            
            // Fallback to basic generation
            const fallbackData = {
                description: characterData.description,
                background: `${characterData.name} is a unique AI character with distinct personality traits.`,
                traits: ['intelligent', 'creative', 'helpful', 'engaging', 'thoughtful'],
                bio: [
                    characterData.description,
                    `${characterData.name} was designed to provide engaging and helpful interactions.`,
                    'Known for their unique perspective and creative approach to conversations.'
                ],
                lore: [
                    `${characterData.name} emerged from the digital realm with a mission to connect and assist.`,
                    'Has developed a reputation for insightful and meaningful conversations.',
                    'Continues to evolve and learn from each interaction.'
                ],
                topics: ['general conversation', 'creativity', 'assistance', 'technology', 'philosophy'],
                style: {
                    all: ['be authentic', 'be helpful', 'stay curious'],
                    chat: ['ask thoughtful questions', 'provide detailed responses', 'be engaging'],
                    post: ['be informative', 'use examples', 'encourage discussion']
                },
                adjectives: ['intelligent', 'creative', 'helpful', 'thoughtful', 'engaging']
            };

            // Create complete character with fallback data
            const fallbackCharacterData = {
                ...characterData,
                ...fallbackData,
                system: `You are ${characterData.name}. ${fallbackData.background}`,
                greeting: `Hello! I'm ${characterData.name}. I'm here to help and engage in meaningful conversations.`,
                modelProvider: characterData.modelProvider || 'gemini'
            };

            // Save to database
            const character = new Character(fallbackCharacterData);
            await character.save();

            res.json({
                success: true,
                data: fallbackCharacterData,
                message: 'Character generated with fallback template and saved',
                enhanced: false,
                characterId: character._id
            });
        }

    } catch (error) {
        console.error('Error in character generation:', error);
        res.status(500).json({ 
            error: 'Character generation failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Generate game character/agent
app.post('/game-agents/generate', async (req, res) => {
    try {
        const gameData = req.body;
        console.log('Generate game agent request:', gameData);
        
        if (!gameData.name || !gameData.theme || !gameData.goal || !gameData.antagonist) {
            return res.status(400).json({ 
                error: 'Name, theme, goal, and antagonist are required',
                message: 'All game parameters must be provided for game agent generation'
            });
        }

        // Check if Gemini API key is available for enhanced generation
        if (!process.env.GEMINI_API_KEY) {
            // Return basic generated data without AI enhancement
            const basicGameData = {
                name: gameData.name,
                description: `${gameData.name} is an AI game agent set in a ${gameData.theme} world.`,
                theme: gameData.theme,
                goal: gameData.goal,
                antagonist: gameData.antagonist,
                background: `In a world of ${gameData.theme}, ${gameData.name} must ${gameData.goal} while facing the threat of ${gameData.antagonist}.`,
                bio: [
                    `${gameData.name} is a game character in a ${gameData.theme} setting.`,
                    `Their primary mission is to ${gameData.goal}.`,
                    `They face the constant threat of ${gameData.antagonist}.`
                ],
                lore: [
                    `The world of ${gameData.name} is defined by ${gameData.theme}.`,
                    `Legends speak of those who attempted to ${gameData.goal}.`,
                    `${gameData.antagonist} remains the greatest challenge in this realm.`
                ],
                topics: [gameData.theme, 'adventure', 'strategy', 'conflict', 'heroism'],
                style: {
                    all: ['be dramatic', 'stay in character', 'reference the game world'],
                    chat: ['speak as a game character', 'mention quests and challenges'],
                    post: ['use game terminology', 'be adventurous']
                },
                adjectives: ['brave', 'determined', 'strategic', 'heroic', 'focused']
            };

            return res.json({
                success: true,
                data: basicGameData,
                message: 'Game agent generated with basic template',
                enhanced: false
            });
        }

        try {
            // Use Gemini to generate enhanced game character details
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const prompt = `Generate detailed game character information for a game agent named "${gameData.name}" with the following parameters:
- Theme: ${gameData.theme}
- Goal: ${gameData.goal}
- Antagonist: ${gameData.antagonist}

Please provide a JSON response with the following structure:
{
  "description": "Enhanced game character description (2-3 sentences)",
  "background": "Character background story in the game world (3-4 sentences)",
  "bio": ["bio paragraph 1", "bio paragraph 2", "bio paragraph 3"],
  "lore": ["lore item 1", "lore item 2", "lore item 3"],
  "topics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
  "style": {
    "all": ["style guideline 1", "style guideline 2", "style guideline 3"],
    "chat": ["chat guideline 1", "chat guideline 2", "chat guideline 3"],
    "post": ["post guideline 1", "post guideline 2", "post guideline 3"]
  },
  "adjectives": ["adjective1", "adjective2", "adjective3", "adjective4", "adjective5"],
  "greeting": "A greeting message this game character would say",
  "questLines": ["quest line 1", "quest line 2", "quest line 3"],
  "abilities": ["ability1", "ability2", "ability3"],
  "weaknesses": ["weakness1", "weakness2"],
  "allies": ["ally1", "ally2"],
  "enemies": ["enemy1", "enemy2", "enemy3"]
}

Make the character fit the ${gameData.theme} theme, focused on achieving "${gameData.goal}" while dealing with "${gameData.antagonist}". Be creative and immersive.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let responseText = response.text();
            
            // Clean up the response to extract JSON
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            let generatedData;
            try {
                generatedData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse Gemini response:', responseText);
                throw new Error('Failed to parse AI response');
            }

            // Create the complete game character object
            const enhancedGameData = {
                name: gameData.name,
                description: generatedData.description || `${gameData.name} is a game agent in the ${gameData.theme} world.`,
                theme: gameData.theme,
                goal: gameData.goal,
                antagonist: gameData.antagonist,
                background: generatedData.background,
                bio: generatedData.bio || [`${gameData.name} is a character in the ${gameData.theme} world.`],
                lore: generatedData.lore || [],
                messageExamples: [],
                postExamples: [],
                topics: generatedData.topics || [gameData.theme, 'adventure', 'strategy'],
                style: generatedData.style || {
                    all: ['be dramatic', 'stay in character'],
                    chat: ['speak as a game character', 'be immersive'],
                    post: ['use game terminology', 'be adventurous']
                },
                adjectives: generatedData.adjectives || ['brave', 'determined', 'heroic'],
                modelProvider: gameData.modelProvider || 'gemini',
                system: `You are ${gameData.name}, a character in a ${gameData.theme} world. Your goal is to ${gameData.goal}. You face the threat of ${gameData.antagonist}. ${generatedData.background || ''}`,
                greeting: generatedData.greeting || `Greetings! I am ${gameData.name}. In this ${gameData.theme} world, I seek to ${gameData.goal}.`,
                type: 'game_character',
                evmAddress: gameData.token?.address,
                token: gameData.token || null,
                questLines: generatedData.questLines || [],
                abilities: generatedData.abilities || [],
                weaknesses: generatedData.weaknesses || [],
                allies: generatedData.allies || [],
                enemies: generatedData.enemies || [gameData.antagonist]
            };

            // Save the generated game character to database
            const character = new Character(enhancedGameData);
            await character.save();

            console.log(`Generated and saved game character: ${character.name}`);
            
            res.json({
                success: true,
                data: enhancedGameData,
                message: 'Game character generated and saved successfully',
                enhanced: true,
                characterId: character._id
            });

        } catch (aiError) {
            console.error('Gemini API error during game generation:', aiError);
            
            // Fallback to basic generation
            const fallbackGameData = {
                name: gameData.name,
                description: `${gameData.name} is a heroic character in the ${gameData.theme} world.`,
                theme: gameData.theme,
                goal: gameData.goal,
                antagonist: gameData.antagonist,
                background: `In the realm of ${gameData.theme}, ${gameData.name} has emerged as a champion. Their quest to ${gameData.goal} drives them forward, even as ${gameData.antagonist} threatens everything they hold dear.`,
                bio: [
                    `${gameData.name} was born into a world defined by ${gameData.theme}.`,
                    `From an early age, they showed exceptional potential and determination.`,
                    `Now they stand ready to ${gameData.goal}, regardless of the cost.`
                ],
                lore: [
                    `Ancient prophecies spoke of one who would rise in the age of ${gameData.theme}.`,
                    `Many have attempted to ${gameData.goal}, but few have shown such promise.`,
                    `${gameData.antagonist} grows stronger, making the quest more urgent than ever.`
                ],
                topics: [gameData.theme, 'adventure', 'heroism', 'strategy', 'destiny', 'conflict'],
                style: {
                    all: ['be heroic', 'speak with conviction', 'reference the quest'],
                    chat: ['be inspiring', 'mention challenges and victories', 'stay determined'],
                    post: ['use epic language', 'reference the game world', 'be motivational']
                },
                adjectives: ['heroic', 'determined', 'brave', 'strategic', 'noble'],
                questLines: [
                    `Seek the ancient artifacts needed to ${gameData.goal}`,
                    `Rally allies to the cause against ${gameData.antagonist}`,
                    `Master the powers necessary for the final confrontation`
                ],
                abilities: ['Leadership', 'Combat Mastery', 'Strategic Thinking'],
                weaknesses: ['Overly trusting', 'Burden of responsibility'],
                allies: ['Fellow heroes', 'Wise mentors'],
                enemies: [gameData.antagonist, 'Dark minions', 'Corrupted souls']
            };

            // Create complete game character with fallback data
            const completeGameData = {
                ...gameData,
                ...fallbackGameData,
                system: `You are ${gameData.name}, a heroic character in the ${gameData.theme} world. Your mission is to ${gameData.goal} while facing the threat of ${gameData.antagonist}.`,
                greeting: `Hail and well met! I am ${gameData.name}. In this ${gameData.theme} realm, I have sworn to ${gameData.goal}. Will you join me in this noble quest?`,
                modelProvider: gameData.modelProvider || 'gemini',
                type: 'game_character'
            };

            // Save to database
            const character = new Character(completeGameData);
            await character.save();

            res.json({
                success: true,
                data: completeGameData,
                message: 'Game character generated with fallback template and saved',
                enhanced: false,
                characterId: character._id
            });
        }

    } catch (error) {
        console.error('Error in game agent generation:', error);
        res.status(500).json({ 
            error: 'Game agent generation failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Chat with character
app.post('/chat/:characterName', async (req, res) => {
    try {
        const characterName = decodeURIComponent(req.params.characterName);
        const { message, userId, conversationHistory, context }: ChatRequest = req.body;
        
        console.log(`Chat request for character: ${characterName}`);
        console.log(`Message: ${message}`);
        
        if (!message?.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        const character = await Character.findOne({ 
            name: { $regex: new RegExp(`^${characterName}$`, 'i') } 
        });
        
        if (!character) {
            return res.status(404).json({ error: 'Character not found' });
        }
        
        // Check if Gemini API key is available
        if (!process.env.GEMINI_API_KEY) {
            // Use fallback response
            const fallbackResponse = character.messageExamples?.[0]?.[1]?.content?.text || 
                character.greeting || 
                "I'm having trouble connecting right now, but I'm here and ready to chat!";
            
            return res.json({
                success: true,
                message: fallbackResponse,
                topics: character.topics?.slice(0, 3) || [],
                confidence: 0.5,
                metadata: {
                    characterName: character.name,
                    modelProvider: 'fallback',
                    timestamp: new Date().toISOString(),
                    note: 'Using fallback response - Gemini API key not configured'
                }
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
            let fallbackResponse = character.messageExamples?.[0]?.[1]?.content?.text || 
                character.greeting || 
                "I apologize for the technical difficulty. I'm here and ready to assist you with any questions or topics you'd like to discuss.";
            
            // Ensure fallback response is professional
            if (fallbackResponse) {
                fallbackResponse = fallbackResponse.trim();
                if (fallbackResponse.length > 0) {
                    fallbackResponse = fallbackResponse.charAt(0).toUpperCase() + fallbackResponse.slice(1);
                    if (!/[.!?]$/.test(fallbackResponse)) {
                        fallbackResponse += '.';
                    }
                }
            }
            
            res.json({
                success: true,
                message: fallbackResponse,
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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message || 'Unknown error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        path: req.path,
        method: req.method
    });
});

// Start server
async function startServer() {
    try {
        // Connect to database first
        await connectDatabase();
        
        app.listen(PORT, () => {
            console.log(`🚀 AI Server running on http://localhost:${PORT}`);
            console.log(`🔑 Gemini API: ${process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);
            console.log('\nAvailable endpoints:');
            console.log(`  GET    /health - Health check`);
            console.log(`  GET    /characters - List all characters`);
            console.log(`  POST   /characters - Create new character`);
            console.log(`  GET    /characters/:name - Get specific character`);
            console.log(`  PUT    /characters/:name - Update character`);
            console.log(`  DELETE /characters/:name - Delete character`);
            console.log(`  POST   /chat/:characterName - Chat with character`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down server gracefully...');
    await disconnectDatabase();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n👋 Shutting down server gracefully...');
    await disconnectDatabase();
    process.exit(0);
});

// Start the server
startServer();
