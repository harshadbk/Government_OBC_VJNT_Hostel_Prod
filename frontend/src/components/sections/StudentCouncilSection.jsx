import { useState } from 'react';
import { FiUsers, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

import studentsCorp from '../../../assets/students_corp.jfif';
import studentCorp2 from '../../../assets/studnet_corp_2.jfif';

const council = [
  {
    name: 'Akash Deshmukh',
    course: 'B.E. Computer Science',
    year: 'Final Year',
    designation: 'Hostel Representative',
    image: studentsCorp
  },
  {
    name: 'Rohit Pawar',
    course: 'B.Com',
    year: 'Third Year',
    designation: 'Sports Coordinator',
    image: studentCorp2
  },
  {
    name: 'Sagar Mane',
    course: 'B.Sc. Physics',
    year: 'Second Year',
    designation: 'Library Coordinator',
    image: studentsCorp
  },
  {
    name: 'Vishal Jadhav',
    course: 'B.A. Political Science',
    year: 'Third Year',
    designation: 'Discipline Coordinator',
    image: studentCorp2
  },
  {
    name: 'Pratik Shinde',
    course: 'BCA',
    year: 'Second Year',
    designation: 'Cultural Coordinator',
    image: studentsCorp
  },
  {
    name: 'Omkar Salunkhe',
    course: 'B.E. Mechanical',
    year: 'Final Year',
    designation: 'Academic Coordinator',
    image: studentCorp2
  },
];

export default function StudentCouncilSection() {
  const [ref, visible] = useInView();
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(-1);
  const prevImage = () => setLightboxIndex((prev) => (prev - 1 + council.length) % council.length);
  const nextImage = () => setLightboxIndex((prev) => (prev + 1) % council.length);

  return (
    <section className="page-section council-section" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiUsers /> Student Leaders</div>
          <h2 className="section-title">Student Council</h2>
          <p className="section-subtitle">
            Elected student representatives who work with hostel administration to ensure smooth functioning and address student needs.
          </p>
        </div>
        <div className="council-grid">
          {council.map((member, index) => (
            <div
              key={member.name}
              className={`council-card glass-card ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <div
                className="council-image-wrap"
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
              <div className="council-info">
                <h3>{member.name}</h3>
                <span className="council-designation">{member.designation}</span>
                <p className="council-course">{member.course} · {member.year}</p>
              </div>
            </div>
          ))}
        </div>

        {lightboxIndex >= 0 && (
          <div className="lightbox-overlay" onClick={closeLightbox}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button className="lightbox-close" onClick={closeLightbox} aria-label="Close"><FiX /></button>
              <button className="lightbox-nav lightbox-prev" onClick={prevImage} aria-label="Previous"><FiChevronLeft /></button>
              <img src={council[lightboxIndex].image} alt={council[lightboxIndex].name} />
              <button className="lightbox-nav lightbox-next" onClick={nextImage} aria-label="Next"><FiChevronRight /></button>
              <div className="lightbox-caption">{council[lightboxIndex].name} — {council[lightboxIndex].designation}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
