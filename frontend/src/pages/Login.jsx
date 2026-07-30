import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiLock, FiArrowRight, FiChrome } from 'react-icons/fi';
import InputField from '../components/InputField';
import Button from '../components/Button';
import '../css/Login.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({ username: '', password: '', remember: false });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/login`, {
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

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <div className="auth-hero glass-card">
          <div className="floating-shape" style={{ width: '120px', height: '120px', background: 'rgba(91,108,255,0.22)', top: '20px', left: '20px' }} />
          <div className="floating-shape" style={{ width: '180px', height: '180px', background: 'rgba(124,58,237,0.15)', bottom: '-30px', right: '-25px' }} />
          <h2>Welcome back to the campus portal</h2>
          <p>Access your hostel profile and stay connected to the latest updates from your residence hall.</p>
          <div className="hero-actions">
            <div className="muted">Accounts are provided by admin — contact your administrator to get credentials.</div>
          </div>
        </div>
        <div className="auth-card glass-card">
          <h3>Login to your account</h3>
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
              <a href="#" className="helper-link">Forgot Password?</a>
            </div>
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
            <Button label="Login" variant="primary" type="submit" fullWidth loading={loading} icon={<FiArrowRight />} />
            <button type="button" className="ghost-btn"><FiChrome /> Continue with Google</button>
          </form>
          <p className="auth-switch">No account yet? Contact your administrator to request access.</p>
        </div>
      </div>
    </section>
  );
}

export default Login;
