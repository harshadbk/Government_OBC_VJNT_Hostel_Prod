import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiLock, FiArrowRight, FiMail, FiKey } from 'react-icons/fi';
import InputField from '../components/InputField';
import Button from '../components/Button';
import '../css/Login.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({ username: '', password: '', remember: false });
  const [resetData, setResetData] = useState({ username: '', otp: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [resetErrors, setResetErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetMode, setResetMode] = useState('login');

  const validate = () => {
    const nextErrors = {};
    if (!formData.username.trim()) nextErrors.username = 'Username is required';
    if (!formData.password) nextErrors.password = 'Password is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setErrorMessage('');
  };

  const handleResetChange = (e) => {
    const { name, value } = e.target;
    setResetData((prev) => ({ ...prev, [name]: value }));
    setResetErrors((prev) => ({ ...prev, [name]: '' }));
    setResetMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: formData.username.trim(), password: formData.password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.message || 'Login failed.');
        setLoading(false);
        return;
      }

      localStorage.setItem('hostelToken', data.token);
      localStorage.setItem('hostelUser', JSON.stringify(data.user));
      onLogin(data.user, data.token, data.user.photoUrl || '');
    } catch (err) {
      console.error(err);
      setErrorMessage('Unable to reach backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!resetData.username.trim()) nextErrors.username = 'Username is required';
    if (resetMode === 'verify' && !resetData.otp.trim()) nextErrors.otp = 'OTP is required';
    if (resetMode === 'verify' && !resetData.newPassword) nextErrors.newPassword = 'New password is required';
    if (resetMode === 'verify' && resetData.newPassword.length < 6) nextErrors.newPassword = 'Password must be at least 6 characters';
    if (resetMode === 'verify' && resetData.newPassword !== resetData.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
    setResetErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setResetLoading(true);
    try {
      if (resetMode === 'request') {
        const response = await fetch(`${apiBaseUrl}/api/user/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: resetData.username.trim() }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Unable to send OTP.');
        setResetMode('verify');
        setResetMessage(data.message || 'OTP sent to your registered email.');
      } else {
        const response = await fetch(`${apiBaseUrl}/api/user/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: resetData.username.trim(),
            otp: resetData.otp.trim(),
            newPassword: resetData.newPassword,
            confirmPassword: resetData.confirmPassword,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Unable to reset password.');
        setResetMode('login');
        setResetData({ username: '', otp: '', newPassword: '', confirmPassword: '' });
        setResetMessage(data.message || 'Password updated successfully.');
      }
    } catch (err) {
      console.error(err);
      setResetMessage(err.message || 'Unable to process password reset.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <div className="auth-hero glass-card">
          <div className="floating-shape" style={{ width: '120px', height: '120px', background: 'rgba(91,108,255,0.22)', top: '20px', left: '20px' }} />
          <div className="floating-shape" style={{ width: '180px', height: '180px', background: 'rgba(124,58,237,0.15)', bottom: '-30px', right: '-25px' }} />
          <h2>Welcome to Government OBC Boys Hostel</h2>
          <p>Access your student portal to manage profile details, track hostel information, and stay updated with official circulars.</p>
          <div className="hero-actions">
            <div className="muted" style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Official Portal under Samaj Kalyan Vibhag, Govt. of Maharashtra.
            </div>
          </div>
        </div>
        <div className="auth-card glass-card">
          <h3>Student / Admin Login</h3>
          <form className="form-grid" onSubmit={handleSubmit} noValidate>
            <InputField
              label="Username"
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              placeholder="Enter your username"
              icon={<FiUser />}
              required
            />
            <InputField
              label="Password"
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="Enter your password"
              icon={<FiLock />}
              required
            />
            <div className="form-row">
              <label className="checkbox-row">
                <input type="checkbox" name="remember" checked={formData.remember} onChange={handleChange} />
                Remember me
              </label>
              <button type="button" className="helper-link reset-trigger" onClick={() => { setResetMode('request'); setResetMessage(''); setResetErrors({}); }}>
                Forgot Password?
              </button>
            </div>
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
            <Button label="Login" variant="primary" type="submit" fullWidth loading={loading} icon={<FiArrowRight />} />
          </form>

          {resetMode !== 'login' ? (
            <form className="reset-card" onSubmit={handleForgotPassword} noValidate>
              <div className="reset-header">
                <h4>{resetMode === 'request' ? 'Reset Password' : 'Verify OTP'}</h4>
                <button type="button" className="reset-close" onClick={() => { setResetMode('login'); setResetData({ username: '', otp: '', newPassword: '', confirmPassword: '' }); setResetMessage(''); setResetErrors({}); }}>
                  Close
                </button>
              </div>
              <InputField
                label="Username"
                id="resetUsername"
                name="username"
                type="text"
                value={resetData.username}
                onChange={handleResetChange}
                error={resetErrors.username}
                placeholder="Enter your username"
                icon={<FiUser />}
                required
              />
              {resetMode === 'verify' ? (
                <>
                  <InputField
                    label="OTP"
                    id="resetOtp"
                    name="otp"
                    type="text"
                    value={resetData.otp}
                    onChange={handleResetChange}
                    error={resetErrors.otp}
                    placeholder="Enter 6-digit OTP"
                    icon={<FiMail />}
                    required
                  />
                  <InputField
                    label="New Password"
                    id="resetNewPassword"
                    name="newPassword"
                    type="password"
                    value={resetData.newPassword}
                    onChange={handleResetChange}
                    error={resetErrors.newPassword}
                    placeholder="Enter new password"
                    icon={<FiLock />}
                    required
                  />
                  <InputField
                    label="Confirm Password"
                    id="resetConfirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={resetData.confirmPassword}
                    onChange={handleResetChange}
                    error={resetErrors.confirmPassword}
                    placeholder="Confirm your password"
                    icon={<FiKey />}
                    required
                  />
                </>
              ) : null}
              {resetMessage ? <p className={`form-error ${resetMode === 'verify' ? 'success' : ''}`}>{resetMessage}</p> : null}
              <Button label={resetMode === 'request' ? 'Send OTP' : 'Update Password'} variant="secondary" type="submit" fullWidth loading={resetLoading} icon={<FiArrowRight />} />
            </form>
          ) : null}
          <p className="auth-switch">Need access? Contact your hostel administrator.</p>
        </div>
      </div>
    </section>
  );
}

export default Login;
