import { useEffect, useState } from 'react';
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
  onReport,
  isAuthenticated
}) {
  const activeChannel = channels.find((c) => c._id === activeChannelId) || channels[0];
  const [mobileView, setMobileView] = useState('channels'); // 'channels' or 'chat'

  // Switch to chat view automatically when selecting a channel on mobile
  const handleSelectChannelMobile = (channelId) => {
    onSelectChannel(channelId);
    setMobileView('chat');
  };

  const handleBackToChannels = () => {
    setMobileView('channels');
  };

  return (
    <div className="community-page">
      <div className={`community-container ${mobileView === 'chat' ? 'show-chat' : ''}`}>
        {/* Sidebar Channels List */}
        <aside className="community-sidebar">
          <div className="community-sidebar-header">
            <div className="sidebar-title-row">
              <h2>Hostel Community</h2>
            </div>
            <p className="sidebar-subtext">Official communication hub for hostel residents</p>
          </div>

          <ChannelList
            channels={channels}
            activeChannelId={activeChannelId}
            onSelectChannel={handleSelectChannelMobile}
            unreads={unreads}
          />
        </aside>

        {/* Chat Window Area */}
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
          isAuthenticated={isAuthenticated}
          onBackToChannels={handleBackToChannels}
        />
      </div>
    </div>
  );
}
