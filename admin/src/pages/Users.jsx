import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { FiHome, FiUser, FiPhone, FiBook, FiSearch, FiEye, FiTrash2 } from 'react-icons/fi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function Users({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const getAdminToken = () => {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'null' || token === 'undefined') {
      localStorage.removeItem('adminToken');
      return null;
    }
    return token;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAdminToken();
      if (!token) {
        if (typeof onLogout === 'function') onLogout();
        navigate('/login');
        return;
      }

      const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('adminToken');
        if (typeof onLogout === 'function') onLogout();
        navigate('/login');
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const token = getAdminToken();
        if (!token) {
          if (typeof onLogout === 'function') onLogout();
          navigate('/login');
          return;
        }

        const response = await fetch(`${apiBaseUrl}/api/admin/users/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('adminToken');
          if (typeof onLogout === 'function') onLogout();
          navigate('/login');
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to delete user');
        }

        setUsers(prev => prev.filter(user => user._id !== id));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleRowClick = (id) => {
    navigate(`/users/${id}`);
  };

  // Filter students based on search query
  const filteredUsers = users.filter(user => {
    const q = searchTerm.toLowerCase();
    return (
      (user.username && user.username.toLowerCase().includes(q)) ||
      (user.fullName && user.fullName.toLowerCase().includes(q)) ||
      (user.college_name && user.college_name.toLowerCase().includes(q)) ||
      (user.stream && user.stream.toLowerCase().includes(q)) ||
      (user.phone && user.phone.toLowerCase().includes(q)) ||
      (user.mobileNumber && user.mobileNumber.toLowerCase().includes(q)) ||
      (user.fathersMobileNumber && user.fathersMobileNumber.toLowerCase().includes(q)) ||
      (user.roomNumber && user.roomNumber.toLowerCase().includes(q))
    );
  });

  // Group filtered students by room number
  const groupedByRoom = filteredUsers.reduce((groups, student) => {
    const roomKey = student.roomNumber ? String(student.roomNumber).trim() : 'Unassigned';
    if (!groups[roomKey]) {
      groups[roomKey] = [];
    }
    groups[roomKey].push(student);
    return groups;
  }, {});

  // Sort room keys in ascending numerical order (putting 'Unassigned' at the end)
  const sortedRoomKeys = Object.keys(groupedByRoom).sort((a, b) => {
    if (a === 'Unassigned' && b === 'Unassigned') return 0;
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Resident Management</p>
            <h2>Users ({users.length})</h2>
          </div>
          <div className="topbar-actions">
            <div className="nb-search-row" style={{ margin: 0 }}>
              <input 
                className="table-search" 
                placeholder="Search name, username, college, stream, room..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '320px' }}
              />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="panel-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--muted)' }}>Loading student records...</p>
          </div>
        ) : error ? (
          <div className="panel-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'red' }}>Error: {error}</p>
          </div>
        ) : sortedRoomKeys.length === 0 ? (
          <div className="panel-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: 'var(--muted)' }}>No student records found matching your search.</p>
          </div>
        ) : (
          <div className="room-groups-container" style={{ display: 'grid', gap: '1.5rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {sortedRoomKeys.map(roomKey => {
              const roomStudents = groupedByRoom[roomKey];
              const isUnassigned = roomKey === 'Unassigned';

              return (
                <div key={roomKey} className="panel-card table-card">
                  {/* Room Container Header */}
                  <div className="panel-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.9rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        display: 'grid',
                        placeItems: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isUnassigned ? 'rgba(239, 68, 68, 0.15)' : 'linear-gradient(135deg, #72e3ff, #4f7cff)',
                        color: isUnassigned ? '#ef4444' : '#07111f',
                        fontSize: '1.1rem',
                        fontWeight: 'bold'
                      }}>
                        <FiHome />
                      </span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                          {isUnassigned ? 'Unassigned Students' : `Room ${roomKey}`}
                        </h3>
                        <small style={{ color: 'var(--muted)' }}>
                          {roomStudents.length} {roomStudents.length === 1 ? 'Resident' : 'Residents'} assigned
                        </small>
                      </div>
                    </div>

                    <span style={{
                      padding: '0.3rem 0.8rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      background: isUnassigned ? 'rgba(239, 68, 68, 0.12)' : 'rgba(114, 227, 255, 0.12)',
                      color: isUnassigned ? '#ef4444' : '#72e3ff',
                      border: isUnassigned ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(114, 227, 255, 0.25)'
                    }}>
                      {isUnassigned ? 'No Room' : `Room ${roomKey}`}
                    </span>
                  </div>

                  {/* Room Container Table */}
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Full Name</th>
                          <th>College</th>
                          <th>Stream</th>
                          <th>Phone No</th>
                          <th>Father's No</th>
                          <th>Present Days</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roomStudents.map((student) => (
                          <tr key={student._id} style={{ cursor: 'pointer' }}>
                            <td onClick={() => handleRowClick(student._id)} style={{ fontWeight: '600', color: '#72e3ff' }}>
                              @{student.username}
                            </td>
                            <td onClick={() => handleRowClick(student._id)} style={{ fontWeight: '600' }}>
                              {student.fullName || '-'}
                            </td>
                            <td onClick={() => handleRowClick(student._id)}>
                              {student.college_name || '-'}
                            </td>
                            <td onClick={() => handleRowClick(student._id)}>
                              {student.stream || '-'}
                            </td>
                            <td onClick={() => handleRowClick(student._id)}>
                              {student.mobileNumber || student.phone || '-'}
                            </td>
                            <td onClick={() => handleRowClick(student._id)}>
                              {student.fathersMobileNumber || '-'}
                            </td>
                            <td onClick={() => handleRowClick(student._id)}>
                              <strong>{student.presentDaysSinceCreated ?? 0}/{student.totalAttendanceDaysSinceCreated ?? 0}</strong>
                            </td>
                            <td>
                              <button 
                                className="table-action" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(student._id);
                                }}
                                style={{ marginRight: '8px' }}
                              >
                                View
                              </button>
                              </td>
                              <td>
                              <button 
                                className="table-action" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(student._id);
                                }}
                                style={{ color: '#ef4444' }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default Users;
