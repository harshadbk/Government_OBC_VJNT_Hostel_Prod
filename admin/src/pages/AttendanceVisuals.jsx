import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiFileText, FiTrendingUp } from 'react-icons/fi';
import Sidebar from '../components/Sidebar';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

function AttendanceVisuals({ onLogout }) {
  const [visualMonth, setVisualMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [attendanceVisuals, setAttendanceVisuals] = useState(null);
  const [visualsLoading, setVisualsLoading] = useState(false);
  const [reportDates, setReportDates] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return { startDate: today, endDate: today };
  });
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const navigate = useNavigate();

  const getAdminToken = () => {
    const token = localStorage.getItem('adminToken');
    if (!token || token === 'null' || token === 'undefined') {
      localStorage.removeItem('adminToken');
      return null;
    }
    return token;
  };

  useEffect(() => {
    const fetchAttendanceVisuals = async () => {
      try {
        const token = getAdminToken();
        if (!token) {
          if (typeof onLogout === 'function') onLogout();
          navigate('/login');
          return;
        }
        setVisualsLoading(true);
        const [year, month] = visualMonth.split('-');
        const response = await fetch(`${apiBaseUrl}/api/attendance/visuals?year=${year}&month=${Number(month)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('adminToken');
          if (typeof onLogout === 'function') onLogout();
          navigate('/login');
          return;
        }
        if (response.ok) {
          const data = await response.json();
          setAttendanceVisuals(data);
        }
      } catch (err) {
        console.error('Failed to fetch attendance visuals:', err);
      } finally {
        setVisualsLoading(false);
      }
    };

    fetchAttendanceVisuals();
  }, [visualMonth, navigate, onLogout]);

  const generateAttendanceReport = async (event) => {
    event.preventDefault();
    setReportLoading(true);
    setReportError('');
    try {
      const token = getAdminToken();
      if (!token) return;
      const response = await fetch(`${apiBaseUrl}/api/attendance/range-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reportDates)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Unable to generate attendance report.');
      }
      setAttendanceReport(data);
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const chartData = attendanceVisuals?.dailyPresent || [];
  const maxPresent = Math.max(...chartData.map(item => item.presentCount), 1);
  const chartWidth = 720;
  const chartHeight = 220;
  const chartPadding = 28;
  const chartPoints = chartData.map((item, index) => {
    const x = chartData.length <= 1
      ? chartPadding
      : chartPadding + (index / (chartData.length - 1)) * (chartWidth - chartPadding * 2);
    const y = chartHeight - chartPadding - (item.presentCount / maxPresent) * (chartHeight - chartPadding * 2);
    return { ...item, x, y };
  });
  const chartPolyline = chartPoints.map(point => `${point.x},${point.y}`).join(' ');
  const reportDatesList = attendanceReport?.dates || [];
  const reportStudents = attendanceReport?.students || [];

  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Attendance Analytics</p>
            <h2>Attendance Visuals</h2>
          </div>
        </header>

        <div className="panel-card attendance-visual-panel">
          <div className="panel-head">
            <div>
              <h3>Monthly Present Students</h3>
              <small>Total present students per day.</small>
            </div>
            <label className="attendance-filter">
              <FiCalendar />
              <input type="month" value={visualMonth} onChange={(e) => setVisualMonth(e.target.value)} />
            </label>
          </div>

          {visualsLoading ? (
            <p style={{ padding: '1rem', color: 'var(--muted)' }}>Loading attendance graph...</p>
          ) : chartData.length === 0 ? (
            <p style={{ padding: '1rem', color: 'var(--muted)' }}>No attendance records found for this month.</p>
          ) : (
            <div className="attendance-line-chart-wrap">
              <svg className="attendance-line-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Monthly attendance present count line graph">
                <line x1={chartPadding} y1={chartHeight - chartPadding} x2={chartWidth - chartPadding} y2={chartHeight - chartPadding} />
                <line x1={chartPadding} y1={chartPadding} x2={chartPadding} y2={chartHeight - chartPadding} />
                <polyline points={chartPolyline} />
                {chartPoints.map(point => (
                  <g key={point.date}>
                    <circle cx={point.x} cy={point.y} r="4" />
                    <title>{`${point.date}: ${point.presentCount} present`}</title>
                  </g>
                ))}
              </svg>
              <div className="attendance-chart-meta">
                <span><FiTrendingUp /> Total present marks: {attendanceVisuals?.totalPresentMarks ?? 0}</span>
                <span>Peak day: {maxPresent}</span>
              </div>
            </div>
          )}
        </div>

        <div className="panel-card attendance-report-panel">
          <div className="panel-head">
            <div>
              <h3>Date Range Attendance Report</h3>
              <small>Inclusive report grouped by room.</small>
            </div>
          </div>

          <form className="attendance-report-form" onSubmit={generateAttendanceReport}>
            <label>
              Start Date
              <input type="date" value={reportDates.startDate} onChange={(e) => setReportDates(prev => ({ ...prev, startDate: e.target.value }))} />
            </label>
            <label>
              End Date
              <input type="date" value={reportDates.endDate} onChange={(e) => setReportDates(prev => ({ ...prev, endDate: e.target.value }))} />
            </label>
            <button className="primary-btn" type="submit" disabled={reportLoading}>
              <FiFileText /> {reportLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </form>

          {reportError ? <p className="attendance-report-error">{reportError}</p> : null}

          {attendanceReport ? (
            <div className="attendance-report-results">
              <div className="attendance-report-summary">
                <strong>{attendanceReport.startDate} to {attendanceReport.endDate}</strong>
                <span>{attendanceReport.totalDays} days shown, totals count marked days only</span>
              </div>
              <div className="attendance-report-wide-table">
                <div
                  className="attendance-report-wide-row head"
                  style={{ gridTemplateColumns: `120px 92px 180px 240px 140px repeat(${reportDatesList.length}, 58px) 130px` }}
                >
                  <span>Student</span>
                  <span>Room No</span>
                  <span>Full Name</span>
                  <span>Email</span>
                  <span>Phone</span>
                  {reportDatesList.map(day => (
                    <span key={day.date} title={day.date}>{day.label}</span>
                  ))}
                  <span>Total Present</span>
                </div>
                {reportStudents.length === 0 ? (
                  <p className="empty-state">No students found for this report.</p>
                ) : (
                  reportStudents.map(student => (
                    <div
                      className="attendance-report-wide-row"
                      key={student.studentId}
                      style={{ gridTemplateColumns: `120px 92px 180px 240px 140px repeat(${reportDatesList.length}, 58px) 130px` }}
                    >
                      <span>{student.username || '-'}</span>
                      <span>{student.roomNumber || '-'}</span>
                      <span>{student.fullName || '-'}</span>
                      <span>{student.email || '-'}</span>
                      <span>{student.phone || '-'}</span>
                      {reportDatesList.map(day => {
                        const mark = student.days?.[day.date] || '-';
                        return (
                          <span className={`attendance-mark ${mark === 'P' ? 'present' : mark === 'A' ? 'absent' : ''}`} key={day.date}>
                            {mark}
                          </span>
                        );
                      })}
                      <span className="attendance-total-cell">{student.totalText || `${student.presentDays || 0}/${student.markedDays || 0}`}</span>
                    </div>
                  ))
                )}
                  </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default AttendanceVisuals;
