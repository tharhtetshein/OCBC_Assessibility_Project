import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Shield, Check, X, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { 
  getMyPendingInvitationsV2,
  acceptAccessInvitationV2,
  declineAccessInvitation
} from '../services/firebase';

//PendingInvitations
// This shows invitations the user has received and needs to accept/decline
const PendingInvitations = ({ onBack, isMobile }) => {
  const { currentUser } = useAuth();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  // OCBC Theme Colors
  const colors = {
    primary: '#E52629',
    primaryDark: '#C41F21',
    secondary: '#4A5568',
    background: '#F5F5F5',
    cardBg: '#FFFFFF',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    textLight: '#A0AEC0',
    border: '#E2E8F0',
    success: '#00A651',
    warning: '#F89728',
    danger: '#E52629',
    lightRed: '#FFF5F5',
    lightGrey: '#F7FAFC',
    lightBeige: '#FFF8F0',
    shadow: 'rgba(0, 0, 0, 0.05)',
    iconBg: '#FFE8D5'
  };

  useEffect(() => {
    if (currentUser) {
      loadInvitations();
    }
  }, [currentUser]);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const result = await getMyPendingInvitationsV2(currentUser.uid);
      if (result.success) {
        setInvitations(result.invitations);
      }
    } catch (error) {
      console.error("Error loading invitations:", error);
    }
    setLoading(false);
  };

  const handleAccept = async (invitationId, ownerName) => {
    if (window.confirm(`Accept access invitation from ${ownerName}?`)) {
      const result = await acceptAccessInvitationV2(invitationId, currentUser.uid);
      
      if (result.success) {
        alert(`You now have access to ${ownerName}'s account!`);
        loadInvitations();
      } else {
        alert("Error accepting invitation: " + result.error);
      }
    }
  };

  const handleDecline = async (invitationId, ownerName) => {
    if (window.confirm(`Decline access invitation from ${ownerName}?`)) {
      const result = await declineAccessInvitation(invitationId);
      
      if (result.success) {
        alert("Invitation declined");
        loadInvitations();
      } else {
        alert("Error declining invitation: " + result.error);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Clock size={40} color={colors.textLight} style={{ marginBottom: '16px' }} />
          <div style={{ fontSize: '18px', color: colors.textSecondary, letterSpacing: '-0.2px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: colors.background,
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: colors.primary, 
        color: 'white', 
        padding: isMobile ? '16px' : '20px 40px', 
        paddingTop: isMobile ? '48px' : '60px' 
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: isMobile ? '24px' : '32px',
          maxWidth: '1200px',
          margin: '0 auto',
          marginBottom: isMobile ? '24px' : '32px'
        }}>
          <button 
            onClick={onBack}
            style={{ 
              marginRight: '16px', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center',
              padding: '8px',
              borderRadius: '50%',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={isMobile ? 24 : 28} />
          </button>
          <h1 style={{ 
            fontSize: isMobile ? '20px' : '28px', 
            fontWeight: '600', 
            margin: 0,
            flex: 1,
            letterSpacing: '-0.4px'
          }}>Pending Invitations</h1>
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        padding: isMobile ? '16px' : '32px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {invitations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: colors.lightGrey,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <Mail size={40} color={colors.textLight} />
            </div>
            <h2 style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '12px', color: colors.textPrimary, letterSpacing: '-0.3px' }}>
              No pending invitations
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: isMobile ? '14px' : '16px', letterSpacing: '-0.1px' }}>
              When someone invites you to access their account, it will appear here
            </p>
          </div>
        ) : (
          <>
            <div style={{
              backgroundColor: '#EFF6FF',
              border: `1px solid #BFDBFE`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              gap: '12px',
              alignItems: 'start'
            }}>
              <Mail size={20} style={{ color: '#3B82F6', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF', marginBottom: '4px', letterSpacing: '-0.2px' }}>
                  You have {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '13px', color: '#1E40AF', letterSpacing: '-0.1px' }}>
                  Review and accept or decline access to these accounts
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: '20px'
            }}>
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  style={{
                    backgroundColor: colors.cardBg,
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: 'none',
                    border: `1px solid ${colors.border}`
                  }}
                >
                  {/* Invitation Header */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: colors.textPrimary, marginBottom: '8px', letterSpacing: '-0.3px' }}>
                      {invitation.ownerName}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '4px', letterSpacing: '-0.1px' }}>
                      wants to give you access to their account
                    </div>
                    {invitation.ownerEmail && (
                      <div style={{ fontSize: '13px', color: colors.textLight, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                        <Mail size={14} />
                        {invitation.ownerEmail}
                      </div>
                    )}
                  </div>

                  {/* Account Number */}
                  <div style={{
                    backgroundColor: colors.lightGrey,
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary, marginBottom: '4px', letterSpacing: '0.5px' }}>
                      ACCOUNT NUMBER
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary, fontFamily: 'monospace', letterSpacing: '1px' }}>
                      {invitation.ownerAccountNumber}
                    </div>
                  </div>

                  {/* Permissions */}
                  <div style={{ 
                    backgroundColor: '#F0FDF4', 
                    borderRadius: '8px', 
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: '#15803D', 
                      marginBottom: '8px',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Shield size={12} />
                      PERMISSIONS YOU'LL RECEIVE
                    </div>
                    <div style={{ fontSize: '13px', color: '#166534', lineHeight: '1.8' }}>
                      {invitation.permissions.viewBalance && <div>✓ View Balance</div>}
                      {invitation.permissions.viewTransactions && <div>✓ View Transactions</div>}
                      {invitation.permissions.makeTransfers && <div>✓ Make Transfers</div>}
                      {invitation.permissions.approveRequests && <div>✓ Approve Requests</div>}
                    </div>
                  </div>

                  {/* Mutual Consent Badge */}
                  {invitation.requireMutualConsent && (
                    <div style={{
                      backgroundColor: colors.lightBeige,
                      border: `1px solid ${colors.warning}`,
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Shield size={16} style={{ color: colors.warning, flexShrink: 0 }} />
                      <div style={{ fontSize: '12px', color: colors.textPrimary, lineHeight: '1.5', letterSpacing: '-0.1px' }}>
                        <strong>Mutual Consent:</strong> Both parties must agree to revoke this access
                      </div>
                    </div>
                  )}

                  {/* Expiry Info */}
                  <div style={{ 
                    fontSize: '12px', 
                    color: colors.textLight, 
                    marginBottom: '16px',
                    paddingTop: '12px',
                    borderTop: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Clock size={12} />
                    Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleAccept(invitation.id, invitation.ownerName)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: colors.success,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        letterSpacing: '-0.2px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <Check size={18} />
                      Accept
                    </button>
                    <button
                      onClick={() => handleDecline(invitation.id, invitation.ownerName)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: colors.lightGrey,
                        color: colors.textSecondary,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        letterSpacing: '-0.2px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.border}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
                    >
                      <X size={18} />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PendingInvitations;