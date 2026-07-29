import { useState } from 'react';
import { FiCamera, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const categories = ['All', 'Hostel Building', 'Rooms', 'Study Hall', 'Library', 'Common Area', 'Garden', 'Students', 'Events', 'Sports', 'Celebrations'];

const galleryItems = [
  { title: 'Hostel Building Front View', category: 'Hostel Building', image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80' },
  { title: 'Hostel Entrance Gate', category: 'Hostel Building', image: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=800&q=80' },
  { title: 'Student Dormitory Room', category: 'Rooms', image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80' },
  { title: 'Study Hall', category: 'Study Hall', image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80' },
  { title: 'Students Studying Together', category: 'Students', image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80' },
  { title: 'Library Reading Room', category: 'Library', image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80' },
  { title: 'Computer Lab', category: 'Study Hall', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80' },
  { title: 'Common Recreation Area', category: 'Common Area', image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80' },
  { title: 'Hostel Garden', category: 'Garden', image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80' },
  { title: 'Cricket Match', category: 'Sports', image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80' },
  { title: 'Cultural Program', category: 'Events', image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=800&q=80' },
  { title: 'Independence Day Celebration', category: 'Celebrations', image: 'https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=800&q=80' },
  { title: 'Tree Plantation Activity', category: 'Events', image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80' },
  { title: 'Group Study Session', category: 'Students', image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80' },
  { title: 'Sports Day Event', category: 'Sports', image: 'https://images.unsplash.com/photo-1461896836934-bd45ba688509?auto=format&fit=crop&w=800&q=80' },
  { title: 'Campus Walkway', category: 'Garden', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=800&q=80' },
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
