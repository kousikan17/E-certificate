import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';

const CoordinatorDashboard = () => {
  const [certificates, setCertificates] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());

  // View certificate modal
  const [viewCert, setViewCert] = useState(null); // { url, name }

  // Email modal state
  const [emailModal, setEmailModal] = useState(null); // null or { cert, mode: 'single' } or { mode: 'bulk', eventName }
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState(null);

  // Event-based email templates
  const getEmailTemplate = (eventName, recipientName) => {
    const signOff = `\n\nWe truly appreciate your enthusiasm and contribution. We hope this experience has been both enriching and inspiring.\n\nYour certificate is embedded in this email. You can also download the PDF using the button provided below.\n\nWishing you continued success in all your future endeavors!\n\nWarm regards,\nThe IEF's E-Horyzon Organizing Committee`;

    const eventMessages = {
      'Pitching': 'delivering an outstanding pitch and showcasing your innovative ideas',
      'Mech Arena': 'demonstrating exceptional engineering skills and problem-solving abilities',
      'Webify': 'showcasing your creativity and technical expertise in web development',
      'Game-A-Thon': 'bringing your incredible gaming creativity and competitive spirit',
      'Electrical Odyssey': 'powering through the challenges with remarkable technical knowledge',
      'Buildscape': 'displaying your vision and skills in building the future',
      'Master Chef Mania': 'cooking up something truly amazing with your culinary talent',
      'IPL Auction': 'showcasing sharp analytical and strategic thinking',
      'Stocks&Shares': 'demonstrating excellent financial acumen and decision-making skills',
      'B-Plan': 'presenting a compelling business plan with clarity and confidence',
      'Detex Forum': 'showcasing your keen eye for detail and investigative skills',
      'Thirai Trivia': 'demonstrating your impressive knowledge and quick thinking',
      'Udyami Bazaar': 'displaying commendable entrepreneurial spirit and business skills',
    };

    const eventMsg = eventMessages[eventName] || 'your valuable participation and dedication';

    const body = `We are delighted to inform you that your certificate for the ${eventName} event at IEF's E-Horyzon 2K26 has been successfully generated.\n\nOn behalf of the Innovation and Entrepreneurship Forum (IEF) and the entire E-Horyzon 2K26 organizing team, we would like to extend our heartfelt congratulations for ${eventMsg}.${signOff}`;

    return {
      subject: `🎓 Your ${eventName} Certificate — IEF's E-Horyzon 2K26`,
      body,
    };
  };

  const openEmailModal = (cert) => {
    const tpl = getEmailTemplate(cert.eventName, cert.recipientName);
    setEmailTo(cert.recipientEmail || '');
    setEmailSubject(tpl.subject);
    setEmailBody(tpl.body);
    setEmailResult(null);
    setEmailModal({ cert, mode: 'single' });
  };

  const openBulkEmailModal = () => {
    // Find most common event name from current certificates
    const events = certificates.map((c) => c.eventName);
    const mostCommon = events.sort((a, b) => events.filter((v) => v === b).length - events.filter((v) => v === a).length)[0] || '';
    const tpl = getEmailTemplate(mostCommon);
    setEmailTo('');
    setEmailSubject(tpl.subject);
    setEmailBody(tpl.body);
    setEmailResult(null);
    setEmailModal({ mode: 'bulk', eventName: mostCommon });
  };

  const openSelectedEmailModal = () => {
    if (selectedIds.size === 0) return;
    const selectedCerts = certificates.filter((c) => selectedIds.has(c.id));
    const events = selectedCerts.map((c) => c.eventName);
    const mostCommon = events.sort((a, b) => events.filter((v) => v === b).length - events.filter((v) => v === a).length)[0] || '';
    const tpl = getEmailTemplate(mostCommon);
    setEmailTo('');
    setEmailSubject(tpl.subject);
    setEmailBody(tpl.body);
    setEmailResult(null);
    setEmailModal({ mode: 'selected', selectedCertIds: Array.from(selectedIds), selectedCount: selectedIds.size, eventName: mostCommon });
  };

  const sendSingleEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      const res = await api.post(`/certificates/${emailModal.cert.id}/send-email`, {
        toEmail: emailTo,
        subject: emailSubject,
        bodyContent: emailBody,
      });
      setEmailResult({ success: true, message: res.data.message });
    } catch (err) {
      setEmailResult({ success: false, message: err.response?.data?.message || 'Failed to send email' });
    } finally {
      setEmailSending(false);
    }
  };

  // Live progress state for bulk email
  const [emailProgress, setEmailProgress] = useState(null); // { total, sent, failed, current, log[] }

  const sendBulkEmail = async () => {
    if (!emailSubject || !emailBody) return;
    setEmailSending(true);
    setEmailResult(null);
    setEmailProgress({ total: 0, sent: 0, failed: 0, current: '', log: [] });

    try {
      const payload = {
        subject: emailSubject,
        bodyContent: emailBody,
      };

      if (emailModal.mode === 'selected') {
        payload.certificateIds = emailModal.selectedCertIds;
      } else if (emailModal.eventName) {
        payload.eventName = emailModal.eventName;
      } else {
        payload.certificateIds = certificates.map((c) => c.id);
      }

      // Use fetch + SSE streaming to get real-time progress
      const token = localStorage.getItem('token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${baseURL}/certificates/send-bulk-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Server error (${response.status})`);
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === 'start') {
                setEmailProgress((p) => ({ ...p, total: evt.total }));
              } else if (evt.type === 'sending') {
                setEmailProgress((p) => ({ ...p, current: `Sending to ${evt.name} (${evt.index}/${evt.total})...` }));
              } else if (evt.type === 'sent') {
                setEmailProgress((p) => ({
                  ...p,
                  sent: evt.sent,
                  failed: evt.failed,
                  current: '',
                  log: [...p.log.slice(-99), { status: 'sent', name: evt.name, email: evt.email, index: evt.index }],
                }));
              } else if (evt.type === 'failed') {
                setEmailProgress((p) => ({
                  ...p,
                  sent: evt.sent,
                  failed: evt.failed,
                  current: '',
                  log: [...p.log.slice(-99), { status: 'failed', name: evt.name, email: evt.email, index: evt.index, error: evt.error }],
                }));
              } else if (evt.type === 'done') {
                setEmailResult({ success: true, message: evt.message, details: evt });
              } else if (evt.type === 'error') {
                setEmailResult({ success: false, message: evt.message });
              }
            } catch (_) { /* ignore parse error */ }
          }
        }
      }
    } catch (err) {
      setEmailResult({ success: false, message: err.message || 'Failed to send emails' });
    } finally {
      setEmailSending(false);
    }
  };

  const closeEmailModal = () => {
    setEmailModal(null);
    setEmailTo('');
    setEmailSubject('');
    setEmailBody('');
    setEmailResult(null);
    setEmailProgress(null);
  };

  // Selection helpers
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === certificates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(certificates.map((c) => c.id)));
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} certificate(s)? This will also delete the PDF files.`)) return;
    try {
      await api.post('/certificates/bulk-delete', { certificateIds: Array.from(selectedIds) });
      setSelectedIds(new Set());
      fetchCertificates();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting certificates');
    }
  };

  // View certificate PDF
  const viewCertificate = async (id) => {
    try {
      const res = await api.get(`/certificates/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      setViewCert({ url, name: `Certificate #${id}` });
    } catch (err) {
      alert('Error loading certificate');
    }
  };

  const closeViewer = () => {
    if (viewCert) window.URL.revokeObjectURL(viewCert.url);
    setViewCert(null);
  };

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/certificates/my-certificates', {
        params: { search, type: filterType, page: pagination.page, limit: 10 },
      });
      setCertificates(res.data.certificates);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterType, pagination.page]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    fetchCertificates();
  };

  const deleteCertificate = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the certificate for "${name}"? This will also delete the PDF file.`)) return;
    try {
      await api.delete(`/certificates/${id}`);
      fetchCertificates();
    } catch (err) {
      alert('Error deleting certificate');
    }
  };

  const downloadCertificate = async (id, filename) => {
    try {
      const res = await api.get(`/certificates/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || 'certificate.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading certificate');
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const [zipDownloading, setZipDownloading] = useState(false);

  const downloadAllZip = async () => {
    setZipDownloading(true);
    try {
      // Determine event name from current certificates
      const events = certificates.map((c) => c.eventName);
      const mostCommon = events.sort((a, b) => events.filter((v) => v === b).length - events.filter((v) => v === a).length)[0] || '';
      const params = mostCommon ? { eventName: mostCommon } : {};
      const res = await api.get('/certificates/download-all-zip', { params, responseType: 'blob', timeout: 0 });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', mostCommon ? `${mostCommon}-certificates.zip` : 'all-certificates.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // When responseType is 'blob', error data is also a Blob – parse it
      let msg = 'Error downloading ZIP';
      if (err.response?.data instanceof Blob) {
        try { const text = await err.response.data.text(); const json = JSON.parse(text); msg = json.message || msg; } catch (_) {}
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      alert(msg);
    } finally {
      setZipDownloading(false);
    }
  };

  const typeColors = {
    participation: 'badge-info',
    achievement: 'badge-success',
    completion: 'badge-purple',
    appreciation: 'badge-warning',
    other: 'badge-info',
  };

  return (
    <DashboardLayout role="coordinator">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>My Certificates</h1>
          <p>Manage all your issued certificates</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {selectedIds.size > 0 && (
            <>
              <button className="btn btn-danger" onClick={bulkDelete} title={`Delete ${selectedIds.size} selected`}>
                🗑️ Delete {selectedIds.size} Selected
              </button>
              <button className="btn btn-outline" onClick={openSelectedEmailModal} title={`Send email to ${selectedIds.size} selected`} style={{ borderColor: 'var(--cyber-blue, #00d4ff)', color: 'var(--cyber-blue, #00d4ff)' }}>
                📧 Email {selectedIds.size} Selected
              </button>
            </>
          )}
          <button className="btn btn-outline" onClick={openBulkEmailModal} title="Send email to all participants">
            📧 Bulk Email
          </button>
          <button
            className="btn btn-outline"
            onClick={downloadAllZip}
            disabled={zipDownloading || certificates.length === 0}
            title="Download all certificates as ZIP"
            style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
          >
            {zipDownloading ? '⏳ Zipping...' : '📦 Download All ZIP'}
          </button>
          <Link to="/coordinator/create" className="btn btn-primary">
            ➕ Create Certificate
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSearch} className="search-bar">
            <input
              type="text"
              placeholder="Search by recipient or event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="form-control"
              style={{ width: 180 }}
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPagination(p => ({...p, page: 1})); }}
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
              <h3>No certificates yet</h3>
              <p>Create your first certificate to get started.</p>
              <Link to="/coordinator/create" className="btn btn-primary" style={{ marginTop: 16 }}>
                ➕ Create Certificate
              </Link>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input
                          type="checkbox"
                          checked={certificates.length > 0 && selectedIds.size === certificates.length}
                          onChange={toggleSelectAll}
                          title="Select all"
                          style={{ accentColor: 'var(--cyber-accent)', cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </th>
                      <th>Recipient</th>
                      <th>Event</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((cert) => (
                      <tr key={cert.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(cert.id)}
                            onChange={() => toggleSelect(cert.id)}
                            style={{ accentColor: 'var(--cyber-accent)', cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>
                        <td>
                          <strong>{cert.recipientName}</strong>
                          {cert.recipientEmail && (
                            <div style={{ fontSize: 12, color: '#64748b' }}>{cert.recipientEmail}</div>
                          )}
                        </td>
                        <td>{cert.eventName}</td>
                        <td>
                          <span className={`badge ${typeColors[cert.certificateType] || 'badge-info'}`}>
                            {cert.certificateType}
                          </span>
                        </td>
                        <td>{formatDate(cert.createdAt)}</td>
                        <td>
                          <span className={`badge ${cert.isValid ? 'badge-success' : 'badge-danger'}`}>
                            {cert.isValid ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => viewCertificate(cert.id)}
                              title="View Certificate"
                              style={{ color: 'var(--cyber-accent, #00ffaa)' }}
                            >
                              👁️
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => openEmailModal(cert)}
                              title="Send Email"
                              style={{ color: 'var(--cyber-blue, #00d4ff)' }}
                            >
                              📧
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => downloadCertificate(cert.id, cert.originalFileName)}
                              title="Download PDF"
                            >
                              📥
                            </button>
                            <Link to={`/coordinator/edit/${cert.id}`} className="btn btn-sm btn-primary" title="Edit">
                              ✏️
                            </Link>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => deleteCertificate(cert.id, cert.recipientName)}
                              title="Delete"
                            >
                              🗑️
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
      {/* Certificate Viewer Modal */}
      {viewCert && (
        <div className="email-modal-overlay" onClick={closeViewer}>
          <div className="cert-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="email-modal-header">
              <h3>📜 {viewCert.name}</h3>
              <button className="email-modal-close" onClick={closeViewer}>✕</button>
            </div>
            <div className="cert-viewer-body">
              <iframe
                src={viewCert.url}
                title="Certificate Preview"
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Email Composer Modal */}
      {emailModal && (
        <div className="email-modal-overlay" onClick={closeEmailModal}>
          <div className="email-modal" onClick={(e) => e.stopPropagation()}>
            <div className="email-modal-header">
              <h3>{emailModal.mode === 'bulk' ? '📧 Bulk Email' : emailModal.mode === 'selected' ? '📧 Email Selected' : '📧 Send Email'}</h3>
              <button className="email-modal-close" onClick={closeEmailModal}>✕</button>
            </div>
            <div className="email-modal-body">
              {emailModal.mode === 'single' && (
                <div className="form-group">
                  <label>To</label>
                  <input
                    type="email"
                    className="form-control"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="recipient@email.com"
                  />
                </div>
              )}
              {emailModal.mode === 'bulk' && (
                <div className="email-info-banner">
                  This will send an email to all participants with email addresses
                  {emailModal.eventName && <> for <strong>{emailModal.eventName}</strong></>}.
                  <br /><small>Use <code>{'{name}'}</code>, <code>{'{event}'}</code> as placeholders.</small>
                </div>
              )}
              {emailModal.mode === 'selected' && (
                <div className="email-info-banner" style={{ borderColor: 'var(--cyber-blue, #00d4ff)' }}>
                  This will send an email to <strong>{emailModal.selectedCount}</strong> selected participant(s) with email addresses.
                  <br /><small>Use <code>{'{name}'}</code>, <code>{'{event}'}</code> as placeholders.</small>
                </div>
              )}
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  className="form-control"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject..."
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  className="form-control email-textarea"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Write your email content..."
                  rows={10}
                />
              </div>
              {emailModal.mode === 'single' && emailModal.cert && (
                <div className="email-cert-info">
                  <span><strong>Recipient:</strong> {emailModal.cert.recipientName}</span>
                  <span><strong>Event:</strong> {emailModal.cert.eventName}</span>
                </div>
              )}
              {/* Live Progress Tracker */}
              {emailProgress && emailModal.mode !== 'single' && (
                <div style={{
                  background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px 16px', marginTop: '10px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span>📊 Progress: <strong>{emailProgress.sent + emailProgress.failed}</strong> / <strong>{emailProgress.total}</strong></span>
                    <span style={{ color: '#4ade80' }}>✅ Sent: {emailProgress.sent}</span>
                    {emailProgress.failed > 0 && <span style={{ color: '#f87171' }}>❌ Failed: {emailProgress.failed}</span>}
                  </div>
                  {/* Progress Bar */}
                  <div style={{
                    width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px'
                  }}>
                    <div style={{
                      height: '100%', borderRadius: '4px', transition: 'width 0.3s ease',
                      width: emailProgress.total > 0 ? `${((emailProgress.sent + emailProgress.failed) / emailProgress.total) * 100}%` : '0%',
                      background: emailProgress.failed > 0 ? 'linear-gradient(90deg, #4ade80, #facc15)' : 'linear-gradient(90deg, #4ade80, #00d4ff)',
                    }} />
                  </div>
                  {/* Current status */}
                  {emailProgress.current && (
                    <div style={{ fontSize: '12px', color: '#93c5fd', marginBottom: '6px', fontStyle: 'italic' }}>
                      {emailProgress.current}
                    </div>
                  )}
                  {/* Log of recent sends */}
                  {emailProgress.log.length > 0 && (
                    <div style={{
                      maxHeight: '120px', overflowY: 'auto', fontSize: '11px', lineHeight: '1.6',
                      borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px', marginTop: '4px'
                    }}>
                      {emailProgress.log.slice(-20).map((entry, i) => (
                        <div key={i} style={{ color: entry.status === 'sent' ? '#86efac' : '#fca5a5' }}>
                          {entry.status === 'sent' ? '✅' : '❌'} #{entry.index} {entry.name} — {entry.email}
                          {entry.error && <span style={{ color: '#f87171', fontSize: '10px' }}> ({entry.error})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {emailResult && (
                <div className={`email-result ${emailResult.success ? 'email-result-success' : 'email-result-error'}`}>
                  {emailResult.success ? '✅' : '❌'} {emailResult.message}
                  {emailResult.details && emailResult.details.errors && emailResult.details.errors.length > 0 && (
                    <details style={{ marginTop: '8px', fontSize: '12px' }}>
                      <summary style={{ cursor: 'pointer', color: '#f87171' }}>View {emailResult.details.errors.length} failed email(s)</summary>
                      <div style={{ maxHeight: '100px', overflowY: 'auto', marginTop: '4px' }}>
                        {emailResult.details.errors.map((e, i) => (
                          <div key={i} style={{ color: '#fca5a5' }}>• {e.name} ({e.email}): {e.error}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
            <div className="email-modal-footer">
              <button className="btn btn-outline" onClick={closeEmailModal} disabled={emailSending}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={emailModal.mode === 'single' ? sendSingleEmail : sendBulkEmail}
                disabled={emailSending || (emailModal.mode === 'single' && !emailTo)}
              >
                {emailSending ? '⏳ Sending...' : emailModal.mode === 'bulk' ? '📧 Send to All' : emailModal.mode === 'selected' ? `📧 Send to ${emailModal.selectedCount} Selected` : '📧 Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CoordinatorDashboard;
