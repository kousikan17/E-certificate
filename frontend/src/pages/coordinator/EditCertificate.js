import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';

const EditCertificate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    recipientName: '',
    recipientEmail: '',
    eventName: '',
    eventDate: '',
    certificateType: 'participation',
    description: '',
  });
  const [currentFile, setCurrentFile] = useState('');
  const [newFile, setNewFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCertificate();
    // eslint-disable-next-line
  }, [id]);

  const fetchCertificate = async () => {
    try {
      const res = await api.get(`/certificates/${id}`);
      const cert = res.data.certificate;
      setFormData({
        recipientName: cert.recipientName || '',
        recipientEmail: cert.recipientEmail || '',
        eventName: cert.eventName || '',
        eventDate: cert.eventDate ? cert.eventDate.substring(0, 10) : '',
        certificateType: cert.certificateType || 'participation',
        description: cert.description || '',
      });
      setCurrentFile(cert.originalFileName || cert.certificateFile);
    } catch (err) {
      setError('Failed to load certificate. It may not exist or you may not have access.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.type !== 'application/pdf') {
        setError('Only PDF files are allowed.');
        return;
      }
      if (selected.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB.');
        return;
      }
      setNewFile(selected);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });
      if (newFile) {
        data.append('certificateFile', newFile);
      }

      await api.put(`/certificates/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Certificate updated successfully!');
      setTimeout(() => navigate('/coordinator'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update certificate');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="coordinator">
        <div className="loading"><div className="spinner"></div></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="coordinator">
      <div className="page-header">
        <h1>Edit Certificate</h1>
        <p>Update the certificate details below</p>
      </div>

      <div className="card">
        <div className="card-body">
          {error && <div className="alert alert-danger">⚠️ {error}</div>}
          {success && <div className="alert alert-success">✅ {success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Recipient Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Full name of the recipient"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Recipient Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Email (optional)"
                  name="recipientEmail"
                  value={formData.recipientEmail}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Event Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Name of the event"
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Event Date *</label>
                <input
                  type="date"
                  className="form-control"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Certificate Type *</label>
                <select
                  className="form-control"
                  name="certificateType"
                  value={formData.certificateType}
                  onChange={handleChange}
                >
                  <option value="participation">Participation</option>
                  <option value="achievement">Achievement</option>
                  <option value="completion">Completion</option>
                  <option value="appreciation">Appreciation</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Brief description (optional)"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Certificate PDF</label>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  Current file: <strong style={{ color: '#e2e8f0' }}>{currentFile}</strong>
                </span>
              </div>
              <div
                className="file-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="file-upload-icon">📄</div>
                {newFile ? (
                  <>
                    <p className="file-name">{newFile.name}</p>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      {(newFile.size / 1024 / 1024).toFixed(2)} MB • Click to change
                    </p>
                  </>
                ) : (
                  <>
                    <p>Click to upload a new certificate PDF (optional)</p>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Leave empty to keep the current file • PDF only, max 10MB
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={saving}
              >
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-lg"
                onClick={() => navigate('/coordinator')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditCertificate;
