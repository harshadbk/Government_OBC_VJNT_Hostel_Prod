import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

function AddUser({ onLogout }) {
  const [username, setUsername] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const storedUsers = localStorage.getItem("adminUsers");
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    }
  }, []);

  const persistUsers = (nextUsers) => {
    setUsers(nextUsers);
    localStorage.setItem("adminUsers", JSON.stringify(nextUsers));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!username.trim() || !tempPassword) {
      setStatus("Please provide both username and temporary password.");
      return;
    }

    setIsSaving(true);
    setStatus("Creating user...");

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/add-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: tempPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus(result.message || "Unable to create user.");
        return;
      }

      const nextUsers = [
        { username: username.trim(), password: tempPassword },
        ...users,
      ];
      persistUsers(nextUsers);
      setStatus(`User "${username}" saved to the database.`);
      setUsername("");
      setTempPassword("");
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
                <input
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder=" "
                />
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

        <div className="panel-card form-card user-list-card">
          <div className="panel-head">
            <h3>Added Users</h3>
            <span>{users.length} total</span>
          </div>
          {users.length === 0 ? (
            <p className="empty-state">No users added yet. Add a user and it will appear below.</p>
          ) : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Temporary Password</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={`${user.username}-${index}`}>
                    <td>{user.username}</td>
                    <td>{user.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default AddUser;
