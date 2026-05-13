import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

interface QueueEntry {
  id: string;
  patient_id: string;
  doctor_id: string;
  token_number: string;
  priority: 'normal' | 'senior' | 'emergency';
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  department: string;
  estimated_wait_time?: number;
}

const QueueManagement: React.FC = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'doctor') {
      fetchDoctorProfile();
    } else {
      fetchDoctors();
    }
  }, [user]);

  useEffect(() => {
    if (selectedDoctor) {
      fetchQueue();
    }
  }, [selectedDoctor]);

  const fetchDoctorProfile = async () => {
    try {
      const response = await apiClient.get('/doctors/me');
      setSelectedDoctor(response.data.id);
    } catch (error) {
      console.error('Failed to fetch doctor profile:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await apiClient.get('/doctors');
      setDoctors(response.data);
      if (response.data.length > 0) {
        setSelectedDoctor(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    }
  };

  const fetchQueue = async () => {
    try {
      const response = await apiClient.get(`/queue?doctor_id=${selectedDoctor}&status=waiting`);
      setQueue(response.data);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = async (queueId: string) => {
    try {
      await apiClient.put(`/queue/${queueId}/call-next`);
      fetchQueue();
    } catch (error) {
      alert('Failed to call next patient');
    }
  };

  const handleComplete = async (queueId: string) => {
    try {
      await apiClient.put(`/queue/${queueId}/complete`);
      fetchQueue();
    } catch (error) {
      alert('Failed to complete queue entry');
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      emergency: '#f44336',
      senior: '#FF9800',
      normal: '#2DB5DA',
    };
    return colors[priority] || '#939598';
  };

  if (loading) {
    return <div className="loading">Loading queue...</div>;
  }

  return (
    <div className="queue-page">
      <div className="page-header">
        <h1>Queue Management</h1>
      </div>

      {user?.role !== 'doctor' && doctors.length > 0 && (
        <div className="doctor-selector">
          <label>Select Doctor:</label>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.specialty} - {doctor.department}
              </option>
            ))}
          </select>
        </div>
      )}

      {queue.length === 0 ? (
        <div className="empty-state">
          <p>No patients in queue</p>
        </div>
      ) : (
        <div className="queue-list">
          {queue.map((entry, index) => (
            <div key={entry.id} className="queue-card">
              <div className="queue-header">
                <span className="token-number">Token: {entry.token_number}</span>
                <span
                  className="priority-badge"
                  style={{ backgroundColor: getPriorityColor(entry.priority) }}
                >
                  {entry.priority.toUpperCase()}
                </span>
              </div>

              <div className="queue-body">
                <div className="queue-position">
                  Position: <strong>#{index + 1}</strong>
                </div>
                <div className="queue-department">
                  Department: <strong>{entry.department}</strong>
                </div>
                {entry.estimated_wait_time && (
                  <div className="queue-wait-time">
                    Est. Wait: <strong>{entry.estimated_wait_time} min</strong>
                  </div>
                )}
              </div>

              {(user?.role === 'doctor' || user?.role === 'staff' || user?.role === 'admin') && (
                <div className="queue-actions">
                  {entry.status === 'waiting' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleCallNext(entry.id)}
                    >
                      Call Patient
                    </button>
                  )}
                  {entry.status === 'in_progress' && (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleComplete(entry.id)}
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QueueManagement;
