export interface GameState {
  health: number;
  oxygen: number; // 0-100
  hunger: number; // 0-100
  thirst: number; // 0-100 (New stat for water)
  temperature: number; // Celsius
  time: string; // e.g. "03:00"
  location: string;
  inventory: string[];
  knowledgeBase: string[]; // PERMANENT MEMORY: Facts the AI must remember (e.g., "Bunker is at the School")
  visualContext: string; // Describes the current room's state (open doors, dropped items) to ensure memory continuity
  isGameOver: boolean;
  gamePhase: 'awakening' | 'gathering' | 'run_to_bunker' | 'bunker_life' | 'wasteland_exploration' | 'base_looting' | 'space_launch' | 'mars_colonization';
}

export interface Message {
  id: string;
  role: 'user' | 'ai' | 'system';
  text: string;
  imageUrl?: string;
  timestamp: number;
}

export type SoundEffectType = 'NONE' | 'FOOTSTEPS' | 'CLOTH_RUSTLE' | 'DOOR_OPEN' | 'HEARTBEAT' | 'ALARM' | 'FIRE_CRACKLE' | 'BREATHING';

export interface TurnResponse {
  story: string;
  imagePrompt: string;
  soundCue: SoundEffectType; // The AI decides which sound to play
  gameState: GameState;
}