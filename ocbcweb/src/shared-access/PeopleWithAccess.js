import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, UserPlus, Trash2, Edit2, Mail, Phone, X, Check, Clock, Shield, Users } from 'lucide-react';
import {
  getPeopleWithAccess,
  sendAccessInvitationV2,
  requestRevokeAccess,
  updateAccessPermissions,
  db,
  getUserData,
  getMyRevocationRequests,
  approveRevocation,
  declineRevocation,
  getPendingLimitChangeRequests
} from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const PeopleWithAccess = ({ user, onBack, onSwitchToSharedAccess, showBackButton = true }) => {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [currentUser] = useState(user);
  const [revocationRequests, setRevocationRequests] = useState([]);
  const [showRevocationRequests, setShowRevocationRequests] = useState(false);

  // New state for permissions and limits
  const [permissions, setPermissions] = useState({
    viewBalance: true,
    viewTransactions: true,
    makeTransfers: false,
    approveRequests: true
  });
  const [transactionApprovalLimit, setTransactionApprovalLimit] = useState(1000);
  const [requireMutualConsent, setRequireMutualConsent] = useState(false);

  const isMobile = window.innerWidth <= 768;

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPeopleWithAccess(currentUser.uid);
      if (result.success) {
        setPeople(result.people);
      }

      // Load revocation requests
      const revocationResult = await getMyRevocationRequests(currentUser.uid);
      if (revocationResult.success) {
        setRevocationRequests(revocationResult.requests);
      }
    } catch (error) {
      console.error("Error loading people:", error);
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    setSearching(true);
    setFoundUser(null);

    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', searchEmail.trim().toLowerCase())
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert('User not found with that email address');
        setSearching(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      const existingAccess = people.find(p => p.userId === userDoc.id);
      if (existingAccess) {
        alert('This user already has access to your account!');
        setSearching(false);
        return;
      }

      if (userDoc.id === currentUser.uid) {
        alert('You cannot grant access to yourself!');
        setSearching(false);
        return;
      }

      setFoundUser({
        id: userDoc.id,
        name: userData.name || 'Unknown',
        email: userData.email,
        phone: userData.phoneNumber || '',
        accountNumber: userData.accountNumber || ''
      });

    } catch (error) {
      console.error('Error searching user:', error);
      alert('Error searching for user: ' + error.message);
    }

    setSearching(false);
  };

  const handleSendInvitation = async () => {
    if (!foundUser) {
      alert('Please search for a user first');
      return;
    }

    try {
      const ownerData = await getUserData(currentUser.uid);
      if (!ownerData.success) {
        alert('Error getting your account data: ' + (ownerData.error || 'Unknown error'));
        return;
      }

      const result = await sendAccessInvitationV2(currentUser.uid, {
        recipientId: foundUser.id,
        recipientName: foundUser.name,
        recipientEmail: foundUser.email,
        recipientPhone: foundUser.phone,
        ownerName: ownerData.data.name,
        ownerAccountNumber: ownerData.data.accountNumber,
        ownerEmail: ownerData.data.email,
        permissions: permissions,
        requireMutualConsent: requireMutualConsent,
        transactionApprovalLimit: transactionApprovalLimit
      });

      if (result.success) {
        alert(`Invitation sent to ${foundUser.name}! They need to accept it to gain access.`);
        setShowAddModal(false);
        setSearchEmail('');
        setFoundUser(null);
        setPermissions({
          viewBalance: true,
          viewTransactions: true,
          makeTransfers: false,
          approveRequests: true
        });
        setRequireMutualConsent(false);
      } else {
        alert('Error sending invitation: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleRevokeAccess = async (person) => {
    const confirmMessage = person.requireMutualConsent
      ? `This access requires mutual consent. A revocation request will be sent to ${person.userName}. Continue?`
      : `Are you sure you want to revoke access for ${person.userName}? This will be immediate.`;

    if (window.confirm(confirmMessage)) {
      const result = await requestRevokeAccess(person.id, "owner", "Access revoked by account owner");

      if (result.success) {
        if (result.immediate) {
          alert("Access revoked successfully!");
          loadData();
        } else {
          alert(result.message);
          loadData();
        }
      } else {
        alert("Error revoking access: " + result.error);
      }
    }
  };

  const handleApproveRevocation = async (requestId) => {
    if (window.confirm("Are you sure you want to approve this revocation request?")) {
      const result = await approveRevocation(requestId);
      if (result.success) {
        alert("Revocation approved. Access has been removed.");
        loadData();
      } else {
        alert("Error: " + result.error);
      }
    }
  };

  const handleDeclineRevocation = async (requestId) => {
    if (window.confirm("Are you sure you want to decline this revocation request?")) {
      const result = await declineRevocation(requestId);
      if (result.success) {
        alert("Revocation request declined.");
        loadData();
      } else {
        alert("Error: " + result.error);
      }
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedPerson) return;
    const result = await updateAccessPermissions(
      selectedPerson.id,
      { permissions: permissions }
    );

    if (result.success) {
      alert("Permissions updated successfully!");
      setShowPermissionsModal(false);
      loadData();
    } else {
      alert("Error updating permissions: " + result.error);
    }
  };

  const openPermissionsModal = (person) => {
    setSelectedPerson(person);
    setPermissions(person.permissions);
    setShowPermissionsModal(true);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
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
        padding: isMobile ? '20px 16px' : '32px 40px',
        color: 'white',
        paddingBottom: '0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '24px',
          maxWidth: isMobile ? '100%' : '1200px',
          margin: '0 auto 24px auto'
        }}>
          {showBackButton && (
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
          )}
          <h1 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '600', margin: 0, letterSpacing: '-0.3px' }}>
            {onSwitchToSharedAccess ? 'Shared Access' : 'People with Access'}
          </h1>
        </div>

        {/* Tabs */}
        {onSwitchToSharedAccess && (
          <div style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.3)',
            maxWidth: isMobile ? '100%' : '1200px',
            margin: '0 auto'
          }}>
            <button
              onClick={onSwitchToSharedAccess}
              style={{
                flex: 1,
                paddingBottom: '12px',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: isMobile ? '14px' : '16px',
                opacity: 0.75,
                background: 'none',
                border: 'none',
                borderBottom: 'none',
                color: 'white',
                cursor: 'pointer',
                letterSpacing: '-0.2px'
              }}
            >
              Accounts you can access
            </button>
            <button
              style={{
                flex: 1,
                paddingBottom: '12px',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: isMobile ? '14px' : '16px',
                opacity: 1,
                background: 'none',
                border: 'none',
                borderBottom: '2px solid white',
                color: 'white',
                cursor: 'pointer',
                letterSpacing: '-0.2px'
              }}
            >
              People with Access
            </button>
          </div>
        )}
      </div>

      {/* Pending Revocation Requests Banner */}
      {revocationRequests.length > 0 && (
        <div style={{
          backgroundColor: colors.lightBeige,
          borderBottom: `2px solid ${colors.warning}`,
          padding: '16px 32px',
          cursor: 'pointer'
        }}
          onClick={() => setShowRevocationRequests(true)}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={20} style={{ color: colors.warning }} />
            <div>
              <div style={{ fontWeight: '600', color: colors.textPrimary, letterSpacing: '-0.2px' }}>
                {revocationRequests.length} Pending Revocation Request{revocationRequests.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '13px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>
                Click to review and respond
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{
        padding: isMobile ? '16px' : '32px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Add Person Button - Top Right */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => setShowAddModal(true)}
            data-help-id="shared-access-add-person"
            style={{
              backgroundColor: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              padding: isMobile ? '10px 20px' : '12px 24px',
              fontSize: isMobile ? '14px' : '15px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              letterSpacing: '-0.2px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = colors.primaryDark;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary;
            }}
          >
            <UserPlus size={18} />
            Add Person
          </button>
        </div>

        {people.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: colors.lightGrey,
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <Users size={40} color={colors.textLight} />
            </div>
            <h2 style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '12px', color: colors.textPrimary, letterSpacing: '-0.3px' }}>
              No one has access yet
            </h2>
            <p style={{ color: colors.textSecondary, marginBottom: '24px', fontSize: isMobile ? '14px' : '16px', letterSpacing: '-0.1px' }}>
              Grant access to family members or trusted individuals to help manage your account
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              data-help-id="shared-access-add-person"
              style={{
                backgroundColor: colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '24px',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                letterSpacing: '-0.2px',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.primary}
            >
              Grant Access
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {people.map((person) => (
              <div
                key={person.id}
                style={{
                  backgroundColor: colors.cardBg,
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: 'none',
                  border: `1px solid ${colors.border}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', marginBottom: '16px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: colors.iconBg,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.primary,
                    fontSize: '20px',
                    fontWeight: '600',
                    marginRight: '12px'
                  }}>
                    {person.userName?.[0] || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: colors.textPrimary, marginBottom: '4px', letterSpacing: '-0.3px' }}>
                      {person.userName}
                    </div>
                    {person.userEmail && (
                      <div style={{ fontSize: '13px', color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', letterSpacing: '-0.1px' }}>
                        <Mail size={14} />
                        {person.userEmail}
                      </div>
                    )}
                    {person.userPhone && (
                      <div style={{ fontSize: '13px', color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '4px', letterSpacing: '-0.1px' }}>
                        <Phone size={14} />
                        {person.userPhone}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openPermissionsModal(person)}
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
                    <Edit2 size={18} />
                  </button>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: colors.textSecondary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Permissions
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {person.permissions.viewBalance && (
                      <span style={{ fontSize: '12px', backgroundColor: '#E0F2FE', color: '#0369A1', padding: '4px 8px', borderRadius: '4px', fontWeight: '500' }}>
                        View Balance
                      </span>
                    )}
                    {person.permissions.viewTransactions && (
                      <span style={{ fontSize: '12px', backgroundColor: '#E0F2FE', color: '#0369A1', padding: '4px 8px', borderRadius: '4px', fontWeight: '500' }}>
                        View Transactions
                      </span>
                    )}
                    {person.permissions.makeTransfers && (
                      <span style={{ fontSize: '12px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 8px', borderRadius: '4px', fontWeight: '500' }}>
                        Make Transfers
                      </span>
                    )}
                    {person.permissions.approveRequests && (
                      <span style={{ fontSize: '12px', backgroundColor: colors.lightBeige, color: colors.warning, padding: '4px 8px', borderRadius: '4px', fontWeight: '500' }}>
                        Approve Requests
                      </span>
                    )}
                  </div>
                </div>

                <div style={{
                  borderTop: `1px solid ${colors.border}`,
                  paddingTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: colors.textLight }}>
                    Access since {new Date(person.grantedAt).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => handleRevokeAccess(person)}
                    style={{
                      color: colors.danger,
                      background: 'none',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      transition: 'background-color 0.2s',
                      letterSpacing: '-0.1px'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightRed}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Trash2 size={14} />
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Person Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0, letterSpacing: '-0.3px' }}>Grant Access</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={24} color={colors.textSecondary} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {!foundUser ? (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: colors.textPrimary, letterSpacing: '-0.1px' }}>
                      Search by Email
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="email"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        placeholder="Enter user's email address"
                        data-help-id="shared-access-email-input"
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.border}`,
                          fontSize: '16px',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = colors.primary}
                        onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
                      />
                      <button
                        onClick={handleSearchUser}
                        disabled={searching}
                        data-help-id="shared-access-search-button"
                        style={{
                          backgroundColor: colors.primary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0 20px',
                          fontWeight: '600',
                          cursor: searching ? 'not-allowed' : 'pointer',
                          opacity: searching ? 0.7 : 1,
                          letterSpacing: '-0.2px',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => {
                          if (!searching) e.currentTarget.style.backgroundColor = colors.primaryDark;
                        }}
                        onMouseOut={(e) => {
                          if (!searching) e.currentTarget.style.backgroundColor = colors.primary;
                        }}
                      >
                        {searching ? '...' : 'Search'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    backgroundColor: colors.lightGrey,
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }} data-help-id="shared-access-found-user">
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: colors.iconBg,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.primary,
                      fontWeight: '600'
                    }}>
                      {foundUser.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', letterSpacing: '-0.2px' }}>{foundUser.name}</div>
                      <div style={{ fontSize: '14px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>{foundUser.email}</div>
                    </div>
                    <button
                      onClick={() => setFoundUser(null)}
                      style={{ color: colors.textSecondary, background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                    >
                      Change
                    </button>
                  </div>

                  <div style={{ marginBottom: '24px' }} data-help-id="shared-access-permissions">
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', letterSpacing: '-0.2px' }}>Permissions</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={permissions.viewBalance}
                          onChange={(e) => setPermissions({ ...permissions, viewBalance: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <div>
                          <div style={{ fontWeight: '500', letterSpacing: '-0.1px' }}>View Balance</div>
                          <div style={{ fontSize: '13px', color: colors.textSecondary }}>Can see account balance</div>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={permissions.viewTransactions}
                          onChange={(e) => setPermissions({ ...permissions, viewTransactions: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <div>
                          <div style={{ fontWeight: '500', letterSpacing: '-0.1px' }}>View Transactions</div>
                          <div style={{ fontSize: '13px', color: colors.textSecondary }}>Can see transaction history</div>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={permissions.makeTransfers}
                          onChange={(e) => setPermissions({ ...permissions, makeTransfers: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <div>
                          <div style={{ fontWeight: '500', letterSpacing: '-0.1px' }}>Make Transfers</div>
                          <div style={{ fontSize: '13px', color: colors.textSecondary }}>Can initiate transfers (subject to limits)</div>
                        </div>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={permissions.approveRequests}
                          onChange={(e) => setPermissions({ ...permissions, approveRequests: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <div>
                          <div style={{ fontWeight: '500', letterSpacing: '-0.1px' }}>Approve Requests</div>
                          <div style={{ fontSize: '13px', color: colors.textSecondary }}>Can approve pending transactions</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: colors.textPrimary, letterSpacing: '-0.1px' }}>
                      Transaction Approval Limit ($)
                    </label>
                    <input
                      type="number"
                      value={transactionApprovalLimit}
                      onChange={(e) => setTransactionApprovalLimit(Number(e.target.value))}
                      min="0"
                      step="100"
                      data-help-id="shared-access-approval-limit"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        fontSize: '16px',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = colors.primary}
                      onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
                    />
                    <div style={{ fontSize: '13px', color: colors.textSecondary, marginTop: '4px' }}>
                      Transactions above this amount will require each other's approval.
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label
                      style={{ display: 'flex', alignItems: 'start', gap: '12px', cursor: 'pointer', backgroundColor: '#F0F9FF', padding: '12px', borderRadius: '8px' }}
                      data-help-id="shared-access-mutual-consent"
                    >
                      <input
                        type="checkbox"
                        checked={requireMutualConsent}
                        onChange={(e) => setRequireMutualConsent(e.target.checked)}
                        style={{ width: '18px', height: '18px', marginTop: '2px' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', color: '#0369A1', letterSpacing: '-0.1px' }}>Require Mutual Consent</div>
                        <div style={{ fontSize: '13px', color: '#0C4A6E' }}>
                          If enabled, revoking access will require approval from the other party.
                        </div>
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={handleSendInvitation}
                    data-help-id="shared-access-send-invite"
                    style={{
                      width: '100%',
                      backgroundColor: colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '14px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      letterSpacing: '-0.2px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                  >
                    Send Invitation
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedPerson && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, letterSpacing: '-0.3px' }}>Edit Permissions</h3>
              <button onClick={() => setShowPermissionsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={24} color={colors.textSecondary} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: '600', marginBottom: '4px', letterSpacing: '-0.2px' }}>{selectedPerson.userName}</div>
                <div style={{ fontSize: '14px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>Adjust what this user can do</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={permissions.viewBalance}
                    onChange={(e) => setPermissions({ ...permissions, viewBalance: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500', letterSpacing: '-0.1px' }}>View Balance</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={permissions.viewTransactions}
                    onChange={(e) => setPermissions({ ...permissions, viewTransactions: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500', letterSpacing: '-0.1px' }}>View Transactions</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={permissions.makeTransfers}
                    onChange={(e) => setPermissions({ ...permissions, makeTransfers: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500', letterSpacing: '-0.1px' }}>Make Transfers</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={permissions.approveRequests}
                    onChange={(e) => setPermissions({ ...permissions, approveRequests: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500', letterSpacing: '-0.1px' }}>Approve Requests</div>
                  </div>
                </label>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: 'white',
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    letterSpacing: '-0.2px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePermissions}
                  style={{
                    flex: 1,
                    backgroundColor: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    letterSpacing: '-0.2px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revocation Requests Modal */}
      {showRevocationRequests && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, letterSpacing: '-0.3px' }}>Revocation Requests</h3>
              <button onClick={() => setShowRevocationRequests(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = colors.lightGrey}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={24} color={colors.textSecondary} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {revocationRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: colors.textSecondary }}>
                  No pending requests
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {revocationRequests.map((request) => (
                    <div
                      key={request.id}
                      style={{
                        border: `1px solid ${colors.border}`,
                        borderRadius: '12px',
                        padding: '20px'
                      }}
                    >
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: colors.textPrimary, marginBottom: '8px', letterSpacing: '-0.2px' }}>
                          {request.requestedBy === 'user' ? (
                            <>
                              {request.userName} wants to remove their access
                            </>
                          ) : (
                            <>
                              You requested to revoke {request.userName}'s access
                            </>
                          )}
                        </div>
                        <div style={{ fontSize: '14px', color: colors.textSecondary, marginBottom: '4px', letterSpacing: '-0.1px' }}>
                          <strong>Account:</strong> {request.ownerName}
                        </div>
                        {request.reason && (
                          <div style={{ fontSize: '14px', color: colors.textSecondary, letterSpacing: '-0.1px' }}>
                            <strong>Reason:</strong> {request.reason}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: colors.textLight, marginTop: '8px' }}>
                          Requested: {new Date(request.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleApproveRevocation(request.id)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: colors.success,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            letterSpacing: '-0.2px',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <Check size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleDeclineRevocation(request.id)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            backgroundColor: colors.danger,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            letterSpacing: '-0.2px',
                            transition: 'background-color 0.2s'
                          }}
                        >
                          <X size={16} />
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeopleWithAccess;