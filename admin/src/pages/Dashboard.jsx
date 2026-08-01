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
  const navigate = useNavigate();

  const getAdminToken = () => {
    const token = localStorage.getItem("adminToken");
    if (!token || token === "null" || token === "undefined") {
      localStorage.removeItem("adminToken");
      return null;
    }
    return token;
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = getAdminToken();
        if (!token) {
          if (typeof onLogout === "function") onLogout();
          navigate("/login");
          return;
        }
        const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("adminToken");
          if (typeof onLogout === "function") onLogout();
          navigate("/login");
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to fetch users for dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchRooms = async () => {
      try {
        const token = getAdminToken();
        if (!token) return;
        const response = await fetch(`${apiBaseUrl}/api/admin/rooms-overview`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("adminToken");
          if (typeof onLogout === "function") onLogout();
          navigate("/login");
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setRooms(data.overview || []);
        }
      } catch (err) {
        console.error("Failed to fetch room overview:", err);
      } finally {
        setRoomsLoading(false);
      }
    };

    const fetchNotifications = async () => {
      try {
        const token = getAdminToken();
        if (!token) return;
        const response = await fetch(`${apiBaseUrl}/api/leaves/notifications`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        console.error("Failed to fetch leave notifications:", err);
      } finally {
        setNotificationsLoading(false);
      }
    };

    fetchUsers();
    fetchRooms();
    fetchNotifications();
  }, [navigate, onLogout]);

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
                        Room {item.roomNumber || "N/A"} - expected back after {item.endDate}
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
              <button onClick={() => navigate("/attendance-visuals")}>
                <FiBarChart2 />
                Attendance Visuals
              </button>
              <button onClick={() => navigate("/leaves")}>
                <FiBarChart2 />
                Leaves
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
