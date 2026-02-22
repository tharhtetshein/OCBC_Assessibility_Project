import React from 'react';
import { speak, speakPrivate, vibrate, generateSessionCode} from './atmUtils';
import ATMCompleteScreen from './ATMCompleteScreen';
import SharedQRScreens from './SharedQRScreens';
import OTPWithdrawalScreens from './OTPWithdrawalScreens';
import { Asterisk, BanknoteArrowDown, ArrowLeft, DollarSign, Wallet, Lock, Unlock, Shield, QrCode, Volume2, LockKeyhole,  CheckCircle, AlertTriangle, Clock, BanknoteX } from 'lucide-react';

const ATMScreens = ({
  currentStep,
  selectedAction,
  amount,
  setAmount,
  sessionCode,
  securityAction,
  timeRemaining,
  navigate,
  onActionSelect,
  onSecurityChoice,
  onPrepareWithdrawal,
  onATMConfirm,
  onFinalConfirm,
  onBack,
  setCurrentStep,
  setSessionCode,
  setSecurityAction,
  startTimer,
  userId,
  userData
}) => {

  const [lockAmount, setLockAmount] = React.useState('');
  const [lockAction, setLockAction] = React.useState('');
  const [qrScanMethod, setQrScanMethod] = React.useState('');
  const [scannedQRData, setScannedQRData] = React.useState(null);
  const videoRef = React.useRef(null);
   
  // OCBC Theme Colors
  const colors = {
    primary: '#E52629',         // OCBC Red
    primaryDark: '#C41F21',     // Darker red for hover states
    secondary: '#4A5568',       // Grey text
    background: '#F5F5F5',      // Light grey background
    cardBg: '#FFFFFF',          // White cards
    textPrimary: '#2D3748',     // Dark grey/black text
    textSecondary: '#718096',   // Medium grey text
    textLight: '#A0AEC0',       // Light grey text
    border: '#E2E8F0',          // Light border
    success: '#00A651',         // Green
    warning: '#F89728',         // Orange
    danger: '#E52629',          // Red
    lightRed: '#FFF5F5',        // Very light red/beige tint
    lightGrey: '#F7FAFC',       // Very light grey
    lightBeige: '#FFF8F0',      // Light beige
    shadow: 'rgba(0, 0, 0, 0.05)',
    iconBg: '#FFE8D5'           // Peach/orange background for icons
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
      gap: '12px',
      marginBottom: '0'
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
      fontSize: '22px'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: colors.textPrimary,
      margin: 0,
      letterSpacing: '-0.3px'
    },
    progressText: {
      padding: '12px 16px',
      backgroundColor: colors.lightGrey,
      color: colors.textSecondary,
      fontSize: '13px',
      fontWeight: '500',
      letterSpacing: '-0.1px',
      borderBottom: `1px solid ${colors.border}`
    },
    illustration: {
      textAlign: 'center',
      fontSize: '64px',
      marginBottom: '24px',
      marginTop: '32px'
    },
    heading: {
      fontSize: '20px',
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: '12px',
      color: colors.textPrimary,
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
      letterSpacing: '-0.3px',
      boxShadow: 'none'
    },
    card: {
      backgroundColor: colors.cardBg,
      border: 'none',
      borderRadius: '16px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'left',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      minHeight: '80px',
      boxShadow: 'none',
      marginBottom: '12px'
    },
    iconContainer: {
      display: 'inline-flex',
      padding: '20px',
      borderRadius: '50%',
      marginBottom: '16px'
    },
    infoCard: {
      backgroundColor: colors.cardBg,
      borderRadius: '16px',
      padding: '24px',
      border: 'none',
      boxShadow: 'none'
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // HUB SCREEN
  if (currentStep === 'hub') {
    const actionCards = [
      { id: 'withdrawal', icon: BanknoteArrowDown, title: 'Cash Withdrawal', description: 'Prepare withdrawal on your phone', color: colors.success },
      { id: 'deposit', icon: Wallet, title: 'Cash Deposit', description: 'Prepare deposit on your phone', color: colors.primary, disabled: true },
      { id: 'security', icon: BanknoteX, title: 'ATM Security Settings', description: 'Lock or unlock ATM withdrawals', color: colors.warning },
      { id: 'amount-lock', icon: LockKeyhole, title: 'Amount Lock', description: 'Lock/unlock specific amounts in your account', color: colors.textSecondary },
      { id: 'shared-qr', icon: QrCode, title: 'Shared Access QR Withdrawal', description: 'Scan QR code to withdraw from shared account', color: colors.primary },
      { id: 'otp-withdrawal', icon: Asterisk, title: 'OTP Withdrawal', description: 'Input saved Emergency Withdrawal OTP to withdraw cash', color: colors.success }
    ];

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={styles.backButton} 
            aria-label="Go back"
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Remote ATM Access</h1>
        </div>
        <div style={styles.progressText}>Step 1 of 4: Choose Action</div>
        
        <div style={{ padding: '16px' }}>
          <div style={{ 
            backgroundColor: colors.lightBeige, 
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: '20px', 
            border: 'none' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>♿</span>
              <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: colors.textPrimary, letterSpacing: '-0.2px' }}>
                Accessible Banking
              </h2>
            </div>
            <p style={{ margin: 0, lineHeight: '1.6', color: colors.textSecondary, fontSize: '14px', letterSpacing: '-0.1px' }}>
              Control ATM transactions from your phone with voice guidance, and step-by-step instructions.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {actionCards.map(card => {
              const IconComponent = card.icon;
              return (
                <button 
                  key={card.id} 
                  data-help-id={`remote-atm-action-${card.id}`}
                  onClick={() => {
                    if (!card.disabled) {
                      if (card.id === 'otp-withdrawal') {
                        setCurrentStep('otp-entry');
                      } else {
                        onActionSelect(card.id);
                      }
                      speak(`${card.title} selected. ${card.description}`);
                      vibrate([50]);
                    }
                  }}
                  disabled={card.disabled}
                  style={{
                    ...styles.card,
                    opacity: card.disabled ? 0.5 : 1,
                    cursor: card.disabled ? 'not-allowed' : 'pointer',
                    pointerEvents: card.disabled ? 'none' : 'auto'
                  }}
                  onMouseOver={(e) => {
                    if (!card.disabled) {
                      e.currentTarget.style.backgroundColor = colors.lightGrey;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!card.disabled) {
                      e.currentTarget.style.backgroundColor = colors.cardBg;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <div style={{ 
                    width: '56px', 
                    height: '56px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    backgroundColor: colors.iconBg, 
                    borderRadius: '12px', 
                    flexShrink: 0
                  }}>
                    <IconComponent size={28} color={card.color} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontSize: '17px', 
                      fontWeight: '600', 
                      color: colors.textPrimary, 
                      marginBottom: '4px', 
                      letterSpacing: '-0.3px' 
                    }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>
                      {card.description}
                    </div>
                  </div>
                  <div style={{ fontSize: '24px', color: colors.textLight }}>›</div>
                </button>
              );
            })}
          </div>

          <button 
            onClick={() => speak('Remote ATM Access. Choose an action: Cash Withdrawal, Cash Deposit, ATM Security Settings, Amount Lock, or Shared Access QR Withdrawal.')}
            style={{ 
              marginTop: '20px', 
              width: '100%', 
              padding: '16px', 
              backgroundColor: colors.lightGrey, 
              border: 'none', 
              borderRadius: '24px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px', 
              fontSize: '15px', 
              fontWeight: '600', 
              color: colors.textSecondary, 
              letterSpacing: '-0.2px', 
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.border}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
          >
            <Volume2 size={18} />
            Play Voice Guide
          </button>
        </div>
      </div>
    );
  }

  // SECURITY CHOICE SCREEN
  if (currentStep === 'security-choice') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => {
              onBack();
              speak('Returned to main menu');
            }} 
            style={styles.backButton} 
            aria-label="Go back"
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>ATM Security</h1>
        </div>
        <div style={styles.progressText}>Step 2 of 4: Choose Action</div>
        
        <div style={{ padding: '16px' }}>
          <div style={{ ...styles.illustration, display: 'flex', justifyContent: 'center' }}>
            <Lock size={64} color={colors.textSecondary} strokeWidth={1.5} />
          </div>
          <h2 style={styles.heading}>Manage ATM Withdrawals</h2>
          <p style={{ 
            textAlign: 'center', 
            color: colors.textSecondary, 
            fontSize: '15px', 
            lineHeight: '1.6', 
            marginBottom: '32px', 
            letterSpacing: '-0.1px' 
          }}>
            Control your ATM withdrawal access for added security
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={() => {
                onSecurityChoice('lock');
                speak('Lock withdrawals selected. This will prevent all ATM cash withdrawals.');
                vibrate([50, 100]);
              }}
              style={{ 
                backgroundColor: colors.lightBeige, 
                border: 'none', 
                borderRadius: '16px', 
                padding: '24px', 
                cursor: 'pointer', 
                transition: 'all 0.2s', 
                minHeight: '100px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
              onMouseOver={(e) => { 
                e.currentTarget.style.transform = 'translateY(-2px)'; 
                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`; 
              }}
              onMouseOut={(e) => { 
                e.currentTarget.style.transform = 'translateY(0)'; 
                e.currentTarget.style.boxShadow = 'none'; 
              }}
            >
              <Lock size={36} color={colors.warning} strokeWidth={2} style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px', color: colors.textPrimary, letterSpacing: '-0.3px' }}>
                Lock Withdrawals
              </div>
              <div style={{ fontSize: '14px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>
                Prevent all ATM cash withdrawals
              </div>
            </button>

            <button 
              onClick={() => {
                onSecurityChoice('unlock');
                speak('Unlock withdrawals selected. This will enable ATM cash withdrawals.');
                vibrate([50, 100]);
              }}
              style={{ 
                backgroundColor: '#E8F5E9', 
                border: 'none', 
                borderRadius: '16px', 
                padding: '24px', 
                cursor: 'pointer', 
                transition: 'all 0.2s', 
                minHeight: '100px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}
              onMouseOver={(e) => { 
                e.currentTarget.style.transform = 'translateY(-2px)'; 
                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`; 
              }}
              onMouseOut={(e) => { 
                e.currentTarget.style.transform = 'translateY(0)'; 
                e.currentTarget.style.boxShadow = 'none'; 
              }}
            >
              <Unlock size={36} color={colors.success} strokeWidth={2} style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px', color: colors.textPrimary, letterSpacing: '-0.3px' }}>
                Unlock Withdrawals
              </div>
              <div style={{ fontSize: '14px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>
                Enable ATM cash withdrawals
              </div>
            </button>
          </div>

          <button 
            onClick={() => speak('ATM Security Settings. Choose to lock withdrawals to prevent all ATM cash withdrawals, or unlock withdrawals to enable them.')}
            style={{ 
              marginTop: '20px', 
              width: '100%', 
              padding: '16px', 
              backgroundColor: colors.lightGrey, 
              border: 'none', 
              borderRadius: '24px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px', 
              fontSize: '15px', 
              fontWeight: '600', 
              color: colors.textSecondary, 
              letterSpacing: '-0.2px', 
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.border}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
          >
            <Volume2 size={18} />
            Play Voice Guide
          </button>
        </div>
      </div>
    );
  }

  // PREPARE WITHDRAWAL SCREEN
  if (currentStep === 'prepare' && selectedAction === 'withdrawal') {
    const quickAmounts = [50, 100, 200, 500, 1000, 2000];

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => {
              onBack();
              speak('Returned to action selection');
            }} 
            style={styles.backButton} 
            aria-label="Go back"
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Cash Withdrawal</h1>
        </div>
        <div style={styles.progressText}>Step 2 of 4: Enter Amount</div>
        
        <div style={{ padding: '16px' }}>
          <div style={{ ...styles.illustration, display: 'flex', justifyContent: 'center' }}>
            <DollarSign size={64} color={colors.success} strokeWidth={1.5} />
          </div>
          <h2 style={styles.heading}>How much do you want to withdraw?</h2>

          <div style={{ ...styles.infoCard, marginBottom: '24px', marginTop: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '13px', 
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
              onChange={(e) => {
                setAmount(e.target.value);
                if (e.target.value) {
                  speakPrivate(`Amount set to ${e.target.value} dollars`);
                }
              }} 
              placeholder="0.00"
              data-help-id="remote-atm-amount-input"
              style={{ 
                width: '100%', 
                fontSize: '44px', 
                fontWeight: '600', 
                padding: '20px', 
                border: `2px solid ${colors.border}`, 
                borderRadius: '16px', 
                textAlign: 'center', 
                boxSizing: 'border-box', 
                backgroundColor: colors.cardBg, 
                color: colors.textPrimary, 
                letterSpacing: '-1px', 
                outline: 'none', 
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = colors.primary}
              onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
              aria-label="Enter withdrawal amount" 
              autoFocus 
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '20px' }}>
              {quickAmounts.map(quickAmount => (
                <button 
                  key={quickAmount} 
                  onClick={() => {
                    setAmount(quickAmount.toString());
                    speakPrivate(`${quickAmount} dollars selected`);
                    vibrate([30]);
                  }}
                  style={{ 
                    padding: '15px', 
                    fontSize: '17px', 
                    fontWeight: '600', 
                    backgroundColor: colors.lightGrey, 
                    border: 'none', 
                    borderRadius: '12px', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    color: colors.textPrimary,
                    letterSpacing: '-0.3px'
                  }}
                  onMouseOver={(e) => { 
                    e.currentTarget.style.backgroundColor = colors.primary; 
                    e.currentTarget.style.color = 'white'; 
                  }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.backgroundColor = colors.lightGrey; 
                    e.currentTarget.style.color = colors.textPrimary; 
                  }}
                >
                  ${quickAmount}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => {
              onPrepareWithdrawal();
              speakPrivate(`Preparing withdrawal of ${amount} dollars. Please wait.`);
              vibrate([50, 50, 50]);
            }} 
            disabled={!amount || parseFloat(amount) <= 0}
            data-help-id="remote-atm-continue"
            style={{ 
              ...styles.primaryButton, 
              backgroundColor: amount && parseFloat(amount) > 0 ? colors.primary : '#D1D5DB', 
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

          <button 
            onClick={() => speak('Enter the amount you want to withdraw. You can type an amount or select from quick amounts: 50, 100, 200, 500, 1000, or 2000 dollars.')}
            style={{ 
              marginTop: '16px', 
              width: '100%', 
              padding: '16px', 
              backgroundColor: colors.lightGrey, 
              border: 'none', 
              borderRadius: '24px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px', 
              fontSize: '15px', 
              fontWeight: '600', 
              color: colors.textSecondary, 
              letterSpacing: '-0.2px', 
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.border}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
          >
            <Volume2 size={18} />
            Play Voice Guide
          </button>
        </div>
      </div>
    );
  }

  // WAITING FOR ATM SCREEN
  if (currentStep === 'waiting') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => {
              onBack();
              speak('Session cancelled. Returned to previous screen.');
            }} 
            style={styles.backButton} 
            aria-label="Go back"
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Ready to Go</h1>
        </div>
        <div style={styles.progressText}>Step 3 of 4: Go to ATM</div>
        
        <div style={{ padding: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '32px', animation: 'pulse 2s infinite' }}>
            <CheckCircle size={64} color={colors.success} strokeWidth={1.5} />
          </div>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>

          <div 
            data-help-id="remote-atm-session-code"
            style={{ 
              backgroundColor: colors.primary, 
              borderRadius: '16px', 
              padding: '32px 24px', 
              marginBottom: '24px', 
              color: 'white', 
              textAlign: 'center',
              boxShadow: 'none'
            }}
          >
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              marginBottom: '16px', 
              opacity: 0.9,
              letterSpacing: '1px'
            }}>
              Your OTP Session Code
            </div>
            <div style={{ 
              fontSize: '48px', 
              fontWeight: '700', 
              letterSpacing: '8px', 
              marginBottom: '20px', 
              fontFamily: 'monospace' 
            }}>
              {sessionCode}
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              fontSize: '17px', 
              fontWeight: '600', 
              opacity: 0.95, 
              letterSpacing: '-0.2px' 
            }}>
              <Clock size={18} />
              Valid for: {formatTime(timeRemaining)}
            </div>
          </div>

          <div style={{ ...styles.infoCard, marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '20px', 
              color: colors.textPrimary, 
              letterSpacing: '-0.2px'
            }}>
              Next Steps:
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                { num: 1, title: 'Go to any OCBC ATM', desc: 'Find a nearby ATM location' },
                { num: 2, title: 'Insert your card', desc: 'ATM will detect your mobile session' },
                { num: 3, title: 'Confirm on your phone', desc: "You'll receive a notification to approve" }
              ].map(step => (
                <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    backgroundColor: colors.primary, 
                    color: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '16px', 
                    fontWeight: '700', 
                    flexShrink: 0 
                  }}>
                    {step.num}
                  </div>
                  <div>
                    <div style={{ 
                      fontSize: '15px', 
                      fontWeight: '600', 
                      marginBottom: '4px', 
                      color: colors.textPrimary, 
                      letterSpacing: '-0.2px' 
                    }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => {
              onATMConfirm();
              speak('ATM card inserted. Please confirm the transaction on your phone.');
              vibrate([100, 50, 100]);
            }}
            data-help-id="remote-atm-simulate-atm"
            style={{ 
              width: '100%', 
              padding: '16px', 
              fontSize: '15px', 
              fontWeight: '600', 
              backgroundColor: colors.success, 
              color: 'white', 
              border: 'none', 
              borderRadius: '24px', 
              cursor: 'pointer', 
              transition: 'all 0.2s',
              letterSpacing: '-0.2px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#008A42'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.success}
          >
            🏧 Simulate ATM Card Insert (Demo)
          </button>

          <button 
            onClick={() => {
              const codeSpoken = sessionCode.split('').join(' ');
              speakPrivate(`Your OTP session code is ${codeSpoken}. Valid for ${formatTime(timeRemaining)}. Step 1: Go to any OCBC ATM. Step 2: Insert your card. Step 3: Confirm on your phone when prompted.`);
            }}
            style={{ 
              marginTop: '12px', 
              width: '100%', 
              padding: '16px', 
              backgroundColor: colors.lightGrey, 
              border: 'none', 
              borderRadius: '24px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px', 
              fontSize: '15px', 
              fontWeight: '600', 
              color: colors.textSecondary, 
              letterSpacing: '-0.2px', 
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.border}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
          >
            <Volume2 size={18} />
            Read Session Code (Private Audio)
          </button>
        </div>
      </div>
    );
  }

  // CONFIRMATION SCREEN
  if (currentStep === 'confirm') {
    const availableBalance = userData?.balance || 0;
    const lockedAmount = userData?.lockedAmount || 0;
    
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Confirm Transaction</h1>
        </div>
        <div style={styles.progressText}>Step 4 of 4: Final Confirmation</div>
        
        <div style={{ padding: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px', marginTop: '20px' }}>
            <div style={{ 
              display: 'inline-block', 
              padding: '24px', 
              backgroundColor: '#E8F5E9', 
              borderRadius: '50%', 
              marginBottom: '16px', 
              animation: 'ping 1.5s infinite' 
            }}>
              <CheckCircle size={48} color={colors.success} strokeWidth={2} />
            </div>
          </div>
          <style>{`@keyframes ping { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } }`}</style>

          <h2 style={styles.heading}>ATM Connected!</h2>

          <div style={{ ...styles.infoCard, marginBottom: '24px', marginTop: '24px' }}>
            <div style={{ 
              fontSize: '14px', 
              color: colors.textSecondary, 
              marginBottom: '16px', 
              textAlign: 'center',
              letterSpacing: '-0.1px'
            }}>
              Please confirm your transaction
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              padding: '24px', 
              backgroundColor: colors.lightGrey, 
              borderRadius: '12px', 
              marginBottom: '20px' 
            }}>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: colors.textSecondary, 
                marginBottom: '10px',
                letterSpacing: '-0.1px'
              }}>
                {selectedAction === 'withdrawal' ? 'Withdrawal Amount' : 
                 selectedAction === 'deposit' ? 'Deposit' : 
                 selectedAction === 'amount-lock' ? (securityAction === 'lock' ? 'Amount to Lock' : 'Amount to Unlock') :
                 'Security Action'}
              </div>
              <div style={{ 
                fontSize: '42px', 
                fontWeight: '700', 
                color: colors.primary, 
                letterSpacing: '-1px'
              }}>
                {selectedAction === 'withdrawal' ? `$${amount}` : 
                 selectedAction === 'deposit' ? 'Ready' : 
                 selectedAction === 'amount-lock' ? `$${amount}` :
                 'Lock/Unlock'}
              </div>
            </div>

            {selectedAction === 'amount-lock' && (
              <div style={{
                backgroundColor: colors.lightBeige,
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: 'none'
              }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: '700', 
                  color: colors.textPrimary, 
                  marginBottom: '16px', 
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  After {securityAction === 'lock' ? 'Locking' : 'Unlocking'}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', color: colors.textSecondary, fontWeight: '500', letterSpacing: '-0.1px' }}>
                    Available Balance
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: colors.success, letterSpacing: '-0.4px' }}>
                    ${securityAction === 'lock' 
                      ? (availableBalance - parseFloat(amount)).toFixed(2) 
                      : (availableBalance + parseFloat(amount)).toFixed(2)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', color: colors.textSecondary, fontWeight: '500', letterSpacing: '-0.1px' }}>
                    Locked Amount
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: colors.warning, letterSpacing: '-0.4px' }}>
                    ${securityAction === 'lock' 
                      ? (lockedAmount + parseFloat(amount)).toFixed(2) 
                      : (lockedAmount - parseFloat(amount)).toFixed(2)}
                  </span>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  paddingTop: '12px',
                  marginTop: '12px',
                  borderTop: `2px solid ${colors.border}`
                }}>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: colors.textPrimary, letterSpacing: '-0.2px' }}>
                    Total Balance
                  </span>
                  <span style={{ fontSize: '24px', fontWeight: '700', color: colors.primary, letterSpacing: '-0.5px' }}>
                    ${(availableBalance + lockedAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div style={{ 
              backgroundColor: colors.lightBeige, 
              padding: '14px 16px', 
              borderRadius: '12px', 
              border: 'none',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <AlertTriangle size={18} color={colors.warning} style={{ marginTop: '1px', flexShrink: 0 }} />
              <div style={{ 
                fontSize: '14px', 
                color: colors.textSecondary, 
                lineHeight: '1.5', 
                letterSpacing: '-0.1px'
              }}>
                Only confirm if you are at the ATM and initiated this transaction
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              onClick={() => {
                onFinalConfirm();
                speakPrivate('Transaction confirmed. Processing your request.');
                vibrate([50, 50, 100, 200]);
              }}
              data-help-id="remote-atm-confirm-transaction"
              style={{ 
                ...styles.primaryButton, 
                backgroundColor: colors.success, 
                fontSize: '17px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#008A42'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.success}
            >
              <CheckCircle size={20} strokeWidth={2.5} />
              Confirm Transaction
            </button>

            <button 
              onClick={() => {
                navigate('/dashboard');
                speak('Transaction cancelled. Returning to dashboard.');
              }}
              style={{ 
                width: '100%', 
                padding: '16px', 
                fontSize: '15px', 
                fontWeight: '600', 
                backgroundColor: colors.cardBg, 
                color: colors.primary, 
                border: `2px solid ${colors.primary}`, 
                borderRadius: '24px', 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                letterSpacing: '-0.2px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = colors.primary;
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = colors.cardBg;
                e.currentTarget.style.color = colors.primary;
              }}
            >
              Cancel
            </button>
          </div>

          <button 
            onClick={() => {
              const actionText = selectedAction === 'withdrawal' ? `withdrawal of ${amount} dollars` :
                                selectedAction === 'deposit' ? 'deposit' :
                                selectedAction === 'amount-lock' ? `${securityAction} amount of ${amount} dollars` :
                                'security action';
              speakPrivate(`Please confirm your ${actionText}. Only confirm if you are at the ATM and initiated this transaction.`);
            }}
            style={{ 
              marginTop: '12px', 
              width: '100%', 
              padding: '16px', 
              backgroundColor: colors.lightGrey, 
              border: 'none', 
              borderRadius: '24px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px', 
              fontSize: '15px', 
              fontWeight: '600', 
              color: colors.textSecondary, 
              letterSpacing: '-0.2px', 
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.border}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
          >
            <Volume2 size={18} />
            Read Confirmation Details (Private Audio)
          </button>
        </div>
      </div>
    );
  }

  // COMPLETE SCREEN
  if (currentStep === 'complete') {
    return (
      <ATMCompleteScreen
        selectedAction={selectedAction}
        amount={amount}
        securityAction={securityAction}
        navigate={navigate}
        setCurrentStep={setCurrentStep}
        setSelectedAction={() => {}}
        setAmount={() => {}}
        setSessionCode={() => {}}
        scannedQRData={scannedQRData} 
      />
    );
  }

  // SHARED QR WITHDRAWAL SCREENS
  if (currentStep === 'shared-qr-method' || currentStep === 'shared-qr-camera' || 
      currentStep === 'shared-qr-upload' || currentStep === 'shared-qr-confirm') {
    return (
      <SharedQRScreens
        currentStep={currentStep}
        onBack={onBack}
        setCurrentStep={setCurrentStep}
        qrScanMethod={qrScanMethod}
        setQrScanMethod={setQrScanMethod}
        scannedQRData={scannedQRData}
        setScannedQRData={setScannedQRData}
        setAmount={setAmount}
        onFinalConfirm={() => {
          setCurrentStep('complete');
          vibrate([50, 50, 50, 200]);
          speakPrivate(`Withdrawal complete. You can now collect $${scannedQRData?.amount} from ${scannedQRData?.ownerName}'s account at the ATM`);
        }}
        navigate={navigate}
        videoRef={videoRef}
      />
    );
  }

  // OTP WITHDRAWAL
  if (currentStep === 'otp-entry' || currentStep === 'otp-success') {
  return (
    <OTPWithdrawalScreens
      currentStep={currentStep}
      onBack={() => setCurrentStep('hub')} 
      setCurrentStep={setCurrentStep}
      navigate={navigate}
    />
  );
}

  // AMOUNT LOCK SCREEN
  if (currentStep === 'amount-lock') {
    const availableBalance = userData?.balance || 0;
    const lockedAmount = userData?.lockedAmount || 0;
    const totalBalance = availableBalance + lockedAmount;

    const handleAmountLockSubmit = async () => {
      const amountNum = parseFloat(lockAmount);
       
      if (!lockAmount || amountNum <= 0) {
        speak('Please enter a valid amount');
        return;
      }

      // Validation: Only whole numbers allowed
      if (!Number.isInteger(amountNum)) {
        speak('Only whole numbers are allowed. No decimals.');
        alert('Only whole numbers are allowed. No decimals.');
        return;
      }

      // Validation for lock action
      if (lockAction === 'lock' && amountNum > availableBalance) {
        speak(`Insufficient balance. You can only lock up to $${availableBalance.toFixed(2)}`);
        alert(`Insufficient balance. You can only lock up to $${availableBalance.toFixed(2)}`);
        return;
      }

      // Validation for unlock action
      if (lockAction === 'unlock' && amountNum > lockedAmount) {
        speak(`Insufficient locked amount. You can only unlock up to $${lockedAmount.toFixed(2)}`);
        alert(`Insufficient locked amount. You can only unlock up to $${lockedAmount.toFixed(2)}`);
        return;
      }

      // Process the lock/unlock in Firebase FIRST
      const { processATMAmountLock } = await import('../services/firebase');
      const result = await processATMAmountLock(userId, lockAction, amountNum);

      if (!result.success) {
        speak(result.error);
        alert(result.error);
        return;
      }

      // If successful, generate session code and proceed
      const code = generateSessionCode();
      setSessionCode(code);
      setAmount(lockAmount);
      setSecurityAction(lockAction);
      setCurrentStep('waiting');
      vibrate([50, 100, 50]);
      const codeSpoken = code.split('').join(' ');
      speakPrivate(`${lockAction === 'lock' ? 'Locking' : 'Unlocking'} $${lockAmount} in your account. Your session code is ${codeSpoken}. Valid for 15 minutes.`);
      startTimer();
    };

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => {
              onBack();
              speak('Returned to main menu');
            }} 
            style={styles.backButton} 
            aria-label="Go back"
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Amount Lock</h1>
        </div>
        <div style={styles.progressText}>Step 2 of 4: Lock or Unlock Amount</div>
        
        <div style={{ padding: '16px' }}>
          <div style={{ ...styles.illustration, display: 'flex', justifyContent: 'center' }}>
            <Shield size={64} color={colors.textSecondary} strokeWidth={1.5} />
          </div>
          <h2 style={styles.heading}>Secure Your Funds</h2>
          <p style={{ 
            textAlign: 'center', 
            color: colors.textSecondary, 
            fontSize: '15px', 
            lineHeight: '1.6', 
            marginBottom: '24px', 
            letterSpacing: '-0.1px' 
          }}>
            Lock specific amounts to prevent unauthorized access or unlock them when needed
          </p>

          {/* Balance Overview Card */}
          <div style={{
            ...styles.infoCard,
            marginBottom: '24px',
            boxShadow: 'none'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '500', letterSpacing: '-0.1px' }}>
                Available Balance
              </span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: colors.success, letterSpacing: '-0.4px' }}>
                ${availableBalance.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <span style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '500', letterSpacing: '-0.1px' }}>
                Locked Amount
              </span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: colors.warning, letterSpacing: '-0.4px' }}>
                ${lockedAmount.toFixed(2)}
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              paddingTop: '15px',
              borderTop: `2px solid ${colors.border}`
            }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, letterSpacing: '-0.2px' }}>
                Total Balance
              </span>
              <span style={{ fontSize: '22px', fontWeight: '700', color: colors.primary, letterSpacing: '-0.4px' }}>
                ${totalBalance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Choose Lock or Unlock */}
          {!lockAction ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <button 
                  onClick={() => { 
                    setLockAction('lock'); 
                    speak(`Lock amount selected. You can lock up to ${availableBalance.toFixed(2)} dollars. Enter the amount to lock.`);
                    vibrate([50]);
                  }}
                  style={{ 
                    backgroundColor: colors.lightBeige, 
                    border: 'none', 
                    borderRadius: '16px', 
                    padding: '24px', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s', 
                    minHeight: '120px' 
                  }}
                  onMouseOver={(e) => { 
                    e.currentTarget.style.transform = 'translateY(-2px)'; 
                    e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`; 
                  }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.transform = 'translateY(0)'; 
                    e.currentTarget.style.boxShadow = 'none'; 
                  }}
                >
                  <Lock size={36} color={colors.warning} strokeWidth={2} style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px', color: colors.textPrimary, letterSpacing: '-0.3px' }}>
                    Lock Amount
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px', letterSpacing: '-0.1px' }}>
                    Secure funds and prevent withdrawals
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: colors.success, letterSpacing: '-0.2px' }}>
                    Max: ${availableBalance.toFixed(2)}
                  </div>
                </button>

                <button 
                  onClick={() => { 
                    setLockAction('unlock'); 
                    speak(`Unlock amount selected. You can unlock up to ${lockedAmount.toFixed(2)} dollars. Enter the amount to unlock.`);
                    vibrate([50]);
                  }}
                  style={{ 
                    backgroundColor: '#E8F5E9', 
                    border: 'none', 
                    borderRadius: '16px', 
                    padding: '24px', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s', 
                    minHeight: '120px' 
                  }}
                  onMouseOver={(e) => { 
                    e.currentTarget.style.transform = 'translateY(-2px)'; 
                    e.currentTarget.style.boxShadow = `0 4px 12px ${colors.shadow}`; 
                  }}
                  onMouseOut={(e) => { 
                    e.currentTarget.style.transform = 'translateY(0)'; 
                    e.currentTarget.style.boxShadow = 'none'; 
                  }}
                >
                  <Unlock size={36} color={colors.success} strokeWidth={2} style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '6px', color: colors.textPrimary, letterSpacing: '-0.3px' }}>
                    Unlock Amount
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '8px', letterSpacing: '-0.1px' }}>
                    Release locked funds for use
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: colors.warning, letterSpacing: '-0.2px' }}>
                    Max: ${lockedAmount.toFixed(2)}
                  </div>
                </button>
              </div>

              <button 
                onClick={() => speak(`Amount Lock feature. Your available balance is ${availableBalance.toFixed(2)} dollars. Your locked amount is ${lockedAmount.toFixed(2)} dollars. Choose to lock funds to prevent withdrawals, or unlock funds to make them available again.`)}
                style={{ 
                  width: '100%', 
                  padding: '16px', 
                  backgroundColor: colors.lightGrey, 
                  border: 'none', 
                  borderRadius: '24px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '10px', 
                  fontSize: '15px', 
                  fontWeight: '600', 
                  color: colors.textSecondary, 
                  letterSpacing: '-0.2px', 
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.border}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
              >
                <Volume2 size={18} />
                Play Voice Guide
              </button>
            </>
          ) : (
            <>
              {/* Amount Entry */}
              <div style={{ ...styles.infoCard, marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {lockAction === 'lock' ? 
                      <Lock size={20} color={colors.warning} strokeWidth={2} /> : 
                      <Unlock size={20} color={colors.success} strokeWidth={2} />
                    }
                    <label style={{ fontSize: '14px', fontWeight: '600', color: colors.textPrimary, letterSpacing: '-0.2px' }}>
                      Amount to {lockAction === 'lock' ? 'Lock' : 'Unlock'} (SGD)
                    </label>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: lockAction === 'lock' ? colors.success : colors.warning, letterSpacing: '-0.1px' }}>
                    Max: ${(lockAction === 'lock' ? availableBalance : lockedAmount).toFixed(2)}
                  </div>
                </div>
                
                <input 
                  type="number" 
                  value={lockAmount} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setLockAmount(value);
                      if (value) {
                        speakPrivate(`Amount set to ${value} dollars`);
                      }
                    }
                  }}
                  placeholder="0"
                  step="1"
                  min="1"
                  style={{ 
                    width: '100%', 
                    fontSize: '44px', 
                    fontWeight: '700', 
                    padding: '20px', 
                    border: `2px solid ${colors.border}`, 
                    borderRadius: '16px', 
                    textAlign: 'center', 
                    boxSizing: 'border-box', 
                    backgroundColor: colors.cardBg, 
                    color: colors.textPrimary, 
                    letterSpacing: '-1px', 
                    outline: 'none', 
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = colors.primary}
                  onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
                  aria-label={`Enter amount to ${lockAction}`}
                  autoFocus 
                />

                {/* Quick Amount Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '20px' }}>
                  {[100, 500, 1000, 2000, 5000, 10000].map(quickAmount => {
                    const maxAmount = lockAction === 'lock' ? availableBalance : lockedAmount;
                    const isDisabled = quickAmount > maxAmount;
                    
                    return (
                      <button 
                        key={quickAmount} 
                        onClick={() => {
                          if (!isDisabled) {
                            setLockAmount(quickAmount.toString());
                            speakPrivate(`${quickAmount} dollars selected`);
                            vibrate([30]);
                          }
                        }}
                        disabled={isDisabled}
                        style={{ 
                          padding: '15px', 
                          fontSize: '17px', 
                          fontWeight: '600', 
                          backgroundColor: isDisabled ? colors.border : colors.lightGrey, 
                          border: 'none', 
                          borderRadius: '12px', 
                          cursor: isDisabled ? 'not-allowed' : 'pointer', 
                          transition: 'all 0.2s',
                          opacity: isDisabled ? 0.5 : 1,
                          color: colors.textPrimary,
                          letterSpacing: '-0.3px'
                        }}
                        onMouseOver={(e) => { 
                          if (!isDisabled) {
                            e.currentTarget.style.backgroundColor = colors.primary; 
                            e.currentTarget.style.color = 'white'; 
                          }
                        }}
                        onMouseOut={(e) => { 
                          if (!isDisabled) {
                            e.currentTarget.style.backgroundColor = colors.lightGrey; 
                            e.currentTarget.style.color = colors.textPrimary; 
                          }
                        }}
                      >
                        ${quickAmount}
                      </button>
                    );
                  })}
                </div>

                {/* Max Button */}
                <button
                  onClick={() => {
                    const maxAmt = Math.floor(lockAction === 'lock' ? availableBalance : lockedAmount).toString();
                    setLockAmount(maxAmt);
                    speakPrivate(`Maximum amount selected: ${maxAmt} dollars`);
                    vibrate([30]);
                  }}
                  style={{
                    width: '100%',
                    marginTop: '15px',
                    padding: '15px',
                    fontSize: '15px',
                    fontWeight: '600',
                    backgroundColor: colors.lightBeige,
                    color: colors.textPrimary,
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '-0.2px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = colors.primary;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = colors.lightBeige;
                    e.currentTarget.style.color = colors.textPrimary;
                  }}
                >
                  Use Maximum Amount (${Math.floor(lockAction === 'lock' ? availableBalance : lockedAmount)})
                </button>
              </div>

              {/* Info Card */}
              <div style={{ 
                backgroundColor: colors.lightBeige, 
                padding: '14px', 
                borderRadius: '12px', 
                marginBottom: '16px', 
                border: 'none' 
              }}>
                <div style={{ fontSize: '14px', color: colors.textSecondary, lineHeight: '1.5', letterSpacing: '-0.1px' }}>
                  ℹ️ {lockAction === 'lock' 
                    ? 'Locked amounts cannot be withdrawn until unlocked. Your available balance will be reduced by this amount. Only whole numbers allowed.' 
                    : 'Unlocking will make this amount available for withdrawal and spending again. Only whole numbers allowed.'}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => { 
                    setLockAction(''); 
                    setLockAmount(''); 
                    speak('Returned to lock or unlock selection');
                  }}
                  style={{ 
                    flex: 1, 
                    padding: '16px', 
                    fontSize: '15px', 
                    fontWeight: '600', 
                    backgroundColor: colors.cardBg, 
                    color: colors.textSecondary, 
                    border: `2px solid ${colors.border}`, 
                    borderRadius: '24px', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    letterSpacing: '-0.2px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.cardBg}
                >
                  ← Back
                </button>
                <button 
                  onClick={handleAmountLockSubmit} 
                  disabled={!lockAmount || parseFloat(lockAmount) <= 0}
                  style={{ 
                    flex: 2, 
                    padding: '16px', 
                    fontSize: '17px', 
                    fontWeight: '600', 
                    backgroundColor: lockAmount && parseFloat(lockAmount) > 0 ? colors.primary : '#D1D5DB', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '24px', 
                    cursor: lockAmount && parseFloat(lockAmount) > 0 ? 'pointer' : 'not-allowed', 
                    transition: 'all 0.2s',
                    letterSpacing: '-0.3px'
                  }}
                  onMouseOver={(e) => { 
                    if (lockAmount && parseFloat(lockAmount) > 0) { 
                      e.currentTarget.style.backgroundColor = colors.primaryDark; 
                    }
                  }}
                  onMouseOut={(e) => { 
                    if (lockAmount && parseFloat(lockAmount) > 0) { 
                      e.currentTarget.style.backgroundColor = colors.primary; 
                    }
                  }}
                >
                  Continue
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default ATMScreens;