import { Point } from '../BoardLayout';
import { FxFeel } from './FxFeel';
import { clampBetween, logLerp } from './FxMath';

export interface ScorePopupLayout {
    readonly text: string;
    readonly x: number;
    readonly y: number;
    readonly scale: number;
}

export interface PraiseLayout {
    readonly x: number;
    readonly y: number;
    readonly width: number;
}

/**
 * Text, size and start point of a score popup on a board of this size centered at 0,0. The popup, its rise and its
 * chain badge stay inside the board, so a top-row "+30" never draws over the frame.
 */
export function scorePopupLayout(
    at: Point,
    points: number,
    chain: number,
    width: number,
    height: number,
): ScorePopupLayout {
    const tune = FxFeel.scorePopup;
    const badge = FxFeel.chainBadge;
    const text = '+' + points;
    const chainScale = 1 + tune.chainGrowth * Math.max(0, chain - 1);
    const scale = logLerp(points, tune.pointsLow, tune.pointsHigh, tune.scaleLow, tune.scaleHigh) * chainScale;
    const halfWidth = (text.length * tune.fontSize * tune.glyphWidth * scale) / 2;
    const halfHeight = (tune.lineHeight * scale) / 2;
    const above = chain > 1 ? Math.max(halfHeight, (badge.raise + badge.lineHeight / 2) * scale) : halfHeight;
    return {
        text,
        x: clampBetween(at.x, tune.edge + halfWidth - width / 2, width / 2 - tune.edge - halfWidth),
        y: clampBetween(
            at.y + tune.lift,
            tune.edge + halfHeight - height / 2,
            height / 2 - tune.edge - tune.rise - above,
        ),
        scale,
    };
}

/** The praise word above the action when there is one, else in the upper part of the board, inside it either way. */
export function praiseLayout(at: Point | null, width: number, height: number): PraiseLayout {
    const tune = FxFeel.praise;
    const textWidth = width * tune.widthShare;
    const halfHeight = (tune.lineHeight * tune.overshoot) / 2;
    const wantedY = at === null ? height * tune.restShare : at.y + tune.aboveAction;
    return {
        x: at === null ? 0 : clampBetween(at.x, (textWidth - width) / 2, (width - textWidth) / 2),
        y: clampBetween(wantedY, halfHeight - height / 2, height / 2 - halfHeight),
        width: textWidth,
    };
}
