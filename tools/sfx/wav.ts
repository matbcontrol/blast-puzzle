const HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;

/** 16-bit PCM mono WAV: the one audio format every browser decodes without a codec. */
export function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
    const dataBytes = samples.length * BYTES_PER_SAMPLE;
    const wav = Buffer.alloc(HEADER_BYTES + dataBytes);
    wav.write('RIFF', 0, 'ascii');
    wav.writeUInt32LE(HEADER_BYTES - 8 + dataBytes, 4);
    wav.write('WAVE', 8, 'ascii');
    wav.write('fmt ', 12, 'ascii');
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20); // PCM
    wav.writeUInt16LE(1, 22); // mono
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * BYTES_PER_SAMPLE, 28);
    wav.writeUInt16LE(BYTES_PER_SAMPLE, 32);
    wav.writeUInt16LE(BYTES_PER_SAMPLE * 8, 34);
    wav.write('data', 36, 'ascii');
    wav.writeUInt32LE(dataBytes, 40);
    for (let i = 0; i < samples.length; i++) {
        const clamped = Math.max(-1, Math.min(1, samples[i]));
        wav.writeInt16LE(Math.round(clamped * 32767), HEADER_BYTES + i * BYTES_PER_SAMPLE);
    }
    return wav;
}
