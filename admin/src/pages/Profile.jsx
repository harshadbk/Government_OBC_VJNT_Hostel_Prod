import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';

function Profile({ onLogout }) {
  const [username, setUsername] = useState(() => localStorage.getItem('adminUsername') || 'admin');
  const [newPassword, setNewPassword] = useState('');
  const [preview, setPreview] = useState(() => localStorage.getItem('adminProfileImage') || '');
  const [status, setStatus] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    // ensure label floats when username is prefilled
    // no-op: controlled inputs already show placeholder behavior via CSS
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleSaveImage = () => {
    if (!preview) {
      setStatus('Please select an image first');
      setTimeout(() => setStatus(''), 2000);
      return;
    }
    localStorage.setItem('adminProfileImage', preview);
    setStatus('Profile picture updated');
    setTimeout(() => setStatus(''), 2500);
  };

  const handleSaveProfile = () => {
    localStorage.setItem('adminUsername', username);
    if (newPassword) {
      // frontend-only: do not store password in localStorage for security
      setStatus('Profile saved (password change requires backend)');
    } else {
      setStatus('Profile saved');
    }
    setTimeout(() => setStatus(''), 2200);
  };

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Admin Profile</p>
            <h2>Profile Settings</h2>
          </div>
        </header>

        <div className="panel-card profile-card profile-card--standard">
          <div className="profile-image-panel">
            <div className="avatar-shell">
              {preview ? (
                <img src={preview} alt="Admin" className="profile-avatar" />
              ) : (
                <div className="profile-fallback">A</div>
              )}
              <div className="upload-overlay">
                <button className="image-upload-btn" onClick={() => fileRef.current?.click()}>Change</button>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} hidden />
            <div className="image-actions">
              <button className="primary-btn" onClick={handleSaveImage}>Save Picture</button>
              <button className="secondary-btn" onClick={() => { setPreview(localStorage.getItem('adminProfileImage') || ''); setStatus('Preview reset'); setTimeout(() => setStatus(''), 1600); }}>Reset</button>
            </div>
          </div>

          <div className="profile-form-grid admin-form-grid">
            <label className="profile-field">
              <span className="label-text">Username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder=" " />
            </label>
            <label className="profile-field">
              <span className="label-text">New Password</span>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder=" " />
            </label>
            <div className="profile-actions" style={{ gridColumn: '1 / -1', marginTop: '.6rem' }}>
              <button className="primary-btn" onClick={handleSaveProfile}>Save Profile</button>
            </div>
            {status ? <div className="form-status">{status}</div> : null}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;
