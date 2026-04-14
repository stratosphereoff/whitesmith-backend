// frontend/src/types/game.ts AND backend/src/types/game.ts

export type StatType = 
  | 'life' | 'mana' | 'strength' | 'dexterity' | 'intelligence'
  | 'physicalDamage' | 'fireDamage' | 'coldDamage' | 'lightningDamage'
  | 'armor' | 'evasion' | 'energyShield' | 'critChance' | 'attackSpeed';

export interface StatRoll {
  min: number;
  max: number;
  tier?: number;
}

export interface ItemMod {
  id: string;
  name: string;
  stat: StatType;
  value: number;
  tier?: number;
  isPrefix: boolean;
  isImplicit: boolean;
  hidden?: boolean;
}

export interface ItemBase {
  id: string;
  name: string;
  category: 'weapon' | 'armor' | 'accessory' | 'flask';
  implicitMods?: ItemMod[];
  maxPrefixes: number;
  maxSuffixes: number;
  ilvl: number;
  description?: string;
}

export interface CraftedItem {
  id: string;
  base: ItemBase;
  mods: ItemMod[];
  createdAt: number;
  rarity: 'normal' | 'magic' | 'rare' | 'unique';
}

export interface PlayerInventory {
  playerId: string;
  items: CraftedItem[];
  maxSlots: number;
}

// Socket Event Payloads
export interface CraftRequest {
  playerId: string;
  baseId: string;
  craftType: 'roll_new' | 'add_mod' | 'reforge' | 'augment';
  currency?: string;
  currentItem?: CraftedItem;
}

export interface CraftResult {
  success: boolean;
  item?: CraftedItem;
  message: string;
  cost?: { currency: string; amount: number };
}

// Socket.IO Type Definitions (for type-safe events)
export interface ClientToServerEvents {
  'player:connect': (playerId: string) => void;
  'craft:request': (data: CraftRequest, callback: (result: CraftResult) => void) => void;
  'inventory:save': (item: CraftedItem, callback: (success: boolean) => void) => void;
  'inventory:get': (callback: (inventory: PlayerInventory) => void) => void;
}

export interface ServerToClientEvents {
  'craft:result': (result: CraftResult) => void;
  'inventory:updated': (inventory: PlayerInventory) => void;
  'bases:available': (bases: ItemBase[]) => void;
  'error': (message: string) => void;
}

export interface SocketData {
  playerId?: string;
}

export interface InterServerEvents {
  'player:disconnect': (playerId: string) => void;
}