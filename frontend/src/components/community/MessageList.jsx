import { useEffect, useRef, useState } from 'react';
import { FiArrowDown } from 'react-icons/fi';
import MessageItem from './MessageItem';

const formatDateHeader = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return `Today, ${date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}`;
  if (isYesterday) return `Yesterday, ${date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}`;

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
  const bottomRef = useRef(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const prevMessagesCountRef = useRef(messages.length);

  // Group messages by Date String
  const groupedMessages = [];
  let lastDateKey = null;

  messages.forEach((msg) => {
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

  useEffect(() => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight, scrollHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight <= 250;

    if (isNearBottom || messages.length > prevMessagesCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevMessagesCountRef.current = messages.length;
  }, [messages.length]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottomBtn(false);
  };

  return (
    <div className="messages-container" ref={containerRef} onScroll={handleScroll}>
      {loading && <div className="messages-loader">Loading conversation history...</div>}

      {!loading && messages.length === 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--muted)',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.4rem', fontFamily: 'Outfit, sans-serif' }}>💬 No messages yet</p>
          <p style={{ fontSize: '0.88rem', margin: 0 }}>Start the conversation in this channel.</p>
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

      <div ref={bottomRef} />

      {showScrollBottomBtn && (
        <button className="new-messages-pill" onClick={scrollToBottom}>
          <FiArrowDown /> New messages
        </button>
      )}
    </div>
  );
}
