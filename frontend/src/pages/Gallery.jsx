import GallerySection from '../components/sections/GallerySection';
import EventsSection from '../components/sections/EventsSection';
import BackToTop from '../components/BackToTop';
import '../css/Home.css';

function Gallery() {
  return (
    <>
      <GallerySection />
      <EventsSection />
      <BackToTop />
    </>
  );
}

export default Gallery;
