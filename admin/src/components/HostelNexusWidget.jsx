import { useState, useRef, useEffect } from 'react';
import './HostelNexusWidget.css';

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://127.0.0.1:8000';

const SUGGESTIONS = [
  'How many students are registered?',
  'Show recent notice board posts',
  'Give me student breakdown by year',
  'Who lives in room 14?',
  'Show absent students today',
  'Show pending leave applications',
];

export default function HostelNexusWidget() {
  const sessionIdRef = useRef(
    localStorage.getItem('hostelnexus_session_id') ||
      `hostelnexus-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const [messages, setMessages] = useState([
    {
      id: 1,
      from: 'bot',
      text: 'Hello. How can I assist you with the hostel database today?',
      source: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isMax, setIsMax] = useState(false);
  const [tab, setTab] = useState('chat'); // 'chat' or 'history'

  const endRef = useRef(null);
  const widgetRef = useRef(null);

  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isMax]);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${FASTAPI_URL}/health`, { method: 'GET' });
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('hostelnexus_session_id', sessionIdRef.current);
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const node = widgetRef.current;
    if (!node) return;
    node.style.left = 'auto';
    node.style.top = 'auto';
    node.style.right = '20px';
    node.style.bottom = '20px';
  }, []);

  /* ---------------------------------------------------------
     Dragging
  --------------------------------------------------------- */
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragRef.current.dragging) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      const nx = dragRef.current.origX + dx;
      const ny = dragRef.current.origY + dy;

      const node = widgetRef.current;
      if (node) {
        node.style.right = 'auto';
        node.style.bottom = 'auto';
        node.style.left = `${nx}px`;
        node.style.top = `${ny}px`;
      }
    };

    const onMouseUp = () => {
      dragRef.current.dragging = false;
      const node = widgetRef.current;
      if (node) {
        node.classList.remove('dragging');
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  /* ---------------------------------------------------------
     Send question to FastAPI /ask endpoint
  --------------------------------------------------------- */
  const send = async (customText = null) => {
    const text = (typeof customText === 'string' ? customText : input).trim();
    if (!text || loading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = Date.now();

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        from: 'user',
        text,
        timestamp: timeStr,
      },
    ]);

    if (!customText) setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${FASTAPI_URL}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: text,
          session_id: sessionIdRef.current,
          history: messages.slice(-10).map((m) => ({
            role: m.from === 'bot' ? 'assistant' : 'user',
            content: m.text,
          })),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      setIsOnline(true);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: 'bot',
          text: data.answer || data.error || 'No answer returned.',
          source: data.source,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      setIsOnline(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: 'bot',
          text: `Service unreachable. Please verify server connection.`,
          source: 'error',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const startDrag = (e) => {
    if (isMax) return;
    if (e.target.closest('button')) return;

    const node = widgetRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();

    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    };

    node.classList.add('dragging');
  };

  const userQueryHistory = messages.filter((m) => m.from === 'user');

  return (
    <div
      ref={widgetRef}
      className={`hostelnexus-widget ${isMax ? 'maximized' : 'minimized'}`}
      style={{ position: 'fixed' }}
      onClick={() => {
        if (!isMax && !dragRef.current.dragging) {
          setIsMax(true);
        }
      }}
    >
      {/* HEADER */}
      <div className="hostelnexus-widget-header" onMouseDown={startDrag}>
        <div className="hostelnexus-title-area">
          <div className="hostelnexus-logo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div>
            <strong>AI Assistant</strong>
            <div className="hostelnexus-status">
              <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
              {isOnline ? 'Connected' : 'Offline'}
            </div>
          </div>
        </div>

        <div className="hostelnexus-header-actions">
          <button
            className="icon-btn maximize-btn"
            title={isMax ? 'Minimize' : 'Maximize'}
            aria-label={isMax ? 'Minimize widget' : 'Maximize widget'}
            onClick={(e) => {
              e.stopPropagation();
              setIsMax((m) => !m);
            }}
          >
            {isMax ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="4 14 10 14 10 20"></polyline>
                <polyline points="20 10 14 10 14 4"></polyline>
                <line x1="14" y1="10" x2="21" y2="3"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className={`hostelnexus-widget-body ${isMax ? 'maximized' : ''}`}>
        {/* ONLY 2 CLEAN TABS: CHAT & HISTORY */}
        <div className="hostelnexus-tabs">
          <button className={`tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
            Chat
          </button>
          <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            History
          </button>
        </div>

        {/* CHAT TAB */}
        {tab === 'chat' && (
          <div className="hostelnexus-chat-container">
            <div className="hostelnexus-messages">
              {messages.map((m) => (
                <div key={m.id} className={`hostelnexus-msg ${m.from}`}>
                  <div className="hostelnexus-msg-content">
                    <div className="hostelnexus-msg-text">{m.text}</div>
                    {m.timestamp && (
                      <div className="msg-meta-row">
                        <span className="msg-time">{m.timestamp}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="hostelnexus-msg bot">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick Suggestions */}
            <div className="quick-suggestions-bar">
              {SUGGESTIONS.slice(0, 3).map((s, idx) => (
                <button key={idx} className="suggestion-chip" onClick={() => send(s)} disabled={loading}>
                  {s}
                </button>
              ))}
            </div>

            {/* INPUT */}
            <div className="hostelnexus-input-row">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                disabled={loading}
              />
              <button className="primary-btn send-btn" onClick={() => send()} disabled={loading || !input.trim()}>
                {loading ? (
                  <span className="send-loader"></span>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div className="hostelnexus-tab-content">
            <div className="section-title">
              <h4>Recent Queries</h4>
            </div>

            {userQueryHistory.length === 0 ? (
              <div className="empty-history-box">
                <p>No queries sent in this session yet.</p>
              </div>
            ) : (
              <div className="history-items-list">
                {userQueryHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="history-item-row"
                    onClick={() => {
                      setTab('chat');
                      send(item.text);
                    }}
                  >
                    <div className="history-item-text">{item.text}</div>
                    <span className="history-item-time">{item.timestamp}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="section-title" style={{ marginTop: '1rem' }}>
              <h4>Quick Prompts</h4>
            </div>
            <div className="suggestions-list">
              {SUGGESTIONS.map((s, idx) => (
                <div
                  key={idx}
                  className="suggestion-card"
                  onClick={() => {
                    setTab('chat');
                    send(s);
                  }}
                >
                  <div className="suggestion-text">{s}</div>
                  <span className="suggestion-action-arrow">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
