import { FiMail, FiPhone, FiMapPin, FiHome, FiBookOpen } from 'react-icons/fi';

function ProfileCard({ user, profileImage }) {
  return (
    <div className="profile-card glass-card">
      <div className="profile-visual">
        <div className="avatar-wrap">
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="avatar-image" />
          ) : (
            <div className="avatar-fallback">{user?.fullName?.[0] || 'S'}</div>
          )}
        </div>
        <div>
          <h3>{user?.fullName}</h3>
          <p>{user?.rollNumber}</p>
        </div>
      </div>
      <div className="profile-details-grid">
        <div className="detail-pill"><FiBookOpen /> {user?.department}</div>
        <div className="detail-pill"><FiHome /> {user?.year}</div>
        <div className="detail-pill"><FiMail /> {user?.email}</div>
        <div className="detail-pill"><FiPhone /> {user?.phone}</div>
        <div className="detail-pill"><FiMapPin /> {user?.address}</div>
      </div>
    </div>
  );
}

export default ProfileCard;
