/**
 * TemplateAssetPicker Component
 * 
 * Permite gestionar los archivos adjuntos de una plantilla.
 * Usa AssetUploader para subir nuevos archivos y lista los existentes.
 */

import { useState, useEffect } from 'react';
import { Paperclip, X, File, FileText, Image, Film, Music, Loader2, AlertCircle } from 'lucide-react';
import { AssetUploader } from '../chat/AssetUploader';
import { Button } from '../ui/Button';
import { DoubleConfirmationDeleteButton } from '../ui/DoubleConfirmationDeleteButton';
import { useTemplateStore } from './store/templateStore';
import type { TemplateAsset } from './types';
import { formatBytes, type UploadedAsset } from '../../hooks/useAssetUpload';
import { api } from '../../services/api';

interface TemplateAssetPickerProps {
    templateId: string;
    accountId: string;
    assets: TemplateAsset[];
    readonly?: boolean;
}

export function TemplateAssetPicker({
    templateId,
    accountId,
    assets = [],
    readonly = false
}: TemplateAssetPickerProps) {
    const { linkAsset, unlinkAsset } = useTemplateStore();
    const [showUploader, setShowUploader] = useState(false);
    const [linkingAssets, setLinkingAssets] = useState<Record<string, TemplateAsset | UploadedAsset>>({});
    const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    // Limpiar estados "linking" cuando el asset ya llegó desde el backend
    useEffect(() => {
        setLinkingAssets(prev => {
            let changed = false;
            const next = { ...prev };
            assets.forEach(asset => {
                if (next[asset.assetId]) {
                    delete next[asset.assetId];
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [assets]);

    const handleUploadComplete = async (uploadedAsset: UploadedAsset) => {
        setActionError(null);
        setLinkingAssets(prev => ({
            ...prev,
            [uploadedAsset.assetId]: {
                assetId: uploadedAsset.assetId,
                name: uploadedAsset.name,
                mimeType: uploadedAsset.mimeType,
                sizeBytes: uploadedAsset.sizeBytes,
                slot: 'attachment',
                version: 1,
                linkedAt: new Date().toISOString(),
                status: uploadedAsset.status,
            },
        }));

        try {
            await linkAsset(accountId, templateId, uploadedAsset.assetId);
            setShowUploader(false);
        } catch (err) {
            console.error('Failed to link asset:', err);
            setActionError('No se pudo adjuntar el archivo. Intenta nuevamente.');
        }
    };

    const handleDeleteAsset = async (assetId: string, slot: string) => {
        setActionError(null);
        setDeletingAssetId(assetId);

        try {
            await unlinkAsset(accountId, templateId, assetId, slot);
            const response = await api.deleteAsset(assetId, accountId);
            if (!response.success) {
                throw new Error(response.error || 'No se pudo eliminar el archivo');
            }
        } catch (err) {
            console.error('Failed to delete asset:', err);
            setActionError('Hubo un problema eliminando el archivo. Intenta nuevamente.');
        } finally {
            setDeletingAssetId(null);
        }
    };

    const getIcon = (mimeType: string | null) => {
        if (!mimeType) return File;
        if (mimeType.startsWith('image/')) return Image;
        if (mimeType.startsWith('video/')) return Film;
        if (mimeType.startsWith('audio/')) return Music;
        if (mimeType.includes('pdf')) return FileText;
        return File;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-primary flex items-center gap-2">
                    <Paperclip size={16} />
                    Adjuntos ({assets.length})
                </label>

                {!readonly && !showUploader && (
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowUploader(true)}
                    >
                        Adjuntar archivo
                    </Button>
                )}
            </div>

            {/* Uploader Area */}
            {showUploader && (
                <div className="border border-subtle rounded-lg p-4 bg-surface">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium">Subir archivo</span>
                        <button
                            onClick={() => setShowUploader(false)}
                            className="text-muted hover:text-primary"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <AssetUploader
                        accountId={accountId}
                        onUploadComplete={handleUploadComplete}
                        onCancel={() => setShowUploader(false)}
                        compact={false}
                    />
                </div>
            )}

            {/* Asset List */}
            <div className="space-y-2">
                {assets.map(asset => {
                    const Icon = getIcon(asset.mimeType);

                    return (
                        <div
                            key={asset.assetId}
                            className="flex items-center gap-3 p-3 rounded-lg border border-subtle bg-surface group"
                        >
                            <div className="p-2 bg-elevated rounded">
                                <Icon size={20} className="text-secondary" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm /*<<< font-medium text-primary truncate">
                                    {asset.name}
                                </p>
                                <p className="text-xs text-muted">
                                    {asset.sizeBytes !== null ? formatBytes(asset.sizeBytes) : 'Tamaño desconocido'}
                                </p>
                            </div>

                            {!readonly && (
                                <DoubleConfirmationDeleteButton
                                    onConfirm={() => handleDeleteAsset(asset.assetId, asset.slot)}
                                    disabled={deletingAssetId === asset.assetId}
                                    className="opacity-0 group-hover:opacity-100"
                                />
                            )}
                        </div>
                    );
                })}

                {Object.entries(linkingAssets).map(([assetId, details]) => {
                    const Icon = getIcon(details.mimeType ?? null);

                    return (
                        <div
                            key={`linking-${assetId}`}
                            className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-accent/40 bg-accent/5"
                        >
                            <div className="p-2 bg-accent/10 rounded">
                                <Icon size={20} className="text-accent" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-primary truncate">
                                    {details.name}
                                </p>
                                <p className="text-xs text-muted flex items-center gap-1">
                                    <Loader2 size={12} className="animate-spin" /> Vinculando
                                </p>
                            </div>
                        </div>
                    );
                })}

                {assets.length === 0 && !showUploader && (
                    <p className="text-sm text-muted italic p-2">
                        No hay archivos adjuntos.
                    </p>
                )}
            </div>

            {actionError && (
                <div className="flex items-center gap-2 text-error text-sm bg-error/10 border border-error/20 rounded px-3 py-2">
                    <AlertCircle size={14} />
                    {actionError}
                </div>
            )}
        </div>
    );
}
