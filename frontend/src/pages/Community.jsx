import { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { FiShieldOff } from 'react-icons/fi';
import CommunityLayout from '../components/community/CommunityLayout';
import ReportModal from '../components/community/ReportModal';
import { getSocket } from '../utils/socket';
import '../css/Community.css';

export default function CommunityPage({ user, token }) {
  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreads, setUnreads] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [reportingMessage, setReportingMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');

  const socketRef = useRef(null);
  const activeChannelRef = useRef(activeChannelId);
  activeChannelRef.current = activeChannelId;

  // Redirect if not logged in
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Verification Check
  const isStudentVerified = user.isVerified !== false;
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  // Fetch Channels
  useEffect(() => {
    let isMounted = true;
    const fetchChannels = async () => {
      try {
        const res = await fetch(`${apiBase}/api/community/channels`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success && isMounted) {
          setChannels(data.channels);
          if (data.channels.length > 0 && !activeChannelId) {
            setActiveChannelId(data.channels[0]._id);
          }
        }
      } catch (err) {
        console.error('Error fetching community channels:', err);
      }
    };

    fetchChannels();
    return () => { isMounted = false; };
  }, [token, apiBase]);

  // Socket Connection & Global Event Listeners
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token, (status) => setConnectionStatus(status));
    socketRef.current = socket;

    if (socket) {
      const handleReceive = (newMsg) => {
        if (newMsg.channelId === activeChannelRef.current) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === newMsg._id)) return prev;
            return [...prev, newMsg];
          });
        } else {
          setUnreads((prev) => ({
            ...prev,
            [newMsg.channelId]: (prev[newMsg.channelId] || 0) + 1
          }));
        }
      };

      const handleUpdate = (updatedMsg) => {
        setMessages((prev) => prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m)));
      };

      const handleDelete = ({ messageId }) => {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted.' } : m)));
      };

      const handleReact = (updatedMsg) => {
        setMessages((prev) => prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m)));
      };

      const handleTypingStart = ({ channelId, fullName, userId }) => {
        if (channelId === activeChannelRef.current && userId !== (user._id || user.userId)) {
          setTypingUsers((prev) => Array.from(new Set([...prev, fullName || 'Someone'])));
        }
      };

      const handleTypingStop = ({ channelId }) => {
        if (channelId === activeChannelRef.current) {
          setTypingUsers([]);
        }
      };

      socket.on('message:receive', handleReceive);
      socket.on('message:update', handleUpdate);
      socket.on('message:delete', handleDelete);
      socket.on('message:react', handleReact);
      socket.on('typing:start', handleTypingStart);
      socket.on('typing:stop', handleTypingStop);

      return () => {
        socket.off('message:receive', handleReceive);
        socket.off('message:update', handleUpdate);
        socket.off('message:delete', handleDelete);
        socket.off('message:react', handleReact);
        socket.off('typing:start', handleTypingStart);
        socket.off('typing:stop', handleTypingStop);
      };
    }
  }, [token, user]);

  // Join Channel Room & Fetch Messages when activeChannelId changes
  useEffect(() => {
    if (!activeChannelId || !token) return;

    setUnreads((prev) => ({ ...prev, [activeChannelId]: 0 }));
    setTypingUsers([]);
    setReplyingTo(null);

    if (socketRef.current) {
      socketRef.current.emit('community:join', { channelId: activeChannelId });
    }

    let isMounted = true;
    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`${apiBase}/api/community/channels/${activeChannelId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success && isMounted) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Error fetching channel messages:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    fetchMessages();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.emit('community:leave', { channelId: activeChannelId });
      }
    };
  }, [activeChannelId, token, apiBase]);

  // Action Handlers
  const handleSelectChannel = (channelId) => {
    setActiveChannelId(channelId);
  };

  const handleSendMessage = async ({ content, replyTo }) => {
    if (!activeChannelId) return;
    try {
      const res = await fetch(`${apiBase}/api/community/channels/${activeChannelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content, replyTo })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to send message.');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      const res = await fetch(`${apiBase}/api/community/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newContent })
      });
      const data = await res.json();
      if (!res.ok) alert(data.message || 'Failed to edit message.');
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      const res = await fetch(`${apiBase}/api/community/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) alert(data.message || 'Failed to delete message.');
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleReactMessage = async (messageId, emoji) => {
    try {
      const res = await fetch(`${apiBase}/api/community/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ emoji })
      });
      const data = await res.json();
      if (!res.ok) alert(data.message || 'Failed to react to message.');
    } catch (err) {
      console.error('Error reacting to message:', err);
    }
  };

  const handleReportSubmit = async ({ reason, description }) => {
    if (!reportingMessage) return;
    try {
      const res = await fetch(`${apiBase}/api/community/messages/${reportingMessage._id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason, description })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Thank you. The message has been reported to hostel administration for review.');
      } else {
        alert(data.message || 'Failed to submit report.');
      }
    } catch (err) {
      console.error('Error submitting report:', err);
    } finally {
      setReportingMessage(null);
    }
  };

  const handleTypingStart = useCallback(() => {
    if (socketRef.current && activeChannelId) {
      socketRef.current.emit('typing:start', { channelId: activeChannelId });
    }
  }, [activeChannelId]);

  const handleTypingStop = useCallback(() => {
    if (socketRef.current && activeChannelId) {
      socketRef.current.emit('typing:stop', { channelId: activeChannelId });
    }
  }, [activeChannelId]);

  if (!isStudentVerified) {
    return (
      <div className="community-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '500px', borderRadius: '24px' }}>
          <FiShieldOff style={{ fontSize: '3rem', color: 'var(--warning, #ea580c)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 0.5rem', fontFamily: 'Outfit, sans-serif' }}>Verification Pending</h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
            Hostel Community access is reserved for verified resident students. Please complete your document submission under <strong>Uploads</strong> or contact hostel administration for verification.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <CommunityLayout
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectChannel}
        unreads={unreads}
        messages={messages}
        loading={loadingMessages}
        currentUser={user}
        connectionStatus={connectionStatus}
        typingUsers={typingUsers}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        onReply={(msg) => setReplyingTo(msg)}
        onReact={handleReactMessage}
        onEdit={handleEditMessage}
        onDelete={handleDeleteMessage}
        onReport={(msg) => setReportingMessage(msg)}
      />

      {reportingMessage && (
        <ReportModal
          message={reportingMessage}
          onClose={() => setReportingMessage(null)}
          onSubmit={handleReportSubmit}
        />
      )}
    </>
  );
}
