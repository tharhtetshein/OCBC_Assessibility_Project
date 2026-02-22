import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { createEmergencySharedWithdrawal } from '../services/firebase';
import { ArrowLeft, AlertTriangle, DollarSign, QrCode, Download, Home, CheckCircle, Clock } from 'lucide-react';

const EmergencyQRWithdrawal = ({ 
  accountAccess,
  currentUser,
  emergencyLimit = 300,
  onNavigateBack
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState('intro');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const qrRef = useRef(null);

  // OCBC Theme Colors (matching SharedQRScreens)
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

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: colors.background,
      padding: '0',
      paddingBottom: '0',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      padding: '16px',
      backgroundColor: colors.cardBg,
      borderBottom: `1px solid ${colors.border}`,
      gap: '12px'
    },
    backButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      color: colors.textPrimary,
      display: 'flex',
      alignItems: 'center',
      borderRadius: '50%',
      transition: 'background-color 0.2s',
      fontSize: '24px'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: colors.textPrimary,
      margin: 0,
      letterSpacing: '-0.3px'
    },
    primaryButton: {
      width: '100%',
      padding: '16px',
      fontSize: '17px',
      fontWeight: '600',
      backgroundColor: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: '24px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: 'none',
      letterSpacing: '-0.3px'
    },
    secondaryButton: {
      width: '100%',
      padding: '16px',
      fontSize: '17px',
      fontWeight: '600',
      backgroundColor: colors.cardBg,
      color: colors.primary,
      border: `2px solid ${colors.primary}`,
      borderRadius: '24px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: 'none',
      letterSpacing: '-0.3px'
    },
    card: {
      backgroundColor: colors.cardBg,
      border: 'none',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '12px',
      boxShadow: 'none'
    },
    errorBox: {
      backgroundColor: '#FEE',
      border: `2px solid ${colors.danger}`,
      borderRadius: '12px',
      padding: '15px',
      marginBottom: '20px',
      color: '#C00',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  };

  const handleAmountContinue = () => {
    setError('');
    const amountNum = parseFloat(amount);
    
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum > emergencyLimit) {
      setError(`Amount exceeds emergency limit of $${emergencyLimit}`);
      return;
    }

    setStep('choose-method');
  };

  const handleGenerateQR = async () => {
    setError('');
    setLoading(true);
    
    try {
      // Create withdrawal session in Firebase
      const result = await createEmergencySharedWithdrawal(
        accountAccess.ownerId,
        currentUser.uid,
        parseFloat(amount),
        `ATM-${Date.now()}` // Simulated ATM ID
      );

      if (!result.success) {
        setError(result.error || 'Failed to create withdrawal session');
        setLoading(false);
        return;
      }

      // Save session data to state
      setSessionData({
        sessionId: result.sessionId,
        amount: parseFloat(amount),
        expiresAt: result.expiresAt,
        ownerId: accountAccess.ownerId,
        ownerName: accountAccess.ownerName
      });
      
      setStep('display-qr');
    } catch (err) {
      console.error('Error generating QR:', err);
      setError('Error generating QR code: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQRCode = () => {
    try {
      const svg = qrRef.current?.querySelector('svg');
      if (!svg) {
        setError('QR code not found');
        return;
      }

      // Convert SVG to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Download as PNG
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `emergency-withdrawal-${sessionData.sessionId}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          alert('QR code saved to your device!');
        });
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Error saving QR code:', err);
      setError('Failed to save QR code: ' + err.message);
    }
  };

  // INTRO SCREEN
  if (step === 'intro') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={onNavigateBack || (() => window.history.back())} 
            style={styles.backButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Emergency QR Withdrawal</h1>
        </div>

        <div style={{ padding: '16px', paddingBottom: '80px' }}>
          {/* Icon Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '20px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '24px',
              backgroundColor: colors.lightRed,
              borderRadius: '50%',
              marginBottom: '16px'
            }}>
              <AlertTriangle size={64} color={colors.danger} />
            </div>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '600',
              color: colors.danger,
              margin: 0,
              letterSpacing: '-0.3px',
              marginBottom: '12px'
            }}>
              Quick Emergency Cash
            </h2>
            <p style={{
              fontSize: '15px',
              color: colors.textSecondary,
              lineHeight: '1.6',
              letterSpacing: '-0.1px',
              margin: '0 auto',
              maxWidth: '90%'
            }}>
              Access emergency cash from {accountAccess?.ownerName}'s account using QR code technology.
            </p>
          </div>

          {/* Emergency Limit Card */}
          <div style={{
            backgroundColor: colors.lightBeige,
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '20px',
            border: `2px solid ${colors.warning}`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                display: 'inline-flex',
                padding: '8px',
                backgroundColor: 'rgba(248, 151, 40, 0.2)',
                borderRadius: '8px'
              }}>
                <DollarSign size={24} color={colors.warning} />
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.textPrimary,
                letterSpacing: '-0.2px'
              }}>
                Your Emergency Limit
              </div>
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: '700',
              color: colors.danger,
              marginBottom: '16px',
              letterSpacing: '-1px'
            }}>
              ${emergencyLimit}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.textSecondary,
              lineHeight: '1.8',
              letterSpacing: '-0.1px'
            }}>
              • Generate or scan QR code for instant access<br/>
              • No card needed, just your phone<br/>
              • Valid for 15 minutes at any OCBC ATM
            </div>
          </div>

          {/* Get Started Button */}
          <button 
            onClick={() => setStep('amount')}
            style={styles.primaryButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.primary}
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  // AMOUNT SELECTION SCREEN
  if (step === 'amount') {
    const quickAmounts = [50, 100, 200, emergencyLimit];

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => setStep('intro')} 
            style={styles.backButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Enter Amount</h1>
        </div>

        <div style={{ padding: '16px', paddingBottom: '80px' }}>
          {/* Icon Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '20px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '24px',
              backgroundColor: colors.iconBg,
              borderRadius: '50%',
              marginBottom: '16px'
            }}>
              <DollarSign size={56} color={colors.primary} />
            </div>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '600',
              color: colors.textPrimary,
              margin: 0,
              letterSpacing: '-0.3px'
            }}>
              How much do you need?
            </h2>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {/* Amount Input Card */}
          <div style={{
            ...styles.card,
            padding: '24px',
            marginBottom: '20px'
          }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              color: colors.textSecondary,
              letterSpacing: '-0.1px'
            }}>
              Amount (SGD)
            </label>
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => { setAmount(e.target.value); setError(''); }}
              placeholder="0.00"
              style={{ 
                width: '100%', 
                fontSize: '32px', 
                fontWeight: '700', 
                padding: '20px', 
                border: `3px solid ${colors.border}`, 
                borderRadius: '12px', 
                textAlign: 'center', 
                boxSizing: 'border-box',
                fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
                letterSpacing: '-0.5px'
              }}
              autoFocus 
            />
            
            {/* Quick Amount Buttons */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              marginTop: '16px'
            }}>
              {quickAmounts.map(quickAmount => (
                <button 
                  key={quickAmount} 
                  onClick={() => { setAmount(quickAmount.toString()); setError(''); }}
                  style={{ 
                    padding: '14px', 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    backgroundColor: colors.lightGrey, 
                    border: `2px solid ${colors.border}`, 
                    borderRadius: '12px', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    letterSpacing: '-0.2px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = colors.primary;
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = colors.primary;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = colors.lightGrey;
                    e.currentTarget.style.color = colors.textPrimary;
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  ${quickAmount}
                </button>
              ))}
            </div>

            {/* Limit Display */}
            <div style={{
              marginTop: '16px',
              padding: '14px',
              backgroundColor: colors.lightRed,
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '13px',
                color: colors.textSecondary,
                marginBottom: '4px',
                letterSpacing: '-0.1px'
              }}>
                Emergency Limit
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: colors.danger,
                letterSpacing: '-0.3px'
              }}>
                ${emergencyLimit}
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button 
            onClick={handleAmountContinue}
            disabled={!amount || parseFloat(amount) <= 0}
            style={{ 
              ...styles.primaryButton, 
              backgroundColor: amount && parseFloat(amount) > 0 ? colors.primary : '#ccc',
              cursor: amount && parseFloat(amount) > 0 ? 'pointer' : 'not-allowed'
            }}
            onMouseOver={(e) => {
              if (amount && parseFloat(amount) > 0) {
                e.currentTarget.style.backgroundColor = colors.primaryDark;
              }
            }}
            onMouseOut={(e) => {
              if (amount && parseFloat(amount) > 0) {
                e.currentTarget.style.backgroundColor = colors.primary;
              }
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // CHOOSE METHOD SCREEN
  if (step === 'choose-method') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => setStep('amount')} 
            style={styles.backButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Choose Method</h1>
        </div>

        <div style={{ padding: '16px', paddingBottom: '80px' }}>
          {/* Icon Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '20px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '24px',
              backgroundColor: '#E3F2FD',
              borderRadius: '50%',
              marginBottom: '16px'
            }}>
              <QrCode size={56} color='#2196F3' />
            </div>
          </div>
          
          {/* Amount Display */}
          <div style={{
            backgroundColor: '#E3F2FD',
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '20px',
            border: '2px solid #2196F3',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1976D2',
              marginBottom: '8px',
              letterSpacing: '-0.1px'
            }}>
              Withdrawal Amount
            </div>
            <div style={{
              fontSize: '36px',
              fontWeight: '700',
              color: colors.danger,
              letterSpacing: '-1px'
            }}>
              ${parseFloat(amount).toFixed(2)}
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {/* Method Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Show QR Code Option */}
            <button 
              onClick={handleGenerateQR}
              disabled={loading}
              style={{ 
                backgroundColor: loading ? colors.border : '#E3F2FD', 
                border: '3px solid #2196F3', 
                borderRadius: '16px', 
                padding: '24px', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                transition: 'all 0.2s', 
                minHeight: '120px',
                opacity: loading ? 0.6 : 1,
                textAlign: 'left'
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px rgba(33, 150, 243, 0.3)`;
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <div style={{
                display: 'inline-flex',
                padding: '16px',
                backgroundColor: loading ? colors.lightGrey : 'rgba(33, 150, 243, 0.1)',
                borderRadius: '50%',
                marginBottom: '12px'
              }}>
                {loading ? (
                  <Clock size={32} color='#9e9e9e' />
                ) : (
                  <QrCode size={32} color='#2196F3' />
                )}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '8px',
                color: colors.textPrimary,
                letterSpacing: '-0.3px'
              }}>
                {loading ? 'Generating...' : 'Show QR Code'}
              </div>
              <div style={{
                fontSize: '14px',
                color: colors.textSecondary,
                letterSpacing: '-0.1px'
              }}>
                Generate a QR code to scan at the ATM
              </div>
            </button>

            {/* Scan QR Code Option (Disabled) */}
            <div
              style={{ 
                backgroundColor: colors.lightGrey, 
                border: `3px solid ${colors.border}`, 
                borderRadius: '16px', 
                padding: '24px', 
                cursor: 'not-allowed', 
                minHeight: '120px',
                opacity: 0.5,
                position: 'relative',
                textAlign: 'left'
              }}
            >
              <div style={{
                display: 'inline-flex',
                padding: '16px',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderRadius: '50%',
                marginBottom: '12px'
              }}>
                <QrCode size={32} color='#999' />
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#999',
                letterSpacing: '-0.3px'
              }}>
                Scan QR Code
              </div>
              <div style={{
                fontSize: '14px',
                color: '#999',
                letterSpacing: '-0.1px',
                marginBottom: '8px'
              }}>
                Upload a previously saved QR code
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#ff6b6b', 
                fontStyle: 'italic',
                letterSpacing: '-0.1px'
              }}>
                *To be scanned at physical ATM but not available right now
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DISPLAY QR SCREEN
  if (step === 'display-qr') {
    const qrData = JSON.stringify({
      sessionId: sessionData.sessionId,
      amount: sessionData.amount,
      expiresAt: sessionData.expiresAt,
      ownerId: sessionData.ownerId
    });

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={onNavigateBack || (() => window.history.back())} 
            style={styles.backButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Your QR Code</h1>
        </div>
        
        <div style={{ padding: '16px', paddingBottom: '80px' }}>
          {/* Success Icon */}
          <div style={{ textAlign: 'center', marginBottom: '20px', marginTop: '20px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '20px',
              backgroundColor: '#E8F5E9',
              borderRadius: '50%',
              marginBottom: '12px'
            }}>
              <CheckCircle size={48} color={colors.success} />
            </div>
          </div>

          {/* QR Code Card */}
          <div style={{
            ...styles.card,
            padding: '24px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <div 
              ref={qrRef}
              style={{ 
                width: '250px', 
                height: '250px', 
                margin: '0 auto 20px', 
                backgroundColor: 'white', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                border: `3px solid ${colors.border}`,
                padding: '10px'
              }}
            >
              <QRCodeSVG 
                value={qrData}
                size={230}
                level="H"
                includeMargin={false}
              />
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.textSecondary,
              fontWeight: '600',
              marginBottom: '6px',
              letterSpacing: '-0.1px'
            }}>
              Withdrawal Amount
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.danger,
              marginBottom: '12px',
              letterSpacing: '-0.5px'
            }}>
              ${sessionData.amount.toFixed(2)}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.textSecondary,
              letterSpacing: '-0.1px'
            }}>
              From: {sessionData.ownerName}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.textLight,
              marginTop: '10px',
              fontFamily: 'monospace'
            }}>
              Session: {sessionData.sessionId.slice(0, 20)}...
            </div>
          </div>

          {/* Instructions Card */}
          <div style={{
            backgroundColor: colors.lightBeige,
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '20px',
            border: `2px solid ${colors.warning}`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px'
            }}>
              <AlertTriangle size={20} color={colors.warning} />
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                margin: 0,
                color: colors.textPrimary,
                letterSpacing: '-0.2px'
              }}>
                Important Instructions:
              </h3>
            </div>
            <ol style={{
              margin: 0,
              paddingLeft: '20px',
              color: colors.textSecondary,
              fontSize: '14px',
              lineHeight: '1.8',
              letterSpacing: '-0.1px'
            }}>
              <li>Save this QR code using the button below</li>
              <li>Go to any OCBC ATM within 15 minutes</li>
              <li>Select "Emergency QR Withdrawal"</li>
              <li>Scan this code at the ATM</li>
              <li>Collect your ${sessionData.amount.toFixed(2)}</li>
            </ol>
            <div style={{
              marginTop: '12px',
              padding: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '8px',
              fontSize: '13px',
              color: colors.textPrimary,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              letterSpacing: '-0.1px'
            }}>
              <Clock size={16} color={colors.warning} />
              This QR code expires at {new Date(sessionData.expiresAt).toLocaleTimeString()}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={handleSaveQRCode}
              style={{ 
                ...styles.primaryButton, 
                backgroundColor: '#2196F3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}
            >
              <Download size={20} />
              Save QR Code to Device
            </button>

            <button 
              onClick={() => navigate('/dashboard')}
              style={{
                ...styles.secondaryButton,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightRed}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.cardBg}
            >
              <Home size={20} />
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default EmergencyQRWithdrawal;