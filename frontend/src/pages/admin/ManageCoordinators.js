import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';

const ManageCoordinators = () => {
  const [coordinators, setCoordinators] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', eventName: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  useEffect(() => {
    fetchCoordinators();
    // eslint-disable-next-line
  }, [pagination.page]);

  const fetchCoordinators = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/coordinators', {
        params: { search, page: pagination.page, limit: 10 },
      });
      setCoordinators(res.data.coordinators);
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
    fetchCoordinators();
  };

  const toggleStatus = async (id) => {
    try {
      await api.patch(`/admin/coordinators/${id}/toggle-status`);
      fetchCoordinators();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const deleteCoordinator = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete coordinator "${name}"?`)) return;
    try {
      await api.delete(`/admin/coordinators/${id}`);
      fetchCoordinators();
    } catch (err) {
      alert('Error deleting coordinator');
    }
  };

  const openAddModal = () => {
    setAddForm({ name: '', email: '', password: '', eventName: '' });
    setAddError('');
    setAddSuccess('');
    setShowAddModal(true);
  };

  const handleAddChange = (e) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  const handleAddCoordinator = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    setAddLoading(true);
    try {
      const res = await api.post('/admin/coordinators', addForm);
      setAddSuccess(res.data.message);
      fetchCoordinators();
      setTimeout(() => {
        setShowAddModal(false);
      }, 1500);
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to create coordinator.');
    } finally {
      setAddLoading(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <DashboardLayout role="admin">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Manage Coordinators</h1>
          <p>View and manage event coordinator accounts</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          ➕ Add Coordinator
        </button>
      </div>

      {/* Add Coordinator Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Coordinator</h2>

            {addError && <div className="alert alert-danger">⚠️ {addError}</div>}
            {addSuccess && <div className="alert alert-success">✅ {addSuccess}</div>}

            <form onSubmit={handleAddCoordinator}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter coordinator's full name"
                  name="name"
                  value={addForm.name}
                  onChange={handleAddChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter email address"
                  name="email"
                  value={addForm.email}
                  onChange={handleAddChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Min 6 characters"
                  name="password"
                  value={addForm.password}
                  onChange={handleAddChange}
                  minLength={6}
                  required
                />
              </div>

              <div className="form-group">
                <label>Event Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter event name"
                  name="eventName"
                  value={addForm.eventName}
                  onChange={handleAddChange}
                  required
/>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                  {addLoading ? 'Creating...' : 'Create Coordinator'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Event Coordinators ({pagination.total})</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSearch} className="search-bar">
            <input
              type="text"
              placeholder="Search by name, email, or organization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>

          {loading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : coordinators.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No coordinators found</h3>
              <p>Add coordinators to get started.</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Organization</th>
                      <th>Certificates</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coordinators.map((coord) => (
                      <tr key={coord.id}>
                        <td><strong>{coord.name}</strong></td>
                        <td>{coord.email}</td>
                        <td>{coord.organization || '-'}</td>
                        <td>{coord.certificateCount}</td>
                        <td>{formatDate(coord.createdAt)}</td>
                        <td>
                          <span className={`badge ${coord.isActive ? 'badge-success' : 'badge-danger'}`}>
                            {coord.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button
                              className={`btn btn-sm ${coord.isActive ? 'btn-warning' : 'btn-success'}`}
                              onClick={() => toggleStatus(coord.id)}
                            >
                              {coord.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => deleteCoordinator(coord.id, coord.name)}
                            >
                              Delete
                            </button>
                          </div>
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

export default ManageCoordinators;
