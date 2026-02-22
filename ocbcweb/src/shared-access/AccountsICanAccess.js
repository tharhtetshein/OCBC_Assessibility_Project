import React, { useState, useEffect } from 'react';
import { ArrowLeft, Shield, Building2, Eye } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getAccountsICanAccess } from '../services/firebase';

const AccountsICanAccess = ({ onBack, onSelectAccount, isMobile }) => {
  const { currentUser } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadAccounts();
    }
  }, [currentUser]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading accounts for user:', currentUser.uid);
      const result = await getAccountsICanAccess(currentUser.uid);
      console.log('📦 Result:', result);
      
      if (result.success) {
        setAccounts(result.accounts);
        console.log(`✅ Found ${result.accounts.length} accounts`);
      } else {
        console.error('❌ Error:', result.error);
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
    setLoading(false);
  };

  const handleSelectAccount = (account) => {
    // You can navigate to view the account details
    if (onSelectAccount) {
      onSelectAccount(account);
    } else {
      alert(`Viewing account: ${account.ownerName} (${account.ownerAccountNumber})`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳ Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Header */}
      <div style={{ 
        backgroundColor: '#e31837', 
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
              padding: '8px'
            }}
          >
            <ArrowLeft size={isMobile ? 24 : 28} />
          </button>
          <h1 style={{ 
            fontSize: isMobile ? '20px' : '28px', 
            fontWeight: '600', 
            margin: 0,
            flex: 1
          }}>Accounts I Can Access</h1>
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        padding: isMobile ? '16px' : '32px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔐</div>
            <h2 style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '12px', color: '#1f2937' }}>
              No shared accounts yet
            </h2>
            <p style={{ color: '#6b7280', fontSize: isMobile ? '14px' : '16px' }}>
              When someone grants you access to their account, it will appear here
            </p>
          </div>
        ) : (
          <>
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              gap: '12px',
              alignItems: 'start'
            }}>
              <Shield size={20} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>
                  You have access to {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '13px', color: '#1e40af' }}>
                  You can view and manage these accounts based on the permissions granted to you
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '20px'
            }}>
              {accounts.map((account) => (
                <div
                  key={account.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    ':hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                    }
                  }}
                  onClick={() => handleSelectAccount(account)}
                >
                  {/* Account Header */}
                  <div style={{ display: 'flex', alignItems: 'start', marginBottom: '20px' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: '#e31837',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '16px'
                    }}>
                      <Building2 size={30} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                        {account.ownerName}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', fontFamily: 'monospace' }}>
                        {account.ownerAccountNumber}
                      </div>
                    </div>
                  </div>

                  {/* Permissions Badge */}
                  <div style={{ 
                    backgroundColor: '#f0fdf4', 
                    borderRadius: '8px', 
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      color: '#15803d', 
                      marginBottom: '8px',
                      letterSpacing: '0.5px'
                    }}>
                      YOUR PERMISSIONS
                    </div>
                    <div style={{ fontSize: '13px', color: '#166534', lineHeight: '1.8' }}>
                      {account.permissions.viewBalance && <div>✓ View Balance</div>}
                      {account.permissions.viewTransactions && <div>✓ View Transactions</div>}
                      {account.permissions.makeTransfers && <div>✓ Make Transfers</div>}
                      {account.permissions.approveRequests && <div>✓ Approve Requests</div>}
                    </div>
                  </div>

                  {/* Access Info */}
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#9ca3af', 
                    marginBottom: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f3f4f6'
                  }}>
                    Access granted: {new Date(account.grantedAt).toLocaleDateString()}
                  </div>

                  {/* View Button */}
                  <button
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#e31837',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Eye size={18} />
                    View Account
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountsICanAccess;