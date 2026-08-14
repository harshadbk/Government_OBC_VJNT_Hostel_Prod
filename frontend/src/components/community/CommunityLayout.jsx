import { FiMessageSquare } from 'react-icons/fi';
import ChannelList from './ChannelList';
import ChatWindow from './ChatWindow';

export default function CommunityLayout({
  channels,
  activeChannelId,
  onSelectChannel,
  unreads,
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
  const activeChannel = channels.find((c) => c._id === activeChannelId) || channels[0];

  return (
    <div className="community-page">
      {/* Mobile Channel Switcher */}
      <div className="mobile-channel-bar">
        <select
          className="mobile-channel-select"
          value={activeChannelId || ''}
          onChange={(e) => onSelectChannel(e.target.value)}
        >
          {channels.map((ch) => (
            <option key={ch._id} value={ch._id}>
              {ch.type === 'announcement' ? '📢' : '💬'} {ch.name}
            </option>
          ))}
        </select>
      </div>

      <div className="community-container">
        {/* Desktop Sidebar Channels */}
        <aside className="community-sidebar">
          <div className="community-sidebar-header">
            <h2>
              <FiMessageSquare style={{ color: 'var(--primary)' }} /> Hostel Community
            </h2>
            <p>Official communication hub for residents.</p>
          </div>
          <ChannelList
            channels={channels}
            activeChannelId={activeChannelId}
            onSelectChannel={onSelectChannel}
            unreads={unreads}
          />
        </aside>

        {/* Main Chat Area */}
        <ChatWindow
          activeChannel={activeChannel}
          messages={messages}
          loading={loading}
          currentUser={currentUser}
          connectionStatus={connectionStatus}
          typingUsers={typingUsers}
          replyingTo={replyingTo}
          onCancelReply={onCancelReply}
          onSendMessage={onSendMessage}
          onTypingStart={onTypingStart}
          onTypingStop={onTypingStop}
          onReply={onReply}
          onReact={onReact}
          onEdit={onEdit}
          onDelete={onDelete}
          onReport={onReport}
        />
      </div>
    </div>
  );
}
