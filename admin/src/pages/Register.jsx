import { useState } from 'react';
import { FiEye, FiEyeOff, FiUser, FiLock, FiMail, FiPhone, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function Register({ onRegister, switchToLogin }) {
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', role: 'admin', phone: '', email: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const showNotice = (message, type = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, username: form.username.trim(), email: form.email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }
      setOtpSent(true);
      setError('');
      showNotice(data.message || 'Registration OTP sent to the root admin email.');
    } catch (err) {
      setError(err.message);
      showNotice(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username.trim(), otp }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed.');
      }
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUsername', data.user.username);
      localStorage.setItem('adminRole', data.user.role);
      showNotice('Registration verified. Opening admin dashboard...');
      onRegister();
    } catch (err) {
      setError(err.message);
      showNotice(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-login-page">
      {notice ? (
        <div className={`action-popup ${notice.type}`} role="status">
          <FiCheckCircle />
          <span>{notice.message}</span>
        </div>
      ) : null}
      <div className="login-card admin-login-card">
        <span className="eyebrow">Create Admin Account</span>
        <h2>{otpSent ? 'Verify Registration' : 'Register Admin'}</h2>
        <p>First-time admin accounts are verified through the root admin email.</p>
        {error ? <p className="form-error">{error}</p> : null}
        {otpSent ? (
          <form onSubmit={handleVerify} className="auth-form">
            <label className="input-group">
              <span><FiUser /></span>
              <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" required />
            </label>
            <button className="primary-btn full-width" type="submit" disabled={loading}>{loading ? <span className="spinner" /> : 'Verify OTP'}</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="input-group">
              <span><FiUser /></span>
              <input value={form.username} onChange={(e) => handleChange('username', e.target.value)} placeholder="Username" required />
            </label>
            <label className="input-group">
              <span><FiMail /></span>
              <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="Email" required />
            </label>
            <label className="input-group">
              <span><FiPhone /></span>
              <input value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="Phone" required />
            </label>
            <label className="input-group">
              <span><FiLock /></span>
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => handleChange('password', e.target.value)} placeholder="Password" required />
              <button type="button" className="icon-btn" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <FiEyeOff /> : <FiEye />}</button>
            </label>
            <label className="input-group">
              <span><FiLock /></span>
              <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} placeholder="Confirm Password" required />
            </label>
            <label className="input-group">
              <span><FiUser /></span>
              <select value={form.role} onChange={(e) => handleChange('role', e.target.value)}>
                <option value="admin">Admin</option>
                <option value="attendance_taker">Attendance Taker</option>
              </select>
            </label>
            <button className="primary-btn full-width" type="submit" disabled={loading}>{loading ? <span className="spinner" /> : 'Register'}</button>
          </form>
        )}
        <div className="auth-secondary-actions single">
          <button className="auth-link-btn" type="button" onClick={switchToLogin}>
            <FiArrowLeft /> Already have an account? Login
          </button>
        </div>
      </div>
    </section>
  );
}

export default Register;
