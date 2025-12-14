import { join } from 'path';
import { mkdir } from 'fs/promises';
import { db, mediaAttachments } from '@fluxcore/db';

type UploadType = 'image' | 'document' | 'audio' | 'video';

const FILE_LIMITS: Record<UploadType, { maxSize: number; mimes: string[] }> = {
  image: {
    maxSize: 10 * 1024 * 1024,
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  document: {
    maxSize: 50 * 1024 * 1024,
    mimes: ['application/pdf', 'application/msword', 'text/plain'],
  },
  audio: {
    maxSize: 20 * 1024 * 1024,
    mimes: ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/ogg'],
  },
  video: {
    maxSize: 100 * 1024 * 1024,
    mimes: ['video/mp4', 'video/webm'],
  },
};

function sanitizeFilename(name: string) {
  return name
    .replace(/[\\/]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function getDateFolder() {
  return new Date().toISOString().slice(0, 10);
}

function getExtension(file: File) {
  const fromName = file.name.split('.').pop();
  if (fromName && fromName.length <= 10) return fromName;

  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  };

  return map[file.type] || 'bin';
}

export class FileUploadService {
  async upload(params: {
    file: File;
    type: UploadType;
    messageId?: string;
    waveformData?: number[];
  }) {
    const { file, type, messageId, waveformData } = params;

    const limits = FILE_LIMITS[type];
    if (!limits) {
      throw new Error('Tipo de archivo no soportado');
    }

    if (!limits.mimes.includes(file.type)) {
      throw new Error('Tipo MIME no permitido');
    }

    if (file.size > limits.maxSize) {
      throw new Error('Archivo excede el tamaño máximo');
    }

    const dateFolder = getDateFolder();
    const extension = getExtension(file);
    const storedFilename = `${crypto.randomUUID()}.${extension}`;

    const uploadDir = join(process.cwd(), 'uploads', type, dateFolder);
    await mkdir(uploadDir, { recursive: true });

    const filepath = join(uploadDir, storedFilename);
    await Bun.write(filepath, file);

    const url = `/uploads/${type}/${dateFolder}/${storedFilename}`;

    const [attachment] = await db
      .insert(mediaAttachments)
      .values({
        messageId: messageId || null,
        type,
        url,
        filename: sanitizeFilename(file.name),
        mimeType: file.type,
        sizeBytes: file.size,
        durationSeconds: null,
        thumbnailUrl: type === 'image' ? url : null,
        waveformData: waveformData ? { samples: waveformData } : null,
        metadata: {
          originalFilename: file.name,
        },
      })
      .returning();

    return {
      attachment,
      url,
    };
  }
}

export const fileUploadService = new FileUploadService();
