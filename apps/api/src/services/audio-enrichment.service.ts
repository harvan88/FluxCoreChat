import OpenAI from 'openai';
import { db, messageEnrichments } from '@fluxcore/db';
import { audioConverterService } from './audio-converter.service';
import { coreEventBus } from '../core/events';
import { logTrace } from '../utils/file-logger';
import { join } from 'path';
import { assetRegistryService } from './asset-registry.service';
import { getStorageAdapter } from './storage/storage-adapter.factory';

export interface AudioEnrichmentResult {
    transcription: string;
    language?: string;
    detectedNoiseLevel?: number;
    wasProcessed: boolean;
}

class AudioEnrichmentService {
    private openai: OpenAI | null = null;

    constructor() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
        }
    }

    /**
     * Proceso principal de enriquecimiento de audio
     */
    async enrichAudioMessage(params: {
        messageId: string;
        accountId: string;
        audioUrl?: string;
        assetId?: string;
        mimeType: string;
    }): Promise<AudioEnrichmentResult> {
        const { messageId, accountId, audioUrl, assetId, mimeType } = params;
        const startMsg = `[AudioEnrichment] 🎧 Starting enrichment for message ${messageId}`;
        console.log(startMsg);
        logTrace(startMsg, { audioUrl, assetId, mimeType });

        try {
            // 1. Descargar y Pre-procesar
            const processedFile = await this.preprocess(audioUrl, assetId, mimeType);
            const normMsg = `[AudioEnrichment] ✅ Audio normalized/processed. Size: ${processedFile.size} bytes`;
            console.log(normMsg);
            logTrace(normMsg);

            // 2. Transcribir (OpenAI Whisper)
            const transcriptionResult = await this.transcribe(processedFile);
            const transMsg = `[AudioEnrichment] 📝 Transcription obtained: "${transcriptionResult.transcription.substring(0, 50)}..."`;
            console.log(transMsg);
            logTrace(transMsg);

            // 3. Guardar Enriquecimiento en DB
            await this.saveEnrichment(messageId, 'audio_transcription', {
                text: transcriptionResult.transcription,
                language: transcriptionResult.language,
                model: 'whisper-1',
                processed: true,
                processedAt: new Date()
            });

            // 4. Notificar al sistema
            coreEventBus.emit('media:enriched', {
                messageId,
                accountId,
                type: 'audio',
                enrichment: transcriptionResult
            });

            return {
                ...transcriptionResult,
                wasProcessed: true
            };

        } catch (error: any) {
            console.error(`[AudioEnrichment] Error enriching message ${messageId}:`, error);
            logTrace(`[AudioEnrichment] ❌ CRITICAL ERROR for ${messageId}: ${error.message}`);
            throw error;
        }
    }

    private getOpenAI(): OpenAI | null {
        if (this.openai) return this.openai;
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            this.openai = new OpenAI({ apiKey });
            return this.openai;
        }
        return null;
    }

    private async preprocess(url?: string, assetId?: string, mimeType?: string): Promise<File> {
        logTrace(`[AudioEnrichment] 🔄 Pre-processing audio. URL: ${url}, AssetId: ${assetId}`);

        let blob: Blob;
        const storage = getStorageAdapter();

        try {
            // SI TENEMOS ASSET ID, USAMOS EL STORAGE ADAPTER (MÁS ROBUSTO)
            if (assetId) {
                const asset = await assetRegistryService.getById(assetId);
                if (asset && asset.storageKey) {
                    logTrace(`[AudioEnrichment] 📦 Downloading from storage: ${asset.storageKey}`);
                    const result = await storage.download(asset.storageKey);

                    // Convertir Buffer/Stream a Blob
                    if (Buffer.isBuffer(result.data)) {
                        blob = new Blob([result.data], { type: mimeType || result.contentType });
                    } else {
                        // Si es stream, lo leemos (Bun compatible)
                        const chunks = [];
                        const reader = (result.data as ReadableStream).getReader();
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            chunks.push(value);
                        }
                        blob = new Blob(chunks, { type: mimeType || result.contentType });
                    }
                } else {
                    throw new Error(`Asset ${assetId} not found or has no storageKey`);
                }
            } else if (url) {
                // Si la URL es una ruta local (comienza con /uploads o similar)
                if (url.startsWith('/') || !url.startsWith('http')) {
                    const absBase = process.cwd();
                    const filePath = join(absBase, url.startsWith('/') ? url.slice(1) : url);
                    logTrace(`[AudioEnrichment] 📁 Local path detected: ${filePath}`);

                    if (await Bun.file(filePath).exists()) {
                        blob = new Blob([await Bun.file(filePath).arrayBuffer()], { type: mimeType || 'audio/webm' });
                    } else {
                        // Intentar fallback si estamos en root
                        const fallbackPath = join(absBase, 'apps', 'api', url.startsWith('/') ? url.slice(1) : url);
                        if (await Bun.file(fallbackPath).exists()) {
                            blob = new Blob([await Bun.file(fallbackPath).arrayBuffer()], { type: mimeType || 'audio/webm' });
                        } else {
                            throw new Error(`File not found: ${filePath}`);
                        }
                    }
                } else {
                    // Si es una URL externa completa
                    logTrace(`[AudioEnrichment] 🌐 Remote URL detected: ${url}`);
                    const response = await fetch(url);
                    if (!response.ok) throw new Error(`External fetch failed with status ${response.status}`);
                    blob = await response.blob();
                }
            } else {
                throw new Error('No audio source provided (url or assetId)');
            }

            // Crear objeto File con nombre correcto para que Whisper/FFmpeg no se confundan
            const extension = mimeType?.includes('wav') ? 'wav' :
                mimeType?.includes('ogg') ? 'ogg' :
                    mimeType?.includes('mpeg') ? 'mp3' : 'webm';

            const file = new File([blob], `input.${extension}`, { type: mimeType || 'audio/webm' });

            // Convertimos a MP3 para Whisper
            logTrace(`[AudioEnrichment] 🛠️ Converting to MP3 for Whisper standardization...`);
            return await audioConverterService.convertToMp3(file);
        } catch (err: any) {
            logTrace(`[AudioEnrichment] ❌ Pre-processing failed: ${err.message}`);
            throw err;
        }
    }

    private async transcribe(file: File): Promise<{ transcription: string; language?: string }> {
        const client = this.getOpenAI();
        if (!client) {
            logTrace(`[AudioEnrichment] ⚠️ OpenAI Client not initialized. Check API Key.`);
            return { transcription: "[Transcripción no disponible: API Key faltante]" };
        }

        logTrace(`[AudioEnrichment] 🤖 Sending to Whisper API...`);
        const startTime = Date.now();

        const response = await client.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
        });

        const duration = (Date.now() - startTime) / 1000;
        logTrace(`[AudioEnrichment] ✨ Whisper success in ${duration}s`);

        return {
            transcription: response.text,
            language: (response as any).language
        };
    }

    private async saveEnrichment(messageId: string, type: string, payload: any) {
        await db.insert(messageEnrichments).values({
            messageId,
            extensionId: 'core:media-enrichment',
            type,
            payload
        });
    }
}

export const audioEnrichmentService = new AudioEnrichmentService();
