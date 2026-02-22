import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, DollarSign, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  getPendingTransactionApprovals,
  getMyPendingTransactionRequests,
  approveTransactionRequest,
  rejectTransactionRequest,
  cancelTransactionRequest,
  getUserData
} from '../services/firebase';

const PendingTransactions = ({ accountAccess, isMobile }) => {
  const { currentUser } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [myPendingRequests, setMyPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [userData, setUserData] = useState(null);

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
    loadPendingTransactions();
    loadUserData();
  }, [currentUser]);

  const loadUserData = async () => {
    if (!currentUser) return;
    const result = await getUserData(currentUser.uid);
    if (result.success) {
      setUserData(result.data);
    }
  };

  const loadPendingTransactions = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // Get approvals that need my approval (as account owner or designated approver)
      const approvalsResult = await getPendingTransactionApprovals(currentUser.uid);
      if (approvalsResult.success) {
        setPendingApprovals(approvalsResult.approvals);
      }

      // Get my pending requests (transactions I initiated that need approval)
      const requestsResult = await getMyPendingTransactionRequests(currentUser.uid);
      if (requestsResult.success) {
        setMyPendingRequests(requestsResult.requests);
      }
    } catch (error) {
      console.error("Error loading pending transactions:", error);
    }
    setLoading(false);
  };

  const handleApprove = async (approvalId) => {
    if (!window.confirm("Are you sure you want to approve this transaction?")) return;

    setProcessingId(approvalId);
    const result = await approveTransactionRequest(approvalId);

    if (result.success) {
      alert("Transaction approved and processed successfully!");
      loadPendingTransactions();
    } else {
      alert("Error: " + result.error);
    }
    setProcessingId(null);
  };


  const handleReject = async (approvalId) => {
    const reason = prompt("Enter rejection reason (optional):");

    setProcessingId(approvalId);
    const result = await rejectTransactionRequest(approvalId, reason || "");

    if (result.success) {
      alert("Transaction rejected successfully.");
      loadPendingTransactions();
    } else {
      alert("Error: " + result.error);
    }
    setProcessingId(null);
  };

  const handleCancel = async (approvalId) => {
    if (!window.confirm("Are you sure you want to cancel this transaction request?")) return;

    setProcessingId(approvalId);
    const result = await cancelTransactionRequest(approvalId, currentUser.uid);

    if (result.success) {
      alert("Transaction request cancelled successfully.");
      loadPendingTransactions();
    } else {
      alert("Error: " + result.error);
    }
    setProcessingId(null);
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    if (diffHours === 0) {
      const diffMins = Math.floor(diffTime / (1000 * 60));
      return diffMins === 0 ? 'Just now' : `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Clock size={32} color={colors.textLight} style={{ marginBottom: '12px' }} />
        <div style={{ fontSize: '16px', color: colors.textSecondary, letterSpacing: '-0.2px' }}>Loading pending transactions...</div>
      </div>
    );
  }

  const hasPendingItems = pendingApprovals.length > 0 || myPendingRequests.length > 0;

  if (!hasPendingItems) {
    return null; // Don't show the section if there are no pending items
  }

  return (
    <div style={{ marginBottom: '32px', fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" }}>
      {/* Pending Approvals (Items needing MY approval) */}
      {pendingApprovals.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <Clock size={20} style={{ color: colors.warning }} />
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.textPrimary,
              margin: 0,
              letterSpacing: '-0.3px'
            }}>
              Pending Your Approval ({pendingApprovals.length})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                style={{
                  backgroundColor: colors.lightBeige,
                  border: `2px solid ${colors.warning}`,
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: 'none'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: approval.requestedBy === 'owner' ? colors.danger : colors.warning,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <User size={16} style={{ color: 'white' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, letterSpacing: '-0.2px' }}>
                          {approval.requestedBy === 'owner' ? "Review Owner's Transaction" : "Transaction Request"}
                        </div>
                        <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                          {formatDate(approval.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: colors.textPrimary,
                      marginBottom: '8px',
                      letterSpacing: '-0.5px'
                    }}>
                      {formatAmount(approval.amount)}
                    </div>

                    <div style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: '4px', letterSpacing: '-0.1px' }}>
                      <strong>To:</strong> {approval.recipientName}
                    </div>
                    <div style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '4px', letterSpacing: '-0.1px' }}>
                      <strong>Number:</strong> {approval.recipientNumber}
                    </div>
                    {approval.message && (
                      <div style={{ fontSize: '13px', color: colors.textSecondary, fontStyle: 'italic' }}>
                        "{approval.message}"
                      </div>
                    )}
                    {approval.requestedBy === 'owner' && (
                      <div style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        backgroundColor: colors.lightRed,
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: colors.danger,
                        fontWeight: '500',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <AlertCircle size={14} />
                        Owner exceeded limit. Approval required.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '8px',
                  paddingTop: '12px',
                  borderTop: `1px solid ${colors.warning}`
                }}>
                  <button
                    onClick={() => handleApprove(approval.id)}
                    disabled={processingId === approval.id}
                    style={{
                      flex: 1,
                      backgroundColor: colors.success,
                      color: 'white',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: processingId === approval.id ? 'not-allowed' : 'pointer',
                      opacity: processingId === approval.id ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      letterSpacing: '-0.2px'
                    }}
                  >
                    <CheckCircle size={16} />
                    {processingId === approval.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(approval.id)}
                    disabled={processingId === approval.id}
                    style={{
                      flex: 1,
                      backgroundColor: colors.danger,
                      color: 'white',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: processingId === approval.id ? 'not-allowed' : 'pointer',
                      opacity: processingId === approval.id ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      letterSpacing: '-0.2px'
                    }}
                  >
                    <XCircle size={16} />
                    {processingId === approval.id ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Pending Requests (Items I requested that are awaiting approval) */}
      {myPendingRequests.length > 0 && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <Clock size={20} style={{ color: '#3B82F6' }} />
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.textPrimary,
              margin: 0,
              letterSpacing: '-0.3px'
            }}>
              Your Pending Requests ({myPendingRequests.length})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myPendingRequests.map((request) => (
              <div
                key={request.id}
                style={{
                  backgroundColor: '#DBEAFE',
                  border: '2px solid #93C5FD',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: 'none'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#3B82F6',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Clock size={16} style={{ color: 'white' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E40AF', letterSpacing: '-0.2px' }}>
                          Awaiting Approval
                        </div>
                        <div style={{ fontSize: '12px', color: '#1E3A8A' }}>
                          {formatDate(request.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: colors.textPrimary,
                      marginBottom: '8px',
                      letterSpacing: '-0.5px'
                    }}>
                      {formatAmount(request.amount)}
                    </div>

                    <div style={{ fontSize: '14px', color: colors.textPrimary, marginBottom: '4px', letterSpacing: '-0.1px' }}>
                      <strong>To:</strong> {request.recipientName}
                    </div>
                    <div style={{ fontSize: '13px', color: colors.textSecondary, marginBottom: '4px', letterSpacing: '-0.1px' }}>
                      <strong>Number:</strong> {request.recipientNumber}
                    </div>
                    {request.message && (
                      <div style={{ fontSize: '13px', color: colors.textSecondary, fontStyle: 'italic' }}>
                        "{request.message}"
                      </div>
                    )}

                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: colors.textSecondary,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <AlertCircle size={14} />
                      {request.requestedBy === 'owner' ? 'The helper will review this request' : 'The account owner will review this request'}
                    </div>
                  </div>
                </div>

                <div style={{
                  paddingTop: '12px',
                  borderTop: '1px solid #93C5FD'
                }}>
                  <button
                    onClick={() => handleCancel(request.id)}
                    disabled={processingId === request.id}
                    style={{
                      width: '100%',
                      backgroundColor: 'white',
                      color: colors.textSecondary,
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: processingId === request.id ? 'not-allowed' : 'pointer',
                      opacity: processingId === request.id ? 0.6 : 1,
                      letterSpacing: '-0.2px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (processingId !== request.id) {
                        e.currentTarget.style.backgroundColor = colors.lightGrey;
                      }
                    }}
                    onMouseOut={(e) => {
                      if (processingId !== request.id) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    {processingId === request.id ? 'Processing...' : 'Cancel Request'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingTransactions;