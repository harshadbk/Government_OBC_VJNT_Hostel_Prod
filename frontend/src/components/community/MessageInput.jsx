import { useState, useRef, useEffect } from 'react';
import { FiSend, FiX, FiLock } from 'react-icons/fi';

export default function MessageInput({
  channelType,
  replyingTo,
  onCancelReply,
  onSendMessage,
  onTypingStart,
  onTypingStop
}) {
  const [content, setContent] = useState('');
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

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  if (isReadOnlyForStudent) {
    return (
      <div className="chat-input-wrapper" style={{ textAlign: 'center' }}>
        <span className="announcement-read-only-badge">
          <FiLock /> Read-only channel. Only hostel administration can post announcements.
        </span>
      </div>
    );
  }

  const charLength = content.length;
  const showCounter = charLength > 1800;

  return (
    <div className="chat-input-wrapper">
      {replyingTo && (
        <div className="reply-banner">
          <span>
            ↩ Replying to <strong>@{replyingTo.senderId?.fullName || replyingTo.senderId?.username || 'User'}</strong>: "{replyingTo.content.substring(0, 50)}..."
          </span>
          <button
            onClick={onCancelReply}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
          >
            <FiX />
          </button>
        </div>
      )}

      <div className="input-box-container">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          rows={1}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        {showCounter && (
          <span className={`char-counter ${charLength >= 2000 ? 'warning' : ''}`}>
            {charLength}/2000
          </span>
        )}
        <button
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
