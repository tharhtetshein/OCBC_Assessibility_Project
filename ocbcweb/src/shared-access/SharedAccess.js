import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Building2, Eye, EyeOff, Bell, Clock, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  addSharedAccessRequest,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  getAccountsICanAccess,
  getMyPendingInvitationsV2,
  getMyRevocationRequests,
  getPendingTransactionApprovals,
  getMyPendingTransactionRequests
} from '../services/firebase';
import PeopleWithAccess from './PeopleWithAccess';
import AccountsICanAccess from './AccountsICanAccess';
import PendingInvitations from './PendingInvitations';
import SharedAccountDetail from './SharedAccountDetail';
import PendingTransactions from './PendingTransaction';

const SharedAccess = () => {
  const { currentUser } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('list');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showBalance, setShowBalance] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notification counts
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [pendingRevocationsCount, setPendingRevocationsCount] = useState(0);
  const [pendingApprovalsList, setPendingApprovalsList] = useState([]);
  const [pendingTransactionApprovalsCount, setPendingTransactionApprovalsCount] = useState(0);
  const [myPendingTransactionRequestsCount, setMyPendingTransactionRequestsCount] = useState(0);

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
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;

    setLoading(true);

    try {
      // Get pending requests
      const requestsResult = await getPendingRequests(currentUser.uid);
      if (requestsResult.success) {
        setPendingRequests(requestsResult.requests);
      }

      // Get accounts I can access
      const accessResult = await getAccountsICanAccess(currentUser.uid);
      if (accessResult.success) {
        setAccounts(accessResult.accounts);
      }

      // Get pending invitations count
      const invitationsResult = await getMyPendingInvitationsV2(currentUser.uid);
      if (invitationsResult.success) {
        setPendingInvitationsCount(invitationsResult.invitations.length);
      }

      // Get pending revocations count
      const revocationsResult = await getMyRevocationRequests(currentUser.uid);
      if (revocationsResult.success) {
        setPendingRevocationsCount(revocationsResult.requests.length);
      }
      // Get pending transaction approvals count (transactions needing MY approval)
      const transactionApprovalsResult = await getPendingTransactionApprovals(currentUser.uid);
      if (transactionApprovalsResult.success) {
        setPendingTransactionApprovalsCount(transactionApprovalsResult.approvals.length);
        // Store the actual array so we can check account IDs later
        setPendingApprovalsList(transactionApprovalsResult.approvals);
      }

      // Get my pending transaction requests count (MY transactions awaiting approval)
      const myTransactionRequestsResult = await getMyPendingTransactionRequests(currentUser.uid);
      if (myTransactionRequestsResult.success) {
        setMyPendingTransactionRequestsCount(myTransactionRequestsResult.requests.length);
      }

    } catch (error) {
      console.error("Error loading data:", error);
    }

    setLoading(false);
  };

  const handleApprove = async (requestId) => {
    const result = await approveRequest(currentUser.uid, requestId);
    if (result.success) {
      alert('Request approved successfully');
      loadData();
    } else {
      alert('Error approving request: ' + result.error);
    }
  };

  const handleReject = async (requestId) => {
    const result = await rejectRequest(currentUser.uid, requestId);
    if (result.success) {
      alert('Request rejected successfully');
      loadData();
    } else {
      alert('Error rejecting request: ' + result.error);
    }
  };

  const toggleBalance = (accountId) => {
    setShowBalance(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const totalNotifications = pendingInvitationsCount + pendingRevocationsCount + pendingTransactionApprovalsCount + myPendingTransactionRequestsCount;

  const AccountListScreen = () => (
    <div style={{ minHeight: '100vh', backgroundColor: colors.background, fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }}>
      {/* Header */}
      <div style={{
        backgroundColor: colors.primary,
        padding: isMobile ? '20px 16px' : '32px 40px',
        color: 'white',
        paddingBottom: '0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '24px',
          maxWidth: isMobile ? '100%' : '1200px',
          margin: '0 auto 24px auto'
        }}>
          <button
            onClick={() => window.history.back()}
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
            <ArrowLeft size={24} />
          </button>
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '600', margin: 0, letterSpacing: '-0.3px' }}>Shared Access</h1>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.3)',
          maxWidth: isMobile ? '100%' : '1200px',
          margin: '0 auto'
        }}>
          <button style={{
            flex: 1,
            paddingBottom: '12px',
            textAlign: 'center',
            fontWeight: '600',
            fontSize: isMobile ? '14px' : '16px',
            borderBottom: currentScreen === 'list' ? '2px solid white' : 'none',
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            opacity: currentScreen === 'list' ? 1 : 0.75,
            letterSpacing: '-0.2px'
          }}
            onClick={() => setCurrentScreen('list')}>
            Accounts you can access
          </button>
          <button
            onClick={() => setCurrentScreen('people')}
            data-help-id="shared-access-people-tab"
            style={{
              flex: 1,
              paddingBottom: '12px',
              textAlign: 'center',
              fontWeight: '600',
              fontSize: isMobile ? '14px' : '16px',
              opacity: currentScreen === 'people' ? 1 : 0.75,
              background: 'none',
              borderBottom: currentScreen === 'people' ? '2px solid white' : 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              letterSpacing: '-0.2px'
            }}
          >
            People with Access
          </button>
        </div>
      </div>

      {/* Notifications Banner */}
      {totalNotifications > 0 && (
        <div style={{
          backgroundColor: colors.lightBeige,
          borderBottom: `2px solid ${colors.warning}`,
          padding: '16px 32px',
          cursor: 'pointer'
        }}
          onClick={() => setCurrentScreen('invitations')}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Bell size={20} style={{ color: colors.warning }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: '4px', letterSpacing: '-0.2px' }}>
                {totalNotifications} pending notification{totalNotifications !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '13px', color: colors.textSecondary, display: 'flex', flexWrap: 'wrap', gap: '4px', letterSpacing: '-0.1px' }}>
                {pendingInvitationsCount > 0 && (
                  <span>• {pendingInvitationsCount} invitation{pendingInvitationsCount !== 1 ? 's' : ''}</span>
                )}
                {pendingRevocationsCount > 0 && (
                  <span>• {pendingRevocationsCount} revocation{pendingRevocationsCount !== 1 ? 's' : ''}</span>
                )}
                {pendingTransactionApprovalsCount > 0 && (
                  <span>• {pendingTransactionApprovalsCount} transaction approval{pendingTransactionApprovalsCount !== 1 ? 's' : ''}</span>
                )}
                {myPendingTransactionRequestsCount > 0 && (
                  <span>• {myPendingTransactionRequestsCount} pending transfer{myPendingTransactionRequestsCount !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account List */}
      <div style={{
        padding: isMobile ? '16px' : '32px',
        maxWidth: isMobile ? '100%' : '1200px',
        margin: '0 auto'
      }}>
        {/* Pending Transaction Approvals */}
        <PendingTransactions isMobile={isMobile} />

        {accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: colors.lightGrey,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <FileText size={40} color={colors.textLight} />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: colors.textPrimary, letterSpacing: '-0.3px' }}>No shared accounts yet</div>
            <div style={{ fontSize: '14px', letterSpacing: '-0.1px' }}>Accept an invitation to view shared accounts here</div>
          </div>
        ) : (
          <div style={{
            display: isMobile ? 'block' : 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: isMobile ? '0' : '24px'
          }}>
            {accounts.map(account => {
              // Check if this account has pending transaction approvals or requests
              const hasNotifications = pendingApprovalsList.some(approval => 
                approval.accountId === account.id || approval.accountNumber === account.ownerAccountNumber
              );

              return (
                <div
                  key={account.id}
                  onClick={() => {
                    setSelectedAccount(account);
                    setCurrentScreen('detail');
                  }}
                  style={{
                    backgroundColor: colors.cardBg,
                    borderRadius: isMobile ? '12px' : '16px',
                    padding: isMobile ? '16px' : '20px',
                    marginBottom: isMobile ? '12px' : '0',
                    boxShadow: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: hasNotifications ? `2px solid ${colors.warning}` : `1px solid ${colors.border}`,
                    position: 'relative'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {hasNotifications && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: colors.warning,
                      color: 'white',
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      letterSpacing: '0.5px'
                    }}>
                      NEW
                    </div>
                  )}

                  <div style={{
                    width: isMobile ? '40px' : '50px',
                    height: isMobile ? '40px' : '50px',
                    backgroundColor: colors.iconBg,
                    borderRadius: '50%',
                    marginRight: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.primary,
                    fontWeight: '600',
                    fontSize: isMobile ? '16px' : '18px'
                  }}>
                    {account.ownerName[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: '600',
                      color: colors.textPrimary,
                      fontSize: isMobile ? '16px' : '18px',
                      letterSpacing: '-0.3px'
                    }}>{account.ownerName}</div>
                    <div style={{
                      fontSize: isMobile ? '14px' : '15px',
                      color: colors.textSecondary,
                      letterSpacing: '-0.1px'
                    }}>{account.ownerAccountNumber}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: isMobile ? '12px' : '14px',
                      height: isMobile ? '12px' : '14px',
                      backgroundColor: colors.success,
                      borderRadius: '50%'
                    }}></div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBalance(account.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: colors.textSecondary,
                        padding: '8px',
                        borderRadius: '6px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.stopPropagation();
                        e.currentTarget.style.backgroundColor = colors.lightGrey;
                      }}
                      onMouseOut={(e) => {
                        e.stopPropagation();
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {showBalance[account.id] ? <EyeOff size={isMobile ? 20 : 24} /> : <Eye size={isMobile ? 20 : 24} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pending Approvals */}
        {pendingRequests.length > 0 && (
          <div style={{ marginTop: isMobile ? '24px' : '40px' }}>
            <h2 style={{
              fontSize: isMobile ? '18px' : '22px',
              fontWeight: '600',
              color: colors.textPrimary,
              marginBottom: isMobile ? '12px' : '20px',
              letterSpacing: '-0.3px'
            }}>Do you want to approve?</h2>
            <div style={{
              display: isMobile ? 'block' : 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: isMobile ? '0' : '24px'
            }}>
              {pendingRequests.map(request => (
                <div key={request.id} style={{
                  backgroundColor: colors.lightRed,
                  border: `1px solid ${colors.danger}`,
                  borderRadius: isMobile ? '12px' : '16px',
                  padding: isMobile ? '16px' : '20px',
                  marginBottom: isMobile ? '12px' : '0'
                }}>
                  <div style={{
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: '600',
                    color: colors.textPrimary,
                    marginBottom: '4px',
                    letterSpacing: '-0.2px'
                  }}>{request.requestType}</div>
                  <div style={{
                    fontSize: isMobile ? '12px' : '14px',
                    color: colors.textSecondary,
                    marginBottom: '4px',
                    letterSpacing: '-0.1px'
                  }}>{request.accountOwner} - {request.accountNumber}</div>
                  <div style={{
                    fontSize: isMobile ? '12px' : '14px',
                    color: colors.textSecondary,
                    marginBottom: '12px',
                    letterSpacing: '-0.1px'
                  }}>{request.reference}</div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? '12px' : '0'
                  }}>
                    <div style={{
                      fontSize: isMobile ? '20px' : '24px',
                      fontWeight: '700',
                      color: colors.textPrimary,
                      letterSpacing: '-0.5px'
                    }}>${request.amount}</div>
                    <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
                      <button
                        onClick={() => handleApprove(request.id)}
                        style={{
                          backgroundColor: colors.primary,
                          color: 'white',
                          padding: isMobile ? '10px 24px' : '10px 32px',
                          borderRadius: '20px',
                          fontSize: isMobile ? '14px' : '15px',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          flex: isMobile ? 1 : 'none',
                          fontWeight: '600',
                          letterSpacing: '-0.2px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        style={{
                          backgroundColor: 'white',
                          border: `1px solid ${colors.border}`,
                          color: colors.textSecondary,
                          padding: isMobile ? '10px 24px' : '10px 32px',
                          borderRadius: '20px',
                          fontSize: isMobile ? '14px' : '15px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          flex: isMobile ? 1 : 'none',
                          fontWeight: '600',
                          letterSpacing: '-0.2px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const PeopleWithAccessScreen = () => (
    <PeopleWithAccess
      user={currentUser}
      onBack={() => window.history.back()}
      onSwitchToSharedAccess={() => {
        setCurrentScreen('list');
        loadData();
      }}
      showBackButton={true}
      isMobile={isMobile}
    />
  );

  const InvitationsScreen = () => (
    <PendingInvitations
      onBack={() => {
        setCurrentScreen('list');
        loadData();
      }}
      isMobile={isMobile}
    />
  );

  // Account Detail Screen with real component
  const AccountDetailScreen = () => (
    <SharedAccountDetail
      account={selectedAccount}
      onBack={() => {
        setCurrentScreen('list');
        setSelectedAccount(null);
        loadData(); // Reload to update notification counts
      }}
      isMobile={isMobile}
    />
  );

  return (
    <div style={{
      maxWidth: isMobile ? '100%' : '100%',
      margin: '0 auto',
      backgroundColor: colors.background
    }}>
      {currentScreen === 'list' && <AccountListScreen />}
      {currentScreen === 'people' && <PeopleWithAccessScreen />}
      {currentScreen === 'invitations' && <InvitationsScreen />}
      {currentScreen === 'detail' && <AccountDetailScreen />}
    </div>
  );
};

export default SharedAccess;