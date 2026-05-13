import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

interface Doctor {
  id: string;
  user_id: string;
  specialty: string;
  department: string;
  qualification: string;
  experience_years: number;
  consultation_fee: number;
}

const BookAppointment: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    doctor_id: '',
    appointment_date: '',
    appointment_time: '',
    reason: '',
    department: 'general',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patientId, setPatientId] = useState('');

  useEffect(() => {
    fetchDoctors();
    fetchPatientProfile();
  }, []);

  useEffect(() => {
    if (formData.doctor_id && formData.appointment_date) {
      fetchAvailableSlots();
    }
  }, [formData.doctor_id, formData.appointment_date]);

  const fetchPatientProfile = async () => {
    try {
      const response = await apiClient.get('/patients/me');
      setPatientId(response.data.id);
    } catch (error) {
      console.error('Failed to fetch patient profile:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await apiClient.get('/doctors');
      setDoctors(response.data);
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const response = await apiClient.get(
        `/doctors/${formData.doctor_id}/schedules/${formData.appointment_date}/slots`
      );
      setAvailableSlots(response.data.available_slots || []);
    } catch (error) {
      console.error('Failed to fetch available slots:', error);
      setAvailableSlots([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.post('/appointments', {
        ...formData,
        patient_id: patientId,
        status: 'scheduled',
      });
      alert('Appointment booked successfully!');
      navigate('/appointments');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="book-appointment-page">
      <div className="page-header">
        <h1>Book Appointment</h1>
        <button onClick={() => navigate('/appointments')} className="btn btn-secondary">
          Back to Appointments
        </button>
      </div>

      <form onSubmit={handleSubmit} className="appointment-form">
        <div className="form-group">
          <label>Department</label>
          <select
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            required
          >
            <option value="general">General</option>
            <option value="cardiology">Cardiology</option>
            <option value="neurology">Neurology</option>
            <option value="pediatrics">Pediatrics</option>
            <option value="orthopedics">Orthopedics</option>
            <option value="diagnostic">Diagnostic</option>
          </select>
        </div>

        <div className="form-group">
          <label>Select Doctor</label>
          <select
            value={formData.doctor_id}
            onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
            required
          >
            <option value="">Choose a doctor</option>
            {doctors
              .filter((doc) => doc.department === formData.department)
              .map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.specialty} - {doctor.qualification} ({doctor.experience_years} years exp)
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label>Appointment Date</label>
          <input
            type="date"
            value={formData.appointment_date}
            onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
            min={minDate}
            required
          />
        </div>

        {availableSlots.length > 0 && (
          <div className="form-group">
            <label>Available Time Slots</label>
            <div className="slots-grid">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={
                    formData.appointment_time === slot ? 'slot-btn active' : 'slot-btn'
                  }
                  onClick={() => setFormData({ ...formData, appointment_time: slot })}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Reason for Visit</label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            rows={4}
            required
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !formData.appointment_time}
        >
          {loading ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>
    </div>
  );
};

export default BookAppointment;
