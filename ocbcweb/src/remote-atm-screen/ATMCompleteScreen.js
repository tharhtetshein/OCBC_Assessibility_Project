import React from 'react';

const ATMCompleteScreen = ({ selectedAction, amount, securityAction, navigate, setCurrentStep }) => {
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    primaryButton: {
      width: '100%',
      padding: '20px',
      fontSize: '18px',
      fontWeight: '700',
      backgroundColor: '#e31837',
      color: 'white',
      border: 'none',
      borderRadius: '15px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      minHeight: '65px'
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ textAlign: 'center', marginTop: '60px', marginBottom: '40px' }}>
        <div style={{ fontSize: '100px', marginBottom: '30px', animation: 'bounce 1s' }}>✅</div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }`}</style>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#4caf50', marginBottom: '15px' }}>Transaction Complete!</h1>
        <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
          {selectedAction === 'withdrawal' ? `You can now collect $${amount} from the ATM` :
           selectedAction === 'deposit' ? 'Your deposit has been processed' :
           selectedAction === 'amount-lock' ? (securityAction === 'lock' ? `$${amount} has been locked` : `$${amount} has been unlocked`) :
           securityAction === 'lock' ? 'ATM withdrawals are now locked' : 'ATM withdrawals are now unlocked'}
        </p>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '25px', marginBottom: '30px', border: '2px solid #e0e0e0' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: '#333', textAlign: 'center' }}>Transaction Summary</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ color: '#666' }}>Type:</span>
            <span style={{ fontWeight: '600' }}>
              {selectedAction === 'withdrawal' ? 'Cash Withdrawal' : 
               selectedAction === 'deposit' ? 'Cash Deposit' : 
               selectedAction === 'amount-lock' ? 'Amount Lock/Unlock' :
               'Security Update'}
            </span>
          </div>
          {amount && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ color: '#666' }}>Amount:</span>
              <span style={{ fontWeight: '600', color: '#e31837' }}>${amount} SGD</span>
            </div>
          )}
          {selectedAction === 'amount-lock' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ color: '#666' }}>Action:</span>
              <span style={{ fontWeight: '600' }}>{securityAction === 'lock' ? 'Locked' : 'Unlocked'}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span style={{ color: '#666' }}>Date:</span>
            <span style={{ fontWeight: '600' }}>{new Date().toLocaleDateString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
            <span style={{ color: '#666' }}>Time:</span>
            <span style={{ fontWeight: '600' }}>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <button onClick={() => navigate('/dashboard')}
        data-help-id="remote-atm-return-dashboard"
        style={{ ...styles.primaryButton, marginBottom: '15px' }}
        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#c41530'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#e31837'; e.currentTarget.style.transform = 'translateY(0)'; }}>
        Return to Dashboard
      </button>

      <button onClick={() => setCurrentStep('hub')}
        style={{ width: '100%', padding: '18px', fontSize: '16px', fontWeight: '600', backgroundColor: 'white', color: '#e31837', border: '2px solid #e31837', borderRadius: '15px', cursor: 'pointer', transition: 'all 0.2s' }}>
        Start New Transaction
      </button>
    </div>
  );
};

export default ATMCompleteScreen;
