import { useState } from 'react';
import { FiCornerUpLeft, FiSmile, FiEdit2, FiTrash2, FiFlag, FiCopy, FiCheck } from 'react-icons/fi';
import { BsCheckAll } from 'react-icons/bs';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '👏', '🔥', '🎉'];

const formatBubbleTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Generates consistent WhatsApp sender name color based on string
const getSenderColor = (name) => {
  const colors = ['#0284c7', '#7c3aed', '#059669', '#d97706', '#db2777', '#2563eb', '#0891b2'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function MessageItem({
  message,
  currentUser,
  currentChannelType,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onReport
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [copied, setCopied] = useState(false);

  const sender = message.senderId || {};
  const isSenderAdmin = message.senderModel === 'Admin' || sender.role === 'admin';
  const senderName = isSenderAdmin ? 'Hostel Administration' : (sender.fullName || sender.username || 'Student');

  const currentUserId = (currentUser?._id || currentUser?.userId || '').toString();
  const msgSenderId = (sender._id || sender || '').toString();
  const isOwnMessage = currentUserId && msgSenderId === currentUserId;
  const isUserAdmin = currentUser?.role === 'admin' || currentUser?.username === 'admin';

  const bubbleTime = formatBubbleTime(message.createdAt);
  const senderColor = isSenderAdmin ? '#e11d48' : getSenderColor(senderName);

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText.trim() !== message.content) {
      onEdit(message._id, editText.trim());
    }
    setIsEditing(false);
  };

  const renderDeletedText = () => {
    if (message.deletedByRole === 'admin') {
      return 'This message was removed by Admin for violating community guidelines.';
    }
    if (message.deletedByRole === 'owner') {
      return `${senderName}'s message was deleted`;
    }
    return message.content || 'This message was deleted.';
  };

  return (
    <div className={`message-item ${isOwnMessage ? 'own-message' : 'other-message'} ${message.isDeleted ? 'deleted-box' : ''}`}>
      {/* Avatar (only for incoming messages) */}
      {!isOwnMessage && (
        sender.photoUrl ? (
          <img src={sender.photoUrl} alt={senderName} className="message-avatar" />
        ) : (
          <div className="message-avatar-fallback" style={{ background: senderColor }}>
            {senderName.charAt(0).toUpperCase()}
          </div>
        )
      )}

      <div className="message-body">
        <div className="message-bubble">
          {/* Sender Meta Name (only for incoming messages) */}
          {!isOwnMessage && (
            <div className="message-meta">
              <span className="message-sender" style={{ color: senderColor }}>{senderName}</span>
              {isSenderAdmin ? (
                <span className="message-role-badge admin">Hostel Admin</span>
              ) : (
                sender.roomNumber && <span className="message-role-badge">Room {sender.roomNumber}</span>
              )}
            </div>
          )}

          {/* Reply Quote Preview */}
          {message.replyTo && (
            <div className="message-reply-preview">
              <strong>@{message.replyTo.senderId?.fullName || message.replyTo.senderId?.username || 'User'}</strong>
              <span>{message.replyTo.isDeleted ? 'Deleted message' : message.replyTo.content}</span>
            </div>
          )}

          {/* Message Content */}
          {message.isDeleted ? (
            <div className="message-text" style={{ fontStyle: 'italic', color: 'var(--wa-text-muted)' }}>
              {renderDeletedText()}
            </div>
          ) : isEditing ? (
            <div style={{ marginTop: '0.2rem' }}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '8px',
                  border: '1px solid var(--wa-primary)',
                  background: 'var(--wa-sidebar-bg)',
                  color: 'var(--wa-text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--wa-primary)',
                    color: '#fff',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--wa-border)',
                    background: 'transparent',
                    color: 'var(--wa-text-primary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="message-text">
              {message.content}
              {message.isEdited && <span className="message-edited-tag">(edited)</span>}

              {/* Timestamp & WhatsApp Double Checkmark */}
              <span className="message-time-wrap">
                <span>{bubbleTime}</span>
                {isOwnMessage && (
                  <BsCheckAll className="check-icon" title="Delivered" />
                )}
              </span>
            </div>
          )}
        </div>

        {/* Reaction Chips */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="reactions-bar">
            {message.reactions.map((r) => {
              const hasReacted = r.users.some((u) => (u._id || u).toString() === currentUserId);
              const userNamesList = r.users
                .map((u) => (typeof u === 'object' ? (u.fullName || u.username) : null))
                .filter(Boolean);
              const tooltip = userNamesList.length > 0
                ? `Reacted by: ${userNamesList.join(', ')}`
                : 'Click to react';

              return (
                <button
                  key={r.emoji}
                  className={`reaction-chip ${hasReacted ? 'active' : ''}`}
                  onClick={() => onReact(message._id, r.emoji)}
                  title={tooltip}
                >
                  <span>{r.emoji}</span>
                  <span>{r.users.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hover Action Toolbar */}
      {!message.isDeleted && (
        <div className="message-actions">
          {/* Reaction Picker Popover */}
          <div style={{ position: 'relative' }}>
            <button
              className="action-btn"
              title="React"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <FiSmile />
            </button>
            {showEmojiPicker && (
              <div style={{
                position: 'absolute',
                bottom: '120%',
                left: isOwnMessage ? 'auto' : 0,
                right: isOwnMessage ? 0 : 'auto',
                background: 'var(--wa-sidebar-bg)',
                border: '1px solid var(--wa-border)',
                borderRadius: '999px',
                padding: '0.25rem 0.5rem',
                display: 'flex',
                gap: '0.35rem',
                boxShadow: 'var(--wa-shadow-md)',
                zIndex: 20
              }}>
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(message._id, emoji);
                      setShowEmojiPicker(false);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', transition: 'transform 0.1s ease' }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Copy Button */}
          <button className="action-btn" title="Copy message text" onClick={handleCopyText}>
            {copied ? <FiCheck style={{ color: 'var(--wa-accent)' }} /> : <FiCopy />}
          </button>

          {/* Reply Button */}
          {currentChannelType !== 'announcement' && (
            <button className="action-btn" title="Reply" onClick={() => onReply(message)}>
              <FiCornerUpLeft />
            </button>
          )}

          {/* Edit (Own message) */}
          {isOwnMessage && currentChannelType !== 'announcement' && (
            <button className="action-btn" title="Edit" onClick={() => setIsEditing(true)}>
              <FiEdit2 />
            </button>
          )}

          {/* Delete (Own message or Admin) */}
          {(isOwnMessage || isUserAdmin) && (
            <button className="action-btn delete" title="Delete" onClick={() => onDelete(message._id)}>
              <FiTrash2 />
            </button>
          )}

          {/* Report (Other users' messages) */}
          {!isOwnMessage && currentChannelType !== 'announcement' && (
            <button className="action-btn" title="Report message" onClick={() => onReport(message)}>
              <FiFlag />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
