import { useState } from 'react';
import { FiEye, FiEyeOff, FiUser, FiLock } from 'react-icons/fi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Login failed.');
        setLoading(false);
        return;
      }

      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUsername', data.user.username);
      onLogin();
    } catch (err) {
      console.error(err);
      setError('Unable to reach backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-login-page">
      <div className="login-card admin-login-card">
        <span className="eyebrow">Administrator Portal</span>
        <h2>Admin Login</h2>
        <p>Manage residents, room assignments, and hostel operations from one secure dashboard.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="input-group">
            <span><FiUser /></span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
            />
          </label>
          <label className="input-group">
            <span><FiLock /></span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <button type="button" className="icon-btn" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="primary-btn full-width" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Login'}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Login;
