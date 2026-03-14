/**
 * V2-1.4: MessageBubble Component
 * 
 * Muestra un mensaje con estados, reply-to, y acciones.
 * CORREGIDO: Usando sistema de diseño canónico
 */

import { useState, Fragment } from 'react';
import { CheckIcon, CheckCheckIcon, ClockIcon, AlertCircleIcon, RotateCcwIcon, ReplyIcon, EditIcon, TrashIcon, BotIcon, FileIcon, ShieldAlertIcon, GripVerticalIcon, ForwardIcon, CopyIcon, FlagIcon, DownloadIcon, XIcon } from '../../lib/icon-library';
import clsx from 'clsx';
import type { Message, MessageStatus } from '../../types';
import { AssetPreview } from './AssetPreview';
import { DeleteMessageModal } from '../ui/DeleteMessageModal';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  isAI?: boolean;
  replyToMessage?: Message;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: (scope: 'self' | 'all') => void;
  onRetry?: () => void;
  onScrollToMessage?: (messageId: string) => void;
  viewerAccountId?: string;
  // Props para modo selección
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: (messageId: string, selected: boolean) => void;
  onSelectionModeToggle?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  isAI = false,
  replyToMessage,
  onReply,
  onEdit,
  onRetry,
  onScrollToMessage,
  viewerAccountId,
  isSelectionMode = false,
  isSelected = false,
  onSelectionToggle,
  onSelectionModeToggle,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showOptionsButton, setShowOptionsButton] = useState(false);

  // Gradiente global para efecto Instagram - ÚNICA FUENTE DE VERDAD
  const GLOBAL_GRADIENT_MASK = {
  // Del 0% al 40% es Azul Oscuro (Header zone)
  // Del 40% al 60% ocurre toda la transición (Reading zone)
  // Del 60% al 100% es Cian/Azul brillante (Input zone)
  background: 'linear-gradient(to bottom, #0f172a 0%, #0f172a 30%, #2563eb 55%, #06b6d4 80%, #06b6d4 100%)',
  backgroundAttachment: 'fixed',
  backgroundSize: '100vw 100vh',
  };

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
        return <ClockIcon size={14} className="text-muted" />;
      case 'synced':
      case 'sent':
        return <CheckIcon size={14} className="text-muted" />;
      case 'delivered':
        return <CheckCheckIcon size={14} className="text-muted" />;
      case 'seen':
        return <CheckCheckIcon size={14} className="text-accent" />;
      case 'failed':
        return <AlertCircleIcon size={14} className="text-error" />;
      default:
        return <CheckIcon size={14} className="text-muted" />;
    }
  };

  // ── System messages (ai_blocked, etc.) ──────────────────────────────
  if (message.generatedBy === 'system') {
    const systemMeta = (message.content as any)?.__system as
      | { type: string; reason?: string; requiredProvider?: string; creditBalance?: number }
      | undefined;

    return (
      <div className="flex justify-center my-2" data-component-name="MessageBubble">
        <div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-warning/10 border border-warning/20 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ShieldAlertIcon size={14} className="text-warning" />
            <span className="text-xs font-medium text-warning">
              {systemMeta?.type === 'ai_blocked' ? 'IA no disponible' : 'Sistema'}
            </span>
          </div>
          {typeof message.content.text === 'string' && message.content.text.trim().length > 0 && (
            <p className="text-sm text-secondary">{message.content.text}</p>
          )}
          <div className="text-xs text-muted mt-1">
            {formatTime(message.createdAt)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
    <div
      className={clsx(
        'group flex gap-0.5 items-center',
        isOwn ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Selector Circle - fuera del bubble */}
      {isSelectionMode && (
        <button
          onClick={() => onSelectionToggle?.(message.id, !isSelected)}
          className={clsx(
            'flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all items-center justify-center',
            isOwn ? 'order-1' : 'order-[-1]',
            isSelected 
              ? 'bg-accent border-accent' 
              : 'bg-surface border-muted hover:border-accent'
          )}
          aria-label={isSelected ? 'Deseleccionar mensaje' : 'Seleccionar mensaje'}
        >
          {isSelected && (
            <div className="w-full h-full flex items-center justify-center">
              <CheckIcon size={12} className="text-white" />
            </div>
          )}
        </button>
      )}

      {/* Actions (left side for own messages) */}
      {isOwn && showActions && !isSelectionMode && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {message.status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="p-1 rounded-md text-muted hover:text-primary hover:bg-hover transition-colors"
              aria-label="Reintentar envío"
            >
              <RotateCcwIcon size={14} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 rounded-md text-muted hover:text-primary hover:bg-hover transition-colors"
              aria-label="Editar mensaje"
            >
              <EditIcon size={14} />
            </button>
          )}
          {onReply && (
            <button
              onClick={onReply}
              className="p-1 rounded-md text-muted hover:text-primary hover:bg-hover transition-colors"
              aria-label="Responder mensaje"
            >
              <ReplyIcon size={14} />
            </button>
          )}
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={clsx(
          'max-w-[80%] px-4 py-2 relative rounded-2xl transition-all',
          isOwn 
            ? 'ml-auto text-white rounded-br-sm shadow-md' 
            : 'mr-auto bg-elevated text-primary rounded-bl-sm',
          // Si es IA y no es propio, aplicamos clase de borde
          (!isOwn && isAI) && 'border border-transparent'
        )}
        style={{
          ...(isOwn ? GLOBAL_GRADIENT_MASK : {}),
          ...((!isOwn && isAI) ? {
            backgroundImage: `linear-gradient(var(--bg-elevated), var(--bg-elevated)), ${GLOBAL_GRADIENT_MASK.background}`,
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
            backgroundAttachment: 'fixed',
            opacity: 0.85
          } : {})
        }}
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
              const sizeBytes = m.sizeBytes ?? 0;

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

              // TODO(assets): Este fallback a url debe eliminarse cuando adapters migren a assetId.
              // Por ahora, se mantiene compatibilidad con canales externos que aún entregan url.
              if (!m.url) {
                return (
                  <div key={`${key}-unsupported`} className="text-xs text-muted bg-active rounded-lg p-2 border border-subtle">
                    No se puede mostrar este adjunto.
                  </div>
                );
              }

              // TODO(assets): Este renderizado directo por url debe eliminarse cuando adapters migren a assetId.
              // Por ahora, se mantiene compatibilidad con canales externos que aún entregan url.
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
                      <FileIcon size={18} className="text-info flex-shrink-0" />
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
          <p className={clsx(
            'text-sm whitespace-pre-wrap break-words',
            isOwn ? 'font-medium' : ''
          )}>{message.content.text}</p>
        )}

        {/* Footer: time, AI badge, status, options */}
        <div
          className={clsx(
            'flex items-center gap-1.5 mt-1 text-xs',
            isOwn ? 'text-white/80 justify-end' : 'text-muted'
          )}
          onMouseEnter={() => setShowOptionsButton(true)}
          onMouseLeave={() => setShowOptionsButton(false)}
        >
          {message.updatedAt && message.updatedAt !== message.createdAt && (
            <span className="opacity-70">(editado)</span>
          )}
          <span>{formatTime(message.createdAt)}</span>
          {message.generatedBy === 'ai' && (
            <span className={clsx(
              'flex items-center gap-0.5 px-1.5 py-0.5 rounded',
              isOwn 
                ? 'bg-white/20 text-white' 
                : 'bg-accent-muted text-accent'
            )}>
              <BotIcon size={10} />
              IA
            </span>
          )}
          {isOwn && renderStatus(message.status)}
          
          {/* Options Button - aparece al hover en metadata */}
          {showOptionsButton && !isSelectionMode && (
            <button
              onClick={() => onSelectionModeToggle?.(message.id)}
              className="p-0.5 rounded text-muted hover:text-primary hover:bg-hover transition-colors"
              aria-label="Opciones de mensaje"
            >
              <GripVerticalIcon size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Actions (right side for received messages) */}
      {!isOwn && showActions && onReply && !isSelectionMode && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onReply}
            className="p-1 text-muted hover:text-primary hover:bg-hover rounded"
            title="Responder"
          >
            <ReplyIcon size={14} />
          </button>
        </div>
      )}
    </div>
  </Fragment>
  );
}

// Componente de barra de acciones para modo selección
interface MessageSelectionToolbarProps {
  selectedCount: number;
  onClose: () => void;
  onForward: () => void;
  onCopy: () => void;
  onReport: () => void;
  onDownload: () => void;
  onDelete: (scope: 'self' | 'all') => void;
}

export function MessageSelectionToolbar({
  selectedCount,
  onClose,
  onForward,
  onCopy,
  onReport,
  onDownload,
  onDelete,
}: MessageSelectionToolbarProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = (scope: 'self' | 'all') => {
    if (onDelete) {
      onDelete(scope);
    }
    setShowDeleteModal(false);
  };

  // For bulk selection, we can delete for all if user has permission
  const canDeleteForAll = true; // This could be determined by user permissions

  return (
    <Fragment>
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-t border-subtle">
        {/* Lado izquierdo: cerrar + contador */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-primary hover:bg-hover transition-colors"
            aria-label="Cerrar modo selección"
          >
            <XIcon size={16} />
          </button>
          <span className="text-sm text-primary">
            {selectedCount} {selectedCount === 1 ? 'mensaje seleccionado' : 'mensajes seleccionados'}
          </span>
        </div>

        {/* Lado derecho: acciones */}
        <div className="flex items-center gap-1">
          <button
            onClick={onForward}
            className="p-2 rounded text-muted hover:text-primary hover:bg-hover transition-colors"
            aria-label="Reenviar mensajes"
          >
            <ForwardIcon size={16} />
          </button>
          <button
            onClick={onCopy}
            className="p-2 rounded text-muted hover:text-primary hover:bg-hover transition-colors"
            aria-label="Copiar mensajes"
          >
            <CopyIcon size={16} />
          </button>
          <button
            onClick={onReport}
            className="p-2 rounded text-muted hover:text-primary hover:bg-hover transition-colors"
            aria-label="Reportar mensajes"
          >
            <FlagIcon size={16} />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1 rounded-md text-error hover:text-error hover:bg-error/10 transition-colors"
            aria-label="Eliminar mensajes seleccionados"
          >
            <TrashIcon size={14} />
          </button>
          <button
            onClick={onDownload}
            className="p-2 rounded text-muted hover:text-primary hover:bg-hover transition-colors"
            aria-label="Descargar mensajes"
          >
            <DownloadIcon size={16} />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteMessageModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        messageCount={selectedCount}
        canDeleteForAll={canDeleteForAll}
      />
    </Fragment>
  );
}
