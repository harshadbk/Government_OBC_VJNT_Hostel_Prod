import { useState } from 'react';
import { FiCalendar, FiImage, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

import festival from '../../../assets/festival.jfif';
import festival02 from '../../../assets/festival_02.jfif';
import festival03 from '../../../assets/festival_03.jfif';
import meeting01 from '../../../assets/meeting_01.jfif';
import meeting02 from '../../../assets/meeting_02.jfif';
import meeting04 from '../../../assets/meeting_04.jfif';
import studentsCorp from '../../../assets/students_corp.jfif';
import studentCorp2 from '../../../assets/studnet_corp_2.jfif';

const events = [
  {
    title: 'Subhash Chandra Bose Jayanti',
    date: '23 January 2026',
    description: 'Officially celebrated as Parakram Diwas',
    image: festival
  },
  {
    title: 'Republic Day Celebration',
    date: '26 January 2026',
    description: 'Republic Day celebrations with cultural performances and flag hoisting.',
    image: festival02
  },
  {
    title: 'Cultural Program',
    date: 'March 2026',
    description: 'Annual cultural program showcasing student talent in music, dance, and drama.',
    image: festival03
  },
  {
    title: 'Official Meeting',
    date: 'Quarterly',
    description: 'Quarterly review meeting with hostel administration and government officials.',
    image: meeting01
  },
  {
    title: 'Staff Meeting',
    date: 'Monthly',
    description: 'Monthly staff coordination meeting to discuss hostel operations and student welfare.',
    image: meeting02
  },
  {
    title: 'Administrative Meeting',
    date: 'December 2025',
    description: 'Administrative review and planning session for upcoming academic year.',
    image: meeting04
  },
  {
    title: 'Student Corps Formation',
    date: 'August 2025',
    description: 'Formation of the student council and corps for the academic year.',
    image: studentsCorp
  },
  {
    title: 'Student Corps Activity',
    date: 'September 2025',
    description: 'Student corps organizing campus activities and community service programs.',
    image: studentCorp2
  },
];

export default function EventsSection() {
  const [ref, visible] = useInView();
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(-1);
  const prevImage = () => setLightboxIndex((prev) => (prev - 1 + events.length) % events.length);
  const nextImage = () => setLightboxIndex((prev) => (prev + 1) % events.length);

  return (
    <section className="page-section events-section" id="events" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiCalendar /> Events & Activities</div>
          <h2 className="section-title">Hostel Events & Activities</h2>
          <p className="section-subtitle">
            Our hostel organizes regular events, sports competitions, cultural programs, and awareness campaigns to support holistic student development.
          </p>
        </div>
        <div className="events-grid">
          {events.map((event, index) => (
            <article
              key={event.title}
              className={`event-card glass-card ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${index * 60}ms` }}
            >
              <div
                className="event-image-wrap"
                onClick={() => openLightbox(index)}
                role="button"
                tabIndex={0}
                aria-label={`View photo of ${event.title}`}
                style={{ cursor: 'pointer' }}
              >
                <img src={event.image} alt={event.title} loading="lazy" />
                <div className="event-date-badge">
                  <FiCalendar /> {event.date}
                </div>
                <div className="image-preview-hint">
                  <span>Click to preview</span>
                </div>
              </div>
              <div className="event-info">
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <button className="event-gallery-btn" onClick={() => openLightbox(index)}>
                  <FiImage /> View Photo
                </button>
              </div>
            </article>
          ))}
        </div>

        {lightboxIndex >= 0 && (
          <div className="lightbox-overlay" onClick={closeLightbox}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button className="lightbox-close" onClick={closeLightbox} aria-label="Close"><FiX /></button>
              <button className="lightbox-nav lightbox-prev" onClick={prevImage} aria-label="Previous"><FiChevronLeft /></button>
              <img src={events[lightboxIndex].image} alt={events[lightboxIndex].title} />
              <button className="lightbox-nav lightbox-next" onClick={nextImage} aria-label="Next"><FiChevronRight /></button>
              <div className="lightbox-caption">{events[lightboxIndex].title} — {events[lightboxIndex].date}</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
