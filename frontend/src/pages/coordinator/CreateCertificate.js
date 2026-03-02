import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../services/api';

/*
 * Default fields for the IEF's E-Horyzon certificate template.
 * Each field maps to a CSV column.
 * The coordinator clicks on the template to position each field.
 */
const FIELD_NAME    = { id: 'name',    label: 'Participant Name',       key: 'name',    positioned: false, x: 50, y: 50, fontSizePct: 21.7, fontColor: '#000000', bold: true  };
const FIELD_COLLEGE = { id: 'college', label: 'College / Organization', key: 'college', positioned: false, x: 50, y: 55, fontSizePct: 21.7, fontColor: '#000000', bold: true  };
const FIELD_EVENT   = { id: 'event',   label: 'Event / Competition',    key: 'event',   positioned: false, x: 50, y: 60, fontSizePct: 21.7, fontColor: '#000000', bold: true  };

// Events that only need Name + College (no event field on cert)
const TWO_FIELD_EVENTS = ['Pitching'];

const getFieldsForEvent = (evtName) => {
  if (TWO_FIELD_EVENTS.includes(evtName)) {
    return [{ ...FIELD_NAME }, { ...FIELD_COLLEGE }];
  }
  return [{ ...FIELD_NAME }, { ...FIELD_COLLEGE }, { ...FIELD_EVENT }];
};

const CreateCertificate = () => {
  const navigate = useNavigate();
  const templateInputRef = useRef(null);
  const csvInputRef = useRef(null);
  const previewRef = useRef(null);

  // Event
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');

  // Template
  const [template, setTemplate] = useState(null);
  const [templatePreview, setTemplatePreview] = useState(null);

  // Fields (initialized for 3-field events; updated when eventName changes)
  const [fields, setFields] = useState(getFieldsForEvent(''));
  const [activeFieldId, setActiveFieldId] = useState('name');

  // Participants
  const [participants, setParticipants] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  const activeField = fields.find((f) => f.id === activeFieldId);

  // When event changes, update the field list (keep positioned data if field still exists)
  const handleEventChange = (newEvent) => {
    setEventName(newEvent);
    const newFields = getFieldsForEvent(newEvent);
    setFields((prev) => {
      return newFields.map((nf) => {
        const existing = prev.find((p) => p.id === nf.id);
        return existing ? { ...existing } : { ...nf };
      });
    });
    // If active field was removed, switch to first field
    setActiveFieldId((prevId) => {
      if (newFields.some((f) => f.id === prevId)) return prevId;
      return newFields[0].id;
    });
  };

  // ─────────────────────────────────
  // Template
  // ─────────────────────────────────
  const handleTemplateChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ok = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!ok.includes(file.type)) { setError('Only PNG / JPEG allowed.'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('Max 20 MB.'); return; }
    setTemplate(file);
    setError('');
    setFields(getFieldsForEvent(eventName));
    setActiveFieldId('name');
    const reader = new FileReader();
    reader.onload = (ev) => setTemplatePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Dragging state
  const [draggingFieldId, setDraggingFieldId] = useState(null);

  const handlePointerDown = (e, fieldId) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingFieldId(fieldId);
    setActiveFieldId(fieldId);
    previewRef.current?.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!draggingFieldId || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setFields((prev) =>
      prev.map((f) => (f.id === draggingFieldId ? { ...f, x, y, positioned: true } : f))
    );
  };

  const handlePointerUp = () => {
    setDraggingFieldId(null);
  };

  // Click on template to move active field there
  const handleTemplateClick = (e) => {
    if (!previewRef.current || !activeFieldId || draggingFieldId) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setFields((prev) =>
      prev.map((f) => (f.id === activeFieldId ? { ...f, x, y, positioned: true } : f))
    );
  };

  const updateField = (id, key, value) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  };

  // ─────────────────────────────────
  // CSV
  // ─────────────────────────────────
  const handleCsvChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFileName(file.name);
    setError('');

    const ext = file.name.split('.').pop().toLowerCase();

    const processRows = (rows) => {
      const parsed = rows
        .map((row) => {
          const obj = {};
          for (const [k, v] of Object.entries(row)) {
            obj[String(k).trim().toLowerCase().replace(/\s+/g, '')] = String(v ?? '').trim();
          }
          return {
            name: obj.name || obj.participantname || obj.fullname || '',
            college: obj.college || obj.collegename || obj.organization || obj.institution || '',
            event: obj.event || obj.eventname || obj.competition || obj.competitionname || '',
            email: obj.email || obj.participantemail || '',
          };
        })
        .filter((p) => p.name);

      if (parsed.length === 0) {
        setError('No valid rows found. The file must have a "name" column.');
        return;
      }
      setParticipants(parsed);
    };

    // Excel files (.xlsx, .xls)
    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const workbook = XLSX.read(evt.target.result, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          processRows(rows);
        } catch (err) {
          setError('Failed to parse Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV files
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => processRows(result.data),
        error: () => setError('Failed to parse CSV file.'),
      });
    }
  };

  const removeParticipant = (i) => setParticipants((prev) => prev.filter((_, idx) => idx !== i));

  const downloadSampleCsv = () => {
    const hasEvent = fields.some((f) => f.id === 'event');
    const csv = hasEvent
      ? 'name,college,event,email\nJohn Doe,MIT,Webify,john@example.com\nJane Smith,Stanford,Mech Arena,jane@example.com\nAlex Kumar,IIT Delhi,Game-A-Thon,alex@example.com\n'
      : 'name,college,email\nJohn Doe,MIT,john@example.com\nJane Smith,Stanford,jane@example.com\nAlex Kumar,IIT Delhi,alex@example.com\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-participants.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────────
  // Generate
  // ─────────────────────────────────
  const handleGenerate = async () => {
    setError('');
    if (!eventName) { setError('Select an event name.'); return; }
    if (!eventDate) { setError('Select an event date.'); return; }
    if (!template) { setError('Upload a certificate template.'); return; }
    const unpositioned = fields.filter((f) => !f.positioned);
    if (unpositioned.length > 0) {
      setError(`Position all fields on the template. Missing: ${unpositioned.map((f) => f.label).join(', ')}`);
      return;
    }
    if (participants.length === 0) { setError('Upload a participant list (CSV).'); return; }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('template', template);
      data.append('eventName', eventName);
      data.append('eventDate', eventDate);
      data.append('participants', JSON.stringify(participants));

      const fieldConfigs = fields.map((f) => ({
        label: f.label,
        key: f.key,
        x: f.x,
        y: f.y,
        fontSizePct: f.fontSizePct || 21.7,
        fontColor: f.fontColor,
        bold: f.bold,
      }));
      data.append('fieldConfigs', JSON.stringify(fieldConfigs));

      const res = await api.post('/certificates/bulk', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate certificates.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────
  // Helpers
  // ─────────────────────────────────
  const downloadCertificateList = () => {
    if (!results) return;
    const csv = 'Name,Email\n' +
      results.certificates.map((c) => `"${c.name}","${c.email}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventName || 'certificates'}-list.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setEventName(''); setEventDate('');
    setTemplate(null); setTemplatePreview(null);
    setFields(getFieldsForEvent(''));
    setActiveFieldId('name');
    setParticipants([]); setCsvFileName('');
    setResults(null); setError('');
  };

  // ═══════════════════════════════════════════
  //  RESULTS VIEW
  // ═══════════════════════════════════════════
  if (results) {
    return (
      <DashboardLayout role="coordinator">
        <div className="page-header">
          <h1>Certificates Generated</h1>
          <p>{results.successful} of {results.total} certificates created successfully</p>
        </div>

        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-value">{results.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--cyber-accent)' }}>{results.successful}</div>
            <div className="stat-label">Generated</div>
          </div>
          {results.failed > 0 && (
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--cyber-danger)' }}>{results.failed}</div>
              <div className="stat-label">Failed</div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Generated Certificates</h3>
            <button className="btn btn-primary btn-sm" onClick={downloadCertificateList}>Download CSV</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead><tr><th>#</th><th>Name</th><th>Email</th></tr></thead>
                <tbody>
                  {results.certificates.map((c, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{c.name}</td>
                      <td style={{ color: 'var(--cyber-text-muted)' }}>{c.email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {results.errors?.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header"><h3 style={{ color: 'var(--cyber-danger)' }}>Failed</h3></div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-container">
                <table>
                  <thead><tr><th>Name</th><th>Error</th></tr></thead>
                  <tbody>
                    {results.errors.map((e, i) => (
                      <tr key={i}><td>{e.name}</td><td style={{ color: 'var(--cyber-danger)' }}>{e.error}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn-primary btn-lg" onClick={resetForm}>Create More</button>
          <button className="btn btn-outline btn-lg" onClick={() => navigate('/coordinator')}>Dashboard</button>
        </div>
      </DashboardLayout>
    );
  }

  // ═══════════════════════════════════════════
  //  LOADING
  // ═══════════════════════════════════════════
  if (loading) {
    return (
      <DashboardLayout role="coordinator">
        <div className="page-header">
          <h1>Generating Certificates...</h1>
          <p>Processing {participants.length} participant(s)</p>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 64 }}>
            <div className="spinner" style={{ margin: '0 auto 24px' }}></div>
            <h3 style={{ color: 'var(--cyber-accent)', marginBottom: 8 }}>Processing</h3>
            <p style={{ color: 'var(--cyber-text-muted)' }}>
              Generating {participants.length} certificate(s) from template...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ═══════════════════════════════════════════
  //  MAIN FORM
  // ═══════════════════════════════════════════
  return (
    <DashboardLayout role="coordinator">
      <div className="page-header">
        <h1>Create Certificates</h1>
        <p>Upload a template, position fields, upload participant list, and generate</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ── STEP 1 : Event Details ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3><span className="step-number">1</span> Event Details</h3>
        </div>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label>Event Name *</label>
              <select className="form-control" value={eventName} onChange={(e) => handleEventChange(e.target.value)}>
                <option value="">Select an event</option>
                <option value="Pitching">Pitching</option>
                <option value="Mech Arena">Mech Arena</option>
                <option value="Webify">Webify</option>
                <option value="Game-A-Thon">Game-A-Thon</option>
                <option value="Electrical Odyssey">Electrical Odyssey</option>
                <option value="Buildscape">Buildscape</option>
                <option value="Master Chef Mania">Master Chef Mania</option>
                <option value="IPL Auction">IPL Auction</option>
                <option value="Stocks&amp;Shares">Stocks&amp;Shares</option>
                <option value="B-Plan">B-Plan</option>
                <option value="Detex Forum">Detex Forum</option>
                <option value="Thirai Trivia">Thirai Trivia</option>
                <option value="Udyami Bazaar">Udyami Bazaar</option>
              </select>
            </div>
            <div className="form-group">
              <label>Event Date *</label>
              <input type="date" className="form-control" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP 2 : Template + Field Positioning ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3><span className="step-number">2</span> Certificate Template &amp; Field Placement</h3>
        </div>
        <div className="card-body">
          {/* Upload */}
          <div className="file-upload" onClick={() => templateInputRef.current?.click()}>
            <div className="file-upload-icon">🖼️</div>
            {template ? (
              <>
                <p className="file-name">{template.name}</p>
                <p style={{ fontSize: 12, color: 'var(--cyber-text-muted)', marginTop: 4 }}>
                  {(template.size / 1024 / 1024).toFixed(2)} MB — Click to change
                </p>
              </>
            ) : (
              <>
                <p>Click to upload certificate template image</p>
                <p style={{ fontSize: 12, color: 'var(--cyber-text-muted)', marginTop: 4 }}>PNG or JPEG, max 20MB</p>
              </>
            )}
          </div>
          <input type="file" ref={templateInputRef} accept="image/png,image/jpeg,image/jpg" style={{ display: 'none' }} onChange={handleTemplateChange} />

          {/* Preview + controls */}
          {templatePreview && (
            <>
              {/* Field selector tabs */}
              <div className="field-tabs">
                {fields.map((f) => (
                  <button
                    key={f.id}
                    className={`field-tab ${activeFieldId === f.id ? 'active' : ''} ${f.positioned ? 'positioned' : ''}`}
                    onClick={() => setActiveFieldId(f.id)}
                    type="button"
                  >
                    <span className="field-tab-dot"></span>
                    {f.label}
                    {f.positioned && <span className="field-tab-check">✓</span>}
                  </button>
                ))}
              </div>

              {/* Instruction */}
              <p style={{ fontSize: 13, color: 'var(--cyber-accent)', marginBottom: 8, fontFamily: 'var(--mono)' }}>
                Drag the labels on the template or use the X/Y sliders below. Click anywhere on the template to move the selected field.
              </p>

              {/* Template image with draggable markers */}
              <div
                className="template-preview"
                ref={previewRef}
                onClick={handleTemplateClick}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ touchAction: 'none' }}
              >
                <img src={templatePreview} alt="Template" draggable={false} />

                {/* All field markers — always visible, draggable */}
                {fields.map((f) => (
                  <div
                    key={f.id}
                    className={`name-marker ${activeFieldId === f.id ? 'active-marker' : ''}`}
                    style={{
                      left: `${f.x}%`,
                      top: `${f.y}%`,
                      fontSize: `${Math.max(8, f.fontSizePct * 0.75)}px`,
                      fontFamily: "'Times New Roman', Times, serif",
                      color: f.fontColor,
                      cursor: 'grab',
                      zIndex: activeFieldId === f.id ? 10 : 5,
                    }}
                    onPointerDown={(e) => handlePointerDown(e, f.id)}
                  >
                    <span className="marker-label">{f.label}</span>
                    {participants.length > 0 ? participants[0][f.key] || f.label : f.label}
                  </div>
                ))}
              </div>

              {/* Per-field controls: X / Y sliders + font */}
              {activeField && (
                <div className="field-controls-panel">
                  <h4 style={{ color: 'var(--cyber-accent)', margin: '0 0 12px', fontSize: 14, fontFamily: 'var(--mono)' }}>
                    {activeField.label} — Position & Style
                  </h4>
                  <div className="field-controls-grid">
                    <div className="font-control-item">
                      <label>X Position (horizontal)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="range" min="0" max="100" step="0.5"
                          value={activeField.x}
                          onChange={(e) => {
                            updateField(activeField.id, 'x', Number(e.target.value));
                            if (!activeField.positioned) updateField(activeField.id, 'positioned', true);
                          }}
                          className="range-slider"
                        />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--cyber-text)', minWidth: 50 }}>
                          {activeField.x.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="font-control-item">
                      <label>Y Position (vertical)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="range" min="0" max="100" step="0.5"
                          value={activeField.y}
                          onChange={(e) => {
                            updateField(activeField.id, 'y', Number(e.target.value));
                            if (!activeField.positioned) updateField(activeField.id, 'positioned', true);
                          }}
                          className="range-slider"
                        />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--cyber-text)', minWidth: 50 }}>
                          {activeField.y.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="font-control-item">
                      <label>Font Size (pt)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="range" min="8" max="72" step="0.1"
                          value={activeField.fontSizePct}
                          onChange={(e) => updateField(activeField.id, 'fontSizePct', Number(e.target.value))}
                          className="range-slider"
                        />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--cyber-text)', minWidth: 50 }}>
                          {activeField.fontSizePct.toFixed(1)} pt
                        </span>
                      </div>
                    </div>
                    <div className="font-control-item">
                      <label>Font Color</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="color"
                          value={activeField.fontColor}
                          onChange={(e) => updateField(activeField.id, 'fontColor', e.target.value)}
                          className="color-picker"
                        />
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--cyber-text-muted)' }}>
                          {activeField.fontColor}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick status */}
              <div className="field-status-list">
                {fields.map((f) => (
                  <div key={f.id} className={`field-status-item ${f.positioned ? 'set' : ''}`} onClick={() => setActiveFieldId(f.id)} style={{ cursor: 'pointer' }}>
                    <span className="field-status-dot"></span>
                    <span className="field-status-label">{f.label}</span>
                    {f.positioned ? (
                      <span className="field-status-pos">X={f.x.toFixed(1)}% Y={f.y.toFixed(1)}%</span>
                    ) : (
                      <span className="field-status-pos" style={{ color: 'var(--cyber-warning)' }}>Use slider or drag to set</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── STEP 3 : Participant List ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3><span className="step-number">3</span> Participant List</h3>
          <button className="btn btn-outline btn-sm" onClick={downloadSampleCsv} type="button">
            Download Sample CSV
          </button>
        </div>
        <div className="card-body">
          <div className="file-upload" onClick={() => csvInputRef.current?.click()}>
            <div className="file-upload-icon">📋</div>
            {csvFileName ? (
              <>
                <p className="file-name">{csvFileName}</p>
                <p style={{ fontSize: 12, color: 'var(--cyber-text-muted)', marginTop: 4 }}>
                  {participants.length} participant(s) loaded — Click to change
                </p>
              </>
            ) : (
              <>
                <p>Click to upload participant list (CSV or Excel)</p>
                <p style={{ fontSize: 12, color: 'var(--cyber-text-muted)', marginTop: 4 }}>
                  CSV / XLSX with columns: {fields.map((f) => f.key).join(', ')}, email (email optional)
                </p>
              </>
            )}
          </div>
          <input type="file" ref={csvInputRef} accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleCsvChange} />

          {participants.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
                <span className="participant-count">{participants.length} participant(s)</span>
                <button className="btn btn-outline btn-sm" onClick={() => { setParticipants([]); setCsvFileName(''); }} type="button">
                  Clear All
                </button>
              </div>
              <div className="csv-preview">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>College</th>
                      {fields.some((f) => f.id === 'event') && <th>Event</th>}
                      <th>Email</th>
                      <th style={{ width: 50 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{p.name}</td>
                        <td>{p.college || '—'}</td>
                        {fields.some((f) => f.id === 'event') && <td>{p.event || '—'}</td>}
                        <td style={{ color: 'var(--cyber-text-muted)' }}>{p.email || '—'}</td>
                        <td>
                          <button
                            className="btn btn-sm"
                            style={{ color: 'var(--cyber-danger)', background: 'none', padding: '2px 8px', border: 'none', cursor: 'pointer' }}
                            onClick={() => removeParticipant(i)} type="button" title="Remove"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Generate ── */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleGenerate}
          disabled={loading || !eventName || !eventDate || !template || fields.some((f) => !f.positioned) || participants.length === 0}
          type="button"
        >
          Generate {participants.length > 0 ? `${participants.length} Certificate(s)` : 'Certificates'}
        </button>
        <button className="btn btn-outline btn-lg" onClick={() => navigate('/coordinator')} type="button">
          Cancel
        </button>
      </div>
    </DashboardLayout>
  );
};

export default CreateCertificate;
