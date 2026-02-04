/**
 * V2-1.4: MessageBubble Component
 * 
 * Muestra un mensaje con estados, reply-to, y acciones.
 * CORREGIDO: Usando sistema de diseño canónico
 */

import { useState } from 'react';
import { Check, CheckCheck, Clock, AlertCircle, RotateCcw, Reply, Pencil, Trash2, Bot, File } from 'lucide-react';
import clsx from 'clsx';
import type { Message, MessageStatus } from '../../types';
import { AssetPreview } from './AssetPreview';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  replyToMessage?: Message;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
  onScrollToMessage?: (messageId: string) => void;
  viewerAccountId?: string;
}

export function MessageBubble({
  message,
  isOwn,
  replyToMessage,
  onReply,
  onEdit,
  onDelete,
  onRetry,
  onScrollToMessage,
  viewerAccountId,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const resolveMediaUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${apiUrl}${url}`;
    return url;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const renderWaveform = (samples: unknown) => {
    if (!Array.isArray(samples) || samples.length === 0) return null;
    const max = Math.max(...samples.map((n) => (typeof n === 'number' ? n : 0)), 1);

    return (
      <div className="mt-2 flex items-end gap-0.5 h-8">
        {samples.slice(0, 64).map((n, i) => {
          const v = typeof n === 'number' ? n : 0;
          const h = Math.max(2, Math.round((v / max) * 28));
          return (
            <div
              key={i}
              className={clsx('w-1 rounded-sm', isOwn ? 'bg-muted opacity-60' : 'bg-muted')}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>
    );
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Sistema canónico de colores
  const renderStatus = (status?: MessageStatus) => {
    switch (status) {
      case 'pending_backend':
      case 'local_only':
        return <Clock size={14} className="text-muted" />;
      case 'synced':
      case 'sent':
        return <Check size={14} className="text-muted" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-muted" />;
      case 'seen':
        return <CheckCheck size={14} className="text-accent" />;
      case 'failed':
        return <AlertCircle size={14} className="text-error" />;
      default:
        return <Check size={14} className="text-muted" />;
    }
  };

  return (
    <div
      className={clsx(
        'group flex gap-2',
        isOwn ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Actions (left side for own messages) */}
      {isOwn && showActions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {message.status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="p-1 text-muted hover:text-primary hover:bg-hover rounded"
              title="Reintentar"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {onEdit && message.status !== 'failed' && (
            <button
              onClick={onEdit}
              className="p-1 text-muted hover:text-primary hover:bg-hover rounded"
              title="Editar"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-muted hover:text-error hover:bg-hover rounded"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          )}
          {onReply && (
            <button
              onClick={onReply}
              className="p-1 text-muted hover:text-primary hover:bg-hover rounded"
              title="Responder"
            >
              <Reply size={14} />
            </button>
          )}
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={clsx(
          'max-w-[70%] rounded-2xl px-4 py-2 relative',
          isOwn 
            ? 'ml-auto bg-accent text-primary rounded-br-md' 
            : 'mr-auto bg-elevated text-primary rounded-bl-md'
        )}
      >
        {/* Reply-to preview */}
        {replyToMessage && (
          <button
            onClick={() => onScrollToMessage?.(replyToMessage.id)}
            className="block w-full text-left mb-2 p-2 bg-active rounded-lg border-l-2 border-accent"
          >
            <div className="text-xs text-accent mb-0.5">
              {replyToMessage.senderAccountId === message.senderAccountId ? 'Tú' : 'Respuesta a'}
            </div>
            <div className="text-xs text-secondary truncate">
              {replyToMessage.content.text}
            </div>
          </button>
        )}

        {/* Media previews */}
        {Array.isArray(message.content.media) && message.content.media.length > 0 && (
          <div className="flex flex-col gap-2 mb-2">
            {message.content.media.map((m, idx) => {
              const key = m.assetId ?? `${m.type}-${idx}`;
              const fallbackName = m.name || m.filename || `Archivo ${idx + 1}`;
              const sizeBytes = m.sizeBytes ?? m.size ?? 0;

              const renderAsset = () => {
                if (!m.assetId || !viewerAccountId) return null;

                const preview = (
                  <AssetPreview
                    key={key}
                    assetId={m.assetId}
                    accountId={viewerAccountId}
                    name={fallbackName}
                    mimeType={m.mimeType || 'application/octet-stream'}
                    sizeBytes={sizeBytes}
                    typeHint={m.type}
                  />
                );

                if (m.type === 'audio' && (m as any)?.waveformData?.samples) {
                  return (
                    <div key={`${key}-asset-audio`} className="bg-elevated rounded-lg p-2 border border-subtle">
                      {preview}
                      {renderWaveform((m as any)?.waveformData?.samples)}
                    </div>
                  );
                }

                return preview;
              };

              const assetContent = renderAsset();
              if (assetContent) return assetContent;

              if (!m.url) {
                return (
                  <div key={`${key}-unsupported`} className="text-xs text-muted bg-active rounded-lg p-2 border border-subtle">
                    No se puede mostrar este adjunto.
                  </div>
                );
              }

              const url = resolveMediaUrl(m.url);

              switch (m.type) {
                case 'image':
                  return (
                    <img
                      key={`${key}-image`}
                      src={url}
                      alt={fallbackName}
                      className="rounded-lg max-h-64 object-cover border border-subtle"
                      loading="lazy"
                    />
                  );
                case 'audio':
                  return (
                    <div key={`${key}-audio`} className="bg-elevated rounded-lg p-2 border border-subtle">
                      <audio controls src={url} className="w-full" />
                      {renderWaveform((m as any)?.waveformData?.samples)}
                      {fallbackName && (
                        <div className={clsx('mt-1 text-xs', isOwn ? 'text-secondary' : 'text-muted')}>
                          {fallbackName}
                        </div>
                      )}
                    </div>
                  );
                case 'document':
                default:
                  return (
                    <a
                      key={`${key}-doc`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className={clsx(
                        'flex items-center gap-2 rounded-lg p-2 border border-subtle',
                        isOwn ? 'bg-elevated' : 'bg-active'
                      )}
                    >
                      <File size={18} className="text-info flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm truncate text-primary">
                          {fallbackName}
                        </div>
                        {(m.mimeType || sizeBytes) && (
                          <div className={clsx('text-xs truncate', isOwn ? 'text-secondary' : 'text-muted')}>
                            {m.mimeType || ''}{m.mimeType && sizeBytes ? ' · ' : ''}{formatBytes(sizeBytes)}
                          </div>
                        )}
                      </div>
                    </a>
                  );
              }
            })}
          </div>
        )}

        {/* Message content */}
        {typeof message.content.text === 'string' && message.content.text.trim().length > 0 && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content.text}</p>
        )}

        {/* Footer: time, AI badge, status */}
        <div
          className={clsx(
            'flex items-center gap-1.5 mt-1 text-xs',
            isOwn ? 'text-secondary opacity-70 justify-end' : 'text-muted'
          )}
        >
          {message.updatedAt && message.updatedAt !== message.createdAt && (
            <span className="opacity-70">(editado)</span>
          )}
          <span>{formatTime(message.createdAt)}</span>
          {message.generatedBy === 'ai' && (
            <span className="flex items-center gap-0.5 bg-accent-muted px-1.5 py-0.5 rounded text-accent">
              <Bot size={10} />
              IA
            </span>
          )}
          {isOwn && renderStatus(message.status)}
        </div>
      </div>

      {/* Actions (right side for received messages) */}
      {!isOwn && showActions && onReply && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onReply}
            className="p-1 text-muted hover:text-primary hover:bg-hover rounded"
            title="Responder"
          >
            <Reply size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
