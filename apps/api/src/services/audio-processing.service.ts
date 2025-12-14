export class AudioProcessingService {
  async generateWaveform(file: File, samples = 64): Promise<number[]> {
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (buffer.length === 0) return [];

    const step = Math.max(1, Math.floor(buffer.length / samples));
    const result: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = i * step;
      const end = Math.min(buffer.length, start + step);
      if (start >= buffer.length) break;

      let acc = 0;
      for (let j = start; j < end; j++) {
        acc += Math.abs(buffer[j] - 128);
      }
      result.push(Math.round(acc / Math.max(1, end - start)));
    }

    return result;
  }
}

export const audioProcessingService = new AudioProcessingService();
