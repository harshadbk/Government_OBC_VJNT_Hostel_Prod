import { useState } from 'react';
import { FiCornerUpLeft, FiSmile, FiEdit2, FiTrash2, FiFlag, FiCopy, FiCheck } from 'react-icons/fi';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '👏', '🔥', '🎉'];

const formatMessageTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  const dateStr = date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  return `${dateStr}, ${timeStr}`;
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

  const formattedTime = formatMessageTime(message.createdAt);

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
      return `${senderName}'s message was deleted by ${senderName}`;
    }
    return message.content || 'This message was deleted.';
  };

  return (
    <div className={`message-item ${isOwnMessage ? 'own-message' : 'other-message'} ${message.isDeleted ? 'deleted-box' : ''}`}>
      {sender.photoUrl ? (
        <img src={sender.photoUrl} alt={senderName} className="message-avatar" />
      ) : (
        <div className="message-avatar-fallback">
          {senderName.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="message-body">
        <div className="message-meta">
          <span className="message-sender">{senderName}</span>
          {isSenderAdmin ? (
            <span className="message-role-badge admin">Hostel Admin</span>
          ) : (
            sender.roomNumber && <span className="message-role-badge">Room {sender.roomNumber}</span>
          )}
          <span className="message-time">{formattedTime}</span>
        </div>

        <div className="message-bubble">
          {message.replyTo && (
            <div className="message-reply-preview">
              <strong>@{message.replyTo.senderId?.fullName || message.replyTo.senderId?.username || 'User'}: </strong>
              <span>{message.replyTo.isDeleted ? 'Deleted message' : message.replyTo.content}</span>
            </div>
          )}

          {message.isDeleted ? (
            <div className="message-text" style={{ fontStyle: 'italic', color: 'var(--muted)' }}>
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
                  padding: '0.4rem',
                  borderRadius: '8px',
                  border: '1px solid var(--primary)',
                  background: 'var(--card-bg)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem'
                }}
              />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
                <button
                  onClick={handleSaveEdit}
                  style={{ padding: '0.25rem 0.65rem', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{ padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="message-text">
              {message.content}
              {message.isEdited && <span className="message-edited-tag">(edited)</span>}
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

      {/* Hover/Touch Action Menu */}
      {!message.isDeleted && (
        <div className="message-actions">
          {/* Reaction Picker */}
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
                bottom: '100%',
                left: isOwnMessage ? 'auto' : 0,
                right: isOwnMessage ? 0 : 'auto',
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                padding: '0.2rem 0.4rem',
                display: 'flex',
                gap: '0.3rem',
                boxShadow: 'var(--shadow-md)',
                zIndex: 20
              }}>
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(message._id, emoji);
                      setShowEmojiPicker(false);
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Copy Button */}
          <button className="action-btn" title="Copy text" onClick={handleCopyText}>
            {copied ? <FiCheck style={{ color: 'var(--success)' }} /> : <FiCopy />}
          </button>

          {/* Reply */}
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

          {/* Report (Other users' messages in General) */}
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
