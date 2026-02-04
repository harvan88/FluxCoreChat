import type { UploadedAsset } from '../../hooks/useAssetUpload';

export type ComposerUploadResult = {
  success: boolean;
  error?: string;
  asset?: UploadedAsset;
  previewUrl?: string;
  waveformData?: any;
};

export type UploadAssetFn = (args: { file: File; type: 'image' | 'document' | 'video' }) => Promise<ComposerUploadResult>;

export type UploadAudioFn = (args: { file: File }) => Promise<ComposerUploadResult>;

export type ComposerMediaItem = {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  assetId: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  previewUrl?: string;
  waveformData?: any;
};
