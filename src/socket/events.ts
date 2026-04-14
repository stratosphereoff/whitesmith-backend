import { 
  CraftRequest, CraftedItem, ItemBase, PlayerInventory,
  StatType 
} from '../types/game.js';

// This types `socket.data` so TypeScript knows `socket.data.playerId` exists
export interface SocketData {
  playerId?: string;
}

// Client → Server events
export interface ClientToServerEvents {
  'player:connect': (playerId: string) => void;
  'craft:request': (data: CraftRequest, callback: (result: CraftResult) => void) => void;
  'inventory:save': (item: CraftedItem, callback: (success: boolean) => void) => void;
  'inventory:get': (callback: (inventory: PlayerInventory) => void) => void;
}

// Server → Client events  
export interface ServerToClientEvents {
  'craft:result': (result: CraftResult) => void;
  'inventory:updated': (inventory: PlayerInventory) => void;
  'bases:available': (bases: ItemBase[]) => void;
  'error': (message: string) => void;
}

export interface CraftResult {
  success: boolean;
  item?: CraftedItem;
  message: string;
  cost?: { currency: string; amount: number };
}

export interface InterServerEvents {
  // Reserved for horizontal scaling
  'player:disconnect': (playerId: string) => void;
}