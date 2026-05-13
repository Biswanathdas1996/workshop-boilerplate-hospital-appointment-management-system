import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_provider: '',
    insurance_number: '',
    blood_group: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/patients/me');
      setProfile(response.data);
      setFormData({
        address: response.data.address || '',
        emergency_contact_name: response.data.emergency_contact_name || '',
        emergency_contact_phone: response.data.emergency_contact_phone || '',
        insurance_provider: response.data.insurance_provider || '',
        insurance_number: response.data.insurance_number || '',
        blood_group: response.data.blood_group || '',
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/patients/${profile.id}`, formData);
      alert('Profile updated successfully!');
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      alert('Failed to update profile');
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>My Profile</h1>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="btn btn-primary">
            Edit Profile
          </button>
        )}
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h2>Personal Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Full Name:</span>
              <span className="value">{user?.full_name}</span>
            </div>
            <div className="info-item">
              <span className="label">Email:</span>
              <span className="value">{user?.email}</span>
            </div>
            <div className="info-item">
              <span className="label">Phone:</span>
              <span className="value">{user?.phone || 'N/A'}</span>
            </div>
            {profile && (
              <>
                <div className="info-item">
                  <span className="label">Date of Birth:</span>
                  <span className="value">{profile.date_of_birth}</span>
                </div>
                <div className="info-item">
                  <span className="label">Gender:</span>
                  <span className="value">{profile.gender}</span>
                </div>
                <div className="info-item">
                  <span className="label">Blood Group:</span>
                  <span className="value">{profile.blood_group || 'N/A'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdate} className="profile-form">
            <h2>Update Information</h2>

            <div className="form-group">
              <label>Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Blood Group</label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
              >
                <option value="">Select</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div className="form-group">
              <label>Emergency Contact Name</label>
              <input
                type="text"
                value={formData.emergency_contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, emergency_contact_name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Emergency Contact Phone</label>
              <input
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) =>
                  setFormData({ ...formData, emergency_contact_phone: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Insurance Provider</label>
              <input
                type="text"
                value={formData.insurance_provider}
                onChange={(e) =>
                  setFormData({ ...formData, insurance_provider: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Insurance Number</label>
              <input
                type="text"
                value={formData.insurance_number}
                onChange={(e) =>
                  setFormData({ ...formData, insurance_number: e.target.value })
                }
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-section">
            <h2>Additional Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Address:</span>
                <span className="value">{profile?.address || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="label">Emergency Contact:</span>
                <span className="value">
                  {profile?.emergency_contact_name || 'N/A'}
                  {profile?.emergency_contact_phone &&
                    ` (${profile.emergency_contact_phone})`}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Insurance:</span>
                <span className="value">
                  {profile?.insurance_provider || 'N/A'}
                  {profile?.insurance_number && ` - ${profile.insurance_number}`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
