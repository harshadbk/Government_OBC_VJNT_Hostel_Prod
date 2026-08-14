import { useState } from 'react';
import { FiVolume2, FiMessageSquare, FiSearch, FiTool, FiShield } from 'react-icons/fi';

export default function ChannelList({ channels, activeChannelId, onSelectChannel, unreads = {} }) {
  const [searchTerm, setSearchTerm] = useState('');

  const getChannelIcon = (type, name) => {
    if (type === 'announcement') return <FiVolume2 />;
    if (name.toLowerCase().includes('maintenance')) return <FiTool />;
    if (name.toLowerCase().includes('admin') || name.toLowerCase().includes('notice')) return <FiShield />;
    return <FiMessageSquare />;
  };

  const filteredChannels = channels.filter((ch) =>
    ch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ch.description && ch.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      {/* Search Input Filter */}
      <div className="channel-search-box">
        <div className="search-input-wrapper">
          <FiSearch />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Channels List */}
      <div className="channel-list">
        {filteredChannels.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--wa-text-muted)', fontSize: '0.85rem' }}>
            No channels found.
          </div>
        ) : (
          filteredChannels.map((ch) => {
            const isAnnouncement = ch.type === 'announcement';
            const isActive = ch._id === activeChannelId;
            const unreadCount = unreads[ch._id] || 0;

            return (
              <button
                key={ch._id}
                className={`channel-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectChannel(ch._id)}
              >
                <div className="channel-item-left">
                  <div className={`channel-icon-avatar ${isAnnouncement ? 'announcement' : ''}`}>
                    {getChannelIcon(ch.type, ch.name)}
                  </div>
                  <div className="channel-info">
                    <span className="channel-name">{ch.name}</span>
                    <span className="channel-desc-snippet">
                      {ch.description || (isAnnouncement ? 'Official Notices' : 'General Chat')}
                    </span>
                  </div>
                </div>

                <div className="channel-item-right">
                  {unreadCount > 0 && !isActive && (
                    <span className="unread-badge">{unreadCount}</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
