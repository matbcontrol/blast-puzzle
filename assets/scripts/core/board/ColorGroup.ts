import { ReadonlyBoard } from './Board';
import { GridPos, neighbours, posKey } from './GridPos';

/** Breadth-first flood fill. Iterative on purpose: no recursion depth limits on big boards. */
export function findColorGroup(board: ReadonlyBoard, origin: GridPos): GridPos[] {
    const start = board.tileAt(origin);
    if (start === null || start.isSuper) {
        return [];
    }

    const visited = new Set<string>([posKey(origin)]);
    const group: GridPos[] = [origin];

    for (let i = 0; i < group.length; i++) {
        for (const next of neighbours(group[i])) {
            const key = posKey(next);
            if (visited.has(key)) {
                continue;
            }
            visited.add(key);
            const tile = board.tileAt(next);
            if (tile !== null && tile.matches(start)) {
                group.push(next);
            }
        }
    }
    return group;
}
