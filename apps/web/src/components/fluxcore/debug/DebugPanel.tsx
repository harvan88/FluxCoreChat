/**
 * DebugPanel.tsx
 * 
 * Panel de debug con pestañas para logs y estado del componente.
 * Diseñado para ser consistente con el sistema de diseño de FluxCore.
 */

import { useState } from 'react';
import { X, Copy, Check, AlertTriangle } from 'lucide-react';

export interface DebugLog {
  timestamp: Date;
  type: 'info' | 'error' | 'warn' | 'success';
  message: string;
  data?: any;
}

interface DebugPanelProps {
  logs: DebugLog[];
  state: Record<string, any>;
  onClose: () => void;
}

export default function DebugPanel({ logs, state, onClose }: DebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'logs' | 'state'>('logs');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const copyViaFallback = (content: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!succeeded) {
      throw new Error('ExecCommand copy failed');
    }
  };

  const handleCopy = async () => {
    const content = activeTab === 'logs'
      ? JSON.stringify(logs, null, 2)
      : JSON.stringify(state, null, 2);

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        copyViaFallback(content);
      }
      setCopyStatus('success');
      setCopyMessage('Copiado al portapapeles');
    } catch (error) {
      console.warn('[DebugPanel] clipboard copy failed', error);
      setCopyStatus('error');
      setCopyMessage('No se pudo copiar, intenta con Cmd/Ctrl + C');
    } finally {
      setTimeout(() => {
        setCopyStatus('idle');
        setCopyMessage(null);
      }, 2200);
    }
  };

  const getLogColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="fixed bottom-16 right-4 w-[500px] max-h-[400px] bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === 'logs' 
                ? 'bg-gray-700 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('state')}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === 'state' 
                ? 'bg-gray-700 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            State
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
            title="Copiar contenido"
          >
            {copyStatus === 'success' ? (
              <Check size={14} className="text-green-400" />
            ) : copyStatus === 'error' ? (
              <AlertTriangle size={14} className="text-yellow-400" />
            ) : (
              <Copy size={14} />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {copyMessage && (
        <div className={`text-xs px-3 py-1 ${copyStatus === 'error' ? 'text-yellow-400' : 'text-green-400'}`}>
          {copyMessage}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {activeTab === 'logs' ? (
          logs.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No hay logs</div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div key={i} className={`${getLogColor(log.type)}`}>
                  <span className="text-gray-600">
                    [{log.timestamp.toLocaleTimeString()}]
                  </span>{' '}
                  <span className="font-semibold">[{log.type.toUpperCase()}]</span>{' '}
                  {log.message}
                  {log.data && (
                    <pre className="ml-4 mt-1 text-gray-500 overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(state, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
