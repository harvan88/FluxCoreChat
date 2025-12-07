/**
 * V2-1.4: MessageBubble Component
 * 
 * Muestra un mensaje con estados, reply-to, y acciones.
 */

import { useState } from 'react';
import { Check, CheckCheck, Clock, AlertCircle, RotateCcw, Reply, Pencil, Trash2, Bot } from 'lucide-react';
import clsx from 'clsx';
import type { Message, MessageStatus } from '../../types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  replyToMessage?: Message;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
  onScrollToMessage?: (messageId: string) => void;
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
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStatus = (status?: MessageStatus) => {
    switch (status) {
      case 'pending_backend':
      case 'local_only':
        return <Clock size={14} className="text-gray-400" />;
      case 'synced':
      case 'sent':
        return <Check size={14} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-gray-400" />;
      case 'seen':
        return <CheckCheck size={14} className="text-blue-400" />;
      case 'failed':
        return <AlertCircle size={14} className="text-red-400" />;
      default:
        return <Check size={14} className="text-gray-400" />;
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
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Reintentar"
            >
              <RotateCcw size={14} />
            </button>
          )}
          {onEdit && message.status !== 'failed' && (
            <button
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
              title="Editar"
            >
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          )}
          {onReply && (
            <button
              onClick={onReply}
              className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
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
            ? message.status === 'failed'
              ? 'bg-red-900/50 text-white rounded-br-md'
              : 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-700 text-white rounded-bl-md'
        )}
      >
        {/* Reply-to preview */}
        {replyToMessage && (
          <button
            onClick={() => onScrollToMessage?.(replyToMessage.id)}
            className="block w-full text-left mb-2 p-2 bg-black/20 rounded-lg border-l-2 border-blue-400"
          >
            <div className="text-xs text-blue-300 mb-0.5">
              {replyToMessage.senderAccountId === message.senderAccountId ? 'Tú' : 'Respuesta a'}
            </div>
            <div className="text-xs text-gray-300 truncate">
              {replyToMessage.content.text}
            </div>
          </button>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content.text}</p>

        {/* Footer: time, AI badge, status */}
        <div
          className={clsx(
            'flex items-center gap-1.5 mt-1 text-xs',
            isOwn ? 'text-blue-200 justify-end' : 'text-gray-400'
          )}
        >
          {message.updatedAt && message.updatedAt !== message.createdAt && (
            <span className="opacity-70">(editado)</span>
          )}
          <span>{formatTime(message.createdAt)}</span>
          {message.generatedBy === 'ai' && (
            <span className="flex items-center gap-0.5 bg-purple-500/30 px-1.5 py-0.5 rounded text-purple-200">
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
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
            title="Responder"
          >
            <Reply size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
