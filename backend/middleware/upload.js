const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const certDir = path.join(__dirname, '..', 'uploads', 'certificates');
const templateDir = path.join(__dirname, '..', 'uploads', 'templates');
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, { recursive: true });

// ─── Certificate PDF upload ───
const certStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, certDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'cert-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const certFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const certificateUpload = multer({
  storage: certStorage,
  fileFilter: certFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ─── Template image upload ───
const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, templateDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'template-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const templateFilter = (req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG and JPEG images are allowed for templates!'), false);
  }
};

const templateUpload = multer({
  storage: templateStorage,
  fileFilter: templateFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

module.exports = { certificateUpload, templateUpload };
