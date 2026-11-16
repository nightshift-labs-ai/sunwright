// The Almanac's contents, read from config every time (never typed by hand): each beetle's HP, speed,
// armour, trait and first sun; each glass type's cost, first sun and effect at Lv1 / Lv2 / Lv3 with the
// upgrade prices; each charm's effect and how it is earned. DOM-free, so check-shot-truth can recompute it.
import { BEAM, BOONS, ENEMIES, ENEMY_ORDER, NAMES, PIECES, PIECE_ORDER, UPGRADES, enemyRuleTag } from './config.js';
import { firstWaveOf } from './waves.js';

const pct = (x) => `${Math.round(x * 100)}%`;

/** What one glass type does at level k (0-based), from BEAM and UPGRADES. */
function glassLevel(type, k) {
  if (type === 'mirror') {
    const loss = BEAM.bounceLoss * UPGRADES.mirror.lossScale[k];
    return loss > 0 ? `turns light, -${pct(loss)}` : 'turns light, no loss';
  }
  if (type === 'splitter') return `2 beams of ${pct(UPGRADES.splitter.half[k])}`;
  if (type === 'lens') return `x${+(BEAM.lensMult + UPGRADES.lens.multAdd[k]).toFixed(1)} for ${BEAM.lensReach} cells`;
  if (type === 'prism') return `branches keep ${pct(Math.min(0.95, BEAM.prismShare + UPGRADES.prism.shareAdd[k]))}`;
  return null;
}

export function almanacEntries() {
  return {
    beetles: ENEMY_ORDER.map((id) => {
      const d = ENEMIES[id];
      return { id, name: d.name, hp: d.hp, speed: d.speed, armour: d.armour, trait: enemyRuleTag(d) || 'walks', firstSun: firstWaveOf(id) + 1 };
    }),
    glass: PIECE_ORDER.map((id) => {
      const p = PIECES[id];
      const levels = [0, 1, 2].map((k) => glassLevel(id, k));
      return { id, name: p.name, cost: p.cost, firstSun: (p.unlockWave ?? 0) + 1, levels: levels[0] ? levels : [p.short], upgrades: levels[0] ? UPGRADES.cost.slice() : [] };
    }),
    charms: BOONS.map((b) => ({ id: b.id, name: b.name, effect: b.text, rare: b.weight <= 2, how: `${b.weight <= 2 ? 'rare' : 'common'} pick after a ${NAMES.sun.toLowerCase()}${b.repeat ? ', can repeat' : ''}` })),
  };
}
