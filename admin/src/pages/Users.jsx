import Sidebar from '../components/Sidebar';

const users = [
  { username: 'ava.thompson', fullName: 'Ava Thompson', rollNumber: 'CSE-202301', department: 'CSE', hostelBlock: 'North Tower', roomNumber: 'A-204', status: 'Active' },
  { username: 'mason.lee', fullName: 'Mason Lee', rollNumber: 'EEE-202302', department: 'EEE', hostelBlock: 'West Wing', roomNumber: 'B-118', status: 'Pending' },
  { username: 'nora.smith', fullName: 'Nora Smith', rollNumber: 'MBA-202210', department: 'MBA', hostelBlock: 'South Court', roomNumber: 'C-212', status: 'Active' }
];

function Users({ onLogout }) {
  return (
    <div className="dashboard-shell admin-dashboard-shell">
      <Sidebar onLogout={onLogout} />
      <main className="dashboard-main admin-main">
        <header className="dashboard-topbar">
          <div>
            <p className="eyebrow">Resident Management</p>
            <h2>Users</h2>
          </div>
        </header>

        <div className="panel-card table-card">
          <div className="panel-head">
            <h3>Student Records</h3>
            <input className="table-search" placeholder="Search students" />
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Roll Number</th>
                  <th>Department</th>
                  <th>Block</th>
                  <th>Room</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((student, index) => (
                  <tr key={index}>
                    <td>{student.username}</td>
                    <td>{student.fullName}</td>
                    <td>{student.rollNumber}</td>
                    <td>{student.department}</td>
                    <td>{student.hostelBlock}</td>
                    <td>{student.roomNumber}</td>
                    <td><span className={`status-pill ${student.status.toLowerCase()}`}>{student.status}</span></td>
                    <td><button className="table-action">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Users;
