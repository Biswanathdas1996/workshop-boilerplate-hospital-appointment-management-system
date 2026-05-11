import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import {
  patientsAPI,
  doctorsAPI,
  appointmentsAPI,
  queueAPI,
  prescriptionsAPI,
  visitsAPI,
  authAPI,
  searchAPI,
} from './api';

// Auth Context
const AuthContext = ({ children }: any) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  return children;
};

// Login Component
function Login({ onLogin }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authAPI.login({ username, password });
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data));
      onLogin(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Hospital Management System</h1>
        <p className="subtitle">Please login to continue</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary">Login</button>
        </form>
      </div>
    </div>
  );
}

// Dashboard Component
function Dashboard() {
  const [stats, setStats] = useState({ patients: 0, appointments: 0, queue: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [patients, appointments, queue] = await Promise.all([
          patientsAPI.list({ limit: 1 }),
          appointmentsAPI.list(),
          queueAPI.list(),
        ]);
        setStats({
          patients: patients.data.count || 0,
          appointments: appointments.data.appointments?.length || 0,
          queue: queue.data.queue?.length || 0,
        });
      } catch (err) {
        console.error('Failed to load stats', err);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Patients</h3>
          <p className="stat-value">{stats.patients}</p>
        </div>
        <div className="stat-card">
          <h3>Today's Appointments</h3>
          <p className="stat-value">{stats.appointments}</p>
        </div>
        <div className="stat-card">
          <h3>Current Queue</h3>
          <p className="stat-value">{stats.queue}</p>
        </div>
      </div>
    </div>
  );
}

// Patient Registration Component
function PatientRegistration() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
  });
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        date_of_birth: new Date(formData.date_of_birth).toISOString(),
      };
      await patientsAPI.create(data);
      setMessage('Patient registered successfully');
      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        phone: '',
        email: '',
        address: '',
      });
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div className="form-page">
      <h2>Patient Registration</h2>
      <form onSubmit={handleSubmit} className="patient-form">
        <div className="form-row">
          <input
            type="text"
            placeholder="First Name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <input
            type="date"
            placeholder="Date of Birth"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            required
          />
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            required
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <input
          type="tel"
          placeholder="Phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <textarea
          placeholder="Address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          required
        />
        {message && <p className="message">{message}</p>}
        <button type="submit" className="btn-primary">Register Patient</button>
      </form>
    </div>
  );
}

// Patient List Component
function PatientList() {
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPatients();
  }, [search]);

  const loadPatients = async () => {
    try {
      const response = await patientsAPI.list({ search });
      setPatients(response.data.patients || []);
    } catch (err) {
      console.error('Failed to load patients', err);
    }
  };

  return (
    <div className="list-page">
      <h2>Patient List</h2>
      <input
        type="search"
        placeholder="Search patients..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />
      <div className="patient-grid">
        {patients.map((patient) => (
          <div key={patient._id} className="patient-card">
            <h3>{patient.first_name} {patient.last_name}</h3>
            <p>Phone: {patient.phone}</p>
            <p>DOB: {new Date(patient.date_of_birth).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Doctor Management Component
function DoctorManagement() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    specialty: '',
    phone: '',
    email: '',
    license_number: '',
  });

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      const response = await doctorsAPI.list();
      setDoctors(response.data.doctors || []);
    } catch (err) {
      console.error('Failed to load doctors', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await doctorsAPI.create(formData);
      setShowForm(false);
      loadDoctors();
      setFormData({
        first_name: '',
        last_name: '',
        specialty: '',
        phone: '',
        email: '',
        license_number: '',
      });
    } catch (err) {
      console.error('Failed to create doctor', err);
    }
  };

  return (
    <div className="list-page">
      <div className="page-header">
        <h2>Doctor Management</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Doctor'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="doctor-form">
          <input
            type="text"
            placeholder="First Name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Specialty"
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="License Number"
            value={formData.license_number}
            onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
            required
          />
          <button type="submit" className="btn-primary">Add Doctor</button>
        </form>
      )}

      <div className="doctor-grid">
        {doctors.map((doctor) => (
          <div key={doctor._id} className="doctor-card">
            <h3>Dr. {doctor.first_name} {doctor.last_name}</h3>
            <p className="specialty">{doctor.specialty}</p>
            <p>Phone: {doctor.phone}</p>
            <p>Email: {doctor.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Appointment Booking Component
function AppointmentBooking() {
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    appointment_date: '',
    notes: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        patientsAPI.list(),
        doctorsAPI.list(),
      ]);
      setPatients(patientsRes.data.patients || []);
      setDoctors(doctorsRes.data.doctors || []);
    } catch (err) {
      console.error('Failed to load data', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        appointment_date: new Date(formData.appointment_date).toISOString(),
      };
      await appointmentsAPI.create(data);
      setMessage('Appointment booked successfully');
      setFormData({ patient_id: '', doctor_id: '', appointment_date: '', notes: '' });
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Booking failed');
    }
  };

  return (
    <div className="form-page">
      <h2>Book Appointment</h2>
      <form onSubmit={handleSubmit} className="appointment-form">
        <select
          value={formData.patient_id}
          onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
          required
        >
          <option value="">Select Patient</option>
          {patients.map((p) => (
            <option key={p._id} value={p._id}>
              {p.first_name} {p.last_name}
            </option>
          ))}
        </select>

        <select
          value={formData.doctor_id}
          onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
          required
        >
          <option value="">Select Doctor</option>
          {doctors.map((d) => (
            <option key={d._id} value={d._id}>
              Dr. {d.first_name} {d.last_name} - {d.specialty}
            </option>
          ))}
        </select>

        <input
          type="datetime-local"
          value={formData.appointment_date}
          onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
          required
        />

        <textarea
          placeholder="Notes (optional)"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />

        {message && <p className="message">{message}</p>}
        <button type="submit" className="btn-primary">Book Appointment</button>
      </form>
    </div>
  );
}

// Appointment List Component
function AppointmentList() {
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const response = await appointmentsAPI.list();
      setAppointments(response.data.appointments || []);
    } catch (err) {
      console.error('Failed to load appointments', err);
    }
  };

  const cancelAppointment = async (id: string) => {
    try {
      await appointmentsAPI.update(id, { status: 'cancelled' });
      loadAppointments();
    } catch (err) {
      console.error('Failed to cancel appointment', err);
    }
  };

  return (
    <div className="list-page">
      <h2>Appointments</h2>
      <div className="appointment-list">
        {appointments.map((apt) => (
          <div key={apt._id} className="appointment-card">
            <h3>Appointment #{apt._id.slice(-6)}</h3>
            <p>Date: {new Date(apt.appointment_date).toLocaleString()}</p>
            <p>Status: <span className={`status-${apt.status}`}>{apt.status}</span></p>
            {apt.status !== 'cancelled' && (
              <button
                className="btn-secondary"
                onClick={() => cancelAppointment(apt._id)}
              >
                Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Queue Management Component
function QueueManagement() {
  const [queue, setQueue] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    priority: 'normal',
  });

  useEffect(() => {
    loadQueue();
    loadData();
  }, []);

  const loadQueue = async () => {
    try {
      const response = await queueAPI.list();
      setQueue(response.data.queue || []);
    } catch (err) {
      console.error('Failed to load queue', err);
    }
  };

  const loadData = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        patientsAPI.list(),
        doctorsAPI.list(),
      ]);
      setPatients(patientsRes.data.patients || []);
      setDoctors(doctorsRes.data.doctors || []);
    } catch (err) {
      console.error('Failed to load data', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await queueAPI.add(formData);
      setShowForm(false);
      loadQueue();
      setFormData({ patient_id: '', doctor_id: '', priority: 'normal' });
    } catch (err) {
      console.error('Failed to add to queue', err);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await queueAPI.update(id, { status });
      loadQueue();
    } catch (err) {
      console.error('Failed to update queue', err);
    }
  };

  return (
    <div className="list-page">
      <div className="page-header">
        <h2>Queue Management</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add to Queue'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="queue-form">
          <select
            value={formData.patient_id}
            onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
            required
          >
            <option value="">Select Patient</option>
            {patients.map((p) => (
              <option key={p._id} value={p._id}>
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>

          <select
            value={formData.doctor_id}
            onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
          >
            <option value="">Select Doctor (Optional)</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>
                Dr. {d.first_name} {d.last_name}
              </option>
            ))}
          </select>

          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
          >
            <option value="normal">Normal</option>
            <option value="senior_citizen">Senior Citizen</option>
            <option value="emergency">Emergency</option>
          </select>

          <button type="submit" className="btn-primary">Add to Queue</button>
        </form>
      )}

      <div className="queue-list">
        {queue.map((item) => (
          <div key={item._id} className={`queue-card priority-${item.priority}`}>
            <div className="token-badge">Token #{item.token_number}</div>
            <p>Priority: {item.priority}</p>
            <p>Status: {item.status}</p>
            <div className="queue-actions">
              {item.status === 'waiting' && (
                <button
                  className="btn-primary"
                  onClick={() => updateStatus(item._id, 'in_consultation')}
                >
                  Start Consultation
                </button>
              )}
              {item.status === 'in_consultation' && (
                <button
                  className="btn-secondary"
                  onClick={() => updateStatus(item._id, 'completed')}
                >
                  Complete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <div className="nav-header">
            <h1>HMS</h1>
            <p className="user-info">{user.username} ({user.role})</p>
          </div>
          <ul className="nav-menu">
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/patients/register">Register Patient</Link></li>
            <li><Link to="/patients">Patient List</Link></li>
            <li><Link to="/doctors">Doctors</Link></li>
            <li><Link to="/appointments/book">Book Appointment</Link></li>
            <li><Link to="/appointments">Appointments</Link></li>
            <li><Link to="/queue">Queue</Link></li>
          </ul>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients/register" element={<PatientRegistration />} />
            <Route path="/patients" element={<PatientList />} />
            <Route path="/doctors" element={<DoctorManagement />} />
            <Route path="/appointments/book" element={<AppointmentBooking />} />
            <Route path="/appointments" element={<AppointmentList />} />
            <Route path="/queue" element={<QueueManagement />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
