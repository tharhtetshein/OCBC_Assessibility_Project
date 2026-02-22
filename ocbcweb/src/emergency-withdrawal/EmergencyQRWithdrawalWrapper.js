import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import EmergencyQRWithdrawal from './EmergencyQRWithdrawal';

const EmergencyQRWithdrawalWrapper = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Get data from navigation state
  const accountAccess = location.state?.accountAccess;
  const emergencyLimit = location.state?.emergencyLimit || 300;

  return (
    <EmergencyQRWithdrawal
      accountAccess={accountAccess}
      currentUser={currentUser}
      emergencyLimit={emergencyLimit}
      onNavigateBack={() => navigate(-1)}
    />
  );
};

export default EmergencyQRWithdrawalWrapper;