/**
 * TemplateAssetPicker Component
 * 
 * Permite gestionar los archivos adjuntos de una plantilla.
 * Usa AssetUploader para subir nuevos archivos y lista los existentes.
 */

import { useState, useEffect } from 'react';
import { Paperclip, X, File, FileText, Image, Film, Music, Loader2 } from 'lucide-react';
import { AssetUploader } from '../chat/AssetUploader'; // Import from chat/AssetUploader
import { Button } from '../ui/Button'; // Import from ui
import { useTemplateStore } from './store/templateStore';
import { api } from '../../services/api';
import type { TemplateAsset } from './types';
import { formatBytes } from '../../hooks/useAssetUpload';

interface TemplateAssetPickerProps {
    templateId: string;
    accountId: string;
    assets: TemplateAsset[];
    readonly?: boolean;
}

interface AssetDetails {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
}

export function TemplateAssetPicker({
    templateId,
    accountId,
    assets = [],
    readonly = false
}: TemplateAssetPickerProps) {
    const { linkAsset, unlinkAsset } = useTemplateStore();
    const [showUploader, setShowUploader] = useState(false);
    const [assetDetails, setAssetDetails] = useState<Record<string, AssetDetails>>({});
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Fetch asset details for linked assets
    useEffect(() => {
        const fetchDetails = async () => {
            const missingIds = assets
                .map(a => a.assetId)
                .filter(id => !assetDetails[id]);

            if (missingIds.length === 0) return;

            setIsLoadingDetails(true);
            try {
                // En un caso real optimizado, haríamos un batch fetch.
                // Aquí hacemos fetch individual por simplicidad, pero con Promise.all
                const promises = missingIds.map(id => api.getAsset(id, accountId));
                const results = await Promise.all(promises);

                const newDetails: Record<string, AssetDetails> = {};
                results.forEach(res => {
                    if (res.success && res.data) {
                        newDetails[res.data.id] = {
                            id: res.data.id,
                            name: res.data.name,
                            mimeType: res.data.mimeType,
                            sizeBytes: res.data.sizeBytes,
                        };
                    }
                });

                setAssetDetails(prev => ({ ...prev, ...newDetails }));
            } catch (err) {
                console.error('Error fetching asset details:', err);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        fetchDetails();
    }, [assets, accountId, assetDetails]);

    const handleUploadComplete = async (uploadedAsset: any) => {
        try {
            await linkAsset(accountId, templateId, uploadedAsset.assetId);

            // Update local details cache immediately
            setAssetDetails(prev => ({
                ...prev,
                [uploadedAsset.assetId]: {
                    id: uploadedAsset.assetId,
                    name: uploadedAsset.name,
                    mimeType: uploadedAsset.mimeType,
                    sizeBytes: uploadedAsset.sizeBytes,
                }
            }));

            setShowUploader(false);
        } catch (err) {
            console.error('Failed to link asset:', err);
        }
    };

    const handleUnlink = async (assetId: string) => {
        if (confirm('¿Estás seguro de desvincular este archivo?')) {
            try {
                await unlinkAsset(accountId, templateId, assetId);
            } catch (err) {
                console.error('Failed to unlink asset:', err);
            }
        }
    };

    const getIcon = (mimeType: string) => {
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
                    const details = assetDetails[asset.assetId];
                    const Icon = details ? getIcon(details.mimeType) : File;

                    return (
                        <div
                            key={asset.assetId}
                            className="flex items-center gap-3 p-3 rounded-lg border border-subtle bg-surface group"
                        >
                            <div className="p-2 bg-elevated rounded">
                                <Icon size={20} className="text-secondary" />
                            </div>

                            <div className="flex-1 min-w-0">
                                {details ? (
                                    <>
                                        <p className="text-sm font-medium text-primary truncate">
                                            {details.name}
                                        </p>
                                        <p className="text-xs text-muted">
                                            {formatBytes(details.sizeBytes)}
                                        </p>
                                    </>
                                ) : (
                                    <div className="h-8 flex items-center">
                                        {isLoadingDetails ? (
                                            <Loader2 size={16} className="animate-spin text-muted" />
                                        ) : (
                                            <span className="text-sm text-muted">Cargando detalles...</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {!readonly && (
                                <button
                                    onClick={() => handleUnlink(asset.assetId)}
                                    className="p-1.5 text-muted hover:text-error hover:bg-hover rounded transition-colors opacity-0 group-hover:opacity-100"
                                    title="Desvincular"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    );
                })}

                {assets.length === 0 && !showUploader && (
                    <p className="text-sm text-muted italic p-2">
                        No hay archivos adjuntos.
                    </p>
                )}
            </div>
        </div>
    );
}
