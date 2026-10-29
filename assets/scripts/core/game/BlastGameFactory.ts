import { TapActionFactory } from '../actions/TapActionFactory';
import { Board } from '../board/Board';
import { BoardFiller } from '../board/BoardFiller';
import { Shuffler } from '../board/Shuffler';
import { BombBooster } from '../boosters/BombBooster';
import { BoosterInventory } from '../boosters/BoosterInventory';
import { TeleportBooster } from '../boosters/TeleportBooster';
import { BurnResolver } from '../burn/BurnResolver';
import { ColumnArea } from '../burn/ColumnArea';
import { RadiusArea } from '../burn/RadiusArea';
import { RowArea } from '../burn/RowArea';
import { SuperTileCatalog } from '../burn/SuperTileCatalog';
import { WholeBoardArea } from '../burn/WholeBoardArea';
import { LevelConfig } from '../config/LevelConfig';
import { Random } from '../random/Random';
import { AutoShuffle } from '../rules/AutoShuffle';
import { GroupRules } from '../rules/GroupRules';
import { LevelProgress } from '../rules/LevelProgress';
import { BlastScore } from '../rules/ScoreFormula';
import { SuperKinds } from '../tiles/SuperKinds';
import { SuperTilePicker } from '../tiles/SuperTilePicker';
import { TileFactory } from '../tiles/TileFactory';
import { BlastGame } from './BlastGame';

/**
 * Composition root of the model: the only place that knows concrete classes.
 * `layout` is a hand-made starting board; empty cells in it are filled randomly.
 */
export function createBlastGame(config: LevelConfig, random: Random, layout?: Board): BlastGame {
    const catalog = new SuperTileCatalog()
        .register(SuperKinds.Row, new RowArea())
        .register(SuperKinds.Column, new ColumnArea())
        .register(SuperKinds.Bomb, new RadiusArea(config.superBombRadius))
        .register(SuperKinds.Field, new WholeBoardArea());
    assertKnownSuperKinds(config, catalog);

    const tiles = new TileFactory(random, config.colorCount);
    const rules = new GroupRules(config.minGroupSize);
    const burner = new BurnResolver(catalog);
    const filler = new BoardFiller(tiles);
    const shuffler = new Shuffler(random, rules);

    const tapActions = new TapActionFactory(rules, burner, new SuperTilePicker(config.superTiles, random), tiles);
    const boosters = new BoosterInventory()
        .add(new BombBooster(new RadiusArea(config.bombRadius), burner), config.bombCharges)
        .add(new TeleportBooster(), config.teleportCharges);

    const board = layout || new Board(config.cols, config.rows);
    filler.fillEmpty(board);
    if (!rules.hasMove(board)) {
        shuffler.shuffle(board);
    }

    return new BlastGame(
        board,
        new LevelProgress(config.targetScore, config.moves, new BlastScore(config.pointsPerTile)),
        rules,
        tapActions,
        boosters,
        filler,
        new AutoShuffle(shuffler, config.maxShuffles),
    );
}

function assertKnownSuperKinds(config: LevelConfig, catalog: SuperTileCatalog): void {
    for (const rule of config.superTiles) {
        for (const kind of rule.kinds) {
            if (!catalog.has(kind)) {
                throw new Error(`Level config uses unknown super tile "${kind}"`);
            }
        }
    }
}
