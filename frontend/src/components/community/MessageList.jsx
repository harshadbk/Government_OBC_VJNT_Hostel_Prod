import { useEffect, useRef, useState } from 'react';
import { FiArrowDown, FiMessageSquare } from 'react-icons/fi';
import MessageItem from './MessageItem';

const formatDateHeader = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return `Today`;
  if (isYesterday) return `Yesterday`;

  return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function MessageList({
  messages,
  loading,
  currentUser,
  currentChannelType,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onReport
}) {
  const containerRef = useRef(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const prevMessagesCountRef = useRef(0);
  const safeMessages = Array.isArray(messages) ? messages : [];

  // Group messages by Date String
  const groupedMessages = [];
  let lastDateKey = null;

  safeMessages.forEach((msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    if (dateKey !== lastDateKey) {
      groupedMessages.push({ type: 'date-separator', id: `date-${dateKey}`, dateString: msg.createdAt });
      lastDateKey = dateKey;
    }
    groupedMessages.push({ type: 'message', data: msg });
  });

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight, scrollHeight } = containerRef.current;
    const isUpwards = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottomBtn(isUpwards);
  };

  const scrollToBottom = (behavior = 'smooth') => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior
    });
    setShowScrollBottomBtn(false);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight, scrollHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight <= 250;

    if (isNearBottom || safeMessages.length > prevMessagesCountRef.current) {
      const isInitial = prevMessagesCountRef.current === 0;
      scrollToBottom(isInitial ? 'auto' : 'smooth');
    }

    prevMessagesCountRef.current = safeMessages.length;
  }, [safeMessages.length]);

  return (
    <div className="messages-container" ref={containerRef} onScroll={handleScroll}>
      {loading && <div className="messages-loader">Loading messages...</div>}

      {!loading && safeMessages.length === 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--wa-text-muted)',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--wa-header-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            marginBottom: '1rem',
            color: 'var(--wa-primary)'
          }}>
            <FiMessageSquare />
          </div>
          <h4 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', color: 'var(--wa-text-primary)' }}>No messages yet</h4>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>Send a message to start the conversation.</p>
        </div>
      )}

      {groupedMessages.map((item) => {
        if (item.type === 'date-separator') {
          return (
            <div key={item.id} className="date-separator-wrap">
              <span className="date-separator-pill">{formatDateHeader(item.dateString)}</span>
            </div>
          );
        }

        return (
          <MessageItem
            key={item.data._id}
            message={item.data}
            currentUser={currentUser}
            currentChannelType={currentChannelType}
            onReply={onReply}
            onReact={onReact}
            onEdit={onEdit}
            onDelete={onDelete}
            onReport={onReport}
          />
        );
      })}

      {showScrollBottomBtn && (
        <button className="new-messages-pill" onClick={() => scrollToBottom('smooth')}>
          <FiArrowDown /> Scroll to bottom
        </button>
      )}
    </div>
  );
}
