import { ReadonlyBoard } from '../../core/board/Board';
import { TILE_BEVEL } from '../TileArt';
import { dropNode, landingThud } from './DropMotion';
import { TileStage } from './TileStage';
import { Timings } from './Timings';

/**
 * Deals a rendered board in: every column falls from above the mask as one stack, left to right,
 * which reads as the level being dealt. Each column thuds once as it lands.
 */
export async function dealIn(stage: TileStage, board: ReadonlyBoard): Promise<void> {
    const layout = stage.layout;
    const thuds: Array<() => void> = [];
    const thudOf = (col: number) => thuds[col] || (thuds[col] = landingThud(stage));
    stage.sound.play('shuffle');
    await Promise.all(
        board.positions().map((p) => {
            const tile = board.tileAt(p);
            if (tile === null) {
                return Promise.resolve();
            }
            const node = stage.nodeOf(tile.id);
            const start = layout.cellCenter(p.col, p.row + layout.rows);
            node.setPosition(start.x, start.y + TILE_BEVEL);
            const delay = p.col * Timings.dealColumnStagger + p.row * Timings.dealRowStagger;
            return dropNode(node, layout.cellCenter(p.col, p.row), layout.rows, delay, thudOf(p.col));
        }),
    );
}
