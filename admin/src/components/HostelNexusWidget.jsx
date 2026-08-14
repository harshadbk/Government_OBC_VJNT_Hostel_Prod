import { useState, useRef, useEffect } from 'react';
import './HostelNexusWidget.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function getAdminToken() {
  const token = localStorage.getItem('adminToken');

  if (!token || token === 'null' || token === 'undefined') {
    localStorage.removeItem('adminToken');
    return null;
  }

  return token;
}

export default function HostelNexusWidget() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: 'bot',
      text: 'HostelNexus ready. Ask for counts or reports.',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const endRef = useRef(null);
  const widgetRef = useRef(null);

  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const [isMax, setIsMax] = useState(false);
  const [tab, setTab] = useState('chat');
  const [counts, setCounts] = useState([]);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({
        behavior: 'smooth',
      });
    }
  }, [messages, isMax]);

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
     Fetch student counts
  --------------------------------------------------------- */

  useEffect(() => {
    if (tab === 'students' || isMax) {
      const token = getAdminToken();

      if (!token) return;

      fetch(
        `${apiBaseUrl}/api/admin/users/counts?groupBy=casteCategory`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
        .then((r) => r.json())
        .then((d) => {
          setCounts(d.counts || []);
        })
        .catch(() => {
          setCounts([]);
        });
    }
  }, [tab, isMax]);

  /* ---------------------------------------------------------
     Send message
  --------------------------------------------------------- */

  const send = async () => {
    const text = input.trim();

    if (!text || loading) return;

    const nextId = messages.length + 1;

    setMessages((m) => [
      ...m,
      {
        id: nextId,
        from: 'user',
        text,
      },
    ]);

    setInput('');
    setLoading(true);

    const token = getAdminToken();

    try {
      if (token) {
        const res = await fetch(
          `${apiBaseUrl}/api/admin/hostelnexus/message`,
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },

            body: JSON.stringify({
              message: text,
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();

          setMessages((m) => [
            ...m,
            {
              id: nextId + 1,
              from: 'bot',
              text: data.reply || 'OK',
            },
          ]);
        } else {
          setMessages((m) => [
            ...m,
            {
              id: nextId + 1,
              from: 'bot',
              text: `Echo: ${text}`,
            },
          ]);
        }
      } else {
        setMessages((m) => [
          ...m,
          {
            id: nextId + 1,
            from: 'bot',
            text: `Echo: ${text}`,
          },
        ]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: nextId + 1,
          from: 'bot',
          text: `Error: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------
     Enter key
  --------------------------------------------------------- */

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  /* ---------------------------------------------------------
     Start dragging
  --------------------------------------------------------- */

  const startDrag = (e) => {
    if (isMax) return;

    // Don't drag when clicking buttons
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

  return (
    <div
      ref={widgetRef}
      className={`hostelnexus-widget ${isMax ? 'maximized' : 'minimized'}`}
      style={{ position: 'fixed' }}
      onClick={(e) => {
        // when minimized, clicking the pill should open the widget
        if (!isMax && !dragRef.current.dragging) {
          setIsMax(true);
        }
      }}
    >

      <div
        className="hostelnexus-widget-header"
        onMouseDown={startDrag}
      >
        <div className="hostelnexus-title-area">
          <div className="hostelnexus-logo">
            ✦
          </div>

          <div>
            <strong>HostelNexus</strong>

            <div className="hostelnexus-status">
              <span className="status-dot"></span>
              Connected to database
            </div>
          </div>
        </div>

        <div className="hostelnexus-header-actions">
          <button
            className="icon-btn maximize-btn"
            title={isMax ? 'Minimize' : 'Maximize'}
            aria-label={isMax ? 'Minimize widget' : 'Maximize widget'}
            onClick={() => setIsMax((m) => !m)}
          >
            {isMax ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 13h2v6a2 2 0 0 1-2 2h-6v-2h6v-6zM5 11H3V5a2 2 0 0 1 2-2h6v2H5v6zM19 3h-6v2h6v6h2V5a2 2 0 0 0-2-2zM7 21a2 2 0 0 1-2-2v-6h2v6h6v2H7z" fill="currentColor"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 5h6V3H3v8h2V5zm14 14h-6v2h8v-8h-2v6zM5 19v-6H3v8h8v-2H5zm14-14h-6V3h8v8h-2V5z" fill="currentColor"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* =====================================================
          BODY
      ===================================================== */}

      <div
        className={`hostelnexus-widget-body ${
          isMax ? 'maximized' : ''
        }`}
      >
        {/* ===================================================
            TABS
        =================================================== */}

        <div className="hostelnexus-tabs">
          <button
            className={`tab ${tab === 'chat' ? 'active' : ''}`}
            onClick={() => setTab('chat')}
          >
            Chat
          </button>

          <button
            className={`tab ${tab === 'history' ? 'active' : ''}`}
            onClick={() => setTab('history')}
          >
            History
          </button>

          <button
            className={`tab ${tab === 'students' ? 'active' : ''}`}
            onClick={() => setTab('students')}
          >
            Students
          </button>
        </div>

        {tab === 'chat' && (
          <div className="hostelnexus-chat-container">
            <div className="hostelnexus-messages">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`hostelnexus-msg ${m.from}`}
                >
                  {m.from === 'bot' && (
                    <div className="bot-avatar">
                      ✦
                    </div>
                  )}

                  <div className="hostelnexus-msg-text">
                    {m.text}
                  </div>
                </div>
              ))}

              {/* Loading animation */}

              {loading && (
                <div className="hostelnexus-msg bot">
                  <div className="bot-avatar">
                    ✦
                  </div>

                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* Input */}

            <div className="hostelnexus-input-row">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask HostelNexus..."
              />

              <button
                className="primary-btn"
                onClick={send}
                disabled={loading || !input.trim()}
              >
                {loading ? (
                  <span className="send-loader"></span>
                ) : (
                  '➤'
                )}
              </button>
            </div>

            <div className="input-hint">
              Press Enter to send
            </div>
          </div>
        )}

        {/* ===================================================
            HISTORY
        =================================================== */}

        {tab === 'history' && (
          <div className="hostelnexus-tab-content">
            <div className="section-title">
              <div>
                <h4>Conversation History</h4>
                <span>Recent activity</span>
              </div>
            </div>

            <ul className="user-list">
              <li>
                <div className="history-icon">✦</div>

                <div className="history-content">
                  <strong>HostelNexus initialized</strong>

                  <span>
                    Chat assistant was initialized
                  </span>

                  <small>August 1, 2026</small>
                </div>
              </li>
            </ul>
          </div>
        )}

        {/* ===================================================
            STUDENTS
        =================================================== */}

        {tab === 'students' && (
          <div className="hostelnexus-tab-content">
            <div className="section-title">
              <div>
                <h4>Students by Category</h4>
                <span>Current hostel statistics</span>
              </div>
            </div>

            {counts.length === 0 ? (
              <div className="empty-state">

                <strong>No data available</strong>

                <span>
                  Student statistics could not be loaded.
                </span>
              </div>
            ) : (
              <div className="student-count-list">
                {counts.map((c) => (
                  <div
                    className="student-count-item"
                    key={c.value}
                  >
                    <div className="category-info">

                      <span>{c.value}</span>
                    </div>

                    <strong>{c.count}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}