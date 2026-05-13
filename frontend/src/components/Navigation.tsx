import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">
          <h2>Hospital MS</h2>
        </Link>
      </div>

      <div className="navbar-links">
        <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
          Dashboard
        </Link>

        {user?.role === 'patient' && (
          <>
            <Link to="/appointments" className={isActive('/appointments') ? 'active' : ''}>
              Appointments
            </Link>
            <Link to="/prescriptions" className={isActive('/prescriptions') ? 'active' : ''}>
              Prescriptions
            </Link>
            <Link to="/profile" className={isActive('/profile') ? 'active' : ''}>
              Profile
            </Link>
          </>
        )}

        {user?.role === 'doctor' && (
          <>
            <Link to="/appointments" className={isActive('/appointments') ? 'active' : ''}>
              Appointments
            </Link>
            <Link to="/queue" className={isActive('/queue') ? 'active' : ''}>
              Queue
            </Link>
          </>
        )}

        {(user?.role === 'admin' || user?.role === 'staff') && (
          <>
            <Link to="/appointments" className={isActive('/appointments') ? 'active' : ''}>
              Appointments
            </Link>
            <Link to="/queue" className={isActive('/queue') ? 'active' : ''}>
              Queue
            </Link>
          </>
        )}
      </div>

      <div className="navbar-user">
        <span className="user-name">{user?.full_name}</span>
        <button onClick={logout} className="btn btn-logout">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
