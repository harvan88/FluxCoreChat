/**
 * RAG Configuration Section
 * 
 * Sección de configuración RAG para Vector Stores.
 * Permite configurar chunking, embedding, y retrieval.
 * 
 * Sigue el patrón existente de CollapsibleSection con toggle
 * para indicar si se usa configuración personalizada o defaults.
 */

import { useState, useEffect } from 'react';
import { Zap, Search, FileText } from 'lucide-react';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { SliderInput } from '../../ui/SliderInput';
import { useAuthStore } from '../../../store/authStore';

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

interface RAGConfig {
    chunking: {
        enabled: boolean;
        strategy: 'fixed' | 'recursive' | 'sentence' | 'paragraph';
        sizeTokens: number;
        overlapTokens: number;
    };
    embedding: {
        enabled: boolean;
        provider: 'openai' | 'cohere' | 'local';
        model: string;
    };
    retrieval: {
        enabled: boolean;
        topK: number;
        minScore: number;
        maxTokens: number;
    };
}

const DEFAULT_CONFIG: RAGConfig = {
    chunking: {
        enabled: true,
        strategy: 'recursive',
        sizeTokens: 500,
        overlapTokens: 50,
    },
    embedding: {
        enabled: true,
        provider: 'openai',
        model: 'text-embedding-3-small',
    },
    retrieval: {
        enabled: true,
        topK: 5,
        minScore: 0.7,
        maxTokens: 2000,
    },
};

const CHUNKING_STRATEGIES = [
    { value: 'fixed', label: 'Tamaño fijo', description: 'Divide en chunks de tamaño uniforme' },
    { value: 'recursive', label: 'Recursivo', description: 'Divide por separadores jerárquicos' },
    { value: 'sentence', label: 'Por oraciones', description: 'Agrupa oraciones completas' },
    { value: 'paragraph', label: 'Por párrafos', description: 'Mantiene párrafos intactos' },
];

const EMBEDDING_PROVIDERS = [
    { value: 'openai', label: 'OpenAI', models: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'] },
    { value: 'cohere', label: 'Cohere', models: ['embed-english-v3.0', 'embed-multilingual-v3.0'] },
    { value: 'local', label: 'Local', models: ['all-MiniLM-L6-v2'] },
];

interface RAGConfigSectionProps {
    vectorStoreId: string;
    accountId: string;
    onConfigChange?: (config: RAGConfig) => void;
}

export function RAGConfigSection({ vectorStoreId, accountId, onConfigChange }: RAGConfigSectionProps) {
    const { token } = useAuthStore();
    const [config, setConfig] = useState<RAGConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Cargar configuración existente
    useEffect(() => {
        if (vectorStoreId && token) {
            loadConfig();
        }
    }, [vectorStoreId, token]);

    const loadConfig = async () => {
        try {
            const response = await fetch(
                `/api/fluxcore/rag-config?vectorStoreId=${vectorStoreId}&accountId=${accountId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setConfig(data.data);
                }
            }
        } catch (error) {
            console.error('Error loading RAG config:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async (newConfig: RAGConfig) => {
        setSaving(true);
        try {
            await fetch(`/api/fluxcore/rag-config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    vectorStoreId,
                    accountId,
                    ...newConfig,
                }),
            });
            onConfigChange?.(newConfig);
        } catch (error) {
            console.error('Error saving RAG config:', error);
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (updates: Partial<RAGConfig>) => {
        const newConfig = { ...config, ...updates };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    const updateChunking = (updates: Partial<RAGConfig['chunking']>) => {
        updateConfig({ chunking: { ...config.chunking, ...updates } });
    };

    const updateEmbedding = (updates: Partial<RAGConfig['embedding']>) => {
        updateConfig({ embedding: { ...config.embedding, ...updates } });
    };

    const updateRetrieval = (updates: Partial<RAGConfig['retrieval']>) => {
        updateConfig({ retrieval: { ...config.retrieval, ...updates } });
    };

    const currentProvider = EMBEDDING_PROVIDERS.find(p => p.value === config.embedding.provider);

    if (loading) {
        return (
            <div className="py-4 text-center text-muted text-sm">
                Cargando configuración RAG...
            </div>
        );
    }

    return (
        <div className="space-y-0 border-t border-subtle">
            {/* Chunking Configuration */}
            <CollapsibleSection
                title="Fragmentación de texto"
                icon={<FileText size={16} />}
                isCustomized={config.chunking.enabled}
                onToggleCustomized={(enabled) => updateChunking({ enabled })}
                showToggle={true}
                defaultExpanded={false}
            >
                <div className={`space-y-4 ${!config.chunking.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* Strategy */}
                    <div>
                        <label className="block text-sm text-muted mb-2">Estrategia</label>
                        <div className="grid grid-cols-2 gap-2">
                            {CHUNKING_STRATEGIES.map((strategy) => (
                                <button
                                    key={strategy.value}
                                    type="button"
                                    onClick={() => updateChunking({ strategy: strategy.value as any })}
                                    className={`
                    p-3 rounded-lg border text-left transition-all
                    ${config.chunking.strategy === strategy.value
                                            ? 'border-accent bg-accent/10 text-primary'
                                            : 'border-subtle bg-elevated text-secondary hover:border-default'
                                        }
                  `}
                                >
                                    <div className="font-medium text-sm">{strategy.label}</div>
                                    <div className="text-xs text-muted mt-1">{strategy.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Size */}
                    <div>
                        <label className="block text-sm text-muted mb-2">
                            Tamaño de fragmento: <span className="text-primary">{config.chunking.sizeTokens} tokens</span>
                        </label>
                        <SliderInput
                            value={config.chunking.sizeTokens}
                            onChange={(value) => updateChunking({ sizeTokens: value })}
                            min={100}
                            max={2000}
                            step={50}
                        />
                    </div>

                    {/* Overlap */}
                    <div>
                        <label className="block text-sm text-muted mb-2">
                            Solapamiento: <span className="text-primary">{config.chunking.overlapTokens} tokens</span>
                        </label>
                        <SliderInput
                            value={config.chunking.overlapTokens}
                            onChange={(value) => updateChunking({ overlapTokens: value })}
                            min={0}
                            max={200}
                            step={10}
                        />
                    </div>
                </div>
            </CollapsibleSection>

            {/* Embedding Configuration */}
            <CollapsibleSection
                title="Modelo de embeddings"
                icon={<Zap size={16} />}
                isCustomized={config.embedding.enabled}
                onToggleCustomized={(enabled) => updateEmbedding({ enabled })}
                showToggle={true}
                defaultExpanded={false}
            >
                <div className={`space-y-4 ${!config.embedding.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* Provider */}
                    <div>
                        <label className="block text-sm text-muted mb-2">Proveedor</label>
                        <div className="flex gap-2">
                            {EMBEDDING_PROVIDERS.map((provider) => (
                                <button
                                    key={provider.value}
                                    type="button"
                                    onClick={() => updateEmbedding({
                                        provider: provider.value as any,
                                        model: provider.models[0]
                                    })}
                                    className={`
                    px-4 py-2 rounded-lg border transition-all flex-1
                    ${config.embedding.provider === provider.value
                                            ? 'border-accent bg-accent/10 text-primary'
                                            : 'border-subtle bg-elevated text-secondary hover:border-default'
                                        }
                  `}
                                >
                                    {provider.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Model */}
                    <div>
                        <label className="block text-sm text-muted mb-2">Modelo</label>
                        <select
                            className="w-full bg-input border border-subtle rounded-lg px-3 py-2 text-primary"
                            value={config.embedding.model}
                            onChange={(e) => updateEmbedding({ model: e.target.value })}
                        >
                            {currentProvider?.models.map((model) => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </CollapsibleSection>

            {/* Retrieval Configuration */}
            <CollapsibleSection
                title="Recuperación"
                icon={<Search size={16} />}
                isCustomized={config.retrieval.enabled}
                onToggleCustomized={(enabled) => updateRetrieval({ enabled })}
                showToggle={true}
                defaultExpanded={false}
            >
                <div className={`space-y-4 ${!config.retrieval.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    {/* Top K */}
                    <div>
                        <label className="block text-sm text-muted mb-2">
                            Fragmentos a recuperar: <span className="text-primary">{config.retrieval.topK}</span>
                        </label>
                        <SliderInput
                            value={config.retrieval.topK}
                            onChange={(value) => updateRetrieval({ topK: value })}
                            min={1}
                            max={20}
                            step={1}
                        />
                    </div>

                    {/* Min Score */}
                    <div>
                        <label className="block text-sm text-muted mb-2">
                            Similitud mínima: <span className="text-primary">{(config.retrieval.minScore * 100).toFixed(0)}%</span>
                        </label>
                        <SliderInput
                            value={config.retrieval.minScore}
                            onChange={(value) => updateRetrieval({ minScore: value })}
                            min={0.5}
                            max={0.95}
                            step={0.05}
                        />
                    </div>

                    {/* Max Tokens */}
                    <div>
                        <label className="block text-sm text-muted mb-2">
                            Tokens máximos: <span className="text-primary">{config.retrieval.maxTokens}</span>
                        </label>
                        <SliderInput
                            value={config.retrieval.maxTokens}
                            onChange={(value) => updateRetrieval({ maxTokens: value })}
                            min={500}
                            max={8000}
                            step={500}
                        />
                    </div>
                </div>
            </CollapsibleSection>

            {/* Status indicator */}
            {saving && (
                <div className="px-4 py-2 text-xs text-muted text-center">
                    Guardando...
                </div>
            )}
        </div>
    );
}

export default RAGConfigSection;
