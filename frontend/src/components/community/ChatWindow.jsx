import { FiVolume2, FiMessageSquare, FiArrowLeft } from 'react-icons/fi';
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
  onReport,
  isAuthenticated,
  onBackToChannels
}) {
  if (!activeChannel) {
    return (
      <div className="chat-window" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--wa-text-muted)', fontSize: '0.95rem' }}>Select a channel to start messaging.</p>
      </div>
    );
  }

  const isAnnouncement = (activeChannel && activeChannel.type) === 'announcement';
  const typingList = Array.isArray(typingUsers) ? typingUsers : [];

  const renderStatusBadge = () => {
    if (connectionStatus === 'connected') {
      return <span className="connection-status-pill connected">🟢 Connected</span>;
    }
    if (connectionStatus === 'reconnecting') {
      return <span className="connection-status-pill reconnecting">🟡 Reconnecting...</span>;
    }
    return <span className="connection-status-pill disconnected">🔴 Offline</span>;
  };

  return (
    <div className="chat-window">
      {/* WhatsApp Chat Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          {onBackToChannels && (
            <button className="mobile-back-btn" onClick={onBackToChannels} title="Back to Channels">
              <FiArrowLeft />
            </button>
          )}

          <div className={`chat-header-avatar ${isAnnouncement ? 'announcement' : ''}`}>
            {isAnnouncement ? <FiVolume2 /> : <FiMessageSquare />}
          </div>

          <div className="chat-title-info">
            <h3>{activeChannel.name}</h3>
            <p className="chat-subtitle">
              {typingList.length > 0
                  ? `${typingList.join(', ')} ${typingList.length === 1 ? 'is' : 'are'} typing...`
                  : (activeChannel.description || 'Hostel Community Channel')}
            </p>
          </div>
        </div>

        <div className="chat-header-right">
          {renderStatusBadge()}
        </div>
      </div>

      {/* Messages Scroll Container */}
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

      {/* Animated Typing Bar */}
      <div className="typing-bar">
        {typingList.length > 0 && (
          <>
            <span className="typing-dots">
              <span />
              <span />
              <span />
            </span>
            <span>{typingList.join(', ')} {typingList.length === 1 ? 'is' : 'are'} typing...</span>
          </>
        )}
      </div>

      {/* Message Input Toolbar */}
      <MessageInput
        channelType={activeChannel.type}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        onSendMessage={onSendMessage}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
