import { spawn } from 'child_process';
import { join } from 'path';
import { mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';

export class AudioConverterService {
  private tempDir = join(process.cwd(), 'temp');

  async ensureTempDir() {
    if (!existsSync(this.tempDir)) {
      await mkdir(this.tempDir, { recursive: true });
    }
  }

  async convertToMp3(inputFile: File): Promise<File> {
    await this.ensureTempDir();

    const inputPath = join(this.tempDir, `input-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`);
    const outputPath = join(this.tempDir, `output-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`);

    try {
      await Bun.write(inputPath, inputFile);

      await this.runFFmpeg([
        '-i', inputPath,
        '-vn',
        '-ar', '44100',
        '-ac', '1',
        '-b:a', '128k',
        '-f', 'mp3',
        outputPath
      ]);

      const mp3Buffer = await Bun.file(outputPath).arrayBuffer();

      // Asegurar extensión .mp3 para que la API de OpenAI la reconozca
      const baseName = inputFile.name.includes('.')
        ? inputFile.name.substring(0, inputFile.name.lastIndexOf('.'))
        : 'audio';

      const mp3File = new File(
        [mp3Buffer],
        `${baseName}.mp3`,
        { type: 'audio/mpeg' }
      );

      return mp3File;
    } finally {
      try { await unlink(inputPath); } catch { }
      try { await unlink(outputPath); } catch { }
    }
  }

  async convertToOgg(inputFile: File): Promise<File> {
    await this.ensureTempDir();

    const inputPath = join(this.tempDir, `input-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`);
    const outputPath = join(this.tempDir, `output-${Date.now()}-${Math.random().toString(36).slice(2)}.ogg`);

    try {
      await Bun.write(inputPath, inputFile);

      await this.runFFmpeg([
        '-i', inputPath,
        '-vn',
        '-c:a', 'libopus',
        '-b:a', '64k',
        '-f', 'ogg',
        outputPath
      ]);

      const oggBuffer = await Bun.file(outputPath).arrayBuffer();
      const oggFile = new File(
        [oggBuffer],
        inputFile.name.replace(/\.(webm|mp3|wav)$/i, '.ogg'),
        { type: 'audio/ogg' }
      );

      return oggFile;
    } finally {
      try { await unlink(inputPath); } catch { }
      try { await unlink(outputPath); } catch { }
    }
  }

  private runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);

      let stderr = '';
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`FFmpeg error: ${err.message}`));
      });
    });
  }
}

export const audioConverterService = new AudioConverterService();
