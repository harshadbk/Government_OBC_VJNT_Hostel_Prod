import HeroSection from '../components/sections/HeroSection';
import FeaturesSection from '../components/sections/FeaturesSection';
import AboutSection from '../components/sections/AboutSection';
import FacilitiesSection from '../components/sections/FacilitiesSection';
import FoodAllowanceSection from '../components/sections/FoodAllowanceSection';
import EventsSection from '../components/sections/EventsSection';
import GallerySection from '../components/sections/GallerySection';
import StaffSection from '../components/sections/StaffSection';
import StudentCouncilSection from '../components/sections/StudentCouncilSection';
import HostelRulesSection from '../components/sections/HostelRulesSection';
import AdmissionSection from '../components/sections/AdmissionSection';
import DocumentsSection from '../components/sections/DocumentsSection';
import NoticeBoardSection from '../components/sections/NoticeBoardSection';
import HostelJourneySection from '../components/sections/HostelJourneySection';
import FAQSection from '../components/sections/FAQSection';
import ContactSection from '../components/sections/ContactSection';
import BackToTop from '../components/BackToTop';
import '../css/Home.css';

function Home() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <AboutSection />
      <FacilitiesSection />
      <FoodAllowanceSection />
      <EventsSection />
      <GallerySection />
      <StaffSection />
      <StudentCouncilSection />
      <HostelRulesSection />
      <AdmissionSection />
      <DocumentsSection />
      <NoticeBoardSection />
      <HostelJourneySection />
      <FAQSection />
      <ContactSection />
      <BackToTop />
    </>
  );
}

export default Home;
