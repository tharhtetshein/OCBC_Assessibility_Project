import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, FileText, DollarSign, CreditCard, Settings, Building2, PiggyBank, TrendingUp, Wallet, User, Bell, Lock, Smartphone, Globe, AlertCircle, RefreshCw, Plus, Eye, Shield, Mail, Users, CheckCircle, Zap, BarChart3, ArrowUpDown, Home, Leaf, Gift, MoreHorizontal } from 'lucide-react';
import { useNavigate, useLocation } from "react-router-dom";
import { logoutUser } from "../services/firebase";
import BottomNav from "./BottomNav";

// More Page Component
function MorePage() {
  const [expandedSections, setExpandedSections] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const highlightLabel = location.state?.highlightLabel || null;
  const highlightRef = useRef(null);
  
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
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleServiceClick = (label) => {
    // Check if it's Shared Access
    if (label === 'Shared Access') {
      navigate('/shared-access');
    } else {
      alert(`Clicked: ${label}`);
    }
  };

  const sections = [
    {
      id: 'card-services',
      title: 'Card services',
      items: [
        { icon: AlertCircle, label: 'Report lost card' },
        { icon: RefreshCw, label: 'Replace card' },
        { icon: CheckCircle, label: 'Activate credit card transaction' },
        { icon: DollarSign, label: 'Request fee waiver' },
        { icon: Lock, label: 'Link/unlink account' },
        { icon: BarChart3, label: 'Manage credit limit' },
        { icon: RefreshCw, label: 'Convert card' },
        { icon: Lock, label: 'Report PIN' },
        { icon: CheckCircle, label: 'Activate card' }
      ]
    },
    {
      id: 'deposit-account',
      title: 'Deposit account settings',
      items: [
        { icon: Lock, label: 'Get Money Lock' },
        { icon: RefreshCw, label: 'Update account' },
        { icon: Plus, label: 'Request services' },
        { icon: Settings, label: 'Standalone mode' },
        { icon: Users, label: 'Shared Access' }
      ]
    },
    {
      id: 'documents',
      title: 'Documents - Statements & Letters',
      items: [
        { icon: Eye, label: 'View documents' },
        { icon: FileText, label: 'Account documents' },
        { icon: FileText, label: 'Tax statement' }
      ]
    },
    {
      id: 'investment',
      title: 'Investment services',
      items: [
        { icon: TrendingUp, label: 'Investment corporate action' },
        { icon: BarChart3, label: 'Goal-planning' },
        { icon: Wallet, label: 'Manage PayNow' },
        { icon: PiggyBank, label: 'Manage CPF withdrawals' },
        { icon: Zap, label: 'Manage UtilityPay' },
        { icon: BarChart3, label: 'Manage stock limit' },
        { icon: Wallet, label: 'Manage PayToMore' },
        { icon: ArrowUpDown, label: 'Manage transaction limit' },
        { icon: TrendingUp, label: 'Pay for shares (IPO)' },
        { icon: CreditCard, label: 'Top up prepaid card' },
        { icon: Smartphone, label: 'Make e-SIM conversion' }
      ]
    },
    {
      id: 'payment',
      title: 'Payment & transfer',
      items: [
        { icon: Wallet, label: 'Manage PayNow' },
        { icon: PiggyBank, label: 'Manage CPF withdrawals' },
        { icon: Zap, label: 'Manage UtilityPay' }
      ]
    },
    {
      id: 'profile',
      title: 'Profile & app settings',
      items: [
        { icon: User, label: 'Update personal details' },
        { icon: Lock, label: 'Manage login details' },
        { icon: Shield, label: 'E-app OCBC DigiToken' },
        { icon: Settings, label: 'Change text size' },
        { icon: Bell, label: 'Manage notifications' },
        { icon: User, label: 'Manage Your Financial Adviser' },
        { icon: Mail, label: 'Secured mailbox' },
        { icon: Globe, label: 'Change language' },
        { icon: RefreshCw, label: 'Quick Sync' }
      ]
    }
  ];

  useEffect(() => {
    if (!highlightLabel) return;
    const match = sections.find((section) =>
      section.items.some((item) => item.label === highlightLabel)
    );
    if (match) {
      setExpandedSections((prev) => ({
        ...prev,
        [match.id]: true
      }));
    }
  }, [highlightLabel]);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightLabel]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', maxWidth: '430px', margin: '0 auto', position: 'relative', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#e31837', color: 'white', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>9:41</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', opacity: 0.3 }}></div>
            <div style={{ width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', opacity: 0.6 }}></div>
            <div style={{ width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%' }}></div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>More</h1>
          <button onClick={handleLogout} style={{ padding: '4px 16px', fontSize: '14px', backgroundColor: 'transparent', color: 'white', cursor: 'pointer', border: 'none'}}>
            Logout
          </button>
        </div>
      </div>

      {/* Apply Section */}
      <div style={{ backgroundColor: 'white', margin: '16px', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontWeight: '600', marginBottom: '12px', marginTop: 0 }}>Apply</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', textAlign: 'center' }}>
          {[
            { icon: Building2, label: 'Accounts' },
            { icon: CreditCard, label: 'Cards' },
            { icon: TrendingUp, label: 'Investments' },
            { icon: Settings, label: 'Insurance' },
            { icon: DollarSign, label: 'Loans' }
          ].map((item, index) => {
            const IconComponent = item.icon;
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconComponent style={{ width: '24px', height: '24px', color: '#4b5563' }} />
                </div>
                <span style={{ fontSize: '11px' }}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Services Section */}
      <div style={{ backgroundColor: 'white', margin: '0 16px 16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontWeight: '600', padding: '16px 16px 0', margin: 0 }}>Services</h2>
        <div>
          {sections.map((section) => (
            <div key={section.id} style={{ borderTop: '1px solid #e5e7eb' }}>
              <button
                onClick={() => toggleSection(section.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                <span style={{ fontWeight: '500', color: '#374151' }}>{section.title}</span>
                {expandedSections[section.id] ? (
                  <ChevronUp style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                ) : (
                  <ChevronDown style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
                )}
              </button>
              
              {expandedSections[section.id] && (
                <div style={{ padding: '0 16px 16px', backgroundColor: '#f9fafb' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {section.items.map((item, index) => {
                      const IconComponent = item.icon;
                      const isHighlighted = highlightLabel === item.label;
                      return (
                        <button
                          key={index}
                          ref={isHighlighted ? highlightRef : null}
                          onClick={() => handleServiceClick(item.label)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px',
                            backgroundColor: isHighlighted ? '#fff5f5' : 'transparent',
                            border: isHighlighted ? '2px solid #e31837' : 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ width: '48px', height: '48px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <IconComponent style={{ width: '20px', height: '20px', color: isHighlighted ? '#e31837' : '#4b5563' }} />
                          </div>
                          <span style={{ fontSize: '10px', textAlign: 'center', color: '#374151', lineHeight: '1.2', fontWeight: isHighlighted ? '600' : '400' }}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* New Features Banner */}
      <div style={{ backgroundColor: 'white', margin: '0 16px 16px', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontWeight: '600', marginBottom: '12px', marginTop: 0 }}>New features for you</h2>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
          <div style={{ minWidth: '180px', backgroundColor: '#fce7f3', padding: '12px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '500', margin: '0 0 4px 0' }}>Check out the new</p>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>Moneyland Detector</p>
              </div>
              <div style={{ fontSize: '24px' }}>🌱</div>
            </div>
            <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 8px 0' }}>Track your financial wins monthly.</p>
            <button style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Learn more</button>
          </div>
          <div style={{ minWidth: '180px', backgroundColor: '#dbeafe', padding: '12px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '500', margin: '0 0 4px 0' }}>Transfer payments</p>
                <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>Instantly</p>
              </div>
              <div style={{ fontSize: '24px' }}>⚡</div>
            </div>
            <p style={{ fontSize: '12px', color: '#4b5563', margin: '0 0 8px 0' }}>Try FAST payments today.</p>
            <button style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>Learn more</button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab="more" />
    </div>
  );
}

export default MorePage;
