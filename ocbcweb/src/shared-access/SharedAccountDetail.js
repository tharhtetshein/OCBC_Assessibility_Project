import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, User, Copy, TrendingDown, TrendingUp, CheckCircle, Clock, DollarSign, AlertCircle, SquareCheckBig, SquareX, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  getUserData, getUserTransactions, getPendingRequests, getPendingTransactionApprovals,
  getMyPendingTransactionRequests
} from '../services/firebase';
import PendingTransactions from './PendingTransaction';

const SharedAccountDetail = ({ account, onBack, isMobile }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(true);
  const [ownerData, setOwnerData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [myPendingRequestsCount, setMyPendingRequestsCount] = useState(0);

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
    lightGreen: '#E8F5E9',
    shadow: 'rgba(0, 0, 0, 0.05)',
    iconBg: '#FFE8D5'
  };

  useEffect(() => {
    loadAccountData();
  }, [account]);

  const loadAccountData = async () => {
  setLoading(true);
  try {
    console.log('Loading data for account:', account);
    console.log('Owner ID:', account.ownerId);

    // Get owner's data
    const ownerResult = await getUserData(account.ownerId);
    console.log('Owner data result:', ownerResult);
    
    if (ownerResult.success) {
      setOwnerData(ownerResult.data);
    }

    // Get owner's transactions (if permission allows)
    if (account.permissions.viewTransactions) {
      console.log('Fetching transactions for owner:', account.ownerId);
      const transactionsResult = await getUserTransactions(account.ownerId, 50);
      
      if (transactionsResult.success) {
        console.log(`Retrieved ${transactionsResult.transactions.length} total transactions`);
        
        // Filter and process transactions
        const processedTransactions = transactionsResult.transactions.map(txn => {
          // Determine transaction type and display info
          const isOutgoing = 
            txn.type === 'paynow' || 
            txn.type === 'investment_buy' ||
            txn.type === 'currency_exchange' ||
            txn.type === 'emergency_withdrawal' ||
            txn.type === 'amount_lock';
          
          const isIncoming = 
            txn.type === 'paynow_received' || 
            txn.type === 'received' ||
            txn.type === 'investment_sell' ||
            txn.type === 'amount_unlock';

          return {
            ...txn,
            isOutgoing,
            isIncoming,
            displayAmount: txn.amount,
            // Determine title based on type
            displayTitle: getTransactionTitle(txn),
            // Determine description based on type
            displayDescription: getTransactionDescription(txn)
          };
        });

        console.log(`Processed ${processedTransactions.length} transactions`);
        setTransactions(processedTransactions);
      } else {
        console.error('Failed to fetch transactions:', transactionsResult.error);
      }
    } else {
      console.log('No permission to view transactions');
    }

    // Get approved requests for this account
    const requestsResult = await getPendingRequests(account.ownerId);
    if (requestsResult.success) {
      const approved = requestsResult.requests.filter(req => req.status === 'approved');
      console.log(`Found ${approved.length} approved requests`);
      setApprovedRequests(approved);
    }

    // Load pending transaction approvals count
    const approvalsResult = await getPendingTransactionApprovals(currentUser.uid);
    if (approvalsResult.success) {
      // Filter for THIS account owner only
      const relevant = approvalsResult.approvals.filter(a => a.ownerId === account.ownerId);
      setPendingApprovalsCount(relevant.length);
    }

    // Load my pending transaction requests count
    const myRequestsResult = await getMyPendingTransactionRequests(currentUser.uid);
    if (myRequestsResult.success) {
      setMyPendingRequestsCount(myRequestsResult.requests.length);
    }

  } catch (error) {
    console.error("Error loading account data:", error);
  }
  setLoading(false);
};

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  // Get appropriate icon for transaction
const getTransactionIcon = (transaction) => {
  if (transaction.isOutgoing) {
    return <TrendingDown size={20} style={{ color: colors.danger }} />;
  } else if (transaction.isIncoming) {
    return <TrendingUp size={20} style={{ color: colors.success }} />;
  } else {
    return <RefreshCw size={20} style={{ color: colors.warning }} />;
  }
};

  const getTransactionTitle = (transaction) => {
  const typeMap = {
    'paynow': 'PayNow Transfer',
    'paynow_received': 'PayNow Received',
    'received': 'Money Received',
    'investment_buy': 'Investment Purchase',
    'investment_sell': 'Investment Sale',
    'currency_exchange': 'Currency Exchange',
    'emergency_withdrawal': 'Emergency Withdrawal',
    'amount_lock': 'Amount Locked',
    'amount_unlock': 'Amount Unlocked'
  };

  return typeMap[transaction.type] || 'Transaction';
};

  // Enhanced transaction description
const getTransactionDescription = (transaction) => {
  switch (transaction.type) {
    case 'paynow':
      return `To: ${transaction.recipientName || 'Unknown'} | ${transaction.recipientNumber || ''}`;
    
    case 'paynow_received':
    case 'received':
      return `From: ${transaction.senderName || 'Unknown'}${transaction.senderAccountNumber ? ` | ${transaction.senderAccountNumber}` : ''}`;
    
    case 'investment_buy':
      return `Bought ${transaction.shares?.toFixed(4) || 0} shares of ${transaction.ticker || 'N/A'} @ $${transaction.pricePerShare?.toFixed(2) || 0}`;
    
    case 'investment_sell':
      return `Sold ${transaction.shares?.toFixed(4) || 0} shares of ${transaction.ticker || 'N/A'} @ $${transaction.pricePerShare?.toFixed(2) || 0}`;
    
    case 'currency_exchange':
      return `${transaction.fromCurrency || ''} → ${transaction.toCurrency || ''} | Rate: ${transaction.exchangeRate?.toFixed(4) || 0}`;
    
    case 'emergency_withdrawal':
      return `Emergency cash withdrawal${transaction.atmId ? ` | ATM: ${transaction.atmId}` : ''}${transaction.method ? ` | Method: ${transaction.method}` : ''}`;
    
    case 'amount_lock':
      return 'Funds locked for ATM withdrawal';
    
    case 'amount_unlock':
      return 'Locked funds released';
    
    default:
      return transaction.message || transaction.reference || 'No description';
  }
};

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Account number copied!');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: colors.background }}>
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
        paddingTop: isMobile ? '48px' : '60px',
        paddingBottom: isMobile ? '24px' : '32px'
      }}>
        <div style={{
          maxWidth: isMobile ? '100%' : '600px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
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
              <ArrowLeft size={24} />
            </button>
            <h1 style={{
              fontSize: isMobile ? '18px' : '20px',
              fontWeight: '600',
              margin: 0,
              letterSpacing: '-0.3px'
            }}>{account.ownerName}</h1>
          </div>

          {/* Account Balance Card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            color: colors.textPrimary,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', color: colors.textSecondary, fontWeight: '500', letterSpacing: '-0.1px' }}>
                Account Balance
              </div>
              {account.permissions.viewBalance && (
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: colors.textSecondary,
                    padding: '4px',
                    borderRadius: '6px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: colors.iconBg,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px'
              }}>
                <User size={20} style={{ color: colors.primary }} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, letterSpacing: '-0.2px' }}>
                  {account.ownerName}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: colors.textSecondary,
                  fontFamily: 'monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {account.ownerAccountNumber}
                  <button
                    onClick={() => copyToClipboard(account.ownerAccountNumber)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.textSecondary,
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.textPrimary,
              marginBottom: '20px',
              marginTop: '16px',
              letterSpacing: '-0.5px'
            }}>
              {account.permissions.viewBalance ? (
                showBalance ? formatAmount(ownerData?.balance || 0) : '••••••'
              ) : (
                <div style={{ fontSize: '14px', color: colors.textSecondary, fontWeight: '400', letterSpacing: '-0.1px' }}>
                  No permission to view balance
                </div>
              )}
            </div>
            {/* Transaction Limit Info */}
            {account.transactionApprovalLimit !== undefined && account.transactionApprovalLimit > 0 && (
              <div style={{
                backgroundColor: colors.lightGrey,
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px', letterSpacing: '-0.1px' }}>
                  Transaction Approval Limit
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: colors.textPrimary, letterSpacing: '-0.3px' }}>
                  {formatAmount(account.transactionApprovalLimit)}
                </div>
                <div style={{ fontSize: '11px', color: colors.textLight, marginTop: '4px' }}>
                  Transactions above this amount require approval
                </div>
              </div>
            )}


            {/* Quick Actions */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              paddingTop: '16px',
              borderTop: `1px solid ${colors.border}`
            }}>
              <button
                onClick={() => navigate('/paynow', { state: { selectedAccountId: account.id } })}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: colors.lightGrey,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: account.permissions.makeTransfers ? 'pointer' : 'not-allowed',
                  opacity: account.permissions.makeTransfers ? 1 : 0.5,
                  transition: 'background-color 0.2s'
                }}
                disabled={!account.permissions.makeTransfers}
                onMouseOver={(e) => {
                  if (account.permissions.makeTransfers) {
                    e.currentTarget.style.backgroundColor = colors.border;
                  }
                }}
                onMouseOut={(e) => {
                  if (account.permissions.makeTransfers) {
                    e.currentTarget.style.backgroundColor = colors.lightGrey;
                  }
                }}>
                <User size={20} style={{ color: colors.textSecondary }} />
                <span style={{ fontSize: '11px', color: colors.textSecondary, textAlign: 'center', letterSpacing: '-0.1px' }}>
                  Manage Payee
                </span>
              </button>
              
              <button
                onClick={() => navigate('/paynow', { state: { selectedAccountId: account.id } })}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: colors.lightGrey,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: account.permissions.makeTransfers ? 'pointer' : 'not-allowed',
                  opacity: account.permissions.makeTransfers ? 1 : 0.5,
                  transition: 'background-color 0.2s'
                }}
                disabled={!account.permissions.makeTransfers}
                onMouseOver={(e) => {
                  if (account.permissions.makeTransfers) {
                    e.currentTarget.style.backgroundColor = colors.border;
                  }
                }}
                onMouseOut={(e) => {
                  if (account.permissions.makeTransfers) {
                    e.currentTarget.style.backgroundColor = colors.lightGrey;
                  }
                }}>
                <DollarSign size={20} style={{ color: colors.textSecondary }} />
                <span style={{ fontSize: '11px', color: colors.textSecondary, textAlign: 'center', letterSpacing: '-0.1px' }}>
                  Pay Bills
                </span>
              </button>
              
              <button
                onClick={() => {
                  if (account.permissions?.emergencyWithdrawal) {
                    navigate('/emergency-qr-withdrawal', { 
                      state: { 
                        accountAccess: account,
                        emergencyLimit: account.emergencyLimit || 0
                      } 
                    });
                  } else {
                    alert('Emergency withdrawal permission not granted');
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: account.permissions?.emergencyWithdrawal ? colors.lightRed : colors.lightGrey,
                  border: account.permissions?.emergencyWithdrawal ? `1px solid ${colors.danger}` : 'none',
                  borderRadius: '8px',
                  cursor: account.permissions?.emergencyWithdrawal ? 'pointer' : 'not-allowed',
                  opacity: account.permissions?.emergencyWithdrawal ? 1 : 0.5,
                  transition: 'all 0.2s'
                }}
                disabled={!account.permissions?.emergencyWithdrawal}
                onMouseOver={(e) => {
                  if (account.permissions?.emergencyWithdrawal) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`;
                  }
                }}
                onMouseOut={(e) => {
                  if (account.permissions?.emergencyWithdrawal) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}>
                <AlertCircle size={20} style={{ color: account.permissions?.emergencyWithdrawal ? colors.danger : colors.textSecondary }} />
                <span style={{ 
                  fontSize: '11px', 
                  color: account.permissions?.emergencyWithdrawal ? colors.danger : colors.textSecondary, 
                  textAlign: 'center',
                  fontWeight: account.permissions?.emergencyWithdrawal ? '600' : '400',
                  letterSpacing: '-0.1px'
                }}>
                  {account.permissions?.emergencyWithdrawal ? 'Emergency (QR)' : 'Emergency (Disabled)'}
                </span>
                {account.permissions?.emergencyWithdrawal && account.emergencyLimit && (
                  <span style={{ 
                    fontSize: '10px', 
                    color: colors.danger,
                    fontWeight: '500'
                  }}>
                    Up to ${account.emergencyLimit}
                  </span>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        padding: isMobile ? '16px' : '24px',
        maxWidth: isMobile ? '100%' : '600px',
        margin: '0 auto'
      }}>
       {/* Pending Transactions Section - Only shows if there is active data */}
        {(pendingApprovalsCount > 0 || myPendingRequestsCount > 0) && (
          <div style={{ marginBottom: '32px' }}>
            <PendingTransactions
              accountAccess={account}
              isMobile={isMobile}
            />
          </div>
        )}
        {/* Recent Activity Section */}
        {account.permissions.viewTransactions && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.textPrimary,
              marginBottom: '16px',
              letterSpacing: '-0.3px'
            }}>
              Recent Activity
            </h2>

            {transactions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                backgroundColor: colors.cardBg,
                borderRadius: '12px',
                color: colors.textSecondary
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: colors.lightGrey,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px'
                }}>
                  <TrendingUp size={32} color={colors.textLight} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: colors.textPrimary, letterSpacing: '-0.2px' }}>
                  No recent transactions
                </div>
                <div style={{ fontSize: '13px', letterSpacing: '-0.1px' }}>
                  Transactions will appear here once the account owner makes them
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {transactions.slice(0, 10).map((transaction) => (
                  <div
                    key={transaction.id}
                    style={{
                      backgroundColor: colors.cardBg,
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: 'none',
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        backgroundColor: transaction.isOutgoing ? colors.lightRed : colors.lightGreen,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {getTransactionIcon(transaction)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: colors.textPrimary,
                            marginBottom: '4px'
                          }}>
                            {transaction.displayTitle}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: colors.textSecondary
                          }}>
                            {transaction.displayDescription}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: colors.textLight,
                            marginTop: '2px'
                          }}>
                            {formatDate(transaction.createdAt)}
                          </div>
                      </div>
                    </div>
                    <div style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: transaction.isOutgoing ? colors.danger : colors.success
                      }}>
                        {transaction.isOutgoing ? '-' : '+'}
                        {formatAmount(transaction.displayAmount)}
                      </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Permission Approved Activity Section */}
        {account.permissions.approveRequests && approvedRequests.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.textPrimary,
              marginBottom: '16px',
              letterSpacing: '-0.3px'
            }}>
              Permission Approved Activity
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {approvedRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    backgroundColor: colors.cardBg,
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: 'none',
                    border: `1px solid ${colors.border}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      backgroundColor: '#E0F2FE',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <CheckCircle size={16} style={{ color: '#3B82F6' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, letterSpacing: '-0.2px' }}>
                        {request.requestType}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>
                        {request.accountOwner} - {request.accountNumber}
                      </div>
                      {request.reference && (
                        <div style={{ fontSize: '11px', color: colors.textLight, marginTop: '2px' }}>
                          {request.reference}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: colors.textLight, marginTop: '2px' }}>
                        Approved: {formatDate(request.approvedAt || request.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: colors.danger,
                    textAlign: 'right',
                    letterSpacing: '-0.3px'
                  }}>
                    -{formatAmount(request.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Permission Granted Section */}
        <div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.textPrimary,
            marginBottom: '16px',
            letterSpacing: '-0.3px'
          }}>
            Permission Granted
          </h2>

          <div style={{
            backgroundColor: colors.cardBg,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: 'none',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              paddingBottom: '16px',
              borderBottom: `1px solid ${colors.border}`
            }}>
              <CheckCircle size={20} style={{ color: colors.success }} />
              <span style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, letterSpacing: '-0.2px' }}>
                Your Access Permissions
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0'
              }}>
                <span style={{ fontSize: '14px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>View Balance</span>
                <span style={{ fontSize: '20px' }}>
                  {account.permissions.viewBalance ? <SquareCheckBig size={20} style={{ color: colors.success }} /> : <SquareX size={20} style={{ color: colors.textSecondary }} />}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0'
              }}>
                <span style={{ fontSize: '14px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>View Transactions</span>
                <span style={{ fontSize: '20px' }}>
                  {account.permissions.viewTransactions ? <SquareCheckBig size={20} style={{ color: colors.success }} /> : <SquareX size={20} style={{ color: colors.textSecondary }} />}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0'
              }}>
                <span style={{ fontSize: '14px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>Make Transfers</span>
                <span style={{ fontSize: '20px' }}>
                  {account.permissions.makeTransfers ? <SquareCheckBig size={20} style={{ color: colors.success }} /> : <SquareX size={20} style={{ color: colors.textSecondary }} />}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0'
              }}>
                <span style={{ fontSize: '14px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>Approve Requests</span>
                <span style={{ fontSize: '20px' }}>
                  {account.permissions.approveRequests ? <SquareCheckBig size={20} style={{ color: colors.success }} /> : <SquareX size={20} style={{ color: colors.textSecondary }} />}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0'
              }}>
                <span style={{ fontSize: '14px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>Emergency Withdrawal</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {account.permissions?.emergencyWithdrawal && account.emergencyLimit && (
                    <span style={{ 
                      fontSize: '12px', 
                      color: colors.danger,
                      fontWeight: '600',
                      backgroundColor: colors.lightRed,
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>
                      ${account.emergencyLimit}
                    </span>
                  )}
                  <span style={{ fontSize: '20px' }}>
                    {account.permissions?.emergencyWithdrawal ? <SquareCheckBig size={20} style={{ color: colors.success }} /> : <SquareX size={20} style={{ color: colors.textSecondary }} />}
                  </span>
                </div>
              </div>
            </div>

            {account.requireMutualConsent && (
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: `1px solid ${colors.border}`
              }}>
                <div style={{
                  backgroundColor: colors.lightBeige,
                  border: `1px solid ${colors.warning}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Clock size={16} style={{ color: colors.warning, flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: colors.textPrimary, letterSpacing: '-0.1px' }}>
                    <strong>Mutual Consent:</strong> Both parties must agree to revoke this access
                  </div>
                </div>
              </div>
            )}

            <div style={{
              marginTop: '16px',
              fontSize: '11px',
              color: colors.textLight,
              textAlign: 'center'
            }}>
              Access granted on {new Date(account.grantedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedAccountDetail;