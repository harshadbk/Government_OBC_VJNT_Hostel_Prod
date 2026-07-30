import { FiInfo, FiArrowRight } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

export default function FoodAllowanceSection() {
  const [ref, visible] = useInView();

  return (
    <section className="page-section food-allowance-section" ref={ref}>
      <div className="section-container">
        <div className={`food-allowance-card glass-card ${visible ? 'visible' : ''}`}>
          <div className="food-allowance-icon-wrap">
            <FiArrowRight/>
          </div>
          <div className="food-allowance-content">
            <div className="food-allowance-badge">
              <FiInfo /> Government Scheme
            </div>
            <h2 className="food-allowance-title">Government Food Allowance</h2>
            <p className="food-allowance-description">
              Currently, students receive <strong>₹150 per day</strong> as a Government Food Allowance 
              to manage their meals independently until hostel mess facilities become available.
            </p>
            <div className="food-allowance-details">
              <div className="food-detail-item">
                <span className="food-detail-label">Daily Allowance</span>
                <span className="food-detail-value">₹150</span>
              </div>
              <div className="food-detail-item">
                <span className="food-detail-label">Monthly (approx.)</span>
                <span className="food-detail-value">₹4,500</span>
              </div>
              <div className="food-detail-item">
                <span className="food-detail-label">Disbursement</span>
                <span className="food-detail-value">Direct to Student</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
