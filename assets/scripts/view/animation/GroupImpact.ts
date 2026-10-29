import { Feel } from './Feel';
import { TileStage } from './TileStage';

/** 0 for a pair, 1 from Feel.fullGroup tiles up. Burst, sound and shake grow together with it. */
export function groupWeight(size: number): number {
    return Math.min(1, Math.max(0, (size - 2) / (Feel.fullGroup - 2)));
}

export function groupBurst(size: number): number {
    return Math.max(Feel.minGroupBurst, groupWeight(size));
}

/** Small groups are most taps of a level: shaking on each of them would make the board jitter all the time. */
export function shakeForGroup(stage: TileStage, size: number): void {
    if (size >= Feel.shakeFromTiles) {
        stage.shake(groupWeight(size));
    }
}
