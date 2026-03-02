import React, { useState } from 'react';
import Sidebar from './Sidebar';

const DashboardLayout = ({ role, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-layout">
      <button className="mobile-menu-toggle" onClick={toggleSidebar}>
        {sidebarOpen ? '✕' : '☰'}
      </button>
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar}></div>
      <Sidebar role={role} isOpen={sidebarOpen} onClose={closeSidebar} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
