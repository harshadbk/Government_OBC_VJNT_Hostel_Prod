import { useState, useEffect, useRef } from 'react';
import HostelNexusWidget from '../components/HostelNexusWidget';
import './HostelNexus.css';

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://127.0.0.1:8000';

const QUICK_PROMPTS = [
  { label: 'Registered Students', query: 'How many students are registered in the hostel?' },
  { label: 'Notice Board Posts', query: 'Show recent notice board posts' },
  { label: 'Students by Year', query: 'Give me student breakdown by year' },
  { label: 'Room Occupants', query: 'Who lives in room 14?' },
  { label: 'Absent Today', query: 'Show absent students today' },
  { label: 'Leave Applications', query: 'Show pending leave applications' },
];

export default function HostelNexus() {
  const sessionIdRef = useRef(
    localStorage.getItem('hostelnexus_page_session_id') ||
      `hostelnexus-page-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const [messages, setMessages] = useState([
    {
      id: 1,
      from: 'bot',
      text: 'Hostel Database Assistant is ready. You can query resident records, attendance stats, notices, room occupancy, or leave requests.',
      source: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${FASTAPI_URL}/health`);
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('hostelnexus_page_session_id', sessionIdRef.current);
    checkHealth();
  }, []);

  const sendQuestion = async (customQuery = null) => {
    const question = (typeof customQuery === 'string' ? customQuery : input).trim();
    if (!question || loading) return;

    const userMsg = {
      id: Date.now(),
      from: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customQuery) setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${FASTAPI_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          session_id: sessionIdRef.current,
          history: messages.slice(-10).map((m) => ({
            role: m.from === 'bot' ? 'assistant' : 'user',
            content: m.text,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setIsOnline(true);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: 'bot',
          text: data.answer || data.error || 'No answer generated.',
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
          text: `Service unreachable. Please verify that the Python API server is running on port 8000.`,
          source: 'error',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hostelnexus-page-container">
      {/* HEADER HERO BANNER */}
      <div className="hostelnexus-hero-card">
        <div className="hero-left">
          <div className="hero-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div>
            <h2>Database AI Assistant</h2>
            <p>Query hostel records, occupancy, attendance, and leaves in real-time</p>
          </div>
        </div>

        <div className="hero-right">
          <div className={`connection-badge ${isOnline ? 'online' : 'offline'}`}>
            <span className="dot"></span>
            {isOnline ? 'Server Connected' : 'Server Offline'}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="hostelnexus-grid">
        {/* CHAT HUB */}
        <div className="chat-hub-card">
          <div className="chat-hub-header">
            <h3>Conversation</h3>
            <span className="live-indicator">Active</span>
          </div>

          <div className="chat-messages-area">
            {messages.map((m) => (
              <div key={m.id} className={`chat-bubble-row ${m.from}`}>
                <div className="bubble-body">
                  <div className="bubble-text">{m.text}</div>
                  {m.timestamp && (
                    <div className="bubble-footer">
                      <span className="bubble-time">{m.timestamp}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble-row bot">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* INPUT BAR */}
          <div className="chat-input-bar">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendQuestion()}
              placeholder="Ask a question about the hostel database..."
              disabled={loading}
            />
            <button className="send-btn" onClick={() => sendQuestion()} disabled={loading || !input.trim()}>
              {loading ? (
                'Processing...'
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* SIDE PANEL: QUICK PROMPTS */}
        <div className="side-panel-card">
          <div className="side-header">
            <h4>Suggested Queries</h4>
            <p>Select a prompt to query the database:</p>
          </div>

          <div className="prompt-cards-list">
            {QUICK_PROMPTS.map((p, idx) => (
              <div key={idx} className="prompt-card-item" onClick={() => sendQuestion(p.query)}>
                <div className="card-info">
                  <strong>{p.label}</strong>
                  <small>"{p.query}"</small>
                </div>
                <span className="card-arrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <HostelNexusWidget />
    </div>
  );
}
