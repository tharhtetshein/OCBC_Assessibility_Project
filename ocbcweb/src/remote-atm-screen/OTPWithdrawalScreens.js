import React from 'react';
import { speak, speakPrivate, vibrate } from './atmUtils';
import { verifyEmergencyOTP } from "../services/firebase";
import { ArrowLeft, Key, CheckCircle, AlertTriangle, Volume2, Copy, Clipboard } from 'lucide-react';

const OTPWithdrawalScreens = ({
  currentStep,
  onBack,
  setCurrentStep,
  navigate
}) => {
  const [otp, setOtp] = React.useState('');
  const [processing, setProcessing] = React.useState(false);
  const [withdrawalResult, setWithdrawalResult] = React.useState(null);

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
    progressText: {
      textAlign: 'center',
      padding: '12px 16px',
      backgroundColor: colors.lightGrey,
      borderBottom: `1px solid ${colors.border}`,
      color: colors.textSecondary,
      fontSize: '14px',
      fontWeight: '500',
      letterSpacing: '-0.1px'
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
    voiceButton: {
      width: '100%',
      padding: '16px',
      backgroundColor: colors.lightGrey,
      border: `2px solid ${colors.border}`,
      borderRadius: '24px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      fontSize: '15px',
      fontWeight: '600',
      color: colors.textSecondary,
      transition: 'all 0.2s ease',
      letterSpacing: '-0.2px'
    }
  };

  // Handle OTP input change with validation
  const handleOtpChange = (value) => {
    // Only allow numbers and limit to 6 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setOtp(numericValue);
    
    if (numericValue.length > 0) {
      speakPrivate(`OTP: ${numericValue.split('').join(' ')}`);
    }
  };

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const numericValue = text.replace(/\D/g, '').slice(0, 6);
      
      if (numericValue.length === 6) {
        setOtp(numericValue);
        vibrate([50]);
        speak('OTP pasted from clipboard');
      } else if (numericValue.length > 0) {
        speak('Pasted text is not a 6-digit OTP');
        alert('The clipboard content is not a valid 6-digit OTP');
      } else {
        speak('No valid OTP found in clipboard');
        alert('No valid OTP found in clipboard');
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      speak('Failed to read clipboard. Please enter OTP manually.');
      alert('Failed to read clipboard. Please enter OTP manually or grant clipboard permission.');
    }
  };

  // Handle OTP verification and withdrawal
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      speak('OTP should be 6 digits');
      alert('OTP should be 6 digits');
      return;
    }

    setProcessing(true);

    try {
      speak('Verifying OTP. Please wait.');
      
      const result = await verifyEmergencyOTP(otp);
      
      if (!result.success) {
        speak(`Verification failed: ${result.error}`);
        alert(`Verification failed: ${result.error}`);
        vibrate([100, 50, 100]);
        setProcessing(false);
        return;
      }
      
      // Success
      setWithdrawalResult(result);
      vibrate([50, 100, 50, 100, 50]);
      speakPrivate(`Withdrawal successful. ${result.amount} dollars dispensed. Please collect your cash.`);
      setCurrentStep('otp-success');
      
    } catch (error) {
      console.error('Verification error:', error);
      speak(`Error verifying OTP: ${error.message}`);
      alert(`Error verifying OTP: ${error.message}`);
      vibrate([100, 50, 100]);
      setProcessing(false);
    }
  };

  // OTP ENTRY SCREEN
  if (currentStep === 'otp-entry') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => {
              onBack();
              speak('Returned to main menu');
            }} 
            style={styles.backButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Emergency OTP Withdrawal</h1>
        </div>

        <div style={styles.progressText}>Enter Your OTP</div>

        <div style={{ padding: '16px', paddingBottom: '80px' }}>
          {/* Header Icon */}
          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '20px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '24px',
              backgroundColor: colors.iconBg,
              borderRadius: '50%',
              marginBottom: '20px'
            }}>
              <Key size={56} color={colors.primary} />
            </div>
            <h2 style={{
              fontSize: '22px',
              fontWeight: '600',
              color: colors.textPrimary,
              marginBottom: '12px',
              letterSpacing: '-0.3px'
            }}>
              Enter Emergency OTP
            </h2>
            <p style={{
              fontSize: '15px',
              color: colors.textSecondary,
              lineHeight: '1.6',
              letterSpacing: '-0.1px'
            }}>
              Enter the 6-digit OTP code from your emergency withdrawal session
            </p>
          </div>

          {/* OTP Input Card */}
          <div style={{ ...styles.card, marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: colors.textSecondary,
              marginBottom: '12px',
              letterSpacing: '-0.1px'
            }}>
              One-Time Password
            </label>
            
            <input
              type="tel"
              inputMode="numeric"
              value={otp}
              onChange={(e) => handleOtpChange(e.target.value)}
              placeholder="000000"
              maxLength={6}
              style={{
                width: '100%',
                fontSize: '48px',
                fontWeight: '700',
                padding: '20px',
                border: `2px solid ${colors.border}`,
                borderRadius: '16px',
                textAlign: 'center',
                boxSizing: 'border-box',
                backgroundColor: colors.cardBg,
                color: colors.textPrimary,
                letterSpacing: '8px',
                fontFamily: 'monospace',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = colors.primary}
              onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
              autoFocus
            />

            {/* Character counter */}
            <div style={{
              textAlign: 'right',
              marginTop: '8px',
              fontSize: '13px',
              color: otp.length === 6 ? colors.success : colors.textLight,
              fontWeight: '600',
              letterSpacing: '-0.1px'
            }}>
              {otp.length} / 6 digits
            </div>

            {/* Paste Button */}
            <button
              onClick={handlePasteFromClipboard}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '14px',
                fontSize: '15px',
                fontWeight: '600',
                backgroundColor: colors.lightGrey,
                color: colors.textPrimary,
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                letterSpacing: '-0.2px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = colors.border;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = colors.lightGrey;
              }}
            >
              <Clipboard size={18} />
              Paste from Clipboard
            </button>
          </div>

          {/* Info Banner */}
          <div style={{
            backgroundColor: colors.lightBeige,
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${colors.warning}`,
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              fontSize: '14px',
              color: colors.textPrimary,
              lineHeight: '1.5',
              letterSpacing: '-0.1px'
            }}>
              <AlertTriangle size={20} color={colors.warning} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Important:</strong> This OTP is valid for one-time use only. The withdrawal amount will be deducted from the account owner's balance.
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleVerifyOTP}
            disabled={otp.length !== 6 || processing}
            style={{
              ...styles.primaryButton,
              backgroundColor: otp.length === 6 && !processing ? colors.success : '#D1D5DB',
              cursor: otp.length === 6 && !processing ? 'pointer' : 'not-allowed',
              opacity: processing ? 0.7 : 1,
              marginBottom: '12px'
            }}
            onMouseOver={(e) => {
              if (otp.length === 6 && !processing) {
                e.currentTarget.style.backgroundColor = '#00842A';
              }
            }}
            onMouseOut={(e) => {
              if (otp.length === 6 && !processing) {
                e.currentTarget.style.backgroundColor = colors.success;
              }
            }}
          >
            {processing ? 'Verifying...' : 'Verify & Withdraw'}
          </button>

          {/* Cancel Button */}
          <button
            onClick={() => {
              setOtp('');
              onBack();
              speak('OTP withdrawal cancelled');
            }}
            disabled={processing}
            style={{
              ...styles.secondaryButton,
              opacity: processing ? 0.5 : 1,
              cursor: processing ? 'not-allowed' : 'pointer'
            }}
            onMouseOver={(e) => {
              if (!processing) {
                e.currentTarget.style.backgroundColor = colors.lightRed;
              }
            }}
            onMouseOut={(e) => {
              if (!processing) {
                e.currentTarget.style.backgroundColor = colors.cardBg;
              }
            }}
          >
            Cancel
          </button>

          {/* Voice Guide */}
          <button
            onClick={() => speak('Enter the 6-digit OTP from your emergency withdrawal session. You can type it manually or paste from clipboard. Press Verify and Withdraw when ready.')}
            style={{
              ...styles.voiceButton,
              marginTop: '16px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = colors.border;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = colors.lightGrey;
            }}
          >
            <Volume2 size={20} />
            Play Voice Guide
          </button>
        </div>
      </div>
    );
  }

  // SUCCESS SCREEN
  if (currentStep === 'otp-success' && withdrawalResult) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Withdrawal Complete</h1>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Success Icon */}
          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '32px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '24px',
              backgroundColor: '#E8F5E9',
              borderRadius: '50%',
              marginBottom: '16px',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              <CheckCircle size={64} color={colors.success} />
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: colors.textPrimary,
              margin: 0,
              letterSpacing: '-0.3px'
            }}>
              Withdrawal Successful!
            </h2>
          </div>

          <style>{`
            @keyframes pulse { 
              0%, 100% { transform: scale(1); opacity: 1; } 
              50% { transform: scale(1.05); opacity: 0.9; } 
            }
          `}</style>

          {/* Amount Display Card */}
          <div style={{
            ...styles.card,
            textAlign: 'center',
            padding: '32px 24px',
            marginBottom: '20px',
            backgroundColor: colors.primary,
            color: 'white'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              letterSpacing: '1px',
              marginBottom: '12px',
              opacity: 0.9
            }}>
              AMOUNT WITHDRAWN
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              marginBottom: '8px',
              letterSpacing: '-1px'
            }}>
              ${withdrawalResult.amount}
            </div>
            <div style={{
              fontSize: '14px',
              opacity: 0.9,
              fontWeight: '500'
            }}>
              SGD
            </div>
          </div>

          {/* Transaction Details Card */}
          <div style={{ ...styles.card, marginBottom: '20px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.textPrimary,
              marginBottom: '16px',
              letterSpacing: '-0.2px'
            }}>
              Transaction Details
            </h3>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: `1px solid ${colors.border}`
            }}>
              <span style={{
                fontSize: '14px',
                color: colors.textSecondary,
                fontWeight: '500'
              }}>
                Status
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.success
              }}>
                Completed
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: `1px solid ${colors.border}`
            }}>
              <span style={{
                fontSize: '14px',
                color: colors.textSecondary,
                fontWeight: '500'
              }}>
                Transaction Type
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.textPrimary
              }}>
                Emergency Withdrawal
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '12px'
            }}>
              <span style={{
                fontSize: '14px',
                color: colors.textSecondary,
                fontWeight: '500'
              }}>
                Date & Time
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.textPrimary
              }}>
                {new Date().toLocaleString()}
              </span>
            </div>
          </div>

          {/* Instructions Card */}
          <div style={{
            backgroundColor: '#E8F5E9',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            border: 'none'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              fontSize: '14px',
              color: colors.textPrimary,
              lineHeight: '1.5',
              letterSpacing: '-0.1px'
            }}>
              <CheckCircle size={20} color={colors.success} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Please collect your cash from the ATM dispenser.</strong> The withdrawal amount has been deducted from the account.
              </div>
            </div>
          </div>

          {/* Done Button */}
          <button
            onClick={() => {
              setOtp('');
              setWithdrawalResult(null);
              navigate('/dashboard');
              speak('Returning to dashboard');
            }}
            style={styles.primaryButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.primary}
          >
            Done
          </button>

          {/* Voice Guide */}
          <button
            onClick={() => speakPrivate(`Withdrawal successful. Amount withdrawn: ${withdrawalResult.amount} dollars. Please collect your cash from the ATM dispenser. Transaction completed at ${new Date().toLocaleTimeString()}.`)}
            style={{
              ...styles.voiceButton,
              marginTop: '16px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = colors.border;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = colors.lightGrey;
            }}
          >
            <Volume2 size={20} />
            Read Details (Private Audio)
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default OTPWithdrawalScreens;