import React from 'react';
import { Navigate } from 'react-router-dom';

// Registration removed — coordinators are created by admin, login via OTP
const RegisterPage = () => <Navigate to="/login" />;

export default RegisterPage;
