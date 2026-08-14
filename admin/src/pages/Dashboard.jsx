import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { FiBell, FiUsers, FiBarChart2 } from "react-icons/fi";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

function Dashboard({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [countsGroupBy, setCountsGroupBy] = useState('casteCategory');
  const [counts, setCounts] = useState([]);
  const [countsLoading, setCountsLoading] = useState(true);
  const navigate = useNavigate();
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedRoomStudents, setSelectedRoomStudents] = useState([]);

  const renderNotificationMessage = (item) => {
    if (item.type === "frequent-unapproved-absence") {
      return `Room ${item.roomNumber || "N/A"} - ${item.absentCount} absences in last ${item.windowDays} days`;
    }

    if (item.expectedReturnDate) {
      return `Room ${item.roomNumber || "N/A"} - expected back on ${item.expectedReturnDate}`;
    }

    return `Room ${item.roomNumber || "N/A"} - expected back after ${item.endDate}`;
  };

  const getAdminToken = () => {
    const token = localStorage.getItem("adminToken");
    if (!token || token === "null" || token === "undefined") {
      localStorage.removeItem("adminToken");
      return null;
    }
    return token;
  };

  useEffect(() => {
    const runDashboardLoad = async () => {
      const token = getAdminToken();
      if (!token) {
        if (typeof onLogout === "function") onLogout();
        navigate("/login");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [usersResponse, roomsResponse, leaveResponse, absenceResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/admin/users`, { headers }),
          fetch(`${apiBaseUrl}/api/admin/rooms-overview`, { headers }),
          fetch(`${apiBaseUrl}/api/leaves/notifications`, { headers }),
          fetch(`${apiBaseUrl}/api/attendance/absence-alerts`, { headers }),
        ]);

        if (usersResponse.status === 401 || usersResponse.status === 403) {
          localStorage.removeItem("adminToken");
          if (typeof onLogout === "function") onLogout();
          navigate("/login");
          return;
        }

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.users || []);
        }

        // counts are loaded in a dedicated effect when `countsGroupBy` changes

        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          setRooms(roomsData.overview || []);
        }

        const leaveData = leaveResponse.ok ? await leaveResponse.json() : { notifications: [] };
        const absenceData = absenceResponse.ok ? await absenceResponse.json() : { alerts: [] };
        setNotifications([
          ...(leaveData.notifications || []),
          ...(absenceData.alerts || []),
        ]);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
        setRoomsLoading(false);
        setNotificationsLoading(false);
          setCountsLoading(false);
      }
    };

    runDashboardLoad();
  }, [navigate, onLogout]);

  const handleRoomClick = (roomNumber) => {
    setSelectedRoomNumber(roomNumber);
    const students = users.filter((u) => String(u.roomNumber || '').trim() === String(roomNumber).trim());
    setSelectedRoomStudents(students);
    setShowRoomModal(true);
  };

  useEffect(() => {
    // fetch counts when groupBy changes
    const token = getAdminToken();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    setCountsLoading(true);
    fetch(`${apiBaseUrl}/api/admin/users/counts?groupBy=${countsGroupBy}`, { headers })
      .then((r) => r.json())
      .then((data) => setCounts(data.counts || []))
      .catch((err) => console.error('Counts load error', err))
      .finally(() => setCountsLoading(false));
  }, [countsGroupBy]);

  const recentUsers = users.slice(0, 4);

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Operations Overview</p>
            <h2>Admin Dashboard</h2>
          </div>
          <div className="topbar-actions">
            <button className="icon-button">
              <FiBell />
              {notifications.length > 0 ? (
                <span className="notification-count">{notifications.length}</span>
              ) : null}
            </button>
            <div className="profile-pill">
              <div className="brand-icon">A</div>
              <span>Admin</span>
            </div>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Students</h3>
            <p>80</p>
          </div>
          <div className="stat-card">
            <h3>Hostel Blocks</h3>
            <p>3</p>
          </div>
          <div className="stat-card">
            <h3>Rooms</h3>
            <p>20</p>
          </div>
          <div className="stat-card">
            <h3>Total Users</h3>
            <p>{loading ? "..." : users.length}</p>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-head">
            <h3>Room Overview</h3>
            <small>Green = free beds available, red = room full.</small>
          </div>
          {roomsLoading ? (
            <p style={{ padding: "1rem", color: "var(--muted)" }}>
              Loading rooms...
            </p>
          ) : (
            <div className="rooms-grid">
              {rooms.map((room) => (
                <div
                  key={room.roomNumber}
                  className={`room-card ${room.status === "alloted" ? "room-full" : "room-free"}`}
                  onClick={() => handleRoomClick(room.roomNumber)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="room-card-title">Room {room.roomNumber}</div>
                  <div className="room-card-meta">
                    {room.occupancy}/{room.capacity} occupied
                  </div>
                  <div className="room-card-badge">
                    {room.status === "alloted" ? "Full" : "Available"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-grid">
          <div className="panel-card">
            <div className="panel-head">
              <h3><FiBell /> Notifications</h3>
              <small>{notifications.length} active</small>
            </div>
            {notificationsLoading ? (
              <p style={{ padding: "1rem", color: "var(--muted)" }}>
                Loading notifications...
              </p>
            ) : notifications.length > 0 ? (
              <ul className="user-list">
                {notifications.map((item) => (
                  <li
                    key={item._id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "1rem",
                      padding: "0.8rem 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: "600" }}>
                        {item.studentName}
                      </span>
                      <small style={{ color: "var(--muted)" }}>
                        {renderNotificationMessage(item)}
                      </small>
                    </div>
                    <button className="table-action" onClick={() => navigate("/leaves")}>
                      Review
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ padding: "1rem", color: "var(--muted)" }}>
                No overdue leave returns.
              </p>
            )}
          </div>
          <div className="panel-card">
            <div className="panel-head">
              <h3>Recently Added Users</h3>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/users");
                }}
              >
                View all
              </a>
            </div>
            {loading ? (
              <p style={{ padding: "1rem", color: "var(--muted)" }}>
                Loading users...
              </p>
            ) : recentUsers.length > 0 ? (
              <ul className="user-list">
                {recentUsers.map((user) => (
                  <li
                    key={user._id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.8rem 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: "600" }}>
                        {user.fullName || user.username}
                      </span>
                      <small style={{ color: "var(--muted)" }}>
                        @{user.username}
                      </small>
                    </div>
                    <small
                      style={{ color: "var(--primary)", fontWeight: "500" }}
                    >
                      Room {user.roomNumber || "N/A"}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ padding: "1rem", color: "var(--muted)" }}>
                No users found.
              </p>
            )}
          </div>
          <div className="panel-card">
            <div className="panel-head">
              <h3>Students by {countsGroupBy === 'caste' ? 'Caste' : 'Category'}</h3>
              <div>
                <select value={countsGroupBy} onChange={(e) => setCountsGroupBy(e.target.value)}>
                  <option value="casteCategory">Category</option>
                  <option value="caste">Caste</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '.6rem' }}>
              {countsLoading ? (
                <p style={{ color: 'var(--muted)' }}>Loading...</p>
              ) : counts.length === 0 ? (
                <p style={{ color: 'var(--muted)' }}>No data available.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {counts.map((c) => (
                    <li
                      key={c.value}
                      onClick={() => navigate(`/users?groupBy=${countsGroupBy}&value=${encodeURIComponent(c.value)}`)}
                      style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', cursor: 'pointer' }}
                    >
                      <span style={{ color: 'var(--muted)' }}>{c.value}</span>
                      <strong>{c.count}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="panel-card">
            <div className="panel-head">
              <h3>Management Panel</h3>
            </div>
            <div className="quick-actions">
              <button onClick={() => navigate("/users")}>
                <FiUsers /> Manage Residents
              </button>
              <button onClick={() => navigate("/notices")}>
                <FiBell />
                Notice Board
              </button>
              <button onClick={() => navigate("/uploads")}>
                <FiUsers />
                Uploads
              </button>
              <button onClick={() => navigate("/staff")}>
                <FiUsers />
                Staffs
              </button>
              <button onClick={() => navigate("/leaves")}>
                <FiBarChart2 />
                Leaves
              </button>
            </div>
          </div>
        </div>
        {showRoomModal ? (
          <div className="room-modal-overlay" onClick={() => setShowRoomModal(false)}>
            <div className="room-modal" onClick={(e) => e.stopPropagation()}>
              <div className="room-modal-header">
                <h3>Room {selectedRoomNumber} — Residents ({selectedRoomStudents.length})</h3>
                <button className="room-modal-close" onClick={() => setShowRoomModal(false)}>Close</button>
              </div>
              <div className="room-modal-body">
                {selectedRoomStudents.length === 0 ? (
                  <p className="muted">No residents in this room.</p>
                ) : (
                  <table className="room-modal-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>College</th>
                        <th>Stream</th>
                        <th>Department</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRoomStudents.map((s) => (
                        <tr key={s._id}>
                          <td>{s.fullName || s.username}</td>
                          <td>{s.college_name || '-'}</td>
                          <td>{s.stream || '-'}</td>
                          <td>{s.department || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default Dashboard;
