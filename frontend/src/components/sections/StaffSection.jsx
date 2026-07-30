import { useState } from 'react';
import { FiUsers, FiPhone, FiMail, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

import staffImg from '../../../assets/staff.jfif';
import staff2 from '../../../assets/staff_2.jfif';

const staff = [
  {
    name: 'Shri. Rajendra Patil',
    designation: 'Rector',
    phone: '+91 98765 43210',
    email: 'rector.obchostel@gov.in',
    image: staffImg
  },
  {
    name: 'Shri. Manoj Jadhav',
    designation: 'Assistant Rector',
    phone: '+91 98765 43211',
    email: 'asstrector.obchostel@gov.in',
    image: staff2
  },
  {
    name: 'Shri. Suresh Kamble',
    designation: 'Hostel Superintendent',
    phone: '+91 98765 43212',
    email: 'superintendent.obchostel@gov.in',
    image: staffImg
  },
  {
    name: 'Shri. Anil Shinde',
    designation: 'Clerk',
    phone: '+91 98765 43213',
    email: 'clerk.obchostel@gov.in',
    image: staff2
  },
  {
    name: 'Shri. Balaji More',
    designation: 'Security Guard',
    phone: '+91 98765 43214',
    email: 'security.obchostel@gov.in',
    image: staffImg
  },
  {
    name: 'Shri. Vishnu Gaikwad',
    designation: 'Caretaker',
    phone: '+91 98765 43215',
    email: 'caretaker.obchostel@gov.in',
    image: staff2
  },
];

export default function StaffSection() {
  const [ref, visible] = useInView();
  const [lightboxIndex, setLightboxIndex] = useState(-1);

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
        <div className="staff-grid">
          {staff.map((member, index) => (
            <div
              key={member.name}
              className={`staff-card glass-card ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <div
                className="staff-image-wrap"
                onClick={() => openLightbox(index)}
                role="button"
                tabIndex={0}
                aria-label={`View photo of ${member.name}`}
                style={{ cursor: 'pointer' }}
              >
                <img src={member.image} alt={member.name} loading="lazy" />
                <div className="image-preview-hint">
                  <span>Click to preview</span>
                </div>
              </div>
              <div className="staff-info">
                <h3>{member.name}</h3>
                <span className="staff-designation">{member.designation}</span>
                <div className="staff-contacts">
                  <a href={`tel:${member.phone}`} className="staff-contact-link">
                    <FiPhone /> {member.phone}
                  </a>
                  <a href={`mailto:${member.email}`} className="staff-contact-link">
                    <FiMail /> {member.email}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {lightboxIndex >= 0 && (
          <div className="lightbox-overlay" onClick={closeLightbox}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button className="lightbox-close" onClick={closeLightbox} aria-label="Close"><FiX /></button>
              <button className="lightbox-nav lightbox-prev" onClick={prevImage} aria-label="Previous"><FiChevronLeft /></button>
              <img src={staff[lightboxIndex].image} alt={staff[lightboxIndex].name} />
              <button className="lightbox-nav lightbox-next" onClick={nextImage} aria-label="Next"><FiChevronRight /></button>
              <div className="lightbox-caption">{staff[lightboxIndex].name} — {staff[lightboxIndex].designation}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
