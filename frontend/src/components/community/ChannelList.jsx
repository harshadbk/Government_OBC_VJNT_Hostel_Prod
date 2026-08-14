import { FiVolume2, FiMessageSquare } from 'react-icons/fi';

export default function ChannelList({ channels, activeChannelId, onSelectChannel, unreads = {} }) {
  return (
    <div className="channel-list">
      {channels.map((ch) => {
        const isAnnouncement = ch.type === 'announcement';
        const isActive = ch._id === activeChannelId;
        const unreadCount = unreads[ch._id] || 0;

        return (
          <button
            key={ch._id}
            className={`channel-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectChannel(ch._id)}
          >
            <div className="channel-item-name">
              <span className="channel-icon">
                {isAnnouncement ? <FiVolume2 /> : <FiMessageSquare />}
              </span>
              <span>{ch.name}</span>
            </div>
            {unreadCount > 0 && !isActive && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
