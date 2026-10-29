import { GridPos } from '../../core/board/GridPos';
import { BoardPointer } from './BoardPointer';

type Located = cc.Event.EventTouch | cc.Event.EventMouse;

/**
 * Feeds the pointer from the board node's touch and mouse events. The engine reports no pointer leaving the page,
 * so the canvas and the window are watched too: otherwise a lifted group or a held press stays stuck after
 * the cursor leaves the window or the player switches away. Returns the unbinder.
 */
export function bindPointer(
    node: cc.Node,
    pointer: BoardPointer,
    cellAt: (location: cc.Vec2) => GridPos | null,
): () => void {
    const at = (event: Located) => cellAt(event.getLocation());
    const owner = {};
    const Type = cc.Node.EventType;
    node.on(Type.TOUCH_START, (event: cc.Event.EventTouch) => pointer.down(at(event)), owner);
    node.on(Type.TOUCH_MOVE, (event: cc.Event.EventTouch) => pointer.move(at(event)), owner);
    node.on(Type.TOUCH_END, (event: cc.Event.EventTouch) => pointer.up(at(event)), owner);
    node.on(Type.TOUCH_CANCEL, () => pointer.cancel(), owner);
    node.on(Type.MOUSE_MOVE, (event: cc.Event.EventMouse) => pointer.hover(at(event)), owner);
    node.on(Type.MOUSE_LEAVE, () => pointer.leave(), owner);

    const lost = (): void => pointer.lost();
    const canvas = cc.game.canvas;
    if (canvas) {
        canvas.addEventListener('mouseleave', lost);
    }
    if (typeof window !== 'undefined') {
        window.addEventListener('blur', lost);
    }
    return () => {
        node.targetOff(owner);
        if (canvas) {
            canvas.removeEventListener('mouseleave', lost);
        }
        if (typeof window !== 'undefined') {
            window.removeEventListener('blur', lost);
        }
    };
}
