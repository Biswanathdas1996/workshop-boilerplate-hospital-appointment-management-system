import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    appointments: 0,
    prescriptions: 0,
    visits: 0,
    queuePosition: null as number | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.role === 'patient') {
          const [appointmentsRes, prescriptionsRes, visitsRes] = await Promise.all([
            apiClient.get('/appointments/'),
            apiClient.get('/prescriptions/'),
            apiClient.get('/visits/'),
          ]);
          setStats({
            appointments: appointmentsRes.data.length,
            prescriptions: prescriptionsRes.data.length,
            visits: visitsRes.data.length,
            queuePosition: null,
          });
        } else if (user?.role === 'doctor') {
          const today = new Date().toISOString().split('T')[0];
          const [appointmentsRes] = await Promise.all([
            apiClient.get(`/appointments/?date=${today}`),
          ]);
          setStats({
            appointments: appointmentsRes.data.length,
            prescriptions: 0,
            visits: 0,
            queuePosition: null,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.full_name}!</h1>
        <p className="role-badge">{user?.role.toUpperCase()}</p>
      </div>

      <div className="stats-grid">
        {user?.role === 'patient' && (
          <>
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <h3>Appointments</h3>
                <p className="stat-value">{stats.appointments}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💊</div>
              <div className="stat-content">
                <h3>Prescriptions</h3>
                <p className="stat-value">{stats.prescriptions}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏥</div>
              <div className="stat-content">
                <h3>Visits</h3>
                <p className="stat-value">{stats.visits}</p>
              </div>
            </div>
          </>
        )}

        {user?.role === 'doctor' && (
          <>
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <h3>Today's Appointments</h3>
                <p className="stat-value">{stats.appointments}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏰</div>
              <div className="stat-content">
                <h3>Queue Status</h3>
                <p className="stat-value">Active</p>
              </div>
            </div>
          </>
        )}

        {(user?.role === 'admin' || user?.role === 'staff') && (
          <>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>Total Patients</h3>
                <p className="stat-value">-</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👨‍⚕️</div>
              <div className="stat-content">
                <h3>Active Doctors</h3>
                <p className="stat-value">-</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          {user?.role === 'patient' && (
            <>
              <a href="/appointments/book" className="action-card">
                <span className="action-icon">📅</span>
                <span>Book Appointment</span>
              </a>
              <a href="/appointments" className="action-card">
                <span className="action-icon">📋</span>
                <span>My Appointments</span>
              </a>
              <a href="/prescriptions" className="action-card">
                <span className="action-icon">💊</span>
                <span>Prescriptions</span>
              </a>
              <a href="/profile" className="action-card">
                <span className="action-icon">👤</span>
                <span>My Profile</span>
              </a>
            </>
          )}

          {user?.role === 'doctor' && (
            <>
              <a href="/appointments" className="action-card">
                <span className="action-icon">📅</span>
                <span>View Appointments</span>
              </a>
              <a href="/schedule" className="action-card">
                <span className="action-icon">🗓️</span>
                <span>Manage Schedule</span>
              </a>
              <a href="/queue" className="action-card">
                <span className="action-icon">⏰</span>
                <span>Queue Management</span>
              </a>
              <a href="/patients" className="action-card">
                <span className="action-icon">👥</span>
                <span>Patient Records</span>
              </a>
            </>
          )}

          {(user?.role === 'admin' || user?.role === 'staff') && (
            <>
              <a href="/appointments" className="action-card">
                <span className="action-icon">📅</span>
                <span>Manage Appointments</span>
              </a>
              <a href="/patients" className="action-card">
                <span className="action-icon">👥</span>
                <span>Patient Management</span>
              </a>
              <a href="/doctors" className="action-card">
                <span className="action-icon">👨‍⚕️</span>
                <span>Doctor Management</span>
              </a>
              <a href="/queue" className="action-card">
                <span className="action-icon">⏰</span>
                <span>Queue Management</span>
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
