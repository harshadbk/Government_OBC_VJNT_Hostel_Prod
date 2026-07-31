import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { 
  FiCalendar, 
  FiCheckCircle, 
  FiClock, 
  FiLock, 
  FiDownload, 
  FiHome, 
  FiUserCheck, 
  FiUserX, 
  FiPercent, 
  FiX, 
  FiCheckSquare, 
  FiSquare,
  FiRefreshCw
} from 'react-icons/fi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function Attendance({ onLogout }) {
  const [todayDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [exportDate, setExportDate] = useState(todayDate);
  const [summary, setSummary] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeRoom, setActiveRoom] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [presentMap, setPresentMap] = useState({});
  const [saveMessage, setSaveMessage] = useState('');
  const [saveMessageType, setSaveMessageType] = useState('');
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  const getAdminToken = () => {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'null' || token === 'undefined') {
      localStorage.removeItem('adminToken');
      return null;
    }
    return token;
  };

  const fetchSummary = async (dateStr) => {
    try {
      setLoading(true);
      setError('');
      const token = getAdminToken();
      if (!token) {
        if (typeof onLogout === 'function') onLogout();
        navigate('/login');
        return;
      }

      const res = await fetch(`${apiBaseUrl}/api/attendance/summary?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('adminToken');
        if (typeof onLogout === 'function') onLogout();
        navigate('/login');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load attendance summary.');
      }

      const data = await res.json();
      setSummary(data.summary || null);
      setRooms(data.rooms || []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(todayDate);
  }, [todayDate]);

  const openRoomModal = async (roomNumber) => {
    setActiveRoom(roomNumber);
    setRoomData(null);
    setModalLoading(true);
    setSaveMessage('');
    setSaveMessageType('');

    try {
      const token = getAdminToken();
      const res = await fetch(`${apiBaseUrl}/api/attendance/room/${roomNumber}?date=${todayDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setRoomData(data);
        
        const initialMap = {};
        (data.students || []).forEach(s => {
          initialMap[s._id] = s.status === 'Present';
        });
        setPresentMap(initialMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleStudent = (studentId) => {
    setPresentMap(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleSelectAll = (val) => {
    if (!roomData?.students) return;
    const newMap = {};
    roomData.students.forEach(s => {
      newMap[s._id] = val;
    });
    setPresentMap(newMap);
  };

  const handleSaveAttendance = async () => {
    if (!activeRoom || !roomData) return;
    setSaving(true);
    setSaveMessage('');
    setSaveMessageType('');

    try {
      const token = getAdminToken();
      const presentUserIds = Object.keys(presentMap).filter(id => presentMap[id]);

      const res = await fetch(`${apiBaseUrl}/api/attendance/room/${activeRoom}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: todayDate,
          presentUserIds
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveMessage(data.message || 'Failed to save attendance.');
        setSaveMessageType('error');
        return;
      }

      setSaveMessage('Attendance saved successfully!');
      setSaveMessageType('success');
      fetchSummary(todayDate);
      
      setTimeout(() => {
        openRoomModal(activeRoom);
      }, 1000);
    } catch (err) {
      console.error(err);
      setSaveMessage('Error saving attendance.');
      setSaveMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (type) => {
    const token = getAdminToken();
    if (!token) return;
    const url = `${apiBaseUrl}/api/attendance/export?type=${type}&date=${exportDate}&year=${exportDate.slice(0, 4)}&month=${parseInt(exportDate.slice(5, 7))}`;
    
    // Trigger file download
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `Attendance_${type}_${exportDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => alert('Failed to export Excel report'));
  };

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        {/* Top Header */}
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Daily Operation & Monitoring</p>
            <h2>Attendance Management</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
              Marking is available only for today ({todayDate}) between 8:00 PM and 12:00 AM.
            </p>
          </div>
          <div className="topbar-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="secondary-btn" onClick={() => fetchSummary(todayDate)}>
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </header>

        {/* Dashboard Summary Statistics */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="stat-card" style={{ borderLeft: '4px solid #34d399' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Total Present</h3>
                <p style={{ color: '#34d399', fontSize: '1.8rem', fontWeight: '800' }}>
                  {loading ? '...' : summary?.totalPresent ?? 0}
                </p>
              </div>
              <FiUserCheck style={{ fontSize: '2rem', color: '#34d399', opacity: 0.8 }} />
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid #f87171' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Total Absent</h3>
                <p style={{ color: '#f87171', fontSize: '1.8rem', fontWeight: '800' }}>
                  {loading ? '...' : summary?.totalAbsent ?? 0}
                </p>
              </div>
              <FiUserX style={{ fontSize: '2rem', color: '#f87171', opacity: 0.8 }} />
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid #72e3ff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Rooms Done</h3>
                <p style={{ color: '#72e3ff', fontSize: '1.8rem', fontWeight: '800' }}>
                  {loading ? '...' : `${summary?.completedRooms ?? 0} / 20`}
                </p>
              </div>
              <FiHome style={{ fontSize: '2rem', color: '#72e3ff', opacity: 0.8 }} />
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid #fbbf24' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Rooms Pending</h3>
                <p style={{ color: '#fbbf24', fontSize: '1.8rem', fontWeight: '800' }}>
                  {loading ? '...' : summary?.pendingRooms ?? 0}
                </p>
              </div>
              <FiClock style={{ fontSize: '2rem', color: '#fbbf24', opacity: 0.8 }} />
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid #a78bfa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Attendance %</h3>
                <p style={{ color: '#a78bfa', fontSize: '1.8rem', fontWeight: '800' }}>
                  {loading ? '...' : `${summary?.overallPercentage ?? 0}%`}
                </p>
              </div>
              <FiPercent style={{ fontSize: '2rem', color: '#a78bfa', opacity: 0.8 }} />
            </div>
          </div>
        </div>

        {/* Excel Export Report Actions Bar */}
        <div className="panel-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Attendance Reports Export</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
              Select a report date here only for download. Past dates cannot be edited from attendance marking.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <FiCalendar style={{ color: '#72e3ff' }} />
              <input
                type="date"
                value={exportDate}
                onChange={(e) => setExportDate(e.target.value)}
                style={{ background: 'none', border: 'none', color: '#fff', fontWeight: '600', cursor: 'pointer', outline: 'none' }}
              />
            </label>
            <button className="secondary-btn" onClick={() => handleExport('daily')}>
              <FiDownload /> Daily Excel
            </button>
            <button className="secondary-btn" onClick={() => handleExport('monthly')}>
              <FiDownload /> Monthly Excel
            </button>
            <button className="primary-btn" onClick={() => handleExport('yearly')}>
              <FiDownload /> Yearly Excel
            </button>
          </div>
        </div>

        {/* 20 Rooms Grid Cards */}
        <div className="panel-card">
          <div className="panel-head" style={{ marginBottom: '1.2rem' }}>
            <h3>Room-wise Attendance (Rooms 1 to 20)</h3>
            <small style={{ color: 'var(--muted)' }}>Click any room to open physical roll-call checklist.</small>
          </div>

          {loading ? (
            <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Loading rooms...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1.2rem' }}>
              {rooms.map((rm) => (
                <div 
                  key={rm.roomNumber}
                  onClick={() => openRoomModal(rm.roomNumber)}
                  style={{
                    padding: '1.2rem',
                    borderRadius: '16px',
                    background: rm.status === 'Completed' ? 'rgba(52, 211, 153, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                    border: rm.status === 'Completed' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  className="room-attendance-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FiHome style={{ color: '#72e3ff' }} /> Room {rm.roomNumber}
                    </h4>
                    {rm.isLocked ? (
                      <span title="Attendance Locked (Passed 2h window)" style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', background: 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: '999px' }}>
                        <FiLock /> Locked
                      </span>
                    ) : rm.status === 'Completed' ? (
                      <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: '999px' }}>
                        <FiCheckCircle /> Done
                      </span>
                    ) : (
                      <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', background: 'rgba(251,191,36,0.1)', padding: '2px 8px', borderRadius: '999px' }}>
                        <FiClock /> Pending
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.88rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div>Assigned Residents: <strong>{rm.capacity}</strong></div>
                    <div>Present: <strong style={{ color: '#34d399' }}>{rm.presentCount}</strong> | Absent: <strong style={{ color: '#f87171' }}>{rm.absentCount}</strong></div>
                  </div>

                  <div style={{ marginTop: '0.9rem', width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: rm.capacity > 0 ? `${(rm.presentCount / rm.capacity) * 100}%` : '0%',
                        background: 'linear-gradient(90deg, #34d399, #72e3ff)',
                        borderRadius: '999px',
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Room Attendance Modal */}
        {activeRoom && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>
            <div style={{ background: '#0d1527', border: '1px solid rgba(255,255,255,0.12)', width: '100%', maxWidth: '720px', maxHeight: '90vh', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 80px rgba(0,0,0,0.5)' }}>
              
              {/* Modal Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiHome style={{ color: '#72e3ff' }} /> Room {activeRoom} Attendance ({todayDate})
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Check residents who are Present physically. Unchecked students will be marked Absent.
                  </p>
                </div>
                <button className="icon-btn" onClick={() => setActiveRoom(null)}><FiX /></button>
              </div>

              {/* Modal Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {modalLoading ? (
                  <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>Loading room residents...</p>
                ) : !roomData || (roomData.students || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                    <p>No students assigned to Room {activeRoom}.</p>
                  </div>
                ) : (
                  <>
                    {/* Lock Status Warning */}
                    {roomData.isLocked ? (
                      <div style={{ padding: '0.9rem 1.2rem', borderRadius: '14px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
                        <FiLock style={{ fontSize: '1.2rem' }} />
                        <span>Attendance is locked outside the 8:00 PM to 12:00 AM marking window.</span>
                      </div>
                    ) : roomData.firstSavedAt ? (
                      <div style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(114,227,255,0.08)', border: '1px solid rgba(114,227,255,0.15)', color: '#72e3ff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiClock />
                        <span>First saved at {new Date(roomData.firstSavedAt).toLocaleTimeString()}. Editable only between 8:00 PM and 12:00 AM today.</span>
                      </div>
                    ) : null}

                    {/* Quick Select Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 1rem', borderRadius: '12px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>
                        Selected Present: {Object.values(presentMap).filter(Boolean).length} / {roomData.students.length}
                      </span>
                      <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <button className="secondary-btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => handleSelectAll(true)}>
                          <FiCheckSquare /> Select All
                        </button>
                        <button className="secondary-btn" style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }} onClick={() => handleSelectAll(false)}>
                          <FiSquare /> Deselect All
                        </button>
                      </div>
                    </div>

                    {/* Student List Checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {roomData.students.map(student => {
                        const isPresent = Boolean(presentMap[student._id]);
                        return (
                          <div 
                            key={student._id}
                            onClick={() => !roomData.isLocked && handleToggleStudent(student._id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.9rem 1.2rem',
                              borderRadius: '14px',
                              background: isPresent ? 'rgba(52, 211, 153, 0.08)' : 'rgba(248, 113, 113, 0.06)',
                              border: isPresent ? '1px solid rgba(52, 211, 153, 0.25)' : '1px solid rgba(248, 113, 113, 0.15)',
                              cursor: roomData.isLocked ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <input 
                                type="checkbox" 
                                checked={isPresent} 
                                onChange={() => {}}
                                disabled={roomData.isLocked}
                                style={{ width: '20px', height: '20px', accentColor: '#34d399', cursor: 'pointer' }}
                              />
                              <div>
                                <div style={{ fontWeight: '700', fontSize: '1rem', color: '#fff' }}>
                                  {student.fullName || student.username}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                                  @{student.username} {student.college_name ? `• ${student.college_name}` : ''}
                                </div>
                              </div>
                            </div>

                            <span style={{
                              padding: '0.3rem 0.8rem',
                              borderRadius: '999px',
                              fontSize: '0.82rem',
                              fontWeight: '700',
                              background: isPresent ? 'rgba(52, 211, 153, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                              color: isPresent ? '#34d399' : '#f87171'
                            }}>
                              {isPresent ? 'PRESENT' : 'ABSENT'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer Message & Save Button */}
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {saveMessage ? (
                  <span style={{ fontSize: '0.88rem', fontWeight: '600', color: saveMessageType === 'success' ? '#34d399' : '#f87171' }}>
                    {saveMessage}
                  </span>
                ) : <span />}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="secondary-btn" onClick={() => setActiveRoom(null)}>Cancel</button>
                  <button 
                    className="primary-btn" 
                    onClick={handleSaveAttendance}
                    disabled={saving || roomData?.isLocked}
                  >
                    {saving ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default Attendance;
