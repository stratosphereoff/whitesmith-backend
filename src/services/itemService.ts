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

export function rollMod(stat: StatType, ilvl: number, forcePrefix?: boolean): ItemMod {
  const options = MOD_POOL[stat];
  if (!options || options.length === 0) {
    throw new Error(`No mod definitions for stat: ${stat}`);
  }
  
  const availableMods = options.filter(m => !m.minIlvl || ilvl >= m.minIlvl);
  if (availableMods.length === 0) {
    throw new Error(`No valid mods for ${stat} at ilvl ${ilvl}`);
  }
  
  const modDef = availableMods[Math.floor(Math.random() * availableMods.length)];
  const tier = modDef.tiers[Math.floor(Math.random() * modDef.tiers.length)];
  const rolledValue = Math.floor(Math.random() * (tier.max - tier.min + 1)) + tier.min;
  
  // Deterministic prefix/suffix assignment
  const isPrefix = forcePrefix !== undefined ? forcePrefix : Math.random() > 0.5;
  
  return {
    id: randomUUID().slice(0, 8),
    name: modDef.name,
    stat,
    value: rolledValue,
    tier: tier.tier,
    isPrefix,
    isImplicit: false
  };
}

export function craftItem(request: { 
  baseId: string; 
  craftType: string; 
  currentItem?: CraftedItem 
}): { item: CraftedItem; success: true } | { success: false; reason: string } {
  const base = ITEM_BASES.find(b => b.id === request.baseId);
  if (!base) return { success: false, reason: 'Invalid item base' };

  const isAugmenting = request.craftType === 'add_mod' && !!request.currentItem;
  let currentMods: ItemMod[] = isAugmenting ? [...request.currentItem!.mods] : [];

  if (!isAugmenting && base.implicitMods) {
    currentMods.push(...base.implicitMods.map(m => ({ ...m, isImplicit: true })));
  }

  // Count ONLY explicit affixes
  const explicitMods = currentMods.filter(m => !m.isImplicit);
  const prefixCount = explicitMods.filter(m => m.isPrefix).length;
  const suffixCount = explicitMods.filter(m => !m.isPrefix).length;

  const canAddPrefix = prefixCount < base.maxPrefixes;
  const canAddSuffix = suffixCount < base.maxSuffixes;

  if (!canAddPrefix && !canAddSuffix) {
    return { success: false, reason: 'Prefix and suffix limits reached' };
  }

  // SMART ROUTING: Determine which slot types are actually available
  let forcePrefix: boolean | undefined = undefined;
  if (canAddPrefix && !canAddSuffix) forcePrefix = true;  // Only prefixes available
  else if (!canAddPrefix && canAddSuffix) forcePrefix = false; // Only suffixes available

  // Roll with constraint applied
  const availableStats: StatType[] = ['life', 'strength', 'dexterity', 'physicalDamage', 'armor'];
  const randomStat = availableStats[Math.floor(Math.random() * availableStats.length)];
  
  try {
    const newMod = rollMod(randomStat, base.ilvl, forcePrefix);
    currentMods.push(newMod);

    const finalExplicitCount = explicitMods.length + 1;
    const rarity: CraftedItem['rarity'] =
      finalExplicitCount >= 4 ? 'rare' : finalExplicitCount >= 1 ? 'magic' : 'normal';

    return {
      success: true,
      item: {
        id: isAugmenting ? request.currentItem!.id : randomUUID(),
        base,
        mods: currentMods,
        createdAt: isAugmenting ? request.currentItem!.createdAt : Date.now(),
        rarity
      }
    };
  } catch (err) {
    return { success: false, reason: (err as Error).message };
  }
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