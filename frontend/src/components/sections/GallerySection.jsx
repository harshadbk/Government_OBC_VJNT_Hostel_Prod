import { useState } from 'react';
import { FiCamera, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

import festival from '../../../assets/festival.jfif';
import festival02 from '../../../assets/festival_02.jfif';
import festival03 from '../../../assets/festival_03.jfif';
import meeting01 from '../../../assets/meeting_01.jfif';
import meeting02 from '../../../assets/meeting_02.jfif';
import meeting04 from '../../../assets/meeting_04.jfif';
import staffImg from '../../../assets/staff.jfif';
import staff2 from '../../../assets/staff_2.jfif';
import studentsCorp from '../../../assets/students_corp.jfif';
import studentCorp2 from '../../../assets/studnet_corp_2.jfif';
import homeImage from '../../../assets/home.png';

const categories = ['All', 'Hostel', 'Festival', 'Meeting', 'Staff', 'Students'];

const galleryItems = [
  { title: 'Hostel Building', category: 'Hostel', image: homeImage },
  { title: 'Festival Celebration', category: 'Festival', image: festival },
  { title: 'Festival Event', category: 'Festival', image: festival02 },
  { title: 'Festival Program', category: 'Festival', image: festival03 },
  { title: 'Official Meeting', category: 'Meeting', image: meeting01 },
  { title: 'Staff Meeting', category: 'Meeting', image: meeting02 },
  { title: 'Meeting Session', category: 'Meeting', image: meeting04 },
  { title: 'Hostel Staff', category: 'Staff', image: staffImg },
  { title: 'Staff Team', category: 'Staff', image: staff2 },
  { title: 'Student Corps', category: 'Students', image: studentsCorp },
  { title: 'Student Corps Team', category: 'Students', image: studentCorp2 },
];

export default function GallerySection() {
  const [ref, visible] = useInView();
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const filtered = activeCategory === 'All' ? galleryItems : galleryItems.filter(item => item.category === activeCategory);

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(-1);
  const prevImage = () => setLightboxIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
  const nextImage = () => setLightboxIndex((prev) => (prev + 1) % filtered.length);

  return (
    <section className="page-section gallery-section" id="gallery" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiCamera /> Photo Gallery</div>
          <h2 className="section-title">Hostel Photo Gallery</h2>
          <p className="section-subtitle">
            Browse through images of our hostel building, rooms, study areas, events, and student activities.
          </p>
        </div>

        <div className="gallery-filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`gallery-filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="gallery-masonry">
          {filtered.map((item, index) => (
            <div
              key={item.title}
              className={`gallery-item ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 60}ms` }}
              onClick={() => openLightbox(index)}
              role="button"
              tabIndex={0}
              aria-label={`View ${item.title}`}
            >
              <img src={item.image} alt={item.title} loading="lazy" />
              <div className="gallery-overlay">
                <FiCamera />
                <span>{item.title}</span>
              </div>
            </div>
          ))}
        </div>

        {lightboxIndex >= 0 && (
          <div className="lightbox-overlay" onClick={closeLightbox}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button className="lightbox-close" onClick={closeLightbox} aria-label="Close"><FiX /></button>
              <button className="lightbox-nav lightbox-prev" onClick={prevImage} aria-label="Previous"><FiChevronLeft /></button>
              <img src={filtered[lightboxIndex].image} alt={filtered[lightboxIndex].title} />
              <button className="lightbox-nav lightbox-next" onClick={nextImage} aria-label="Next"><FiChevronRight /></button>
              <div className="lightbox-caption">{filtered[lightboxIndex].title}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
