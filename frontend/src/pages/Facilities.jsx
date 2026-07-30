import FacilitiesSection from '../components/sections/FacilitiesSection';
import FoodAllowanceSection from '../components/sections/FoodAllowanceSection';
import BackToTop from '../components/BackToTop';
import '../css/Home.css';

function Facilities() {
  return (
    <>
      <FacilitiesSection />
      <FoodAllowanceSection />
      <BackToTop />
    </>
  );
}

export default Facilities;
