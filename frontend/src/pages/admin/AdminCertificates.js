import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';

const AdminCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
    // eslint-disable-next-line
  }, [pagination.page, filterType]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/certificates', {
        params: { search, type: filterType, page: pagination.page, limit: 10 },
      });
      setCertificates(res.data.certificates);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    fetchCertificates();
  };

  const toggleValidity = async (id) => {
    try {
      await api.patch(`/admin/certificates/${id}/toggle-validity`);
      fetchCertificates();
    } catch (err) {
      alert('Error updating certificate');
    }
  };

  const clearAllCertificates = async () => {
    if (window.confirm('Are you sure you want to delete ALL certificates? This action cannot be undone.')) {
      try {
        const res = await api.delete('/admin/certificates/all');
        alert(res.data.message);
        fetchCertificates();
      } catch (err) {
        alert('Error clearing certificates');
      }
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const typeColors = {
    participation: 'badge-info',
    achievement: 'badge-success',
    completion: 'badge-purple',
    appreciation: 'badge-warning',
    other: 'badge-info',
  };

  return (
    <DashboardLayout role="admin">
      <div className="page-header">
        <h1>All Certificates</h1>
        <p>View and manage all certificates across coordinators</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Certificates ({pagination.total})</h2>
          <button className="btn btn-danger" onClick={clearAllCertificates}>Clear All</button>
        </div>
        <div className="card-body">
          <form onSubmit={handleSearch} className="search-bar">
            <input
              type="text"
              placeholder="Search by recipient, event, or hash code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-control"
              style={{ width: 180 }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="participation">Participation</option>
              <option value="achievement">Achievement</option>
              <option value="completion">Completion</option>
              <option value="appreciation">Appreciation</option>
              <option value="other">Other</option>
            </select>
            <button type="submit" className="btn btn-primary">Search</button>
          </form>

          {loading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : certificates.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📜</div>
              <h3>No certificates found</h3>
              <p>Certificates will appear here once coordinators start creating them.</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Event</th>
                      <th>Type</th>
                      <th>Issued By</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((cert) => (
                      <tr key={cert.id}>
                        <td><strong>{cert.recipientName}</strong></td>
                        <td>{cert.eventName}</td>
                        <td>
                          <span className={`badge ${typeColors[cert.certificateType] || 'badge-info'}`}>
                            {cert.certificateType}
                          </span>
                        </td>
                        <td>{cert.issuer?.name || 'N/A'}</td>
                        <td>{formatDate(cert.createdAt)}</td>
                        <td>
                          <span className={`badge ${cert.isValid ? 'badge-success' : 'badge-danger'}`}>
                            {cert.isValid ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${cert.isValid ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => toggleValidity(cert.id)}
                          >
                            {cert.isValid ? 'Revoke' : 'Restore'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  >
                    Previous
                  </button>
                  {Array.from({ length: pagination.pages }, (_, i) => (
                    <button
                      key={i + 1}
                      className={pagination.page === i + 1 ? 'active' : ''}
                      onClick={() => setPagination((p) => ({ ...p, page: i + 1 }))}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    disabled={pagination.page === pagination.pages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminCertificates;
