import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, IdCard, Building2, ChevronDown } from 'lucide-react';
import { auth } from '../services/firebase';
import { processPayNowTransaction, getUserData, addContact, getUserContacts, getAccountsICanAccess, findUserByIdentifier } from '../services/firebase';

const PayNow = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentScreen, setCurrentScreen] = useState('main');
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [showScamWarning, setShowScamWarning] = useState(true);
  const [hasAcknowledgedWarning, setHasAcknowledgedWarning] = useState(false);
  const [manualNumber, setManualNumber] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [savedContacts, setSavedContacts] = useState([]);
  const [contactName, setContactName] = useState('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedTransactionId, setGeneratedTransactionId] = useState('');
  const [userAccountNumber, setUserAccountNumber] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Shared account states
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  const filteredContacts = savedContacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.number.includes(searchQuery)
  );

  const loadContacts = async () => {
    const user = auth.currentUser;
    if (user) {
      setLoadingContacts(true);
      const contactsResult = await getUserContacts(user.uid);
      if (contactsResult.success) {
        setSavedContacts(contactsResult.contacts);
      }
      setLoadingContacts(false);
    }
  };

  // Fetch user data and contacts
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        // Fetch user data
        const result = await getUserData(user.uid);
        if (result.success) {
          setUserBalance(result.data.balance || 0);
          setUserAccountNumber(result.data.accountNumber || '671-000000-001');

          // Create "My Account" option
          const myAccount = {
            id: 'my-account',
            ownerName: 'My Account',
            ownerAccountNumber: result.data.accountNumber,
            ownerId: user.uid,
            balance: result.data.balance || 0,
            isOwnAccount: true,
            transactionApprovalLimit: 0,
            permissions: {
              makeTransfers: true,
              viewBalance: true,
              viewTransactions: true,
              approveRequests: false
            }
          };

          // Fetch shared accounts
          const sharedResult = await getAccountsICanAccess(user.uid);

          let accounts = [myAccount];
          if (sharedResult.success && sharedResult.accounts.length > 0) {
            // Add shared accounts that have makeTransfers permission
            const transferableAccounts = sharedResult.accounts.filter(
              acc => acc.permissions.makeTransfers
            );

            // Fetch balance for each shared account
            const enrichedAccounts = await Promise.all(transferableAccounts.map(async (acc) => {
              const ownerDataResult = await getUserData(acc.ownerId);
              let balance = 0;
              if (ownerDataResult.success) {
                balance = ownerDataResult.data.balance || 0;
              }
              return {
                ...acc,
                balance: balance
              };
            }));

            accounts = [...accounts, ...enrichedAccounts];
          }

          setAvailableAccounts(accounts);
          setSelectedAccount(myAccount);
        }

        await loadContacts();
      }
    };

    fetchUserData();
  }, []);

  const handleScamWarningProceed = () => {
    setHasAcknowledgedWarning(true);
    setShowScamWarning(false);
  };

  const handleScamWarningDecline = () => {
    navigate('/dashboard');
  };

  const handleRecipientClick = (contact) => {
    setSelectedRecipient(contact);
    setCurrentScreen('amount');
  };

  const handleManualNumberSubmit = async () => {
    if (!manualNumber || manualNumber.length < 8) {
      alert('Please enter a valid phone number');
      return;
    }

    const existingContact = savedContacts.find(c => c.number === manualNumber);
    if (existingContact) {
      setSelectedRecipient(existingContact);
      setShowManualEntry(false);
      setManualNumber('');
      setCurrentScreen('amount');
      return;
    }

    // Look up user by identifier
    const foundUser = await findUserByIdentifier(manualNumber);
    if (foundUser) {
      setContactName(foundUser.displayName || '');
    } else {
      setContactName('');
    }

    setShowManualEntry(false);
    setShowSavePrompt(true);
  };

  const handleSaveContact = async () => {
    if (!contactName.trim()) {
      alert('Please enter a name');
      return;
    }
    const user = auth.currentUser;
    if (user) {
      await addContact(user.uid, {
        name: contactName,
        number: manualNumber,
        type: 'paynow'
      });
      await loadContacts();
    }

    setSelectedRecipient({
      name: contactName,
      number: manualNumber,
      initial: contactName.charAt(0).toUpperCase(),
      color: '#e31837'
    });
    setShowSavePrompt(false);
    setManualNumber('');
    setCurrentScreen('amount');
  };

  const handleSkipSave = () => {
    setSelectedRecipient({
      name: contactName || manualNumber,
      number: manualNumber,
      initial: (contactName || manualNumber).charAt(0).toUpperCase(),
      color: '#9ca3af'
    });
    setShowSavePrompt(false);
    setManualNumber('');
    setCurrentScreen('amount');
  };

  const handleNext = () => {
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const accountBalance = selectedAccount.isOwnAccount
      ? userBalance
      : selectedAccount.balance || 0;

    if (accountBalance < amountNum) {
      alert(`Insufficient balance. Account balance is SGD ${accountBalance.toFixed(2)}`);
      return;
    }
    setCurrentScreen('confirm');
  };

  const handleTapToPay = async () => {
    setIsProcessing(true);

    const user = auth.currentUser;
    if (!user) {
      alert('Please log in to continue');
      setIsProcessing(false);
      return;
    }

    const amountNum = parseFloat(amount);

    const transactionData = {
      amount: amountNum,
      recipientName: selectedRecipient?.name,
      recipientNumber: selectedRecipient?.number,
      message: message,
      accountName: selectedAccount.isOwnAccount
        ? "OCBC FRANK Account"
        : `${selectedAccount.ownerName}'s Account`
    };

    let accessData = null;
    if (!selectedAccount.isOwnAccount) {
      accessData = {
        accessId: selectedAccount.id,
        ownerId: selectedAccount.ownerId,
        accessorId: user.uid,
        transactionApprovalLimit: selectedAccount.transactionApprovalLimit || 0
      };
    }

    const result = await processPayNowTransaction(
      selectedAccount.isOwnAccount ? user.uid : selectedAccount.ownerId,
      transactionData,
      accessData
    );

    if (result.success) {
      if (result.requiresApproval) {
        alert(result.message || `Transaction submitted for approval. Amount exceeds your limit.`);
        navigate('/dashboard');
      } else {
        setUserBalance(result.newBalance);
        setGeneratedTransactionId(result.transactionId);
        setCurrentScreen('success');
      }
    } else {
      alert(`Transaction failed: ${result.error}`);
    }

    setIsProcessing(false);
  };

  const handleBackToHome = () => {
    navigate('/dashboard');
  };

  // Main Screen
  if (currentScreen === 'main') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        maxWidth: '100%',
        margin: '0 auto',
        width: '100%',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        paddingBottom: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #e5e5e5',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          width: '100%',
          maxWidth: '800px'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginRight: '16px',
              padding: '4px'
            }}
          >
            <ChevronDown size={24} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>PayNow</div>
        </div>

        {/* Account Selector */}
        <div style={{
          width: '100%',
          maxWidth: '800px',
          backgroundColor: 'white',
          padding: '16px 20px',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>FROM</div>
          <div
            onClick={() => setShowAccountSelector(!showAccountSelector)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: selectedAccount?.isOwnAccount ? '#e31837' : '#4b5563',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Building2 size={16} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                  {selectedAccount?.ownerName}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {selectedAccount?.ownerAccountNumber}
                </div>
              </div>
            </div>
            <ChevronDown size={20} style={{ color: '#6b7280' }} />
          </div>

          {/* Account Dropdown */}
          {showAccountSelector && (
            <div style={{
              marginTop: '8px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              {availableAccounts.map(account => (
                <div
                  key={account.id}
                  onClick={() => {
                    setSelectedAccount(account);
                    setShowAccountSelector(false);
                  }}
                  style={{
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    backgroundColor: selectedAccount?.id === account.id ? '#f3f4f6' : 'white',
                    borderBottom: '1px solid #f3f4f6'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: account.isOwnAccount ? '#e31837' : '#4b5563',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <Building2 size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                      {account.ownerName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {account.ownerAccountNumber}
                    </div>
                  </div>
                  {account.id === selectedAccount?.id && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#e31837' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'white',
          width: '100%',
          maxWidth: '800px'
        }}>
          <div style={{
            position: 'relative',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Enter mobile number or name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-help-id="recipient-input"
              style={{
                width: '100%',
                paddingLeft: '32px',
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                fontSize: '16px'
              }}
            />
          </div>
        </div>

        {/* Manual Entry Option */}
        {searchQuery && !savedContacts.some(c => c.number === searchQuery) && (
          <div
            onClick={() => {
              setManualNumber(searchQuery);
              setShowManualEntry(true);
            }}
            data-help-id="pay-to-number"
            style={{
              padding: '16px 20px',
              backgroundColor: 'white',
              width: '100%',
              maxWidth: '800px',
              borderBottom: '1px solid #f3f4f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#e5e7eb',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IdCard size={20} style={{ color: '#6b7280' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                Pay to {searchQuery}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                Tap to enter details
              </div>
            </div>
          </div>
        )}

        {/* Manual Entry Modal */}
        {showManualEntry && (
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
            zIndex: 100,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '340px'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>Enter Details</h3>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={manualNumber}
                  onChange={(e) => setManualNumber(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowManualEntry(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: 'transparent',
                    color: '#6b7280',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualNumberSubmit}
                  data-help-id="manual-number-next"
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#e31837',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contacts List */}
        <div style={{
          width: '100%',
          maxWidth: '800px',
          backgroundColor: 'white',
          flex: 1
        }}>
          <div style={{
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#6b7280',
            backgroundColor: '#f9fafb'
          }}>
            ALL CONTACTS
          </div>

          {loadingContacts ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              Loading contacts...
            </div>
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => handleRecipientClick(contact)}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: contact.color || '#9ca3af',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600'
                }}>
                  {contact.initial}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {contact.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {contact.number}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              No contacts found
            </div>
          )}
        </div>

        {/* Save Contact Prompt Modal */}
        {showSavePrompt && (
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
            zIndex: 100,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '340px'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>Save to contacts?</h3>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter name"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>
              <div
                data-help-id="save-contact-actions"
                style={{ display: 'flex', gap: '12px' }}
              >
                <button
                  onClick={handleSkipSave}
                  data-help-id="save-contact-skip"
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: 'transparent',
                    color: '#6b7280',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Skip
                </button>
                <button
                  onClick={handleSaveContact}
                  data-help-id="save-contact-save"
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#e31837',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scam Warning Modal */}
        {showScamWarning && !hasAcknowledgedWarning && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '340px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <span style={{ fontSize: '32px' }}>⚠️</span>
              </div>
              <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: '700' }}>Protect yourself from scams</h2>
              <p style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
                Do not transfer money to strangers or for items listed on online marketplaces if you are unsure. OCBC will never ask for your login details or OTP.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={handleScamWarningProceed}
                  data-help-id="scam-warning-proceed"
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#e31837',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  I understand
                </button>
                <button
                  onClick={handleScamWarningDecline}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: 'transparent',
                    color: '#6b7280',
                    border: 'none',
                    fontWeight: '500',
                    fontSize: '15px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Amount Screen
  if (currentScreen === 'amount') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => setCurrentScreen('main')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
          >
            <ChevronDown size={24} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: '600', fontSize: '16px' }}>
            Enter Amount
          </div>
          <div style={{ width: '40px' }}></div>
        </div>

        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: selectedRecipient?.color || '#9ca3af',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              fontWeight: '600',
              margin: '0 auto 12px'
            }}>
              {selectedRecipient?.initial}
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
              {selectedRecipient?.name}
            </div>
            <div style={{ color: '#6b7280' }}>{selectedRecipient?.number}</div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Amount (SGD)</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid #e5e5e5', paddingBottom: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: '600', marginRight: '8px' }}>$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                data-help-id="amount-input"
                style={{
                  flex: 1,
                  fontSize: '32px',
                  fontWeight: '600',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent'
                }}
                autoFocus
              />
            </div>
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
              <span>
                Balance: SGD {selectedAccount?.isOwnAccount
                  ? userBalance.toFixed(2)
                  : (selectedAccount?.permissions?.viewBalance ? selectedAccount?.balance?.toFixed(2) : 'Hidden')}
              </span>
              {selectedAccount && !selectedAccount.isOwnAccount && (
                <span style={{ color: '#e31837' }}>
                  Using: {selectedAccount.ownerName}'s Account
                </span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Message (Optional)</div>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter description"
              style={{
                width: '100%',
                padding: '12px 0',
                border: 'none',
                borderBottom: '1px solid #e5e5e5',
                outline: 'none',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button
              onClick={handleNext}
              data-help-id="next-button"
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#e31837',
                color: 'white',
                border: 'none',
                borderRadius: '30px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(227, 24, 55, 0.3)'
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation Screen
  if (currentScreen === 'confirm') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', backgroundColor: 'white' }}>
          <button
            onClick={() => setCurrentScreen('amount')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
          >
            <ChevronDown size={24} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontWeight: '600', fontSize: '16px' }}>
            Review Transfer
          </div>
          <div style={{ width: '40px' }}></div>
        </div>

        <div style={{ padding: '20px', flex: 1 }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Amount</div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937' }}>
                SGD {parseFloat(amount).toFixed(2)}
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>To</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: '#1f2937' }}>{selectedRecipient?.name}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedRecipient?.number}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>From</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: '#1f2937' }}>
                    {selectedAccount?.isOwnAccount ? 'OCBC FRANK Account' : `${selectedAccount?.ownerName}'s Account`}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {selectedAccount?.isOwnAccount ? userAccountNumber : selectedAccount?.ownerAccountNumber}
                  </div>
                </div>
              </div>

              {message && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ color: '#6b7280', fontSize: '14px' }}>Message</div>
                  <div style={{ fontWeight: '500', color: '#1f2937' }}>{message}</div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleTapToPay}
            disabled={isProcessing}
            data-help-id="confirm-button"
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: '#e31837',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(227, 24, 55, 0.3)',
              opacity: isProcessing ? 0.7 : 1
            }}
          >
            {isProcessing ? 'Processing...' : 'Slide to Pay'}
          </button>
        </div>
      </div>
    );
  }

  // Success Screen
  if (currentScreen === 'success') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#dcfce7',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '40px' }}>✅</div>
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
          Transfer Successful
        </h2>
        <div style={{ fontSize: '16px', color: '#6b7280', marginBottom: '32px' }}>
          Ref: {generatedTransactionId}
        </div>

        <div style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', marginBottom: '48px' }}>
          SGD {parseFloat(amount).toFixed(2)}
        </div>

        <button
          onClick={handleBackToHome}
          style={{
            width: '100%',
            maxWidth: '300px',
            padding: '16px',
            backgroundColor: '#f3f4f6',
            color: '#1f2937',
            border: 'none',
            borderRadius: '30px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  return null;
};

export default PayNow;
