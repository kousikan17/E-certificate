const express = require('express');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { Op } = require('sequelize');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const { auth, coordinatorOnly } = require('../middleware/auth');
const { certificateUpload, templateUpload } = require('../middleware/upload');
const { sendCustomEmail } = require('../services/email');
const { generateCertificatePdf } = require('../services/pdfGenerator');

const router = express.Router();

const certDir = path.join(__dirname, '..', 'uploads', 'certificates');

// ─── Bulk generate certificates from template + participant list ───
router.post('/bulk', auth, coordinatorOnly, templateUpload.single('template'), async (req, res) => {
  try {
    const { eventName, eventDate, participants, fieldConfigs } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Template image is required.' });
    }

    let participantList;
    try {
      participantList = JSON.parse(participants);
    } catch {
      return res.status(400).json({ message: 'Invalid participants data.' });
    }

    let fields;
    try {
      fields = JSON.parse(fieldConfigs);
    } catch {
      return res.status(400).json({ message: 'Invalid field configuration.' });
    }

    if (!participantList || participantList.length === 0) {
      return res.status(400).json({ message: 'At least one participant is required.' });
    }

    if (!eventName || !eventDate) {
      return res.status(400).json({ message: 'Event name and date are required.' });
    }

    if (!fields || fields.length === 0) {
      return res.status(400).json({ message: 'At least one field must be positioned on the template.' });
    }

    const templatePath = req.file.path;
    const results = [];
    const errors = [];

    for (const participant of participantList) {
      try {
        // Build text fields for this participant
        const textFields = fields.map((f) => ({
          label: f.label,
          value: participant[f.key] || '',
          x: parseFloat(f.x),
          y: parseFloat(f.y),
          fontSizePct: parseFloat(f.fontSizePct) || 21.7,
          fontColor: f.fontColor || '#000000',
          bold: f.bold !== false,
        }));

        // Generate PDF from template
        const pdfBytes = await generateCertificatePdf(templatePath, textFields);

        // Save generated PDF
        const filename = `cert-${Date.now()}-${Math.round(Math.random() * 1e9)}.pdf`;
        const filepath = path.join(certDir, filename);
        fs.writeFileSync(filepath, pdfBytes);

        // Create database record
        const certificate = await Certificate.create({
          recipientName: participant.name || participant.Name || '',
          recipientEmail: participant.email || participant.Email || null,
          eventName,
          eventDate,
          certificateType: 'participation',
          certificateFile: filename,
          originalFileName: `${participant.name || participant.Name || 'cert'}-certificate.pdf`,
          issuedBy: req.user.id,
        });

        results.push({
          name: participant.name || participant.Name || '',
          email: participant.email || participant.Email || '',
          id: certificate.id,
        });
      } catch (err) {
        errors.push({ name: participant.name || participant.Name || 'Unknown', error: err.message });
      }
    }

    // Clean up template file
    fs.unlink(templatePath, () => {});

    res.status(201).json({
      message: `Generated ${results.length} certificate(s)`,
      total: participantList.length,
      successful: results.length,
      failed: errors.length,
      certificates: results,
      errors,
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create single certificate (Event Coordinator)
router.post('/', auth, coordinatorOnly, certificateUpload.single('certificateFile'), async (req, res) => {
  try {
    const { recipientName, recipientEmail, eventName, eventDate, certificateType, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Certificate PDF file is required.' });
    }

    const certificate = await Certificate.create({
      recipientName,
      recipientEmail,
      eventName,
      eventDate,
      certificateType,
      description,
      certificateFile: req.file.filename,
      originalFileName: req.file.originalname,
      issuedBy: req.user.id,
    });

    res.status(201).json({
      message: 'Certificate created successfully',
      certificate: certificate.toJSON(),
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all certificates for logged-in coordinator
router.get('/my-certificates', auth, coordinatorOnly, async (req, res) => {
  try {
    const { search, type, page = 1, limit = 10 } = req.query;
    const where = { issuedBy: req.user.id };

    if (search) {
      where[Op.or] = [
        { recipientName: { [Op.iLike]: `%${search}%` } },
        { eventName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (type) {
      where.certificateType = type;
    }

    const offset = (page - 1) * parseInt(limit);

    const { count: total, rows: certificates } = await Certificate.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit),
      include: [{ model: User, as: 'issuer', attributes: ['name', 'email'] }],
    });

    res.json({
      certificates,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Download ALL certificates as a single ZIP file
router.get('/download-all-zip', auth, coordinatorOnly, async (req, res) => {
  try {
    req.setTimeout(0);
    res.setTimeout(0);

    const { eventName } = req.query;
    const where = { issuedBy: req.user.id };
    if (eventName) where.eventName = eventName;

    const certificates = await Certificate.findAll({ where });
    if (certificates.length === 0) {
      return res.status(404).json({ message: 'No certificates found.' });
    }

    // Pre-check that at least one file exists before piping
    const validFiles = [];
    for (const cert of certificates) {
      const filePath = path.join(certDir, cert.certificateFile);
      if (fs.existsSync(filePath)) {
        const fileName = `${cert.recipientName.replace(/[^a-zA-Z0-9 ]/g, '')}-${cert.id}.pdf`;
        validFiles.push({ filePath, fileName });
      }
    }

    if (validFiles.length === 0) {
      return res.status(404).json({ message: 'No certificate files found on disk.' });
    }

    const zipName = eventName
      ? `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}-certificates.zip`
      : 'all-certificates.zip';

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) res.status(500).json({ message: 'ZIP creation failed' });
    });
    archive.pipe(res);

    for (const { filePath, fileName } of validFiles) {
      archive.file(filePath, { name: fileName });
    }

    await archive.finalize();
  } catch (error) {
    console.error('ZIP download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// Get single certificate
router.get('/:id', auth, async (req, res) => {
  try {
    const certificate = await Certificate.findByPk(req.params.id, {
      include: [{ model: User, as: 'issuer', attributes: ['name', 'email', 'organization'] }],
    });

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    // Coordinators can only view their own certificates
    if (req.user.role === 'coordinator' && certificate.issuedBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ certificate });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update certificate
router.put('/:id', auth, coordinatorOnly, certificateUpload.single('certificateFile'), async (req, res) => {
  try {
    const certificate = await Certificate.findByPk(req.params.id);

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    if (req.user.role === 'coordinator' && certificate.issuedBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { recipientName, recipientEmail, eventName, eventDate, certificateType, description } = req.body;

    if (recipientName) certificate.recipientName = recipientName;
    if (recipientEmail) certificate.recipientEmail = recipientEmail;
    if (eventName) certificate.eventName = eventName;
    if (eventDate) certificate.eventDate = eventDate;
    if (certificateType) certificate.certificateType = certificateType;
    if (description !== undefined) certificate.description = description;

    // If new file uploaded, delete old one and update
    if (req.file) {
      const oldFilePath = path.join(__dirname, '..', 'uploads', 'certificates', certificate.certificateFile);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      certificate.certificateFile = req.file.filename;
      certificate.originalFileName = req.file.originalname;
    }

    await certificate.save();

    res.json({ message: 'Certificate updated successfully', certificate });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete certificate 
router.delete('/:id', auth, coordinatorOnly, async (req, res) => {
  try {
    const certificate = await Certificate.findByPk(req.params.id);

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    if (req.user.role === 'coordinator' && certificate.issuedBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Delete the PDF file
    const filePath = path.join(__dirname, '..', 'uploads', 'certificates', certificate.certificateFile);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await certificate.destroy();

    res.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk delete certificates
router.post('/bulk-delete', auth, coordinatorOnly, async (req, res) => {
  try {
    const { certificateIds } = req.body;
    if (!certificateIds || !Array.isArray(certificateIds) || certificateIds.length === 0) {
      return res.status(400).json({ message: 'Provide an array of certificateIds.' });
    }

    const certificates = await Certificate.findAll({
      where: { id: { [Op.in]: certificateIds }, issuedBy: req.user.id },
    });

    let deleted = 0;
    for (const cert of certificates) {
      const filePath = path.join(__dirname, '..', 'uploads', 'certificates', cert.certificateFile);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await cert.destroy();
      deleted++;
    }

    res.json({ message: `Deleted ${deleted} certificate(s)`, deleted });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper: delay ms
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Send bulk email with real-time SSE progress streaming
// NOTE: Must be defined BEFORE /:id routes to avoid Express matching 'send-bulk-email' as :id
router.post('/send-bulk-email', auth, coordinatorOnly, async (req, res) => {
  req.setTimeout(0);
  res.setTimeout(0);

  try {
    const { subject, bodyContent, eventName, certificateIds } = req.body;
    if (!subject || !bodyContent) {
      return res.status(400).json({ message: 'Subject and Message are required.' });
    }

    let where = { issuedBy: req.user.id };
    if (certificateIds && certificateIds.length > 0) {
      where.id = { [Op.in]: certificateIds };
    } else if (eventName) {
      where.eventName = eventName;
    } else {
      return res.status(400).json({ message: 'Provide certificateIds or eventName to target.' });
    }

    const certificates = await Certificate.findAll({ where });
    const withEmail = certificates.filter((c) => c.recipientEmail);

    if (withEmail.length === 0) {
      return res.status(404).json({ message: 'No certificates with email addresses found.' });
    }

    // Set up SSE headers so the frontend receives real-time updates
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');  // disable nginx buffering if proxied
    res.flushHeaders();

    const sendEvent = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial info
    sendEvent({ type: 'start', total: withEmail.length, skippedNoEmail: certificates.length - withEmail.length });

    const { createTransporter } = require('../services/email');
    const pooledTransporter = createTransporter({
      pool: true,
      maxConnections: 1,
      maxMessages: 50,
    });

    let sent = 0;
    const errors = [];
    const BATCH_SIZE = 10;
    const DELAY_MS = 1500;
    const RETRY_DELAY = 3000;

    for (let i = 0; i < withEmail.length; i++) {
      const cert = withEmail[i];
      const certFilePath = cert.certificateFile
        ? path.join(__dirname, '..', 'uploads', 'certificates', cert.certificateFile)
        : null;

      if (i > 0 && i % BATCH_SIZE === 0) {
        await delay(DELAY_MS);
      }

      // Notify frontend we are attempting this email
      sendEvent({ type: 'sending', index: i + 1, total: withEmail.length, name: cert.recipientName, email: cert.recipientEmail });

      let success = false;
      let lastError = '';

      for (let attempt = 0; attempt < 2 && !success; attempt++) {
        try {
          if (attempt > 0) await delay(RETRY_DELAY);
          const result = await sendCustomEmail({
            toEmail: cert.recipientEmail,
            subject,
            bodyContent: bodyContent
              .replace(/\{name\}/gi, cert.recipientName)
              .replace(/\{event\}/gi, cert.eventName),
            eventName: cert.eventName,
            recipientName: cert.recipientName,
            attachmentPath: certFilePath,
            attachmentName: `${cert.recipientName}-certificate.pdf`,
            certificateId: cert.id,
            transporter: pooledTransporter,
          });
          if (result.success) {
            success = true;
            sent++;
          } else {
            lastError = result.error;
          }
        } catch (emailErr) {
          lastError = emailErr.message;
        }
      }

      // Notify frontend of result for this email
      sendEvent({
        type: success ? 'sent' : 'failed',
        index: i + 1,
        total: withEmail.length,
        name: cert.recipientName,
        email: cert.recipientEmail,
        sent,
        failed: errors.length + (success ? 0 : 1),
        error: success ? null : lastError,
      });

      if (!success) {
        errors.push({ name: cert.recipientName, email: cert.recipientEmail, error: lastError });
      }
    }

    pooledTransporter.close();

    // Send final summary event
    sendEvent({
      type: 'done',
      message: `Sent ${sent} of ${withEmail.length} email(s)`,
      total: withEmail.length,
      sent,
      failed: errors.length,
      skippedNoEmail: certificates.length - withEmail.length,
      errors,
    });

    res.end();
  } catch (error) {
    // If headers already sent as SSE, write error event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// Send custom email for a certificate
router.post('/:id/send-email', auth, coordinatorOnly, async (req, res) => {
  try {
    const certificate = await Certificate.findByPk(req.params.id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }
    if (certificate.issuedBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { toEmail, subject, bodyContent } = req.body;
    if (!toEmail || !subject || !bodyContent) {
      return res.status(400).json({ message: 'To, Subject and Message are required.' });
    }

    const certFilePath = certificate.certificateFile
      ? path.join(__dirname, '..', 'uploads', 'certificates', certificate.certificateFile)
      : null;
    const result = await sendCustomEmail({
      toEmail,
      subject,
      bodyContent,
      eventName: certificate.eventName,
      recipientName: certificate.recipientName,
      attachmentPath: certFilePath,
      attachmentName: `${certificate.recipientName}-certificate.pdf`,
      certificateId: certificate.id,
    });

    if (result.success) {
      res.json({ message: 'Email sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ message: 'Failed to send email', error: result.error });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Download certificate PDF
router.get('/:id/download', auth, async (req, res) => {
  try {
    const certificate = await Certificate.findByPk(req.params.id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found.' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', 'certificates', certificate.certificateFile);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Certificate file not found.' });
    }

    res.download(filePath, certificate.originalFileName || 'certificate.pdf');
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
