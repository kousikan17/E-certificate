import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ role, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const adminLinks = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/coordinators', label: 'Coordinators', icon: '👥' },
    { path: '/admin/certificates', label: 'All Certificates', icon: '📜' },
  ];

  const coordinatorLinks = [
    { path: '/coordinator', label: 'My Certificates', icon: '📜' },
    { path: '/coordinator/create', label: 'Create Certificate', icon: '➕' },
  ];

  const links = role === 'admin' ? adminLinks : coordinatorLinks;

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">TV</span>
          TwinVerify
        </div>
        <div className="sidebar-role">
          {role === 'admin' ? 'Admin Portal' : 'Event Coordinator'}
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.path === '/admin' || link.path === '/coordinator'}
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={handleNavClick}
          >
            <span className="nav-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}

        <a href="/verify" target="_blank" rel="noreferrer" onClick={handleNavClick}>
          <span className="nav-icon">🔍</span>
          Verify Certificate
        </a>

        <button onClick={handleLogout}>
          <span className="nav-icon">🚪</span>
          Logout
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
