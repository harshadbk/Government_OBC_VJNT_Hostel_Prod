import { useEffect, useState } from 'react';
import { FiBell, FiCalendar, FiAlertCircle, FiInfo } from 'react-icons/fi';
import useInView from '../../hooks/useInView';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

const typeIcons = {
  high: <FiAlertCircle />,
  medium: <FiInfo />,
  low: <FiBell />,
};

export default function NoticeBoardSection() {
  const [ref, visible] = useInView();
  const [notices, setNotices] = useState([]);
  const [recentCount, setRecentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/notices?limit=6`);
        const data = await res.json();
        if (res.ok) {
          setNotices(data.notices || []);
          setRecentCount(data.recentCount || 0);
        }
      } catch (err) {
        console.error('Failed to fetch notices:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, []);

  const isRecent = (createdAt) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return diff < 3 * 24 * 60 * 60 * 1000;
  };

  return (
    <section className="page-section notice-section" id="notices" ref={ref}>
      <div className="section-container">
        <div className="section-header">
          <div className="section-eyebrow"><FiBell /> Announcements</div>
          <h2 className="section-title">Notice Board</h2>
          <p className="section-subtitle">
            Stay updated with the latest notices, announcements, and government circulars from the hostel administration.
          </p>
        </div>

        {loading ? (
          <p className="section-subtitle">Loading notices…</p>
        ) : notices.length === 0 ? (
          <p className="section-subtitle">No notices have been published yet.</p>
        ) : (
          <div className="notices-list">
            {notices.map((notice, index) => {
              const recent = isRecent(notice.createdAt);
              const showNewBadge = recentCount > 0 && recent;
              return (
                <div
                  key={notice._id || notice.title}
                  className={`notice-card glass-card ${showNewBadge ? 'urgent' : ''} ${visible ? 'visible' : ''}`}
                  style={{ transitionDelay: `${index * 70}ms` }}
                >
                  <div className="notice-icon-wrap">
                    {typeIcons[notice.severity] || typeIcons.low}
                  </div>
                  <div className="notice-content">
                    <div className="notice-header">
                      <h3>{notice.title}</h3>
                      {showNewBadge && <span className="notice-urgent-badge">New</span>}
                    </div>
                    <p>{notice.content}</p>
                    <span className="notice-date"><FiCalendar /> {new Date(notice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
