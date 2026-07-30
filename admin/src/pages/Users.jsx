import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function Users({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
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
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${apiBaseUrl}/api/admin/users/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to delete user');
        }
        setUsers(users.filter(user => user._id !== id));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleRowClick = (id) => {
    navigate(`/users/${id}`);
  };

  const filteredUsers = users.filter(user => 
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Resident Management</p>
            <h2>Users</h2>
          </div>
        </header>

        <div className="panel-card table-card">
          <div className="panel-head">
            <h3>Student Records</h3>
            <input 
              className="table-search" 
              placeholder="Search students" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="table-wrapper">
            {loading ? (
              <p style={{ padding: '1rem' }}>Loading users...</p>
            ) : error ? (
              <p style={{ padding: '1rem', color: 'red' }}>Error: {error}</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Phone No</th>
                    <th>Father's No</th>
                    <th>Block</th>
                    <th>Room</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? filteredUsers.map((student) => (
                    <tr key={student._id} style={{ cursor: 'pointer' }}>
                      <td onClick={() => handleRowClick(student._id)}>{student.username}</td>
                      <td onClick={() => handleRowClick(student._id)}>{student.fullName || '-'}</td>
                      <td onClick={() => handleRowClick(student._id)}>{student.mobileNumber || student.phone || '-'}</td>
                      <td onClick={() => handleRowClick(student._id)}>{student.fathersMobileNumber || '-'}</td>
                      <td onClick={() => handleRowClick(student._id)}>{student.hostelBlock || '-'}</td>
                      <td onClick={() => handleRowClick(student._id)}>{student.roomNumber || '-'}</td>
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
                  )) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '1rem' }}>No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Users;
