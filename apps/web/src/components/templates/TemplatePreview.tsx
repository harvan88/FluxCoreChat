import { useMemo } from 'react';
import clsx from 'clsx';
import { AssetPreview } from '../chat/AssetPreview';
import type { TemplateVariable, TemplateAsset } from './types';

interface TemplatePreviewProps {
    content: string;
    variables?: TemplateVariable[];
    assets?: TemplateAsset[];
    accountId: string;
    className?: string;
    compact?: boolean;
}

export function TemplatePreview({
    content,
    variables = [],
    assets = [],
    accountId,
    className,
    compact = false
}: TemplatePreviewProps) {

    // Substitute variables with visualization
    const previewContent = useMemo(() => {
        if (!content) return <span className="text-muted italic">Sin contenido...</span>;

        const parts: (string | JSX.Element)[] = [];
        let lastIndex = 0;
        const regex = /\{\{(\w+)\}\}/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            // Push text before match
            if (match.index > lastIndex) {
                parts.push(content.substring(lastIndex, match.index));
            }

            const varName = match[1];
            const variable = variables.find(v => v.name === varName);
            const displayValue = variable?.defaultValue
                ? variable.defaultValue
                : variable?.label || varName;

            parts.push(
                <span key={match.index} className="inline-block bg-accent/10 text-accent px-1 rounded text-xs font-medium border border-accent/20 mx-0.5">
                    {displayValue}
                </span>
            );

            lastIndex = regex.lastIndex;
        }

        // Push remaining text
        if (lastIndex < content.length) {
            parts.push(content.substring(lastIndex));
        }

        return parts;
    }, [content, variables]);

    return (
        <div className={clsx("flex flex-col gap-2", className)}>
            <div className={clsx(
                "p-3 bg-surface border border-subtle rounded-lg shadow-sm w-fit max-w-[85%]", // Message bubble style
                "rounded-tl-none"
            )}>
                <p className="text-primary whitespace-pre-wrap text-sm leading-relaxed">
                    {previewContent}
                </p>
            </div>

            {/* Assets Grid */}
            {assets.length > 0 && (
                <div className={clsx(
                    "grid gap-2",
                    compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
                )}>
                    {assets.map(asset => (
                        <AssetPreview
                            key={asset.assetId}
                            assetId={asset.assetId}
                            accountId={accountId}
                            name={asset.name}
                            mimeType={asset.mimeType || 'application/octet-stream'}
                            sizeBytes={asset.sizeBytes || 0}
                            compact={true}
                            className="border border-subtle rounded-lg bg-surface overflow-hidden"
                            showDownload={false}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
