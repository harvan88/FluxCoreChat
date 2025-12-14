/**
 * ChatWidget Component
 * Extension Karen - Website Builder
 * Widget de chat embebible para sitios públicos
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'visitor' | 'business';
  timestamp: Date;
}

interface ChatWidgetProps {
  alias: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  greeting?: string;
}

const WIDGET_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';

export function ChatWidget({
  alias,
  position = 'bottom-right',
  primaryColor = '#3b82f6',
  greeting = '¡Hola! ¿En qué podemos ayudarte?',
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate or retrieve visitor ID
  useEffect(() => {
    const storedId = localStorage.getItem(`fluxcore_visitor_${alias}`);
    if (storedId) {
      setVisitorId(storedId);
    } else {
      const newId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(`fluxcore_visitor_${alias}`, newId);
      setVisitorId(newId);
    }
  }, [alias]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setIsConnecting(true);
    
    try {
      const ws = new WebSocket(`${WIDGET_WS_URL}?alias=${alias}&visitor=${visitorId}`);
      
      ws.onopen = () => {
        setIsConnecting(false);
        setIsConnected(true);
        
        // Send initial connection message
        ws.send(JSON.stringify({
          type: 'widget:connect',
          alias,
          visitorId,
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'widget:connected':
              setRelationshipId(data.relationshipId);
              break;
              
            case 'message:new':
              if (data.message) {
                setMessages(prev => [...prev, {
                  id: data.message.id,
                  text: data.message.content?.text || '',
                  sender: data.message.senderAccountId === visitorId ? 'visitor' : 'business',
                  timestamp: new Date(data.message.createdAt),
                }]);
              }
              break;
          }
        } catch (e) {
          console.warn('[ChatWidget] Failed to parse message:', e);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
      };
      
      ws.onerror = () => {
        setIsConnecting(false);
      };
      
      wsRef.current = ws;
    } catch (error) {
      setIsConnecting(false);
      console.error('[ChatWidget] Failed to connect:', error);
    }
  }, [alias, visitorId]);

  // Connect when widget opens
  useEffect(() => {
    if (isOpen && visitorId && !isConnected && !isConnecting) {
      connect();
    }
  }, [isOpen, visitorId, isConnected, isConnecting, connect]);

  // Add greeting message when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0 && greeting) {
      setMessages([{
        id: 'greeting',
        text: greeting,
        sender: 'business',
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, greeting, messages.length]);

  // Send message
  const sendMessage = useCallback(() => {
    if (!inputValue.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const messageId = `msg_${Date.now()}`;
    const text = inputValue.trim();

    // Optimistically add message
    setMessages(prev => [...prev, {
      id: messageId,
      text,
      sender: 'visitor',
      timestamp: new Date(),
    }]);

    // Send via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'widget:message',
      alias,
      visitorId,
      relationshipId,
      content: { text },
    }));

    setInputValue('');
  }, [inputValue, alias, visitorId, relationshipId]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const positionStyles = position === 'bottom-right' 
    ? { right: '1.5rem', bottom: '1.5rem' }
    : { left: '1.5rem', bottom: '1.5rem' };

  return (
    <div 
      className="fluxcore-chat-widget"
      style={{
        position: 'fixed',
        zIndex: 9999,
        fontFamily: 'Inter, system-ui, sans-serif',
        ...positionStyles,
      }}
    >
      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '5rem',
            right: position === 'bottom-right' ? '0' : 'auto',
            left: position === 'bottom-left' ? '0' : 'auto',
            width: '360px',
            maxWidth: 'calc(100vw - 2rem)',
            height: '500px',
            maxHeight: 'calc(100vh - 8rem)',
            backgroundColor: '#0d0d0d',
            borderRadius: '1rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #2a2a2a',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1rem',
              backgroundColor: primaryColor,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageCircle size={20} />
              <span style={{ fontWeight: 600 }}>Chat</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'visitor' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                }}
              >
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '1rem',
                    backgroundColor: msg.sender === 'visitor' ? primaryColor : '#1a1a1a',
                    color: msg.sender === 'visitor' ? 'white' : '#f5f5f5',
                    fontSize: '0.9rem',
                    lineHeight: 1.4,
                  }}
                >
                  {msg.text}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: '#666',
                    marginTop: '0.25rem',
                    textAlign: msg.sender === 'visitor' ? 'right' : 'left',
                  }}
                >
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '1rem',
              borderTop: '1px solid #2a2a2a',
              display: 'flex',
              gap: '0.5rem',
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #2a2a2a',
                backgroundColor: '#141414',
                color: '#f5f5f5',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || !isConnected}
              style={{
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: primaryColor,
                color: 'white',
                cursor: inputValue.trim() && isConnected ? 'pointer' : 'not-allowed',
                opacity: inputValue.trim() && isConnected ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isConnecting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>

          {/* Connection status */}
          {!isConnected && !isConnecting && (
            <div
              style={{
                padding: '0.5rem',
                backgroundColor: '#dc2626',
                color: 'white',
                fontSize: '0.75rem',
                textAlign: 'center',
              }}
            >
              Desconectado. <button onClick={connect} style={{ textDecoration: 'underline', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>Reconectar</button>
            </div>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: primaryColor,
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>
    </div>
  );
}

export default ChatWidget;
