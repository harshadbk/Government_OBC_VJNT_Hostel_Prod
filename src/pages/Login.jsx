import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiLock, FiArrowRight, FiChrome } from 'react-icons/fi';
import InputField from '../components/InputField';
import Button from '../components/Button';
import '../css/Login.css';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({ email: '', password: '', remember: false });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors = {};
    if (!formData.email.trim()) nextErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.email = 'Enter a valid email address';
    if (!formData.password) nextErrors.password = 'Password is required';
    else if (formData.password.length < 6) nextErrors.password = 'Password must be at least 6 characters';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      onLogin({ email: formData.email }, '');
      setLoading(false);
    }, 900);
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
            <Link to="/signup">
              <Button label="Create account" variant="secondary" />
            </Link>
          </div>
        </div>
        <div className="auth-card glass-card">
          <h3>Login to your account</h3>
          <form className="form-grid" onSubmit={handleSubmit} noValidate>
            <InputField
              label="Email"
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="Enter your college email"
              icon={<FiMail />}
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
            <Button label="Login" variant="primary" type="submit" fullWidth loading={loading} icon={<FiArrowRight />} />
            <button type="button" className="ghost-btn"><FiChrome /> Continue with Google</button>
          </form>
          <p className="auth-switch">No account yet? <Link to="/signup">Sign up</Link></p>
        </div>
      </div>
    </section>
  );
}

export default Login;
