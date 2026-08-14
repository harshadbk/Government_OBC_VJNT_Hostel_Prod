import { FiVolume2, FiMessageSquare } from 'react-icons/fi';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatWindow({
  activeChannel,
  messages,
  loading,
  currentUser,
  connectionStatus,
  typingUsers,
  replyingTo,
  onCancelReply,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onReport
}) {
  if (!activeChannel) {
    return (
      <div className="chat-window" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Select a channel to view conversation.</p>
      </div>
    );
  }

  const isAnnouncement = activeChannel.type === 'announcement';

  const renderStatusBadge = () => {
    if (connectionStatus === 'connected') {
      return <span className="connection-status-pill connected">🟢 Connected</span>;
    }
    if (connectionStatus === 'reconnecting') {
      return <span className="connection-status-pill reconnecting">🟡 Reconnecting...</span>;
    }
    return <span className="connection-status-pill disconnected">🔴 Connection lost</span>;
  };

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-title-group">
          <h3>
            {isAnnouncement ? <FiVolume2 style={{ color: 'var(--secondary, #d97706)' }} /> : <FiMessageSquare style={{ color: 'var(--primary)' }} />}
            {activeChannel.name}
          </h3>
          <p className="chat-channel-desc">{activeChannel.description}</p>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Messages Scroll Area */}
      <MessageList
        messages={messages}
        loading={loading}
        currentUser={currentUser}
        currentChannelType={activeChannel.type}
        onReply={onReply}
        onReact={onReact}
        onEdit={onEdit}
        onDelete={onDelete}
        onReport={onReport}
      />

      {/* Animated Typing Indicator */}
      <div className="typing-bar">
        {typingUsers.length > 0 && (
          <>
            <span className="typing-dots">
              <span />
              <span />
              <span />
            </span>
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        channelType={activeChannel.type}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        onSendMessage={onSendMessage}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />
    </div>
  );
}
