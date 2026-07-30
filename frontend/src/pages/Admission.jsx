import AdmissionSection from '../components/sections/AdmissionSection';
import DocumentsSection from '../components/sections/DocumentsSection';
import HostelRulesSection from '../components/sections/HostelRulesSection';
import NoticeBoardSection from '../components/sections/NoticeBoardSection';
import FAQSection from '../components/sections/FAQSection';
import BackToTop from '../components/BackToTop';
import '../css/Home.css';

function Admission() {
  return (
    <>
      <AdmissionSection />
      <DocumentsSection />
      <HostelRulesSection />
      <NoticeBoardSection />
      <FAQSection />
      <BackToTop />
    </>
  );
}

export default Admission;
