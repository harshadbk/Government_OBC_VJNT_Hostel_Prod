import { useState } from 'react';
import { FiEye, FiEyeOff, FiUser, FiLock, FiUserPlus, FiKey, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import Register from './Register';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [mode, setMode] = useState('login');
  const [otp, setOtp] = useState('');
  const [forgotStep, setForgotStep] = useState(false);

  const showNotice = (message, type = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      localStorage.setItem('adminRole', data.user.role || 'admin');
      showNotice('Login successful. Opening admin dashboard...');
      onLogin();
    } catch (err) {
      console.error(err);
      setError('Unable to reach backend.');
      showNotice('Unable to reach backend.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to process forgot password request.');
      }
      setForgotStep(true);
      setError('');
      showNotice(data.message || 'OTP sent to the registered admin email.');
    } catch (err) {
      setError(err.message);
      showNotice(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), otp, newPassword: password, confirmPassword: password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Password reset failed.');
      }
      setForgotStep(false);
      setError('');
      setPassword('');
      setOtp('');
      showNotice(data.message || 'Password reset successful. You can login now.');
    } catch (err) {
      setError(err.message);
      showNotice(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'register') {
    return <Register onRegister={onLogin} switchToLogin={() => setMode('login')} />;
  }

  return (
    <section className="admin-login-page">
      {notice ? (
        <div className={`action-popup ${notice.type}`} role="status">
          <FiCheckCircle />
          <span>{notice.message}</span>
        </div>
      ) : null}
      <div className="login-card admin-login-card">
        <span className="eyebrow">Administrator Portal</span>
        <h2>{forgotStep ? 'Reset Password' : 'Admin Login'}</h2>
        <p>{forgotStep ? 'Enter the OTP sent to your registered email.' : 'Manage residents, room assignments, and hostel operations from one secure dashboard.'}</p>
        {error ? <p className="form-error">{error}</p> : null}
        {forgotStep ? (
          <form onSubmit={handleReset} className="auth-form">
            <label className="input-group">
              <span><FiUser /></span>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
            </label>
            <label className="input-group">
              <span><FiLock /></span>
              <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="OTP" required />
            </label>
            <label className="input-group">
              <span><FiLock /></span>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password" required />
              <button type="button" className="icon-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <FiEyeOff /> : <FiEye />}</button>
            </label>
            <button className="primary-btn full-width" type="submit" disabled={loading}>{loading ? <span className="spinner" /> : 'Reset Password'}</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="input-group">
              <span><FiUser /></span>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
            </label>
            <label className="input-group">
              <span><FiLock /></span>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
              <button type="button" className="icon-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <FiEyeOff /> : <FiEye />}</button>
            </label>
            <button className="primary-btn full-width" type="submit" disabled={loading}>{loading ? <span className="spinner" /> : 'Login'}</button>
          </form>
        )}
        <div className="auth-secondary-actions">
          <button className="auth-link-btn" type="button" onClick={() => setMode('register')}>
            <FiUserPlus /> Register
          </button>
          <button
            className="auth-link-btn"
            type="button"
            onClick={forgotStep ? () => { setForgotStep(false); setError(''); } : handleForgot}
            disabled={!forgotStep && (!username.trim() || loading)}
          >
            {forgotStep ? <FiArrowLeft /> : <FiKey />}
            {forgotStep ? 'Back to Login' : 'Forgot Password'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default Login;
