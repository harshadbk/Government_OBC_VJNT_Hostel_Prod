import { useState, useRef, useEffect } from 'react';
import { FiSend, FiX, FiLock, FiSmile } from 'react-icons/fi';

const QUICK_EMOJIS = ['😊', '😂', '👍', '❤️', '🔥', '🎉'];

export default function MessageInput({
  channelType,
  replyingTo,
  onCancelReply,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  isAuthenticated
}) {
  const [content, setContent] = useState('');
  const [showQuickEmojiBar, setShowQuickEmojiBar] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isReadOnlyForStudent = channelType === 'announcement';

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // If user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className="chat-input-wrapper" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--wa-text-muted)', fontSize: '0.9rem' }}>
            Please sign in to join the conversation.
          </span>
          <a
            href="/login"
            style={{
              color: 'var(--wa-primary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none'
            }}
          >
            Sign in to account
          </a>
        </div>
      </div>
    );
  }

  // If channel is read-only (Announcements)
  if (isReadOnlyForStudent) {
    return (
      <div className="chat-input-wrapper">
        <div className="announcement-read-only-badge">
          <FiLock /> Announcement channel is read-only for resident students.
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const text = e.target.value;
    if (text.length <= 2000) {
      setContent(text);

      if (onTypingStart && onTypingStop) {
        onTypingStart();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          onTypingStop();
        }, 2000);
      }
    }
  };

  const handleSend = () => {
    if (!content.trim() || isReadOnlyForStudent) return;
    onSendMessage({
      content: content.trim(),
      replyTo: replyingTo ? replyingTo._id : null
    });
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
    if (onCancelReply) onCancelReply();
    if (onTypingStop) onTypingStop();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji) => {
    setContent((prev) => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  

  return (
    <div className="chat-input-wrapper">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="reply-banner">
          <div>
            <strong>Replying to @{replyingTo.senderId?.fullName || replyingTo.senderId?.username || 'User'}</strong>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--wa-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{replyingTo.content}"
            </span>
          </div>
          <button
            onClick={onCancelReply}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--wa-text-muted)', padding: '0.2rem' }}
          >
            <FiX />
          </button>
        </div>
      )}

      {/* Quick Emoji Bar Popover */}
      {showQuickEmojiBar && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.4rem 0.8rem',
          background: 'var(--wa-sidebar-bg)',
          border: '1px solid var(--wa-border)',
          borderRadius: '12px',
          marginBottom: '0.5rem',
          boxShadow: 'var(--wa-shadow-sm)'
        }}>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => insertEmoji(emoji)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Toolbar */}
      <div className="input-box-container">
        <div className="chat-textarea-box">
          <button
            type="button"
            className="emoji-trigger-btn"
            title="Insert Emoji"
            onClick={() => setShowQuickEmojiBar(!showQuickEmojiBar)}
          >
            <FiSmile />
          </button>

          <textarea
            ref={textareaRef}
            className="chat-textarea"
            rows={1}
            placeholder="Type a message..."
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>

        <button
          type="button"
          className="send-btn"
          onClick={handleSend}
          disabled={!content.trim()}
          title="Send message"
        >
          <FiSend />
        </button>
      </div>
    </div>
  );
}
