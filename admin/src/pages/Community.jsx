import { useState, useEffect, useRef } from 'react';
import { FiVolume2, FiMessageSquare, FiAlertTriangle, FiTrash2, FiSend, FiXCircle, FiCheckCircle, FiClock, FiShield } from 'react-icons/fi';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';

export default function AdminCommunity({ onLogout }) {
  const [activeTab, setActiveTab] = useState('announcements'); // 'announcements', 'general', 'reports'
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reports, setReports] = useState([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const socketRef = useRef(null);

  const token = localStorage.getItem('adminToken');
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  // Fetch Channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await fetch(`${apiBase}/api/community/channels`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setChannels(data.channels);
        }
      } catch (err) {
        console.error('Error fetching channels:', err);
      }
    };
    fetchChannels();
  }, [token, apiBase]);

  const announcementChannel = channels.find((c) => c.type === 'announcement');
  const generalChannel = channels.find((c) => c.type === 'general');

  // Socket.IO Real-time Connection for Admin
  useEffect(() => {
    if (!token) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io/'
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Admin Socket.IO connected.');
    });

    socket.on('message:receive', (newMsg) => {
      const activeChannel = activeTab === 'announcements' ? announcementChannel : generalChannel;
      if (activeChannel && newMsg.channelId === activeChannel._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
      }
    });

    socket.on('message:delete', ({ messageId }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true } : m)));
    });

    return () => {
      socket.disconnect();
    };
  }, [token, activeTab, announcementChannel, generalChannel]);

  // Join Room & Fetch Messages when activeTab changes
  useEffect(() => {
    const targetChannel = activeTab === 'announcements' ? announcementChannel : generalChannel;
    if (!targetChannel || activeTab === 'reports') return;

    if (socketRef.current) {
      socketRef.current.emit('community:join', { channelId: targetChannel._id });
    }

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/community/channels/${targetChannel._id}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Error fetching channel messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    return () => {
      if (socketRef.current && targetChannel) {
        socketRef.current.emit('community:leave', { channelId: targetChannel._id });
      }
    };
  }, [activeTab, announcementChannel, generalChannel, token, apiBase]);

  // Fetch Reports
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/community/admin/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  // Post Announcement
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementChannel || !announcementText.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/api/community/channels/${announcementChannel._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: announcementText.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setAnnouncementText('');
        setMessages((prev) => [...prev, data.message]);
      } else {
        alert(data.message || 'Failed to post announcement.');
      }
    } catch (err) {
      console.error('Error posting announcement:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Message (Moderation)
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to remove this message?')) return;
    try {
      const res = await fetch(`${apiBase}/api/community/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true, deletedByRole: 'admin' } : m)));
      } else {
        alert(data.message || 'Failed to delete message.');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  // Update Report Status
  const handleUpdateReport = async (reportId, status, action = null) => {
    try {
      const res = await fetch(`${apiBase}/api/community/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, action })
      });
      if (res.ok) {
        fetchReports();
      }
    } catch (err) {
      console.error('Error updating report status:', err);
    }
  };

  const renderDeletionNotice = (msg) => {
    const senderName = msg.senderId?.fullName || msg.senderId?.username || 'Student';
    if (msg.deletedByRole === 'admin') {
      return 'This message was removed by Admin for violating community guidelines.';
    }
    if (msg.deletedByRole === 'owner') {
      return `${senderName}'s message was deleted by ${senderName}`;
    }
    return msg.content || 'This message was deleted.';
  };

  const pendingReportsCount = reports.filter((r) => r.status === 'Pending').length;

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        {/* Top Header */}
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Community & Moderation</p>
            <h2 style={{ margin: 0 }}>Hostel Community Management</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
              Broadcast announcements, monitor resident chat, and resolve student moderation reports.
            </p>
          </div>
        </header>

        {/* SIDE-BY-SIDE 2-COLUMN LAYOUT */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem', minHeight: '620px' }}>
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="glass-card" style={{ padding: '1rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em', margin: '0.4rem 0.5rem 0.6rem' }}>
              Moderation Channels
            </h3>

            <button
              onClick={() => setActiveTab('announcements')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'announcements' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'announcements' ? '#fff' : 'var(--text)',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FiVolume2 /> Announcements
              </span>
            </button>

            <button
              onClick={() => setActiveTab('general')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'general' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'general' ? '#fff' : 'var(--text)',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FiMessageSquare /> General Chat
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'reports' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'reports' ? '#fff' : 'var(--text)',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FiAlertTriangle /> Reported Desk
              </span>
              {pendingReportsCount > 0 && (
                <span style={{
                  background: activeTab === 'reports' ? '#fff' : 'var(--danger, #dc2626)',
                  color: activeTab === 'reports' ? 'var(--primary)' : '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px'
                }}>
                  {pendingReportsCount}
                </span>
              )}
            </button>
          </div>

          {/* RIGHT WORKSPACE PANEL */}
          <div className="glass-card" style={{ padding: '1.4rem', borderRadius: '18px', display: 'flex', flexDirection: 'column' }}>
            {/* TAB 1: ANNOUNCEMENTS */}
            {activeTab === 'announcements' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
                <div style={{ background: 'rgba(26, 54, 93, 0.05)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
                  <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.05rem', fontFamily: 'Outfit, sans-serif' }}>
                    📢 Broadcast New Official Announcement
                  </h3>
                  <form onSubmit={handlePostAnnouncement}>
                    <textarea
                      rows={3}
                      className="form-control"
                      placeholder="Type official announcement text for all hostel students..."
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      style={{ width: '100%', marginBottom: '0.8rem', padding: '0.75rem', borderRadius: '10px', fontFamily: 'inherit' }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={submitting || !announcementText.trim()}>
                      <FiSend /> {submitting ? 'Publishing...' : 'Publish Announcement'}
                    </button>
                  </form>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <h4 style={{ margin: '0 0 0.8rem', fontSize: '0.95rem', color: 'var(--muted)' }}>Published Announcements History</h4>
                  {loading ? <p>Loading announcements...</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {messages.length === 0 && <p style={{ color: 'var(--muted)' }}>No announcements published yet.</p>}
                      {messages.map((msg) => (
                        <div key={msg._id} style={{ padding: '1rem', borderRadius: '12px', background: 'var(--card-bg)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                              <strong>{msg.senderId?.fullName || 'Hostel Admin'}</strong> · {new Date(msg.createdAt).toLocaleString()}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.92rem', color: msg.isDeleted ? 'var(--muted)' : 'var(--text)', fontStyle: msg.isDeleted ? 'italic' : 'normal' }}>
                              {msg.isDeleted ? renderDeletionNotice(msg) : msg.content}
                            </p>
                          </div>
                          {!msg.isDeleted && (
                            <button className="btn btn-danger" style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }} onClick={() => handleDeleteMessage(msg._id)}>
                              <FiTrash2 /> Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: GENERAL CHAT MONITOR */}
            {activeTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Outfit, sans-serif' }}>
                    💬 General Channel Live Monitor
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Live updating stream</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.4rem' }}>
                  {loading ? <p>Loading chat history...</p> : messages.length === 0 ? (
                    <p style={{ color: 'var(--muted)' }}>No messages in General channel.</p>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg._id} style={{ padding: '0.85rem 1.1rem', borderRadius: '12px', background: msg.isDeleted ? 'rgba(0,0,0,0.03)' : 'var(--card-bg)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.25rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <strong>{msg.senderId?.fullName || msg.senderId?.username || 'Student'}</strong>
                            {msg.senderId?.roomNumber && <span style={{ background: 'rgba(26,54,93,0.08)', padding: '0.1rem 0.4rem', borderRadius: '999px', fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 700 }}>Room {msg.senderId.roomNumber}</span>}
                            <span>· {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.92rem', color: msg.isDeleted ? 'var(--muted)' : 'var(--text)', fontStyle: msg.isDeleted ? 'italic' : 'normal' }}>
                            {msg.isDeleted ? renderDeletionNotice(msg) : msg.content}
                          </p>
                        </div>
                        {!msg.isDeleted && (
                          <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem' }} onClick={() => handleDeleteMessage(msg._id)}>
                            <FiTrash2 /> Delete
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: REPORTED MESSAGES DESK */}
            {activeTab === 'reports' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Outfit, sans-serif' }}>
                    🚩 Moderation Desk (Flagged Messages)
                  </h3>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {loading ? <p>Loading reports...</p> : reports.length === 0 ? (
                    <p style={{ color: 'var(--muted)' }}>No message reports pending resolution.</p>
                  ) : (
                    reports.map((rpt) => (
                      <div key={rpt._id} style={{ padding: '1.1rem', borderRadius: '14px', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '999px', background: rpt.status === 'Pending' ? 'rgba(217,119,6,0.15)' : 'rgba(22,163,74,0.15)', color: rpt.status === 'Pending' ? 'var(--secondary)' : 'var(--success)' }}>
                            {rpt.status}
                          </span>
                          <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>Reported: {new Date(rpt.createdAt).toLocaleString()}</span>
                        </div>

                        <p style={{ margin: '0 0 0.4rem', fontSize: '0.88rem' }}>
                          <strong>Reason:</strong> <span style={{ color: 'var(--danger)' }}>{rpt.reason}</span>
                        </p>
                        {rpt.description && (
                          <p style={{ margin: '0 0 0.6rem', fontSize: '0.84rem', color: 'var(--muted)' }}>
                            <strong>Student Details:</strong> {rpt.description}
                          </p>
                        )}

                        <div style={{ background: 'rgba(0,0,0,0.04)', padding: '0.75rem', borderRadius: '10px', marginBottom: '0.8rem' }}>
                          <div style={{ fontSize: '0.76rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                            Reported Content (by {rpt.messageId?.senderId?.fullName || 'Student'}):
                          </div>
                          <div style={{ fontSize: '0.9rem', fontStyle: rpt.messageId?.isDeleted ? 'italic' : 'normal' }}>
                            "{rpt.messageId?.content || renderDeletionNotice(rpt.messageId || {})}"
                          </div>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
                          Reported By: <strong>{rpt.reportedBy?.fullName || rpt.reportedBy?.username || 'Student'}</strong>
                        </div>

                        {rpt.status === 'Pending' && (
                          <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <button
                              className="btn btn-danger"
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                              onClick={() => handleUpdateReport(rpt._id, 'Action Taken', 'delete_message')}
                            >
                              <FiTrash2 /> Delete Message & Resolve
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                              onClick={() => handleUpdateReport(rpt._id, 'Dismissed')}
                            >
                              <FiXCircle /> Dismiss Report
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
