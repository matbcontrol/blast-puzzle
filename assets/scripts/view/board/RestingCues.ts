import { Clock } from '../../app/Clock';
import { GridPos, posKey } from '../../core/board/GridPos';
import { RewardGroup } from '../../core/rules/SuperTileRewards';
import { SuperKind } from '../../core/tiles/SuperKinds';
import { BoardLayout } from '../BoardLayout';
import { CellGlows, GlowFeel } from './CellGlows';
import { CellOutlines } from './CellOutlines';
import { TileBadges } from './TileBadges';
import { CueTile, TileCues, TileDepth } from './TileCues';
import { TileDimmer } from './TileDimmer';

/** A tile at rest between turns, as the cues see it. */
export interface RestingTile extends CueTile {
    readonly cell: GridPos;
    readonly superKind: SuperKind | null;
}

/** Where the cues draw: a layer under the tiles, and one over them and under the effects. */
export interface CueLayers {
    readonly under: cc.Node;
    readonly over: cc.Node;
}

export interface CueArt {
    /** Nine-sliced rounded panel, lit over targets and the hint. */
    readonly panel: cc.SpriteFrame | null;
    /** Soft round glow behind resting super tiles. */
    readonly glow: cc.SpriteFrame | null;
    readonly superFrame: (kind: SuperKind) => cc.SpriteFrame;
}

/** Rockets rock on their axis while they rest. Every super tile breathes. */
const ROCKS: Readonly<Record<SuperKind, boolean>> = { row: true, column: true, bomb: false, field: false };

/**
 * Every cue on the board while it rests between turns: press, hover lift, booster targets and preview, the hint,
 * reward badges and the idle life of super tiles. settle() hands the tiles to the animations, rest() takes them back.
 */
export class RestingCues {
    private readonly cues: TileCues;
    private readonly superGlows: CellGlows;
    private readonly hintGlows: CellGlows;
    private readonly targetGlows: CellGlows;
    private readonly outlines: CellOutlines;
    private readonly dimmer = new TileDimmer();
    private readonly badges: TileBadges;
    /** By posKey. Empty while an animation owns the tiles. */
    private readonly tiles = new Map<string, RestingTile>();
    private layout: BoardLayout | null = null;
    private targets: RestingTile[] = [];
    private preview: RestingTile[] = [];

    constructor(
        depth: TileDepth,
        layers: CueLayers,
        art: CueArt,
        clock: Clock,
        private readonly liftsOnHover: boolean,
    ) {
        this.cues = new TileCues(depth);
        this.superGlows = new CellGlows(addLayer(layers.under, 'SuperGlows'), art.glow, GlowFeel.superBacking);
        this.hintGlows = new CellGlows(addLayer(layers.over, 'HintGlows'), art.panel, GlowFeel.hint);
        this.targetGlows = new CellGlows(addLayer(layers.over, 'TargetGlows'), art.panel, GlowFeel.target);
        this.outlines = new CellOutlines(layers.over);
        this.badges = new TileBadges(art.superFrame, clock);
    }

    /** The board rests: cues may touch these tiles, and its super tiles come alive. */
    rest(tiles: ReadonlyArray<RestingTile>, layout: BoardLayout): void {
        this.settle();
        this.layout = layout;
        const supers: RestingTile[] = [];
        const rocking: RestingTile[] = [];
        tiles.forEach((tile) => {
            this.tiles.set(posKey(tile.cell), tile);
            if (tile.superKind !== null) {
                supers.push(tile);
                if (ROCKS[tile.superKind]) {
                    rocking.push(tile);
                }
            }
        });
        this.cues.idle(supers, rocking);
        this.glow(this.superGlows, supers);
    }

    /** Hands the tiles to the animations: no cue touches one until the next rest(). */
    settle(): void {
        this.cues.reset();
        this.dimmer.reset();
        this.badges.clear();
        this.superGlows.clear();
        this.hintGlows.clear();
        this.targetGlows.clear();
        this.outlines.clear();
        this.tiles.clear();
        this.targets = [];
        this.preview = [];
    }

    press(cell: GridPos | null): void {
        this.cues.press(cell === null ? null : this.tileAt(cell));
    }

    /** Shakes the tile in the cell. False when no tile rests there. */
    reject(cell: GridPos): boolean {
        const tile = this.tileAt(cell);
        if (tile !== null) {
            this.cues.shake(tile);
        }
        return tile !== null;
    }

    showTargets(cells: ReadonlyArray<GridPos>): void {
        this.targets = this.tilesAt(cells);
        this.cues.mark(this.targets);
        this.glow(this.targetGlows, this.targets);
        this.dimAroundPreview();
    }

    /** A finger covers the group it presses, and the squeeze already answers it: only a mouse lifts the group. */
    showTapPreview(cells: ReadonlyArray<GridPos>): void {
        this.cues.lift(this.liftsOnHover ? this.tilesAt(cells) : []);
    }

    /** Rims the cells an aimed booster would hit and dims the rest of the board, picked targets aside. */
    showBoosterPreview(cells: ReadonlyArray<GridPos>): void {
        this.preview = this.tilesAt(cells);
        const layout = this.layout;
        if (layout !== null) {
            this.outlines.show(
                this.preview.map((tile) => tile.rest),
                layout.stepX,
                layout.stepY,
            );
        }
        this.dimAroundPreview();
    }

    showHint(cells: ReadonlyArray<GridPos>): void {
        const tiles = this.tilesAt(cells);
        this.cues.hint(tiles);
        this.glow(this.hintGlows, tiles);
    }

    showRewards(rewards: ReadonlyArray<RewardGroup>): void {
        this.badges.show(
            rewards.map((reward) => ({
                tiles: this.tilesAt(reward.cells).map((tile) => tile.node),
                kinds: reward.kinds,
            })),
        );
    }

    private dimAroundPreview(): void {
        if (this.preview.length === 0) {
            this.dimmer.dim([]);
            return;
        }
        const focus = this.preview.concat(this.targets);
        const dark: cc.Node[] = [];
        this.tiles.forEach((tile) => {
            if (focus.indexOf(tile) < 0) {
                dark.push(tile.node);
            }
        });
        this.dimmer.dim(dark);
    }

    private glow(glows: CellGlows, tiles: ReadonlyArray<RestingTile>): void {
        const layout = this.layout;
        if (layout === null) {
            glows.clear();
            return;
        }
        glows.show(
            tiles.map((tile) => tile.rest),
            layout.stepX,
            layout.stepY,
        );
    }

    private tileAt(cell: GridPos): RestingTile | null {
        return this.tiles.get(posKey(cell)) || null;
    }

    private tilesAt(cells: ReadonlyArray<GridPos>): RestingTile[] {
        const tiles: RestingTile[] = [];
        cells.forEach((cell) => {
            const tile = this.tileAt(cell);
            if (tile !== null) {
                tiles.push(tile);
            }
        });
        return tiles;
    }
}

function addLayer(parent: cc.Node, name: string): cc.Node {
    const layer = new cc.Node(name);
    layer.parent = parent;
    return layer;
}
