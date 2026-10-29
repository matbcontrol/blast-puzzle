/** Effects keep tints as 0xRRGGBB numbers, so the particle code runs without the engine. These convert at the edge. */
export function toCcColor(hex: number, out: cc.Color = new cc.Color()): cc.Color {
    return cc.Color.set(out, (hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff, 255);
}

export function toHex(color: cc.Color): number {
    return (color.r << 16) | (color.g << 8) | color.b;
}
