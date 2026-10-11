import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import HostelNexusWidget from '../components/HostelNexusWidget';
import MarkdownMessage from '../components/MarkdownMessage';
import AssistantHistory from '../components/AssistantHistory';
import { askQuestion, checkHealth, timeNow } from '../utils/assistantApi';
import './HostelNexus.css';

const QUICK_PROMPTS = [
  'How many students are registered in the hostel?',
  'Show recent notice board posts',
  'Give me student breakdown by year',
  'Who lives in room 14?',
  'Show absent students today',
  'Show pending leave applications',
];

export default function HostelNexus({ onLogout }) {
  const sessionIdRef = useRef(
    localStorage.getItem('hostelnexus_page_session_id') ||
      `assistant-page-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  const [tab, setTab] = useState('chat');
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: 'bot',
      text: 'Hostel Database Assistant is ready. You can query resident records, attendance stats, notices, room occupancy, or leave requests.',
      timestamp: timeNow(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    localStorage.setItem('hostelnexus_page_session_id', sessionIdRef.current);
    checkHealth().then(setIsOnline);
  }, []);

  const sendQuestion = async (customQuery = null) => {
    const question = (typeof customQuery === 'string' ? customQuery : input).trim();
    if (!question || loading) return;

    setTab('chat');
    setMessages((prev) => [...prev, { id: Date.now(), from: 'user', text: question, timestamp: timeNow() }]);
    if (!customQuery) setInput('');
    setLoading(true);

    try {
      const data = await askQuestion({
        question,
        sessionId: sessionIdRef.current,
        history: messages.slice(-10).map((m) => ({ role: m.from === 'bot' ? 'assistant' : 'user', content: m.text })),
      });
      setIsOnline(true);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, from: 'bot', text: data.answer || data.error || 'No answer returned.', timestamp: timeNow() },
      ]);
    } catch {
      setIsOnline(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: 'bot',
          error: true,
          text: 'Could not reach the assistant server. Make sure the Python API (port 8000) is running.',
          timestamp: timeNow(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main assistant-page">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Tools</p>
            <h2>Assistant</h2>
            <p className="assistant-sub">Ask questions about students, rooms, attendance, leaves and notices.</p>
          </div>
          <span className={`assistant-conn ${isOnline ? 'on' : 'off'}`}>
            {isOnline ? 'Server online' : 'Server offline'}
          </span>
        </header>

        <div className="assistant-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'chat'} className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>
            Chat
          </button>
          <button role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
            History
          </button>
        </div>

        {tab === 'chat' ? (
          <div className="assistant-grid">
            <section className="panel-card assistant-chat">
              <div className="assistant-messages">
                {messages.length === 0 && (
                  <p className="assistant-empty">No messages yet. Type a question below or pick one from the list.</p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`assistant-msg ${m.from} ${m.error ? 'error' : ''}`}>
                    <div className="assistant-msg-text">
                      {m.from === 'bot' ? <MarkdownMessage content={m.text} /> : m.text}
                    </div>
                    <span className="assistant-msg-time">{m.timestamp}</span>
                  </div>
                ))}
                {loading && <div className="assistant-msg bot pending">Looking it up…</div>}
                <div ref={chatEndRef} />
              </div>

              <form
                className="assistant-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendQuestion();
                }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. Who was absent yesterday?"
                  disabled={loading}
                />
                <button type="submit" className="primary-btn" disabled={loading || !input.trim()}>
                  {loading ? 'Sending…' : 'Send'}
                </button>
              </form>
            </section>

            <aside className="panel-card assistant-prompts">
              <h3>Common questions</h3>
              <ul>
                {QUICK_PROMPTS.map((q) => (
                  <li key={q}>
                    <button type="button" onClick={() => sendQuestion(q)} disabled={loading}>{q}</button>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        ) : (
          <section className="panel-card">
            <AssistantHistory onAskAgain={sendQuestion} />
          </section>
        )}
        <HostelNexusWidget />
      </main>
    </div>
  );
}
