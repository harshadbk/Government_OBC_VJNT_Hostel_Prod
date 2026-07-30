import AboutSection from '../components/sections/AboutSection';
import StaffSection from '../components/sections/StaffSection';
import StudentCouncilSection from '../components/sections/StudentCouncilSection';
import HostelJourneySection from '../components/sections/HostelJourneySection';
import BackToTop from '../components/BackToTop';
import '../css/Home.css';

function About() {
  return (
    <>
      <AboutSection />
      <StaffSection />
      <StudentCouncilSection />
      <HostelJourneySection />
      <BackToTop />
    </>
  );
}

export default About;
