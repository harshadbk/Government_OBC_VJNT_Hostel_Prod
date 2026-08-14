import { useState, useEffect } from 'react';
import { FiVolume2, FiMessageSquare, FiAlertTriangle, FiTrash2, FiSend, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';

export default function AdminCommunity({ onLogout }) {
  const [activeTab, setActiveTab] = useState('announcements'); // 'announcements', 'general', 'reports'
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reports, setReports] = useState([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Fetch Messages for current active tab (Announcements or General)
  useEffect(() => {
    const targetChannel = activeTab === 'announcements' ? announcementChannel : generalChannel;
    if (!targetChannel || activeTab === 'reports') return;

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
        setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted.' } : m)));
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

  return (
    <div className="admin-layout">
      <Sidebar onLogout={onLogout} />
      <main className="main-content" style={{ padding: '1.5rem' }}>
          {/* Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.6rem', fontFamily: 'Outfit, sans-serif' }}>💬 Hostel Community Management</h1>
            <p style={{ margin: 0, color: 'var(--muted)' }}>Broadcast announcements, monitor resident chat, and resolve student reports.</p>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
            <button
              className={`btn ${activeTab === 'announcements' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('announcements')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FiVolume2 /> Announcements
            </button>
            <button
              className={`btn ${activeTab === 'general' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('general')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FiMessageSquare /> General Chat
            </button>
            <button
              className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('reports')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <FiAlertTriangle /> Reported Messages {reports.filter(r => r.status === 'Pending').length > 0 && `(${reports.filter(r => r.status === 'Pending').length})`}
            </button>
          </div>

          {/* TAB 1: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div>
              <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '18px' }}>
                <h3 style={{ margin: '0 0 0.8rem', fontSize: '1.1rem' }}>📢 Broadcast New Official Announcement</h3>
                <form onSubmit={handlePostAnnouncement}>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Type official announcement details..."
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', borderRadius: '10px' }}
                  />
                  <button type="submit" className="btn btn-primary" disabled={submitting || !announcementText.trim()}>
                    <FiSend /> {submitting ? 'Publishing...' : 'Publish Announcement'}
                  </button>
                </form>
              </div>

              <h3 style={{ margin: '0 0 1rem' }}>Recent Published Announcements</h3>
              {loading ? <p>Loading announcements...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {messages.length === 0 && <p style={{ color: 'var(--muted)' }}>No announcements published yet.</p>}
                  {messages.map((msg) => (
                    <div key={msg._id} className="glass-card" style={{ padding: '1rem 1.25rem', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
                          <strong>{msg.senderId?.fullName || 'Admin'}</strong> · {new Date(msg.createdAt).toLocaleString()}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.95rem', color: msg.isDeleted ? 'var(--muted)' : 'var(--text)' }}>
                          {msg.content}
                        </p>
                      </div>
                      {!msg.isDeleted && (
                        <button className="btn btn-danger" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleDeleteMessage(msg._id)}>
                          <FiTrash2 /> Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GENERAL CHAT MONITOR */}
          {activeTab === 'general' && (
            <div>
              <h3 style={{ margin: '0 0 1rem' }}>General Channel Discussion Monitor</h3>
              {loading ? <p>Loading general messages...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '550px', overflowY: 'auto' }}>
                  {messages.length === 0 && <p style={{ color: 'var(--muted)' }}>No messages in General channel.</p>}
                  {messages.map((msg) => (
                    <div key={msg._id} className="glass-card" style={{ padding: '0.85rem 1.1rem', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>
                          <strong>{msg.senderId?.fullName || msg.senderId?.username || 'Student'}</strong> {msg.senderId?.roomNumber && `(Room ${msg.senderId.roomNumber})`} · {new Date(msg.createdAt).toLocaleTimeString()}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.92rem', color: msg.isDeleted ? 'var(--muted)' : 'var(--text)' }}>
                          {msg.content}
                        </p>
                      </div>
                      {!msg.isDeleted && (
                        <button className="btn btn-danger" style={{ padding: '0.3rem 0.55rem', fontSize: '0.78rem' }} onClick={() => handleDeleteMessage(msg._id)}>
                          <FiTrash2 /> Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REPORTED MESSAGES DESK */}
          {activeTab === 'reports' && (
            <div>
              <h3 style={{ margin: '0 0 1rem' }}>Reported Messages Moderation Desk</h3>
              {loading ? <p>Loading reports...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reports.length === 0 && <p style={{ color: 'var(--muted)' }}>No message reports pending.</p>}
                  {reports.map((rpt) => (
                    <div key={rpt._id} className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', background: rpt.status === 'Pending' ? 'rgba(217,119,6,0.15)' : 'rgba(22,163,74,0.15)', color: rpt.status === 'Pending' ? 'var(--secondary)' : 'var(--success)' }}>
                          {rpt.status}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Reported: {new Date(rpt.createdAt).toLocaleString()}</span>
                      </div>

                      <p style={{ margin: '0 0 0.4rem', fontSize: '0.9rem' }}>
                        <strong>Report Reason:</strong> <span style={{ color: 'var(--danger)' }}>{rpt.reason}</span>
                      </p>
                      {rpt.description && (
                        <p style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
                          <strong>Details:</strong> {rpt.description}
                        </p>
                      )}

                      <div style={{ background: 'rgba(0,0,0,0.04)', padding: '0.75rem', borderRadius: '10px', marginBottom: '0.8rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                          Reported Message (by {rpt.messageId?.senderId?.fullName || 'Student'}):
                        </div>
                        <div style={{ fontSize: '0.9rem', fontStyle: rpt.messageId?.isDeleted ? 'italic' : 'normal' }}>
                          "{rpt.messageId?.content || 'Message deleted'}"
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.8rem' }}>
                        Reported By: {rpt.reportedBy?.fullName || rpt.reportedBy?.username || 'Student'}
                      </div>

                      {rpt.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                          <button
                            className="btn btn-danger"
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                            onClick={() => handleUpdateReport(rpt._id, 'Action Taken', 'delete_message')}
                          >
                            <FiTrash2 /> Delete Message & Resolve
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                            onClick={() => handleUpdateReport(rpt._id, 'Dismissed')}
                          >
                            <FiXCircle /> Dismiss Report
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
    </div>
  );
}
