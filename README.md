# TwinVerify - Certificate Verification System

A full-stack web application for issuing, managing, and verifying certificates with unique hash codes.

## Features

### 🔐 Admin Portal
- Dashboard with system-wide statistics
- Manage event coordinators (activate/deactivate/delete)
- View all certificates across coordinators
- Revoke or restore certificates

### 📋 Event Coordinator Portal
- Create certificates with auto-generated unique hash codes
- Attach certificate PDFs (upload)
- Edit certificate details and replace PDFs
- Delete certificates
- Search and filter certificates
- Copy hash codes to clipboard
- Download certificate PDFs

### 🔍 Public Verification
- Anyone can verify a certificate using its hash code
- Shows full certificate details if valid
- Tracks verification count

---

## Tech Stack

- **Frontend**: React 18, React Router, Axios
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Auth**: JWT (JSON Web Tokens)
- **File Uploads**: Multer (PDF only, max 10MB)

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone and Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

Edit `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/twinverify
JWT_SECRET=your_secret_key_here
FRONTEND_URL=http://localhost:3000
```

### 3. Start the Application

```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Start frontend
cd frontend
npm start
```

### 4. Seed Admin Account

Hit this endpoint once to create the default admin:
```
POST http://localhost:5000/api/auth/seed-admin
```

**Default Admin Credentials:**
- Email: `admin@twinverify.com`
- Password: `admin123`

---

## Project Structure

```
twinverify/
├── backend/
│   ├── models/
│   │   ├── User.js          # User model (Admin & Coordinator)
│   │   └── Certificate.js   # Certificate model with hash generation
│   ├── routes/
│   │   ├── auth.js           # Login, Register, Seed Admin
│   │   ├── certificates.js   # CRUD for certificates
│   │   ├── admin.js          # Admin-only routes
│   │   └── verify.js         # Public verification
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   └── upload.js         # Multer file upload config
│   ├── uploads/certificates/ # Stored PDF files
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.js
│   │   │   └── DashboardLayout.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── LandingPage.js
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── VerifyPage.js
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.js
│   │   │   │   ├── ManageCoordinators.js
│   │   │   │   └── AdminCertificates.js
│   │   │   └── coordinator/
│   │   │       ├── CoordinatorDashboard.js
│   │   │       ├── CreateCertificate.js
│   │   │       └── EditCertificate.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register as coordinator |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/seed-admin` | Create default admin |

### Certificates (Coordinator)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/certificates` | Create certificate |
| GET | `/api/certificates/my-certificates` | List my certificates |
| GET | `/api/certificates/:id` | Get single certificate |
| PUT | `/api/certificates/:id` | Update certificate |
| DELETE | `/api/certificates/:id` | Delete certificate |
| GET | `/api/certificates/:id/download` | Download PDF |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET | `/api/admin/coordinators` | List coordinators |
| PATCH | `/api/admin/coordinators/:id/toggle-status` | Activate/Deactivate |
| DELETE | `/api/admin/coordinators/:id` | Delete coordinator |
| GET | `/api/admin/certificates` | List all certificates |
| PATCH | `/api/admin/certificates/:id/toggle-validity` | Revoke/Restore |

### Public Verification
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/verify/:hashCode` | Verify certificate |

---

## Hash Code Format

Each certificate gets a unique hash code in the format: `TV-XXXXXXXXXXXXXXXX`

- Prefix: `TV-` (TwinVerify)
- 16 character hex string (SHA-256 based)
- Example: `TV-A3F8B2C1D4E5F607`
