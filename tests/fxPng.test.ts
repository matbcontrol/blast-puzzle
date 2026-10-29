import { inflateSync } from 'zlib';
import { crc32, encodePng } from '../tools/art/png';

interface Chunk {
    readonly type: string;
    readonly data: Buffer;
}

/** Splits a PNG into chunks and checks every CRC on the way, as a decoder would. */
function readChunks(png: Buffer): Chunk[] {
    const chunks: Chunk[] = [];
    let offset = 8;
    while (offset < png.length) {
        const length = png.readUInt32BE(offset);
        const body = png.subarray(offset + 4, offset + 8 + length);
        expect(png.readUInt32BE(offset + 8 + length)).toBe(crc32(body));
        chunks.push({ type: body.subarray(0, 4).toString('ascii'), data: body.subarray(4) });
        offset += 12 + length;
    }
    return chunks;
}

describe('PNG encoder', () => {
    it('matches the reference CRC-32', () => {
        expect(crc32(Buffer.from('123456789', 'ascii'))).toBe(0xcbf43926);
    });

    it('writes RGBA pixels a decoder reads back unchanged', () => {
        const pixels = Uint8Array.from([
            255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 255, 255, 255, 64, 1, 2, 3, 4, 5, 6, 7, 8,
        ]);
        const png = encodePng(3, 2, pixels);

        expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        const chunks = readChunks(png);
        expect(chunks.map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);

        const header = chunks[0].data;
        expect(header.readUInt32BE(0)).toBe(3);
        expect(header.readUInt32BE(4)).toBe(2);
        expect(Array.from(header.subarray(8))).toEqual([8, 6, 0, 0, 0]);

        const raw = inflateSync(chunks[1].data);
        const stride = 3 * 4;
        expect(raw).toHaveLength((stride + 1) * 2);
        expect(raw[0]).toBe(0);
        expect(raw[stride + 1]).toBe(0);
        expect(Array.from(raw.subarray(1, stride + 1))).toEqual(Array.from(pixels.subarray(0, stride)));
        expect(Array.from(raw.subarray(stride + 2))).toEqual(Array.from(pixels.subarray(stride)));
    });

    it('refuses pixel data of the wrong size', () => {
        expect(() => encodePng(2, 2, new Uint8Array(3))).toThrow();
    });
});
