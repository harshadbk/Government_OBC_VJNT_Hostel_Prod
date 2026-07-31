import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

function AddUser({ onLogout }) {
  const [username, setUsername] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };

    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${apiBaseUrl}/api/admin/rooms-overview`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const data = await response.json();
          setRooms(data.overview || []);
        }
      } catch (err) {
        console.error('Failed to fetch room list:', err);
      } finally {
        setRoomsLoading(false);
      }
    };

    fetchUsers();
    fetchRooms();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!username.trim() || !tempPassword || !roomNumber.trim()) {
      setStatus("Please provide username, temporary password, and room allocation.");
      return;
    }

    setIsSaving(true);
    setStatus("Creating user...");

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${apiBaseUrl}/api/admin/add-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username: username.trim(),
          password: tempPassword,
          roomNumber: roomNumber.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || "Unable to create user.");
        return;
      }

      setStatus(`User "${username}" saved to the database.`);
      setUsername("");
      setTempPassword("");
      setRoomNumber("");
      const refreshedResponse = await fetch(`${apiBaseUrl}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      if (refreshedResponse.ok) {
        const refreshedData = await refreshedResponse.json();
        setUsers(refreshedData.users || []);
      }
    } catch (error) {
      console.error(error);
      setStatus("Network error. Could not reach the backend.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatus(""), 4000);
    }
  };

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">User Creation</p>
            <h2>Add User</h2>
          </div>
        </header>

        <div className="panel-card form-card">
          <form className="profile-form admin-form" onSubmit={handleCreate}>
            <div className="profile-form-grid admin-form-grid compact-grid gap-5">
              <label className="profile-field">
                <span className="label-text">Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder=" "
                />
              </label>
              <br />
              <label className="profile-field">
                <span className="label-text">Temporary Password</span>
                <div className="password-toggle-field" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    placeholder=" "
                    style={{ paddingRight: '3rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '0.9rem',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>
              <br />
              <label className="profile-field">
                <span className="label-text">Room Number</span>
                <select value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)}>
                  {roomsLoading ? (
                    <option value="">Loading rooms...</option>
                  ) : rooms.length > 0 ? (
                    rooms.map((room) => (
                      <option
                        key={room.roomNumber}
                        value={room.roomNumber}
                        disabled={room.occupancy >= room.capacity}
                      >
                        Room {room.roomNumber} ({room.occupancy}/{room.capacity}){room.occupancy >= room.capacity ? ' - Full' : ''}
                      </option>
                    ))
                  ) : (
                    <option value="">No rooms available</option>
                  )}
                </select>
              </label>
            </div>
            <div className="profile-actions">
              <button className="primary-btn" type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Create User"}
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => {
                  setUsername("");
                  setTempPassword("");
                  setStatus("");
                }}
              >
                Reset
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => window.history.back()}
              >
                Cancel
              </button>
            </div>
            {status ? <p className="form-status">{status}</p> : null}
          </form>
        </div>

        <div className="panel-card form-card user-list-card" style={{ maxHeight: '320px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <h3>Added Users</h3>
            <span>{users.length} total</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
            {users.length === 0 ? (
              <p className="empty-state">No users added yet. Add a user and it will appear below.</p>
            ) : (
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Room</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={`${user.username}-${index}`}>
                      <td>{user.username}</td>
                      <td>{user.roomNumber || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default AddUser;
