import mongoose, { Document, Schema } from 'mongoose';

// Character interface for TypeScript
export interface ICharacter extends Document {
  name: string;
  description: string;
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
  type: 'ai_character' | 'game_character';
  twitter_handle?: string;
  token_address?: string;
  token_name?: string;
  token_symbol?: string;
  token_image_url?: string;
  theme?: string;
  goal?: string;
  antagonist?: string;
  ipfs_url?: string;
  token?: {
    symbol: string;
    address: string;
    name?: string;
    image_url?: string;
  };
  created_at: Date;
  updated_at: Date;
}

// MongoDB Schema
const CharacterSchema = new Schema<ICharacter>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  bio: [{
    type: String,
    trim: true
  }],
  lore: [{
    type: String,
    trim: true
  }],
  messageExamples: [{
    type: Schema.Types.Mixed
  }],
  postExamples: [{
    type: String,
    trim: true
  }],
  topics: [{
    type: String,
    trim: true
  }],
  style: {
    all: [{
      type: String,
      trim: true
    }],
    chat: [{
      type: String,
      trim: true
    }],
    post: [{
      type: String,
      trim: true
    }]
  },
  adjectives: [{
    type: String,
    trim: true
  }],
  modelProvider: {
    type: String,
    required: true,
    default: 'gemini'
  },
  system: {
    type: String,
    trim: true
  },
  greeting: {
    type: String,
    trim: true
  },
  evm_address: {
    type: String,
    trim: true
  },
  evmAddress: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['ai_character', 'game_character'],
    default: 'ai_character'
  },
  twitter_handle: {
    type: String,
    trim: true
  },
  token_address: {
    type: String,
    trim: true
  },
  token_name: {
    type: String,
    trim: true
  },
  token_symbol: {
    type: String,
    trim: true
  },
  token_image_url: {
    type: String,
    trim: true
  },
  theme: {
    type: String,
    trim: true
  },
  goal: {
    type: String,
    trim: true
  },
  antagonist: {
    type: String,
    trim: true
  },
  ipfs_url: {
    type: String,
    trim: true
  },
  token: {
    symbol: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    image_url: {
      type: String,
      trim: true
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for better performance
CharacterSchema.index({ name: 1 });
CharacterSchema.index({ type: 1 });
CharacterSchema.index({ created_at: -1 });

// Pre-save middleware to ensure consistency
CharacterSchema.pre('save', function(next) {
  // Ensure evmAddress and evm_address are synced
  if (this.evmAddress && !this.evm_address) {
    this.evm_address = this.evmAddress;
  } else if (this.evm_address && !this.evmAddress) {
    this.evmAddress = this.evm_address;
  }
  
  // Generate greeting if not provided
  if (!this.greeting) {
    this.greeting = `Hello! I'm ${this.name}. How can I help you today?`;
  }
  
  // Generate EVM address if not provided
  if (!this.evmAddress && !this.evm_address) {
    const address = `0x${Math.random().toString(16).substr(2, 40)}`;
    this.evmAddress = address;
    this.evm_address = address;
  }
  
  next();
});

// Export the model
export const Character = mongoose.model<ICharacter>('Character', CharacterSchema);
export default Character;
