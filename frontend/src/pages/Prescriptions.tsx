import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';

interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  visit_id: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  instructions?: string;
  created_at: string;
}

const Prescriptions: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const response = await apiClient.get('/prescriptions/');
      setPrescriptions(response.data);
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading prescriptions...</div>;
  }

  return (
    <div className="prescriptions-page">
      <div className="page-header">
        <h1>My Prescriptions</h1>
      </div>

      {prescriptions.length === 0 ? (
        <div className="empty-state">
          <p>No prescriptions found</p>
        </div>
      ) : (
        <div className="prescriptions-list">
          {prescriptions.map((prescription) => (
            <div key={prescription.id} className="prescription-card">
              <div className="prescription-header">
                <h3>Prescription</h3>
                <span className="prescription-date">
                  {new Date(prescription.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="prescription-body">
                <h4>Medications:</h4>
                <div className="medications-list">
                  {prescription.medications.map((med, index) => (
                    <div key={index} className="medication-item">
                      <div className="med-name">{med.name}</div>
                      <div className="med-details">
                        <span>Dosage: {med.dosage}</span>
                        <span>Frequency: {med.frequency}</span>
                        <span>Duration: {med.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {prescription.instructions && (
                  <div className="prescription-instructions">
                    <h4>Instructions:</h4>
                    <p>{prescription.instructions}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Prescriptions;
