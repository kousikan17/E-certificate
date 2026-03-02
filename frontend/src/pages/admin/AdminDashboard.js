import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentCerts, setRecentCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setStats(res.data.stats);
      setRecentCerts(res.data.recentCertificates);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="loading"><div className="spinner"></div></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Overview of your certificate verification system</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📜</div>
          <div className="stat-info">
            <h3>{stats?.totalCertificates || 0}</h3>
            <p>Total Certificates</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-info">
            <h3>{stats?.activeCertificates || 0}</h3>
            <p>Active Certificates</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">👥</div>
          <div className="stat-info">
            <h3>{stats?.totalCoordinators || 0}</h3>
            <p>Event Coordinators</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">🔍</div>
          <div className="stat-info">
            <h3>{stats?.totalVerifications || 0}</h3>
            <p>Total Verifications</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">🚫</div>
          <div className="stat-info">
            <h3>{stats?.revokedCertificates || 0}</h3>
            <p>Revoked Certificates</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Recent Certificates</h2>
        </div>
        <div className="card-body">
          {recentCerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No certificates yet</h3>
              <p>Certificates will appear here once coordinators start creating them.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Event</th>
                    <th>Issued By</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCerts.map((cert) => (
                    <tr key={cert.id}>
                      <td><strong>{cert.recipientName}</strong></td>
                      <td>{cert.eventName}</td>
                      <td>{cert.issuer?.name || 'N/A'}</td>
                      <td>{formatDate(cert.createdAt)}</td>
                      <td>
                        <span className={`badge ${cert.isValid ? 'badge-success' : 'badge-danger'}`}>
                          {cert.isValid ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
