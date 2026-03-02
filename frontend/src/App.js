import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageCoordinators from './pages/admin/ManageCoordinators';
import AdminCertificates from './pages/admin/AdminCertificates';

// Coordinator Pages
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import CreateCertificate from './pages/coordinator/CreateCertificate';
import EditCertificate from './pages/coordinator/EditCertificate';

// Protected Route Components
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/" />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/coordinator'} />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/coordinators" element={<ProtectedRoute requiredRole="admin"><ManageCoordinators /></ProtectedRoute>} />
          <Route path="/admin/certificates" element={<ProtectedRoute requiredRole="admin"><AdminCertificates /></ProtectedRoute>} />

          {/* Coordinator Routes */}
          <Route path="/coordinator" element={<ProtectedRoute requiredRole="coordinator"><CoordinatorDashboard /></ProtectedRoute>} />
          <Route path="/coordinator/create" element={<ProtectedRoute requiredRole="coordinator"><CreateCertificate /></ProtectedRoute>} />
          <Route path="/coordinator/edit/:id" element={<ProtectedRoute requiredRole="coordinator"><EditCertificate /></ProtectedRoute>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
