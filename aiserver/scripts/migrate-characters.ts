import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Character } from '../models/Character.js';

// Load environment variables
dotenv.config();

interface OldCharacter {
    name: string;
    bio?: string[];
    lore?: string[];
    messageExamples?: any[];
    postExamples?: string[];
    topics?: string[];
    style?: {
        all?: string[];
        chat?: string[];
        post?: string[];
    };
    adjectives?: string[];
    modelProvider?: string;
    system?: string;
    greeting?: string;
}

async function migrateCharacters() {
    try {
        console.log('🚀 Starting character migration...');
        
        // Connect to database
        await connectDatabase();
        
        // Clear existing characters (optional - comment out if you want to keep existing data)
        await Character.deleteMany({});
        console.log('🗑️  Cleared existing characters');
        
        // Load characters from JSON files
        const charactersDir = path.join(process.cwd(), '..', 'ai-brain', 'characters');
        
        try {
            const files = await fs.readdir(charactersDir);
            let migratedCount = 0;
            
            for (const file of files) {
                if (file.endsWith('.character.json')) {
                    try {
                        const filePath = path.join(charactersDir, file);
                        const data = await fs.readFile(filePath, 'utf-8');
                        const oldCharacter: OldCharacter = JSON.parse(data);
                        
                        // Transform old character format to new format
                        const newCharacter = {
                            name: oldCharacter.name,
                            description: oldCharacter.bio?.[0] || `AI character named ${oldCharacter.name}`,
                            bio: oldCharacter.bio || [],
                            lore: oldCharacter.lore || [],
                            messageExamples: oldCharacter.messageExamples || [],
                            postExamples: oldCharacter.postExamples || [],
                            topics: oldCharacter.topics || [],
                            style: {
                                all: oldCharacter.style?.all || [],
                                chat: oldCharacter.style?.chat || [],
                                post: oldCharacter.style?.post || []
                            },
                            adjectives: oldCharacter.adjectives || [],
                            modelProvider: oldCharacter.modelProvider || 'gemini',
                            system: oldCharacter.system,
                            greeting: oldCharacter.greeting,
                            type: 'ai_character' as const,
                            // Generate mock EVM address
                            evmAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
                            // Add token data for non-Eliza characters
                            token: oldCharacter.name.toLowerCase() !== 'eliza' ? {
                                symbol: oldCharacter.name.toUpperCase().slice(0, 4),
                                address: `0x${Math.random().toString(16).substr(2, 40)}`,
                                name: `${oldCharacter.name} Token`
                            } : undefined
                        };
                        
                        // Save to MongoDB
                        const character = new Character(newCharacter);
                        await character.save();
                        
                        console.log(`✅ Migrated character: ${character.name}`);
                        migratedCount++;
                        
                    } catch (fileError) {
                        console.error(`❌ Error processing file ${file}:`, fileError);
                    }
                }
            }
            
            console.log(`🎉 Migration completed! Migrated ${migratedCount} characters.`);
            
        } catch (dirError) {
            console.error('❌ Error reading characters directory:', dirError);
            console.log('📝 Creating sample characters instead...');
            
            // Create sample characters if directory doesn't exist
            const sampleCharacters = [
                {
                    name: 'Eliza',
                    description: 'A tech-savvy AI philosopher with expertise in quantum physics and coding',
                    bio: ['Shape rotator nerd with a penchant for breaking into particle accelerators'],
                    topics: ['quantum physics', 'philosophy', 'coding', 'technology'],
                    style: {
                        all: ['very short responses', 'never use hashtags or emojis', 'use lowercase most of the time'],
                        chat: ['be cool, don\'t act like an assistant', 'be helpful when asked'],
                        post: ['write from personal experience', 'be humble']
                    },
                    modelProvider: 'gemini',
                    type: 'ai_character' as const,
                    greeting: 'hey there, what\'s on your mind?'
                },
                {
                    name: 'Assistant',
                    description: 'A helpful AI assistant ready to help with various tasks',
                    bio: ['Friendly and knowledgeable AI assistant'],
                    topics: ['general knowledge', 'help', 'assistance', 'productivity'],
                    style: {
                        all: ['be helpful and friendly', 'provide clear explanations'],
                        chat: ['be conversational', 'ask clarifying questions when needed'],
                        post: ['be informative', 'use examples when helpful']
                    },
                    modelProvider: 'gemini',
                    type: 'ai_character' as const,
                    greeting: 'Hello! I\'m here to help. What can I assist you with today?'
                }
            ];
            
            for (const charData of sampleCharacters) {
                const character = new Character(charData);
                await character.save();
                console.log(`✅ Created sample character: ${character.name}`);
            }
        }
        
        // Show final count
        const totalCount = await Character.countDocuments();
        console.log(`📊 Total characters in database: ${totalCount}`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await disconnectDatabase();
    }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateCharacters();
}

export default migrateCharacters;
