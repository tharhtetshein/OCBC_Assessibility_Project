import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { createEmergencySelfWithdrawal, getPeopleWithAccess, updateAccessPermissions, getOngoingOTPSessions, getSelfWithdrawalHistory, discardOTPSession } from '../services/firebase';
import { speak, vibrate, isHeadphonesConnected, monitorAudioDevices } from '../remote-atm-screen/atmUtils';
import { AlertTriangle, Users, Key, Copy, ArrowLeft, Headphones, VolumeX, Share2, Clock, Eye, EyeOff } from 'lucide-react';

/* --- Generate a 6-digit OTP --- */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/* --- Handle self withdrawal --- */
const EmergencyWithdrawal = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // UI flow
  const [activeTab, setActiveTab] = useState('self');
  const [step, setStep] = useState('select-tab');
  // Withdrawal state
  const [amount, setAmount] = useState('');
  const [otp, setOTP] = useState('');
  const [withdrawalSession, setWithdrawalSession] = useState(null);
  // OTP validity
  const [selectedValidity, setSelectedValidity] = useState(600);
  const [timeRemaining, setTimeRemaining] = useState(600);
  // Shared access helpers
  const [helpersWithAccess, setHelpersWithAccess] = useState([]);
  const [selectedHelper, setSelectedHelper] = useState(null);
  const [editingLimit, setEditingLimit] = useState('');
  // Headphone connection status
  const [hasHeadphones, setHasHeadphones] = useState(false);
  // Track remaining limit for self withdrawal
  const [selfRemainingLimit, setSelfRemainingLimit] = useState(500);
  const selfEmergencyLimit = 500;

  const [ongoingSessions, setOngoingSessions] = useState([]);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [visibleOTPs, setVisibleOTPs] = useState({});
  
  // Load ongoing sessions
  const loadOngoingSessions = useCallback(async () => {
    if (!currentUser) return;

    try {
      const result = await getOngoingOTPSessions(currentUser.uid);
      console.log('Ongoing sessions result:', result);
      if (result.success) {
        console.log('Sessions found:', result.sessions);
        setOngoingSessions(result.sessions);
      }
    } catch (error) {
      console.error('Failed to load ongoing sessions:', error);
    }
  }, [currentUser]);

  // Load withdrawal history
  const loadWithdrawalHistory = useCallback(async () => {
    if (!currentUser) return;

    try {
      const result = await getSelfWithdrawalHistory(currentUser.uid, 5);
      console.log('Withdrawal history result:', result);
      if (result.success) {
        console.log('History found:', result.history);
        setWithdrawalHistory(result.history);
      }
    } catch (error) {
      console.error('Failed to load withdrawal history:', error);
    }
  }, [currentUser]);
  
  // Monitor headphone connection
  useEffect(() => {
    const checkHeadphones = async () => {
      const connected = await isHeadphonesConnected();
      setHasHeadphones(connected);
    };

    checkHeadphones();
    const cleanup = monitorAudioDevices(({ hasHeadphones }) => {
      setHasHeadphones(hasHeadphones);
    });

    return cleanup;
  }, []);

  // OTP countdown
  useEffect(() => {
    if (step === 'show-otp' && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step, timeRemaining]);
 
  // Load helpers with access
  const loadHelpersWithAccess = useCallback(async () => {
    if (!currentUser) return;

    try {
      const result = await getPeopleWithAccess(currentUser.uid);
      if (result.success) {
        setHelpersWithAccess(result.people);
      }
    } catch (error) {
      console.error('Failed to load helpers:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'shared') {
      loadHelpersWithAccess();
    } else if (activeTab === 'self') {
      loadOngoingSessions();
      loadWithdrawalHistory();
    }
  }, [activeTab, loadHelpersWithAccess, loadOngoingSessions, loadWithdrawalHistory]);

  // Format time in MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle OTP visibility
  const toggleOTPVisibility = (sessionId) => {
    setVisibleOTPs(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  // Copy OTP to clipboard
  const copySessionOTP = (otp) => {
    navigator.clipboard.writeText(otp);
    vibrate([50]);
    alert('OTP copied to clipboard!');
  };

  // Mask OTP
  const maskOTP = (otp) => {
    return '●●●●●●';
  };
  
  
  // Self emergency withdrawal submission
  const handleSelfAmountSubmit = async () => {
    const amountNum = parseFloat(amount);

    if (!amount || amountNum <= 0) {
      await speak('Please enter a valid amount');
      alert('Please enter a valid amount');
      return;
    }

    if (amountNum > selfEmergencyLimit) {
      await speak(`Amount exceeds emergency limit of $${selfEmergencyLimit}`);
      alert(`Amount exceeds emergency limit of $${selfEmergencyLimit}`);
      return;
    }

    const generatedOTP = generateOTP();
    const result = await createEmergencySelfWithdrawal(currentUser.uid, amountNum, generatedOTP, selectedValidity);

    if (!result.success) {
      alert(result.error);
      return;
    }

    setOTP(generatedOTP);
    setWithdrawalSession(result.tokenId);
    setStep('show-otp');
    setTimeRemaining(selectedValidity);
    setSelfRemainingLimit(selfEmergencyLimit - amountNum);

    vibrate([50, 100, 50]);

    loadOngoingSessions();

    const validityLabel = validityOptions.find(opt => opt.value === selectedValidity)?.label || '10 minutes';

    if (hasHeadphones) {
      await speak(`Your emergency withdrawal OTP is ${generatedOTP.split('').join(' ')}. Valid for ${validityLabel}.`);
    } else {
      await speak('Your OTP has been generated. Please connect headphones to hear it for security.');
    }
  };

  const handleToggleEmergencyAccess = async (helper, enabled) => {
    const updatedPermissions = {
      ...helper.permissions,
      emergencyWithdrawal: enabled
    };

    const result = await updateAccessPermissions(helper.id, {
      permissions: updatedPermissions
    });

    if (result.success) {
      alert(`Emergency withdrawal ${enabled ? 'enabled' : 'disabled'} for ${helper.userName}`);
      loadHelpersWithAccess();
    } else {
      alert('Failed to update permissions: ' + result.error);
    }
  };
  
  // Update helper emergency limit
  const handleUpdateEmergencyLimit = async (helper) => {
    const newLimit = parseFloat(editingLimit);

    if (isNaN(newLimit) || newLimit < 0) {
      alert('Please enter a valid limit amount');
      return;
    }

    const result = await updateAccessPermissions(helper.id, {
      emergencyLimit: newLimit
    });

    if (result.success) {
      alert(`Emergency limit updated to ${newLimit} for ${helper.userName}`);
      setSelectedHelper(null);
      setEditingLimit('');
      loadHelpersWithAccess();
    } else {
      alert('Failed to update limit: ' + result.error);
    }
  };

  // OCBC Theme Colors (from reference image)
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
  
  // Inline styles
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
      transition: 'background-color 0.2s'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: colors.textPrimary,
      margin: 0,
      letterSpacing: '-0.3px'
    },
    tabContainer: {
      display: 'flex',
      gap: '8px',
      padding: '16px',
      backgroundColor: colors.cardBg,
      borderBottom: `1px solid ${colors.border}`
    },
    tab: {
      flex: 1,
      padding: '14px 16px',
      fontSize: '15px',
      fontWeight: '600',
      border: 'none',
      borderRadius: '24px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      letterSpacing: '-0.2px'
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
    card: {
      backgroundColor: colors.cardBg,
      border: 'none',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '12px',
      boxShadow: 'none'
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
    },
    iconButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '6px',
      color: colors.textSecondary,
      display: 'flex',
      alignItems: 'center',
      borderRadius: '6px',
      transition: 'all 0.2s ease'
    }
  };
  
  // Validity options for OTP
  const validityOptions = [
    { label: '10 Minutes', value: 600, seconds: 600 },
    { label: '30 Minutes', value: 1800, seconds: 1800 },
    { label: '1 Hour', value: 3600, seconds: 3600 },
    { label: '6 Hours', value: 21600, seconds: 21600 },
    { label: '12 Hours', value: 43200, seconds: 43200 },
    { label: '24 Hours', value: 86400, seconds: 86400 },
    { label: '3 Days', value: 259200, seconds: 259200 }
  ];

  // TAB SELECTION SCREEN
  if (step === 'select-tab') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={styles.backButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Emergency Cash Withdrawal</h1>
        </div>

        {/* Tabs */}
        <div style={styles.tabContainer}>
          <button
            data-help-id="emergency-tab-self"
            onClick={() => { setActiveTab('self'); setStep('enter-amount'); }}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'self' ? colors.primary : colors.lightGrey,
              color: activeTab === 'self' ? 'white' : colors.textSecondary
            }}
          >
            For Self (OTP)
          </button>
          <button 
            data-help-id="emergency-tab-manage"
            onClick={() => { 
              setActiveTab('shared'); 
              setStep('manage-helpers'); 
            }}
            style={{
              ...styles.tab,
              backgroundColor: activeTab === 'shared' ? colors.primary : colors.lightGrey,
              color: activeTab === 'shared' ? 'white' : colors.textSecondary
            }}
          >
            Manage Helper Access
          </button>
        </div>

        {/* Content Area */}
        <div style={{ padding: '16px', paddingBottom: '80px' }}>
          {/* Headphone Status */}
          <div style={{
            backgroundColor: hasHeadphones ? '#E8F5E9' : colors.lightBeige,
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {hasHeadphones ? 
              <Headphones size={20} color={colors.success} /> : 
              <VolumeX size={20} color={colors.warning} />
            }
            <span style={{
              fontSize: '15px',
              fontWeight: '500',
              color: colors.textPrimary,
              letterSpacing: '-0.2px'
            }}>
              {hasHeadphones ? 'Headphones Connected' : 'Connect headphones for audio'}
            </span>
          </div>

          {/* Alert Banner */}
          <div style={{
            backgroundColor: colors.lightBeige,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <AlertTriangle size={20} color={colors.warning} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  marginBottom: '4px',
                  letterSpacing: '-0.2px'
                }}>
                  Emergency Access
                </div>
                <div style={{
                  fontSize: '14px',
                  color: colors.textSecondary,
                  lineHeight: '1.5',
                  letterSpacing: '-0.1px'
                }}>
                  For emergency situations when you need immediate cash access.
                </div>
              </div>
            </div>
          </div>

          {activeTab === 'self' ? (
            <>
              {/* Self Emergency Withdrawal Card */}
              <div style={styles.infoCard}>
                <div style={{
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    ...styles.iconContainer,
                    backgroundColor: colors.iconBg,
                    display: 'inline-flex'
                  }}>
                    <Key size={40} color={colors.primary} />
                  </div>
                </div>

                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  marginBottom: '10px',
                  letterSpacing: '-0.3px'
                }}>
                  Self Emergency Withdrawal
                </h2>
                <p style={{
                  fontSize: '15px',
                  color: colors.textSecondary,
                  lineHeight: '1.6',
                  marginBottom: '28px',
                  letterSpacing: '-0.1px'
                }}>
                  Generate a one-time password for emergency cash withdrawal at any ATM.
                </p>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '20px',
                  paddingBottom: '24px',
                  borderTop: `1px solid ${colors.border}`
                }}>
                  <div>
                    <div style={{
                      fontSize: '13px',
                      color: colors.textSecondary,
                      marginBottom: '6px',
                      fontWeight: '500',
                      letterSpacing: '-0.1px'
                    }}>
                      Emergency Limit
                    </div>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '600',
                      color: colors.textPrimary,
                      letterSpacing: '-0.5px'
                    }}>
                      ${selfEmergencyLimit}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStep('enter-amount')}
                  style={styles.primaryButton}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                >
                  Continue to Self Withdrawal
                </button>
              </div>

              {/* Active OTP Sessions Card */}
              <div style={{ ...styles.infoCard, marginTop: '16px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  marginBottom: '16px',
                  letterSpacing: '-0.2px'
                }}>
                  Active OTP Sessions
                </h3>

                {ongoingSessions.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px 20px',
                    backgroundColor: colors.lightGrey,
                    borderRadius: '12px'
                  }}>
                    <Clock size={40} color={colors.textLight} style={{ marginBottom: '12px' }} />
                    <p style={{
                      fontSize: '15px',
                      color: colors.textSecondary,
                      margin: 0,
                      letterSpacing: '-0.1px'
                    }}>
                      No active OTP sessions
                    </p>
                  </div>
                ) : (
                  ongoingSessions.map((session) => (
                    <div key={session.id} style={{
                      backgroundColor: colors.lightBeige,
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '16px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px'
                          }}>
                            <span style={{
                              fontSize: '15px',
                              fontWeight: '600',
                              color: colors.textPrimary,
                              letterSpacing: visibleOTPs[session.id] ? '2px' : '0',
                              fontFamily: visibleOTPs[session.id] ? 'monospace' : 'inherit'
                            }}>
                              {visibleOTPs[session.id] ? session.otp : maskOTP(session.otp)}
                            </span>
                            <button
                              onClick={() => toggleOTPVisibility(session.id)}
                              style={styles.iconButton}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              title={visibleOTPs[session.id] ? 'Hide OTP' : 'Show OTP'}
                            >
                              {visibleOTPs[session.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button
                              onClick={() => copySessionOTP(session.otp)}
                              style={styles.iconButton}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              title="Copy OTP"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: colors.textSecondary,
                            marginBottom: '4px'
                          }}>
                            Amount: ${session.amount}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: colors.textSecondary
                          }}>
                            Expires: {new Date(session.expiresAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (window.confirm('Are you sure you want to cancel this OTP session?')) {
                              const result = await discardOTPSession(session.id);
                              if (result.success) {
                                loadOngoingSessions();
                                alert('OTP session cancelled');
                              } else {
                                alert('Failed to cancel: ' + result.error);
                              }
                            }
                          }}
                          style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            fontWeight: '600',
                            backgroundColor: colors.danger,
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            letterSpacing: '-0.1px'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.danger}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* OTP Transaction History Card */}
              <div style={{ ...styles.infoCard, marginTop: '16px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  marginBottom: '16px',
                  letterSpacing: '-0.2px'
                }}>
                  OTP Transaction History
                </h3>

                {withdrawalHistory.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px 20px',
                    backgroundColor: colors.lightGrey,
                    borderRadius: '12px'
                  }}>
                    <AlertTriangle size={40} color={colors.textLight} style={{ marginBottom: '12px' }} />
                    <p style={{
                      fontSize: '15px',
                      color: colors.textSecondary,
                      margin: 0,
                      letterSpacing: '-0.1px'
                    }}>
                      No OTP transaction
                    </p>
                  </div>
                ) : (
                  withdrawalHistory.map((record) => (
                    <div key={record.id} style={{
                      backgroundColor: '#E8F5E9',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: colors.textPrimary,
                          marginBottom: '4px',
                          letterSpacing: '-0.2px'
                        }}>
                          ${record.amount} - Completed
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: colors.textSecondary
                        }}>
                          {new Date(record.completedAt).toLocaleString()}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '24px',
                        color: colors.success,
                        fontWeight: '600'
                      }}>
                        ✓
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* Manage Helper Access View */
            <div style={styles.infoCard}>
              <div style={{
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <div style={{
                  ...styles.iconContainer,
                  backgroundColor: colors.lightGrey,
                  display: 'inline-flex'
                }}>
                  <Users size={40} color={colors.textSecondary} />
                </div>
              </div>

              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: colors.textPrimary,
                marginBottom: '10px',
                letterSpacing: '-0.3px'
              }}>
                Manage Helper Access
              </h2>
              <p style={{
                fontSize: '15px',
                color: colors.textSecondary,
                lineHeight: '1.6',
                marginBottom: '28px',
                letterSpacing: '-0.1px'
              }}>
                Set emergency withdrawal limits for people with account access.
              </p>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '20px',
                paddingBottom: '24px',
                borderTop: `1px solid ${colors.border}`
              }}>
                <div>
                  <div style={{
                    fontSize: '13px',
                    color: colors.textSecondary,
                    marginBottom: '6px',
                    fontWeight: '500',
                    letterSpacing: '-0.1px'
                  }}>
                    Helpers with Access
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: '600',
                    color: colors.textPrimary,
                    letterSpacing: '-0.5px'
                  }}>
                    {helpersWithAccess.length}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('manage-helpers')}
                style={styles.primaryButton}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.primary}
              >
                Manage Emergency Access
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MANAGE HELPERS SCREEN
  if (step === 'manage-helpers' && activeTab === 'shared') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => setStep('select-tab')} 
            style={styles.backButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Manage Helper Access</h1>
        </div>

        <div style={{ padding: '16px' }}>
          <div style={{
            backgroundColor: colors.lightGrey,
            padding: '14px 16px',
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              fontSize: '15px',
              fontWeight: '600',
              color: colors.textPrimary,
              letterSpacing: '-0.2px'
            }}>
              Emergency Withdrawal Settings
            </div>
          </div>

          {helpersWithAccess.length === 0 ? (
            <div style={{
              ...styles.card,
              textAlign: 'center',
              padding: '40px 20px',
              backgroundColor: colors.lightGrey
            }}>
              <Users size={48} color={colors.textLight} style={{ marginBottom: '16px' }} />
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.textPrimary,
                marginBottom: '8px',
                letterSpacing: '-0.3px'
              }}>
                No Helpers Yet
              </h3>
              <p style={{
                fontSize: '15px',
                color: colors.textSecondary,
                letterSpacing: '-0.1px'
              }}>
                You haven't granted anyone access to your account yet.
              </p>
            </div>
          ) : (
            helpersWithAccess.map(helper => (
              <div key={helper.id} style={{ ...styles.card, marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: `1px solid ${colors.border}`
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: colors.iconBg,
                    color: colors.textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    {helper.userName?.charAt(0) || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '17px',
                      fontWeight: '600',
                      color: colors.textPrimary,
                      marginBottom: '2px',
                      letterSpacing: '-0.3px'
                    }}>
                      {helper.userName}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: colors.textSecondary,
                      letterSpacing: '-0.1px'
                    }}>
                      {helper.userEmail}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      color: colors.textSecondary,
                      marginBottom: '4px',
                      fontWeight: '500',
                      letterSpacing: '-0.1px'
                    }}>
                      Emergency Withdrawal
                    </div>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: helper.permissions?.emergencyWithdrawal ? colors.success : colors.textLight,
                      letterSpacing: '-0.2px'
                    }}>
                      {helper.permissions?.emergencyWithdrawal ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleEmergencyAccess(helper, !helper.permissions?.emergencyWithdrawal)}
                    style={{
                      padding: '10px 24px',
                      fontSize: '15px',
                      fontWeight: '600',
                      backgroundColor: helper.permissions?.emergencyWithdrawal ? colors.danger : colors.success,
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      letterSpacing: '-0.2px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {helper.permissions?.emergencyWithdrawal ? 'Disable' : 'Enable'}
                  </button>
                </div>

                {helper.permissions?.emergencyWithdrawal && (
                  <div style={{
                    backgroundColor: colors.lightGrey,
                    padding: '16px',
                    borderRadius: '12px',
                    marginTop: '16px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.textPrimary,
                      marginBottom: '12px',
                      letterSpacing: '-0.1px'
                    }}>
                      Emergency Withdrawal Limit
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <input
                        type="number"
                        value={selectedHelper?.id === helper.id ? editingLimit : helper.emergencyLimit || 300}
                        onChange={(e) => {
                          setSelectedHelper(helper);
                          setEditingLimit(e.target.value);
                        }}
                        placeholder="Enter limit"
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          fontSize: '16px',
                          border: `1px solid ${colors.border}`,
                          borderRadius: '12px',
                          fontWeight: '500',
                          backgroundColor: colors.cardBg,
                          letterSpacing: '-0.2px',
                          outline: 'none'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = colors.primary}
                        onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
                      />
                      <button
                        onClick={() => handleUpdateEmergencyLimit(helper)}
                        disabled={!selectedHelper || selectedHelper.id !== helper.id}
                        style={{
                          padding: '12px 24px',
                          fontSize: '15px',
                          fontWeight: '600',
                          backgroundColor: (selectedHelper?.id === helper.id) ? colors.primary : '#D1D5DB',
                          color: 'white',
                          border: 'none',
                          borderRadius: '20px',
                          cursor: (selectedHelper?.id === helper.id) ? 'pointer' : 'not-allowed',
                          letterSpacing: '-0.2px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Update
                      </button>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: colors.textSecondary,
                      letterSpacing: '-0.1px'
                    }}>
                      Current limit: ${helper.emergencyLimit || 300} SGD
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ENTER AMOUNT SCREEN
  if (step === 'enter-amount' && activeTab === 'self') {
    const quickAmounts = [50, 100, 200, selfEmergencyLimit];

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => setStep('select-tab')} 
            style={styles.backButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Enter Amount</h1>
        </div>

        <div style={{ padding: '16px' }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '32px',
            marginTop: '20px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '500',
              color: colors.textSecondary,
              marginBottom: '20px',
              letterSpacing: '-0.2px'
            }}>
              How much do you need?
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: colors.textSecondary,
                marginBottom: '8px',
                letterSpacing: '-0.1px'
              }}>
                Amount (SGD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                max={selfEmergencyLimit}
                data-help-id="emergency-amount-input"
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
                  outline: 'none',
                  transition: 'all 0.2s',
                  letterSpacing: '-1px',
                  color: colors.textPrimary
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.primary;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                }}
                autoFocus
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginTop: '20px'
            }}>
              {quickAmounts.map(quickAmount => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  style={{
                    padding: '16px',
                    fontSize: '17px',
                    fontWeight: '600',
                    backgroundColor: colors.lightGrey,
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
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

          <div style={{
            ...styles.card,
            backgroundColor: colors.lightGrey,
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{
                  fontSize: '13px',
                  color: colors.textSecondary,
                  marginBottom: '4px',
                  fontWeight: '500',
                  letterSpacing: '-0.1px'
                }}>
                  Emergency Limit
                </div>
                <div style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  letterSpacing: '-0.4px'
                }}>
                  ${selfEmergencyLimit}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '13px',
                  color: colors.textSecondary,
                  marginBottom: '4px',
                  fontWeight: '500',
                  letterSpacing: '-0.1px'
                }}>
                  Remaining
                </div>
                <div style={{
                  fontSize: '22px',
                  fontWeight: '600',
                  color: colors.success,
                  letterSpacing: '-0.4px'
                }}>
                  ${selfRemainingLimit}
                </div>
              </div>
            </div>
          </div>

          {/* Validity Selector */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: colors.textPrimary,
              marginBottom: '12px',
              letterSpacing: '-0.1px'
            }}>
              <Clock size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
              OTP Validity Period
            </label>
            <select
              value={selectedValidity}
              onChange={(e) => setSelectedValidity(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                fontWeight: '500',
                color: colors.textPrimary,
                backgroundColor: colors.cardBg,
                border: `2px solid ${colors.border}`,
                borderRadius: '12px',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s',
                letterSpacing: '-0.2px'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border;
              }}
            >
              {validityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div style={{
              fontSize: '13px',
              color: colors.textSecondary,
              marginTop: '8px',
              letterSpacing: '-0.1px'
            }}>
              Your OTP will be valid for {validityOptions.find(opt => opt.value === selectedValidity)?.label.toLowerCase()}
            </div>
          </div>

          <button
            onClick={handleSelfAmountSubmit}
            data-help-id="emergency-generate-otp"
            disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > selfEmergencyLimit}
            style={{
              ...styles.primaryButton,
              backgroundColor: (amount && parseFloat(amount) > 0 && parseFloat(amount) <= selfEmergencyLimit) 
                ? colors.primary 
                : '#D1D5DB',
              cursor: (amount && parseFloat(amount) > 0 && parseFloat(amount) <= selfEmergencyLimit) 
                ? 'pointer' 
                : 'not-allowed'
            }}
            onMouseOver={(e) => {
              if (amount && parseFloat(amount) > 0 && parseFloat(amount) <= selfEmergencyLimit) {
                e.currentTarget.style.backgroundColor = colors.primaryDark;
              }
            }}
            onMouseOut={(e) => {
              if (amount && parseFloat(amount) > 0 && parseFloat(amount) <= selfEmergencyLimit) {
                e.currentTarget.style.backgroundColor = colors.primary;
              }
            }}
          >
            Generate OTP
          </button>
        </div>
      </div>
    );
  }

  // SHOW OTP SCREEN
  if (step === 'show-otp' && activeTab === 'self') {
    const copyOTP = () => {
      navigator.clipboard.writeText(otp);
      vibrate();
      alert('OTP copied to clipboard!');
    };

    const speakOTP = async () => {
      if (hasHeadphones) {
        await speak(`Your emergency withdrawal OTP is ${otp.split('').join(' ')}. Valid for ${formatTime(timeRemaining)}.`);
      } else {
        alert('Please connect headphones to hear your OTP for security purposes.');
      }
    };

    const shareOTP = async () => {
      const shareText = `Emergency Withdrawal OTP: ${otp}\nAmount: $${amount} SGD\nValid for: ${formatTime(timeRemaining)}\n\nThis OTP can only be used once at any ATM.`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Emergency Withdrawal OTP',
            text: shareText
          });
          vibrate([50]);
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error sharing:', error);
            navigator.clipboard.writeText(shareText);
            alert('Share not available. OTP details copied to clipboard!');
          }
        }
      } else {
        navigator.clipboard.writeText(shareText);
        vibrate([50]);
        alert('OTP details copied to clipboard!');
      }
    };

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={styles.backButton}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <h1 style={styles.title}>Your Emergency OTP</h1>
        </div>

        <div style={{ padding: '16px' }}>
          {/* OTP Display Card */}
          <div 
            data-help-id="emergency-otp-card"
            style={{
              backgroundColor: colors.primary,
              color: 'white',
              textAlign: 'center',
              padding: '32px 24px',
              marginTop: '20px',
              marginBottom: '24px',
              borderRadius: '16px'
            }}
          >
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              letterSpacing: '1px',
              marginBottom: '16px',
              opacity: 0.9
            }}>
              ONE-TIME PASSWORD
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              letterSpacing: '8px',
              marginBottom: '20px',
              fontFamily: 'monospace'
            }}>
              {otp}
            </div>
            <div style={{
              fontSize: '15px',
              fontWeight: '500',
              marginBottom: '8px',
              opacity: 0.95,
              letterSpacing: '-0.1px'
            }}>
              Valid for: {formatTime(timeRemaining)}
            </div>
            <div style={{
              fontSize: '17px',
              fontWeight: '600',
              opacity: 0.95,
              letterSpacing: '-0.2px'
            }}>
              Amount: ${amount} SGD
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <button
              onClick={copyOTP}
              style={{
                padding: '16px 12px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: colors.cardBg,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                letterSpacing: '-0.1px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = colors.lightGrey;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = colors.cardBg;
              }}
            >
              <Copy size={20} />
              Copy
            </button>
            <button
              onClick={speakOTP}
              style={{
                padding: '16px 12px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: colors.cardBg,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                letterSpacing: '-0.1px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = colors.lightGrey;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = colors.cardBg;
              }}
            >
              {hasHeadphones ? <Headphones size={20} /> : <VolumeX size={20} />}
              {hasHeadphones ? 'Listen' : 'Audio'}
            </button>
            <button
              onClick={shareOTP}
              style={{
                padding: '16px 12px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: colors.cardBg,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                letterSpacing: '-0.1px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = colors.lightGrey;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = colors.cardBg;
              }}
            >
              <Share2 size={20} />
              Share
            </button>
          </div>

          {/* Important Notice */}
          <div style={{
            ...styles.card,
            backgroundColor: colors.lightBeige,
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <AlertTriangle size={20} color={colors.warning} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.textPrimary,
                  marginBottom: '12px',
                  letterSpacing: '-0.2px'
                }}>
                  Important
                </div>
                <ul style={{
                  fontSize: '14px',
                  color: colors.textSecondary,
                  lineHeight: '1.6',
                  paddingLeft: '20px',
                  margin: 0,
                  letterSpacing: '-0.1px'
                }}>
                  <li style={{ marginBottom: '8px' }}>This OTP can be used by anyone who has it</li>
                  <li style={{ marginBottom: '8px' }}>It can only be used once at any ATM</li>
                  <li style={{ marginBottom: '8px' }}>Share it only with trusted individuals</li>
                  <li style={{ marginBottom: '8px' }}>Go to any ATM and select "Emergency Withdrawal"</li>
                  <li style={{ marginBottom: '8px' }}>Enter this OTP when prompted</li>
                  <li>If OTP is not used, your limit remains at ${selfEmergencyLimit}</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            data-help-id="emergency-otp-done"
            style={{
              ...styles.primaryButton,
              marginTop: '16px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.primary}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default EmergencyWithdrawal;