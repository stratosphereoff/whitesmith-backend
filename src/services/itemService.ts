import { v4 as randomUUID } from 'uuid';
import { ItemBase, ItemMod, CraftedItem, StatType, StatRoll } from '../types/game.js';

// Type for a single mod definition
interface ModDefinition {
  name: string;
  tiers: StatRoll[];
  minIlvl?: number;
  tags?: string[];
}

// Sample mod pool
const MOD_POOL: Partial<Record<StatType, ModDefinition[]>> = {
  life: [
    { name: "of the Whale", tiers: [{ min: 40, max: 49, tier: 3 }, { min: 30, max: 39, tier: 4 }] },
    { name: "of the Lion", tiers: [{ min: 20, max: 29, tier: 5 }] }
  ],
  mana: [
    { name: "of the Spirit", tiers: [{ min: 15, max: 19, tier: 3 }] },
    { name: "of the Mind", tiers: [{ min: 8, max: 12, tier: 5 }] }
  ],
  strength: [
    { name: "of the Brute", tiers: [{ min: 10, max: 13, tier: 2 }] }
  ],
  dexterity: [
    { name: "of the Fox", tiers: [{ min: 10, max: 13, tier: 2 }] }
  ],
  intelligence: [
    { name: "of the Scholar", tiers: [{ min: 10, max: 13, tier: 2 }] }
  ],
  physicalDamage: [
    { name: "of Sharpness", tiers: [{ min: 10, max: 14, tier: 3 }, { min: 5, max: 9, tier: 5 }] }
  ],
  armor: [
    { name: "of the Ironbound", tiers: [{ min: 35, max: 45, tier: 3 }] }
  ],
  // Add more as needed - TypeScript won't complain about missing keys now ✅
};

// Helper type for mod generation result
type GeneratedMod = ItemMod | null;

const ITEM_BASES: ItemBase[] = [
  {
    id: 'rusty_sword',
    name: 'Rusty Sword',
    category: 'weapon',
    maxPrefixes: 3,
    maxSuffixes: 3,
    ilvl: 10,
    implicitMods: [{
      id: 'imp_dmg',
      name: 'Inherent Damage',
      stat: 'physicalDamage',
      value: 5,
      isPrefix: true
    }]
  },
  {
    id: 'leather_cap',
    name: 'Leather Cap',
    category: 'armor',
    maxPrefixes: 2,
    maxSuffixes: 2,
    ilvl: 5
  }
];

export function getAvailableBases(): ItemBase[] {
  return ITEM_BASES;
}

export function rollMod(stat: StatType, ilvl: number): GeneratedMod {
  const options = MOD_POOL[stat];
  
  // ✅ Handle undefined stats gracefully
  if (!options || options.length === 0) {
    console.warn(`No mod definitions found for stat: ${stat}`);
    return null;
  }
  
  // Filter by ilvl if needed (enhancement)
  const availableMods = options.filter(mod => !mod.minIlvl || ilvl >= mod.minIlvl);
  if (availableMods.length === 0) return null;
  
  // Weighted random selection (simplified - could add spawn weights)
  const modDef = availableMods[Math.floor(Math.random() * availableMods.length)];
  const tier = modDef.tiers[Math.floor(Math.random() * modDef.tiers.length)];
  
  // Roll value within tier range
  const rolledValue = Math.floor(Math.random() * (tier.max - tier.min + 1)) + tier.min;
  
  return {
    id: randomUUID().slice(0, 8),
    name: modDef.name,
    stat,
    value: rolledValue,
    tier: tier.tier,
    isPrefix: Math.random() > 0.5 // Simplified - in real game, mod name determines prefix/suffix
  };
}

export function craftItem(request: { baseId: string; craftType: string }): CraftedItem | null {
  const base = ITEM_BASES.find(b => b.id === request.baseId);
  if (!base) return null;

  const mods: ItemMod[] = [];
  
  // Copy implicit mods (they're fixed)
  if (base.implicitMods) {
    mods.push(...base.implicitMods.map(m => ({ 
      ...m, 
      id: randomUUID().slice(0, 8) 
    })));
  }

  // Determine how many mods to roll based on craft type
  const numRolls = request.craftType === 'roll_new' 
    ? Math.floor(Math.random() * 3) + 1  // 1-3 mods
    : 1;
    
  // Available stats to roll (expand this pool for production)
  const availableStats: StatType[] = ['life', 'strength', 'dexterity', 'physicalDamage', 'armor'];
  
  for (let i = 0; i < numRolls; i++) {
    // Check if we've hit mod limits
    const prefixCount = mods.filter(m => m.isPrefix).length;
    const suffixCount = mods.filter(m => !m.isPrefix).length;
    
    if (prefixCount >= base.maxPrefixes && suffixCount >= base.maxSuffixes) {
      break; // Item is full
    }
    
    // Pick random stat and try to roll a mod
    const randomStat = availableStats[Math.floor(Math.random() * availableStats.length)];
    const newMod = rollMod(randomStat, base.ilvl);
    
    if (newMod) {
      // Simple prefix/suffix assignment logic
      const wouldBePrefix = newMod.isPrefix;
      
      if ((wouldBePrefix && prefixCount < base.maxPrefixes) || 
          (!wouldBePrefix && suffixCount < base.maxSuffixes)) {
        mods.push(newMod);
      }
    }
  }

  // Determine rarity based on mod count (simplified)
  const explicitModCount = mods.length - (base.implicitMods?.length || 0);
  const rarity: CraftedItem['rarity'] = 
    explicitModCount >= 4 ? 'rare' : 
    explicitModCount >= 1 ? 'magic' : 
    'normal';

  return {
    id: randomUUID(),
    base,
    mods,
    createdAt: Date.now(),
    rarity
  };
}

// Helper to get all possible mods for UI preview
export function getModOptionsForStat(stat: StatType): ModDefinition[] {
  return MOD_POOL[stat] || [];
}

// Validation helper
function validateModPool(): void {
  for (const [stat, mods] of Object.entries(MOD_POOL)) {
    if (!Array.isArray(mods)) {
      throw new Error(`MOD_POOL[${stat}] must be an array`);
    }
    for (const mod of mods) {
      if (!mod.name || !Array.isArray(mod.tiers)) {
        throw new Error(`Invalid mod definition in ${stat}: ${JSON.stringify(mod)}`);
      }
    }
  }
}

// Call once at startup
validateModPool();