import { useEffect, useState } from 'react';
import { FiUsers, FiPhone, FiMail, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export default function StaffSection() {
  const [ref, visible] = useInView();
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchStaff = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/staff`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Unable to load staff.');
        if (mounted) setStaff(data.staff || []);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchStaff();
    return () => { mounted = false; };
  }, []);

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(-1);
  const prevImage = () => setLightboxIndex((prev) => (prev - 1 + staff.length) % staff.length);
  const nextImage = () => setLightboxIndex((prev) => (prev + 1) % staff.length);

  return (
    <section className="page-section staff-section" id="staff" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiUsers /> Our Team</div>
          <h2 className="section-title">Hostel Staff</h2>
          <p className="section-subtitle">
            Dedicated and responsible hostel staff ensuring smooth operations and student welfare.
          </p>
        </div>

        {loading ? (
          <p>Loading staff members…</p>
        ) : error ? (
          <p style={{ color: '#f87171' }}>{error}</p>
        ) : (
          <div className="staff-grid">
            {staff.length > 0 ? staff.map((member, index) => (
              <div
                key={member._id}
                className={`staff-card glass-card ${visible ? 'visible' : ''}`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div
                  className="staff-image-wrap"
                  onClick={() => member.imageUrl && openLightbox(index)}
                  role={member.imageUrl ? 'button' : undefined}
                  tabIndex={member.imageUrl ? 0 : -1}
                  aria-label={member.imageUrl ? `View photo of ${member.name}` : undefined}
                  style={{ cursor: member.imageUrl ? 'pointer' : 'default' }}
                >
                  <img src={member.imageUrl || ''} alt={member.name} loading="lazy" />
                  {member.imageUrl && (
                    <div className="image-preview-hint">
                      <span>Click to preview</span>
                    </div>
                  )}
                </div>
                <div className="staff-info">
                  <h3>{member.name}</h3>
                  <span className="staff-designation">{member.position || 'Staff member'}</span>
                  <div className="staff-contacts">
                    <a href={`tel:${member.phone || ''}`} className="staff-contact-link">
                      <FiPhone /> {member.phone || 'No phone'}
                    </a>
                    <a href={`mailto:${member.email || ''}`} className="staff-contact-link">
                      <FiMail /> {member.email || 'No email'}
                    </a>
                  </div>
                </div>
              </div>
            )) : (
              <p>No staff records are available yet.</p>
            )}
          </div>
        )}

        {lightboxIndex >= 0 && staff[lightboxIndex] && staff[lightboxIndex].imageUrl && (
          <div className="lightbox-overlay" onClick={closeLightbox}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button className="lightbox-close" onClick={closeLightbox} aria-label="Close"><FiX /></button>
              <button className="lightbox-nav lightbox-prev" onClick={prevImage} aria-label="Previous"><FiChevronLeft /></button>
              <img src={staff[lightboxIndex].imageUrl} alt={staff[lightboxIndex].name} />
              <button className="lightbox-nav lightbox-next" onClick={nextImage} aria-label="Next"><FiChevronRight /></button>
              <div className="lightbox-caption">{staff[lightboxIndex].name} — {staff[lightboxIndex].position}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
