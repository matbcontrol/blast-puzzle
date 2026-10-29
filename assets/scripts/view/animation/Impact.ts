import { Feel } from './Feel';

/** 0 for a pair, 1 from Feel.fullGroup tiles up. A group's burst and sound grow together with it. */
export function groupWeight(size: number): number {
    return Math.min(1, Math.max(0, (size - 2) / (Feel.fullGroup - 2)));
}

export function groupBurst(size: number): number {
    return Math.max(Feel.minGroupBurst, groupWeight(size));
}

/** 0 for the first explosion of a burn, 1 from Feel.fullChain up: chained explosions sound bigger. */
export function chainWeight(chain: number): number {
    return Math.min(1, Math.max(0, (chain - 1) / (Feel.fullChain - 1)));
}

/** How hard the board shakes as explosion number `chain` of a burn goes off. */
export function chainShake(chain: number): number {
    return Math.min(1, Feel.chainShake.base + Feel.chainShake.perExplosion * chain);
}
