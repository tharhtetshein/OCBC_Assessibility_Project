import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../services/firebase";
import { useAuth } from "../auth/AuthContext";
import AccountDetails from "./AccountDetails";
import BottomNav from "../navigation/BottomNav";
// import Chatbot from "../chatbot/Chatbot"; // Removed unused import
import ShortcutsLayoutManager from "../shortcuts/ShortcutsLayoutManager";
import { slugifyShortcutId } from "../shortcuts/shortcutsConfig";

const Dashboard = ({ user, isHelpOverlayActive = false, isHandTrackingEnabled = false, onToggleHandTracking = () => {}, isEyeTrackingEnabled = false, onToggleEyeTracking = () => {}, onVoiceHelpClick = () => {} }) => {
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  // const [showChatbot, setShowChatbot] = useState(false); // Removed
  const [isRobotHovered, setIsRobotHovered] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedShortcutInfo, setSelectedShortcutInfo] = useState(null);
  const { userData, currentUser } = useAuth();
  const [livePortfolio, setLivePortfolio] = useState(null);

  const navigate = useNavigate();

  // Shortcut information data
  const shortcutInfoData = {
    'scanpay': {
      title: 'Scan&Pay',
      description: 'Quickly scan QR codes to make payments at merchants, restaurants, and online stores.',
      features: [
        'Scan merchant QR codes instantly',
        'Make payments without cash or cards',
        'View transaction history',
        'Set payment limits for security'
      ],
      usage: 'Point your camera at any PayNow QR code and confirm the payment amount.',
      category: 'Payments'
    },
    'paynow': {
      title: 'PayNow',
      description: 'Send money instantly to friends and family using their mobile number or NRIC.',
      features: [
        'Instant money transfers',
        'Send using mobile number or NRIC',
        'Request money from contacts',
        'Split bills with friends'
      ],
      usage: 'Enter recipient\'s mobile number or NRIC, amount, and confirm transfer.',
      category: 'Payments'
    },
    'transfer': {
      title: 'Transfer',
      description: 'Transfer money between your OCBC accounts or to other local bank accounts.',
      features: [
        'Transfer between own accounts',
        'Send to other local banks',
        'Schedule recurring transfers',
        'Set up standing instructions'
      ],
      usage: 'Select source and destination accounts, enter amount and transfer details.',
      category: 'Payments'
    },
    'overseas-transfer': {
      title: 'Overseas Transfer',
      description: 'Send money internationally to over 200 countries and territories worldwide.',
      features: [
        'Global money transfers',
        'Competitive exchange rates',
        'Track transfer status',
        'Save beneficiary details'
      ],
      usage: 'Enter recipient details, select currency, and confirm international transfer.',
      category: 'Payments'
    },
    'bills': {
      title: 'Bills',
      description: 'Pay your utility bills, credit card bills, and other recurring payments easily.',
      features: [
        'Pay utility bills instantly',
        'Set up auto-pay for recurring bills',
        'View bill payment history',
        'Get payment reminders'
      ],
      usage: 'Select biller, enter bill details or scan bill barcode, and confirm payment.',
      category: 'Payments'
    },
    'payment-list': {
      title: 'Payment List',
      description: 'View and manage all your scheduled and recurring payments in one place.',
      features: [
        'View all scheduled payments',
        'Manage recurring transfers',
        'Edit payment details',
        'Cancel or modify payments'
      ],
      usage: 'Browse your payment list, select items to view details or make changes.',
      category: 'Payments'
    }
  };

  // Function to get shortcut info
  const getShortcutInfo = (shortcut) => {
    const id = slugifyShortcutId(shortcut.id || shortcut.label);
    return shortcutInfoData[id] || {
      title: shortcut.label,
      description: 'This feature helps you manage your banking needs efficiently.',
      features: ['Quick access to banking services', 'Secure transactions', 'Easy to use interface'],
      usage: 'Tap this shortcut to access the feature.',
      category: 'Banking'
    };
  };

  const handleShortcutInfo = (shortcut) => {
    setSelectedShortcutInfo(shortcut);
    setShowInfoModal(true);
  };

  // Default shortcuts
  const defaultShortcuts = [
    { id: 'scanPay', icon: 'qr_code_scanner', label: 'Scan&Pay' },
    { id: 'payNow', icon: 'payment', label: 'PayNow' },
    { id: 'transfer', icon: 'transfer_within_a_station', label: 'Transfer' },
    { id: 'overseasTransfer', icon: 'public', label: 'Overseas Transfer' },
    { id: 'bills', icon: 'receipt_long', label: 'Bills' }
  ];

  const [shortcuts, setShortcuts] = useState(defaultShortcuts);
  const [autoOrganize, setAutoOrganize] = useState(false);
  const [largeTextMode, setLargeTextMode] = useState(false);

  // Load shortcuts and settings from Firebase userData
  useEffect(() => {
    if (userData) {
      // Load shortcuts from Firebase
      if (userData.shortcuts && Array.isArray(userData.shortcuts)) {
        const shortcutsWithUsage = userData.shortcuts.map(s => ({
          ...s,
          usageCount: s.usageCount || 0
        }));
        console.log('📊 Loaded shortcuts from Firebase with usage counts:', shortcutsWithUsage);
        setShortcuts(shortcutsWithUsage);
      }
      
      // Load settings from Firebase (sync across devices)
      if (userData.settings) {
        if (userData.settings.autoOrganize !== undefined) {
          setAutoOrganize(userData.settings.autoOrganize);
          console.log('🔄 Auto-organize setting:', userData.settings.autoOrganize);
        }
        if (userData.settings.largeTextMode !== undefined) {
          setLargeTextMode(userData.settings.largeTextMode);
          console.log('👓 Large text mode:', userData.settings.largeTextMode);
        }
      }
    } else {
      // Fallback to localStorage for guests
      const savedShortcuts = localStorage.getItem('shortcuts');
      if (savedShortcuts) {
        try {
          const parsed = JSON.parse(savedShortcuts);
          const shortcutsWithUsage = parsed.map(s => ({
            ...s,
            usageCount: s.usageCount || 0
          }));
          console.log('📊 Loaded shortcuts from localStorage:', shortcutsWithUsage);
          setShortcuts(shortcutsWithUsage);
        } catch (error) {
          console.error('Error loading shortcuts:', error);
        }
      }
      
      // Load settings from localStorage for guests
      const savedAutoOrganize = localStorage.getItem('autoOrganizeShortcuts');
      const savedLargeTextMode = localStorage.getItem('largeTextMode');
      
      if (savedAutoOrganize) {
        setAutoOrganize(savedAutoOrganize === 'true');
      }

      if (savedLargeTextMode) {
        setLargeTextMode(savedLargeTextMode === 'true');
      }
    }
  }, [userData]);

  // Fetch live portfolio data with current prices
  useEffect(() => {
    const fetchLivePortfolio = async () => {
      if (currentUser && userData?.portfolio?.length > 0) {
        try {
          const response = await fetch(`http://3.0.16.15:5000/api/portfolio/${currentUser.uid}`);
          const data = await response.json();
          if (data.success) {
            setLivePortfolio(data);
          }
        } catch (error) {
          console.error('Error fetching live portfolio:', error);
        }
      }
    };

    fetchLivePortfolio();
    // Refresh every 30 seconds for live prices
    const interval = setInterval(fetchLivePortfolio, 30000);
    return () => clearInterval(interval);
  }, [currentUser, userData?.portfolio]);

  // Auto-sort shortcuts by usage when enabled (only on mount and when autoOrganize changes)
  useEffect(() => {
    if (autoOrganize && shortcuts.length > 0) {
      const sorted = [...shortcuts].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
      // Only update if order actually changed
      const orderChanged = sorted.some((s, i) => s.id !== shortcuts[i]?.id);
      if (orderChanged) {
        setShortcuts(sorted);
        localStorage.setItem('shortcuts', JSON.stringify(sorted));
        
        // Save to Firebase if user is logged in
        if (user) {
          (async () => {
            try {
              const { updateUserShortcuts } = await import('../services/firebase');
              await updateUserShortcuts(user.uid, sorted);
            } catch (error) {
              console.error('Error saving sorted shortcuts to Firebase:', error);
            }
          })();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOrganize]);

  const handleShortcutClick = async (shortcut) => {
    // Track usage
    let updatedShortcuts = shortcuts.map(s => 
      s.id === shortcut.id 
        ? { ...s, usageCount: (s.usageCount || 0) + 1 }
        : s
    );
    
    // Auto-sort if enabled
    if (autoOrganize) {
      // updatedShortcuts = [...updatedShortcuts].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
      // Sorting disabled on click - will happen on next load
    }
    
    setShortcuts(updatedShortcuts);
    
    // Save to localStorage as backup
    localStorage.setItem('shortcuts', JSON.stringify(updatedShortcuts));
    
    // Save to Firebase if user is logged in (don't wait for it to complete)
    if (user) {
      const { updateUserShortcuts } = await import('../services/firebase');
      updateUserShortcuts(user.uid, updatedShortcuts).then(result => {
        if (result.success) {
          console.log('✅ Shortcuts with usage counts saved to Firebase');
        } else {
          console.error('❌ Failed to save shortcuts:', result.error);
        }
      }).catch(error => {
        console.error('❌ Error saving shortcuts to Firebase:', error);
      });
    }

    // Handle navigation based on shortcut id
    if (shortcut.id === 'payNow' || shortcut.label === 'PayNow') {
      navigate('/paynow');
    } else if (shortcut.id === 'payment-list' || shortcut.label === 'Payment List') {
      console.log('Payment List clicked - feature coming soon');
      // Disabled: navigate('/payment-list');
    } else if (shortcut.id === 'scanPay' || shortcut.label === 'Scan&Pay') {
      console.log('Scan&Pay clicked');
    } else if (shortcut.id === 'transfer' || shortcut.label === 'Transfer') {
      console.log('Transfer clicked');
    } else if (shortcut.id === 'overseasTransfer' || shortcut.label === 'Overseas Transfer') {
      navigate('/shared-access');
    } else if (shortcut.id === 'bills' || shortcut.label === 'Bills') {
      navigate('/paynow');
    }
  };

  const handleLogout = async () => {
    const result = await logoutUser();
    if (result.success) {
      const onboardingState = {};
      Object.keys(localStorage)
        .filter((key) => key.startsWith("ocbc_onboarding_seen_"))
        .forEach((key) => {
          onboardingState[key] = localStorage.getItem(key);
        });

      localStorage.clear();

      Object.entries(onboardingState).forEach(([key, value]) => {
        if (value !== null) {
          localStorage.setItem(key, value);
        }
      });
      console.log("User logged out successfully");
    }
  };

  if (showAccountDetails) {
    return <AccountDetails onBack={() => setShowAccountDetails(false)} />;
  }

  return (
  <div
    className="dashboard"
    style={{
      minHeight: "100vh",
      backgroundColor: "#f8f9fa",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    }}
  >
    <div
      className="dashboard-header"
      style={{
        backgroundColor: "#e31837",
        padding: "15px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        position: "relative",
      }}
    >
      {/* Left spacer - keep empty */}
      <div className="header-left" style={{ flex: 1 }}></div>

      {/* Right - Notification Button */}
      <div className="header-right" style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
        <div
          className="notification-icon"
          onClick={() => navigate('/notification')}
          style={{
            cursor: "pointer",
            backgroundColor: "white",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="https://png.pngtree.com/png-vector/20250708/ourmid/pngtree-red-3d-notification-bell-icon-for-youtube-or-app-alerts-png-image_16616221.webp"
            alt="Notification"
            style={{ width: "50px", height: "50px", objectFit: "contain" }}
          />
        </div>
      </div>
    </div>

    <div className="dashboard-content">
      <div
        className="account-card"
        onClick={() => setShowAccountDetails(true)}
        style={{
          maxWidth: "600px",
          margin: "20px auto",
          padding: "25px",
          backgroundColor: "white",
          borderRadius: "15px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid #e0e0e0",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.12)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}>
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              backgroundColor: "#d4a574",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "15px",
              fontWeight: "bold",
            }}
          >
            FRA
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "bold", fontSize: largeTextMode ? "20px" : "16px" }}>OCBC FRANK Account</div>
            <div style={{ fontSize: largeTextMode ? "17px" : "14px", color: "#666" }}>
              {userData?.accountNumber || "************"} <span style={{ fontSize: largeTextMode ? "19px" : "16px" }}></span>
            </div>
          </div>
          <div style={{ fontSize: largeTextMode ? "26px" : "20px" }}>›</div>
        </div>

        <div style={{ fontSize: largeTextMode ? "17px" : "14px", color: "#666", marginBottom: "5px" }}>
          ⓘ Click in to view your locked amount
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: largeTextMode ? "17px" : "14px" }}>Available balance</span>
          <span style={{ fontSize: largeTextMode ? "34px" : "28px", fontWeight: "bold" }}>
            {userData?.balance?.toFixed(2) || "0.00"} <span style={{ fontSize: largeTextMode ? "20px" : "16px" }}>SGD</span>
          </span>
        </div>

        {/* Foreign Currencies Display */}
        {userData?.foreignCurrencies && Object.keys(userData.foreignCurrencies).length > 0 && (
          <div style={{ 
            marginBottom: "15px", 
            padding: "12px 15px", 
            backgroundColor: "#f0f7ff", 
            borderRadius: "10px",
            border: "1px solid #d0e3ff"
          }}>
            <div style={{ 
              fontSize: largeTextMode ? "15px" : "12px", 
              color: "#666", 
              marginBottom: "8px",
              fontWeight: "500"
            }}>
              💱 Foreign Currency Holdings
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {Object.entries(userData.foreignCurrencies).map(([currency, amount]) => (
                <div 
                  key={currency}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    backgroundColor: "white",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
                  }}
                >
                  <span style={{ 
                    fontSize: largeTextMode ? "20px" : "16px", 
                    fontWeight: "600" 
                  }}>
                    {Number(amount).toFixed(2)}
                  </span>
                  <span style={{ 
                    fontSize: largeTextMode ? "14px" : "12px", 
                    color: "#666",
                    fontWeight: "500"
                  }}>
                    {currency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investment Portfolio Display */}
        {(livePortfolio?.portfolio?.length > 0 || userData?.portfolio?.length > 0) && (
          <div style={{ 
            marginBottom: "15px", 
            padding: "12px 15px", 
            backgroundColor: "#f0fff4", 
            borderRadius: "10px",
            border: "1px solid #c6f6d5"
          }}>
            <div style={{ 
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px"
            }}>
              <span style={{ 
                fontSize: largeTextMode ? "15px" : "12px", 
                color: "#666", 
                fontWeight: "500"
              }}>
                📈 Investment Portfolio
              </span>
              {livePortfolio?.summary && (
                <span style={{ 
                  fontSize: largeTextMode ? "14px" : "11px", 
                  fontWeight: "600",
                  color: livePortfolio.summary.totalGainLoss >= 0 ? "#22543d" : "#c53030"
                }}>
                  Total: ${livePortfolio.summary.totalValue.toFixed(2)} 
                  <span style={{ marginLeft: "5px" }}>
                    ({livePortfolio.summary.totalGainLoss >= 0 ? "+" : ""}
                    {livePortfolio.summary.totalGainLossPercent.toFixed(2)}%)
                  </span>
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(livePortfolio?.portfolio || userData?.portfolio || []).map((holding, index) => {
                const gainLoss = holding.gainLoss || 0;
                const gainLossPercent = holding.gainLossPercent || 0;
                const isProfit = gainLoss >= 0;
                
                return (
                  <div 
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      backgroundColor: "white",
                      borderRadius: "8px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ 
                        fontSize: largeTextMode ? "16px" : "14px", 
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        {holding.ticker}
                      </span>
                      <span style={{ 
                        fontSize: largeTextMode ? "12px" : "10px", 
                        color: "#888"
                      }}>
                        {Number(holding.shares).toFixed(4)} shares @ ${Number(holding.currentPrice || holding.avgPrice).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ 
                        fontSize: largeTextMode ? "16px" : "14px", 
                        fontWeight: "600",
                        color: "#333"
                      }}>
                        ${Number(holding.currentValue || holding.totalValue).toFixed(2)}
                      </div>
                      {holding.gainLoss !== undefined && (
                        <div style={{ 
                          fontSize: largeTextMode ? "12px" : "10px", 
                          fontWeight: "500",
                          color: isProfit ? "#22543d" : "#c53030"
                        }}>
                          {isProfit ? "▲" : "▼"} {isProfit ? "+" : ""}{gainLoss.toFixed(2)} ({isProfit ? "+" : ""}{gainLossPercent.toFixed(2)}%)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ fontSize: largeTextMode ? "17px" : "14px", color: "#666" }}>
          Debit card no. <span style={{ marginLeft: "10px" }}>****-****-****-****</span>
        </div>
      </div>

      <div
        className="accessibility-hub"
        style={{
          maxWidth: "640px",
          margin: "0 auto 18px",
          padding: "16px",
          backgroundColor: "white",
          borderRadius: "18px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: "1px solid #eee",
          "--access-card-height": largeTextMode ? "112px" : "96px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: "700",
                fontSize: largeTextMode ? "20px" : "16px",
                color: "#1a1a1a",
              }}
            >
              Accessible Actions
            </div>
            <div
              style={{
                fontSize: largeTextMode ? "14px" : "12px",
                color: "#666",
              }}
            >
              Quick access to help and essential tools.
            </div>
          </div>
          <div
            style={{
              backgroundColor: "#fef2f2",
              color: "#b91c1c",
              padding: "4px 10px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: "700",
              border: "1px solid #fecaca",
              letterSpacing: "0.4px",
            }}
          >
            ACCESSIBLE
          </div>
        </div>

        <div className="access-action-grid">
          {/* Voice Help Button (Manual Trigger) */}
          <button
            type="button"
            className="access-action-button"
            data-help-id="dashboard-voice-help-manual"
            onClick={onVoiceHelpClick}
            style={{ minHeight: largeTextMode ? "96px" : "88px" }}
            aria-label="Need Help?"
          >
            <span
              className="material-icons"
              aria-hidden="true"
              style={{
                fontSize: largeTextMode ? "28px" : "24px",
                color: "#e31837",
              }}
            >
              support_agent
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
              <span style={{ fontSize: largeTextMode ? "16px" : "14px", fontWeight: "700" }}>
                Need Help?
              </span>
              <span style={{ fontSize: largeTextMode ? "13px" : "12px", color: "#666", fontWeight: "500" }}>
                Voice and guided help
              </span>
            </div>
          </button>

          {/* AI Chatbot Button */}
          <button
            type="button"
            className="access-action-button ai-chatbot-button"
            data-help-id="onboarding-chatbot"
            onClick={() => navigate('/chatbot')}
            style={{ minHeight: largeTextMode ? "96px" : "88px" }}
            aria-label="Open AI Chatbot"
          >
            <span
              className="material-icons"
              aria-hidden="true"
              style={{
                fontSize: largeTextMode ? "28px" : "24px",
                color: "#e31837",
              }}
            >
              smart_toy
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
              <span style={{ fontSize: largeTextMode ? "16px" : "14px", fontWeight: "700" }}>
                AI Chatbot
              </span>
              <span style={{ fontSize: largeTextMode ? "13px" : "12px", color: "#666", fontWeight: "500" }}>
                Ask for help any time
              </span>
            </div>
          </button>

          {/* Eye Tracker Button - Same pattern as Hand Tracker */}
          <button
            type="button"
            className="access-action-button"
            onClick={onToggleEyeTracking}
            style={{ 
              minHeight: largeTextMode ? "96px" : "88px",
              backgroundColor: isEyeTrackingEnabled ? "#fef2f2" : "white",
              borderColor: isEyeTrackingEnabled ? "#e31837" : "#eee"
            }}
            aria-label={isEyeTrackingEnabled ? "Disable Eye Tracking" : "Enable Eye Tracking"}
          >
            <span
              className="material-icons"
              aria-hidden="true"
              style={{
                fontSize: largeTextMode ? "28px" : "24px",
                color: isEyeTrackingEnabled ? "#e31837" : "#e31837",
              }}
            >
              {isEyeTrackingEnabled ? "visibility" : "visibility"}
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
              <span style={{ fontSize: largeTextMode ? "16px" : "14px", fontWeight: "700" }}>
                {isEyeTrackingEnabled ? "Eye Tracking On" : "Eye Tracking"}
              </span>
              <span style={{ fontSize: largeTextMode ? "13px" : "12px", color: "#666", fontWeight: "500" }}>
                {isEyeTrackingEnabled ? "Gaze control active" : "Hands-free navigation"}
              </span>
            </div>
          </button>

          {/* Hand Tracker Button */}
          <button
            type="button"
            className="access-action-button"
            onClick={onToggleHandTracking}
            style={{ 
              minHeight: largeTextMode ? "96px" : "88px",
              backgroundColor: isHandTrackingEnabled ? "#f0fdf4" : "white",
              borderColor: isHandTrackingEnabled ? "#4caf50" : "#eee"
            }}
            aria-label={isHandTrackingEnabled ? "Disable Hand Tracking" : "Enable Hand Tracking"}
          >
            <span
              className="material-icons"
              aria-hidden="true"
              style={{
                fontSize: largeTextMode ? "28px" : "24px",
                color: isHandTrackingEnabled ? "#166534" : "#e31837",
              }}
            >
              front_hand
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
              <span style={{ fontSize: largeTextMode ? "16px" : "14px", fontWeight: "700" }}>
                {isHandTrackingEnabled ? "Hand Tracking On" : "Hand Tracking"}
              </span>
              <span style={{ fontSize: largeTextMode ? "13px" : "12px", color: "#666", fontWeight: "500" }}>
                {isHandTrackingEnabled ? "Gesture control active" : "Enable gestures"}
              </span>
            </div>
          </button>

          {/* Emergency Withdrawal Button */}
          <button
            type="button"
            className="access-action-button emergency-withdrawal-button"
            data-help-id="emergency-cash-button"
            onClick={() => navigate("/emergency-withdrawal")}
            style={{
              minHeight: largeTextMode ? "96px" : "88px",
              borderColor: "#fed7aa",
              backgroundColor: "#fff7ed",
            }}
            aria-label="Emergency cash withdrawal"
          >
            <span
              className="material-icons"
              aria-hidden="true"
              style={{
                fontSize: largeTextMode ? "28px" : "24px",
                color: "#ea580c",
              }}
            >
              emergency
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
              <span style={{ fontSize: largeTextMode ? "16px" : "14px", fontWeight: "700" }}>
                Emergency Cash
              </span>
              <span style={{ fontSize: largeTextMode ? "13px" : "12px", color: "#666", fontWeight: "500" }}>
                Fast cash withdrawal
              </span>
            </div>
          </button>

          {/* Remote ATM Button */}
          <button
            type="button"
            className="access-action-button"
            data-help-id="remote-atm-badge"
            onClick={() => navigate("/atm-remote")}
            style={{ minHeight: largeTextMode ? "96px" : "88px" }}
            aria-label="Remote ATM access"
          >
            <span
              className="material-icons"
              aria-hidden="true"
              style={{
                fontSize: largeTextMode ? "28px" : "24px",
                color: "#2563eb",
              }}
            >
              atm
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
              <span style={{ fontSize: largeTextMode ? "16px" : "14px", fontWeight: "700" }}>
                Remote ATM
              </span>
              <span style={{ fontSize: largeTextMode ? "13px" : "12px", color: "#666", fontWeight: "500" }}>
                Cardless access
              </span>
            </div>
          </button>

          {/* Shared Access Button */}
          <button
            type="button"
            className="access-action-button shared-access-button"
            onClick={() => navigate("/shared-access")}
            style={{ minHeight: largeTextMode ? "96px" : "88px" }}
            aria-label="Shared access"
          >
            <span
              className="material-icons"
              aria-hidden="true"
              style={{
                fontSize: largeTextMode ? "28px" : "24px",
                color: "#059669",
              }}
            >
              group
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
              <span style={{ fontSize: largeTextMode ? "16px" : "14px", fontWeight: "700" }}>
                Shared Access
              </span>
              <span style={{ fontSize: largeTextMode ? "13px" : "12px", color: "#666", fontWeight: "500" }}>
                Manage trusted helpers
              </span>
            </div>
          </button>

          {/* Customise Shortcut Button */}
          <button
            type="button"
            className="access-action-button customise-button"
            onClick={() => navigate("/customise-shortcut")}
            style={{ minHeight: largeTextMode ? "96px" : "88px" }}
            aria-label="Customise shortcuts"
          >
            <span
              className="material-icons"
              aria-hidden="true"
              style={{
                fontSize: largeTextMode ? "28px" : "24px",
                color: "#7c3aed",
              }}
            >
              tune
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
              <span style={{ fontSize: largeTextMode ? "16px" : "14px", fontWeight: "700" }}>
                Customise Shortcut
              </span>
              <span style={{ fontSize: largeTextMode ? "13px" : "12px", color: "#666", fontWeight: "500" }}>
                Edit quick actions
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Shortcuts Section Header */}
      <div
        style={{
          maxWidth: "600px",
          margin: "20px auto 10px",
          padding: "0 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontWeight: "700",
              fontSize: largeTextMode ? "20px" : "16px",
              color: "#1a1a1a",
            }}
          >
            Shortcuts
          </div>
          <div
            style={{
              fontSize: largeTextMode ? "14px" : "12px",
              color: "#666",
            }}
          >
            Quick access to your frequent actions
          </div>
        </div>
      </div>

      <ShortcutsLayoutManager 
        shortcuts={shortcuts}
        onShortcutClick={handleShortcutClick}
        onAddClick={() => navigate('/customise-shortcut')}
        showUsageCount={false}
        largeTextMode={largeTextMode}
        showLayoutSelector={false}
        defaultLayout="swipeable"
      />

      <div
        className="security-notice"
        style={{
          maxWidth: "600px",
          margin: "20px auto",
          padding: "15px 20px",
          backgroundColor: "#fff3cd",
          borderRadius: "10px",
          border: "1px solid #ffc107",
          fontSize: "13px",
          color: "#856404",
          lineHeight: "1.6",
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>Security advisory:</strong> Be aware of e-commerce scams. Do
          not click links or scan QR codes to make/collect payments - if an
          offer seems too good to be true, it likely is.{" "}
          <button
            style={{
              background: "none",
              border: "none",
              color: "#0066cc",
              textDecoration: "underline",
              cursor: "pointer",
              padding: 0,
              font: "inherit",
            }}
          >
            Learn more
          </button>
        </p>
      </div>

      <button
        onClick={handleLogout}
        className="logout-button"
        style={{
          marginTop: "30px",
          marginBottom: "80px",
          display: "block",
          marginLeft: "auto",
          marginRight: "auto",
          padding: "12px 40px",
          backgroundColor: "#e31837",
          color: "white",
          border: "none",
          borderRadius: "25px",
          fontSize: "16px",
          fontWeight: "500",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(227, 24, 55, 0.3)",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = "#c41530";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(227, 24, 55, 0.4)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "#e31837";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(227, 24, 55, 0.3)";
        }}
      >
        Logout
      </button>
    </div>
    
    <BottomNav activeTab="home" />
      {/* Chatbot Overlay Removed - now a standalone page */}
  </div>
);};

export default Dashboard;