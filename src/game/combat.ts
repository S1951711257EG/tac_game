/**
 * Combat rules: damage calculation, attack forecasts, attack legality and
 * resolution (including counterattacks). All numbers come from content
 * (unit classes, terrain, balance) — nothing is hardcoded here.
 */
import { manhattan } from "./grid";
import type { Rng } from "./rng";
import type {
  AttackForecast,
  BalanceDef,
  ClassModifierTable,
  TerrainDef,
  Unit,
  UnitClassDef,
} from "./types";

export interface CombatContext {
  classById: Record<string, UnitClassDef>;
  classModifiers: ClassModifierTable;
  balance: BalanceDef;
  terrainAt(x: number, y: number): TerrainDef;
}

export const effAttack = (ctx: CombatContext, unit: Unit): number => {
  const cls = ctx.classById[unit.class];
  const vetBonus = 1 + ctx.balance.veterancyAttackBonus * unit.vet;
  return cls.attack * vetBonus;
};

/** Fraction of incoming damage removed by the defender's terrain. */
export const terrainProtection = (ctx: CombatContext, terrain: TerrainDef): number =>
  Math.min(0.75, terrain.defense * ctx.balance.terrainDefenseReduction);

function rawDamage(
  ctx: CombatContext,
  attacker: Unit,
  defender: Unit,
  rng: Rng,
  factor: number,
): number {
  const atkCls = ctx.classById[attacker.class];
  const defCls = ctx.classById[defender.class];
  const terrain = ctx.terrainAt(defender.x, defender.y);
  const classMod = ctx.classModifiers[atkCls.id]?.[defCls.id] ?? 1;
  const hpFrac = attacker.hp / atkCls.hp;
  const protect = terrainProtection(ctx, terrain);
  const roll = rng.spread(ctx.balance.damageRngSpread);
  const dmg =
    effAttack(ctx, attacker) * hpFrac * classMod * (1 - protect) * roll * factor;
  return Math.max(1, Math.min(Math.round(dmg), 10));
}

export const distanceBetween = (a: Unit, b: Unit): number => manhattan(a, b);

/** Can `attacker` currently strike `defender` given class range rules? */
export function inRange(ctx: CombatContext, attacker: Unit, defender: Unit): boolean {
  const cls = ctx.classById[attacker.class];
  const d = distanceBetween(attacker, defender);
  return d >= cls.minRange && d <= cls.maxRange;
}

/** Can the defender answer with a counterattack from where it stands? */
export function canCounter(ctx: CombatContext, defender: Unit, attacker: Unit): boolean {
  return inRange(ctx, defender, attacker);
}

export function forecastAttack(
  ctx: CombatContext,
  attacker: Unit,
  defender: Unit,
): AttackForecast {
  const spread = ctx.balance.damageRngSpread;
  const atkCls = ctx.classById[attacker.class];
  const defCls = ctx.classById[defender.class];
  const terrain = ctx.terrainAt(defender.x, defender.y);
  const classMod = ctx.classModifiers[atkCls.id]?.[defCls.id] ?? 1;
  const protect = terrainProtection(ctx, terrain);
  const hpFrac = attacker.hp / atkCls.hp;
  const base = effAttack(ctx, attacker) * hpFrac * classMod * (1 - protect);
  const minDamage = Math.max(1, Math.min(Math.round(base * (1 - spread)), 10));
  const maxDamage = Math.max(1, Math.min(Math.round(base * (1 + spread)), 10));
  const avg = base;

  let willCounter = false;
  let counterMin = 0;
  let counterMax = 0;
  const survHp = Math.max(0, defender.hp - avg);
  if (survHp > 0 && canCounter(ctx, defender, attacker)) {
    const atkTerrain = ctx.terrainAt(attacker.x, attacker.y);
    const counterClassMod = ctx.classModifiers[defCls.id]?.[atkCls.id] ?? 1;
    const counterBase =
      effAttack(ctx, defender) *
      (defender.hp / defCls.hp) *
      counterClassMod *
      (1 - terrainProtection(ctx, atkTerrain)) *
      ctx.balance.counterFactor;
    counterMin = Math.max(0, Math.min(Math.round(counterBase * (1 - spread)), 10));
    counterMax = Math.max(0, Math.min(Math.round(counterBase * (1 + spread)), 10));
    willCounter = true;
  }

  return {
    minDamage,
    maxDamage,
    counterMin,
    counterMax,
    canCounter: willCounter,
    likelyLethal: avg >= defender.hp,
  };
}

export interface AttackResult {
  attackerId: string;
  defenderId: string;
  damage: number;
  defenderHpAfter: number;
  counterDamage: number;
  attackerHpAfter: number;
  destroyedDefender: boolean;
  destroyedAttacker: boolean;
}

/**
 * Resolve one attack. Mutates nothing: caller applies the returned outcome.
 * Rules: counter only if the defender survives and the attacker is inside the
 * defender's range band; counters are suppressed if the attacker was broken
 * below counterBreakThreshold HP by the strike.
 */
export function resolveAttack(
  ctx: CombatContext,
  attacker: Unit,
  defender: Unit,
  rng: Rng,
): AttackResult {
  const damage = rawDamage(ctx, attacker, defender, rng, 1);
  const defenderHpAfter = Math.max(0, defender.hp - damage);
  const destroyedDefender = defenderHpAfter === 0;

  let counterDamage = 0;
  let attackerHpAfter = attacker.hp;
  // A defender broken down to/below the threshold is suppressed and cannot
  // answer (also true when it died). Artillery (minRange > 1) simply cannot
  // reach adjacent attackers, handled by canCounter().
  const counterAllowed =
    !destroyedDefender &&
    defenderHpAfter > ctx.balance.counterBreakThreshold &&
    canCounter(ctx, defender, attacker);
  if (counterAllowed) {
    const counterUnit: Unit = { ...defender, hp: defenderHpAfter };
    counterDamage = rawDamage(ctx, counterUnit, attacker, rng, ctx.balance.counterFactor);
    attackerHpAfter = Math.max(0, attacker.hp - counterDamage);
  }

  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    damage,
    defenderHpAfter,
    counterDamage,
    attackerHpAfter,
    destroyedDefender,
    destroyedAttacker: attackerHpAfter === 0,
  };
}

/** Class display helper used by UI previews. */
export const classShort = (ctx: CombatContext, unit: Unit): UnitClassDef =>
  ctx.classById[unit.class];
