import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string;
  status: string;
  department: string;
}

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    try {
      const response = await apiClient.get('/appointments');
      let data = response.data;

      if (filter !== 'all') {
        data = data.filter((apt: Appointment) => apt.status === filter);
      }

      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await apiClient.delete(`/appointments/${appointmentId}`);
      fetchAppointments();
    } catch (error) {
      alert('Failed to cancel appointment');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: '#2DB5DA',
      completed: '#4CAF50',
      cancelled: '#f44336',
      rescheduled: '#FF9800',
      no_show: '#9E9E9E',
    };
    return colors[status] || '#939598';
  };

  if (loading) {
    return <div className="loading">Loading appointments...</div>;
  }

  return (
    <div className="appointments-page">
      <div className="page-header">
        <h1>Appointments</h1>
        {user?.role === 'patient' && (
          <a href="/appointments/book" className="btn btn-primary">
            Book New Appointment
          </a>
        )}
      </div>

      <div className="filters">
        <button
          className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter === 'scheduled' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('scheduled')}
        >
          Scheduled
        </button>
        <button
          className={filter === 'completed' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
        <button
          className={filter === 'cancelled' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('cancelled')}
        >
          Cancelled
        </button>
      </div>

      {appointments.length === 0 ? (
        <div className="empty-state">
          <p>No appointments found</p>
        </div>
      ) : (
        <div className="appointments-list">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="appointment-card">
              <div className="appointment-header">
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(appointment.status) }}
                >
                  {appointment.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="department-badge">{appointment.department}</span>
              </div>

              <div className="appointment-body">
                <div className="appointment-info">
                  <div className="info-item">
                    <span className="label">Date:</span>
                    <span className="value">{appointment.appointment_date}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Time:</span>
                    <span className="value">{appointment.appointment_time}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Reason:</span>
                    <span className="value">{appointment.reason}</span>
                  </div>
                </div>
              </div>

              {appointment.status === 'scheduled' && user?.role === 'patient' && (
                <div className="appointment-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => (window.location.href = `/appointments/${appointment.id}/reschedule`)}
                  >
                    Reschedule
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleCancel(appointment.id)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Appointments;
