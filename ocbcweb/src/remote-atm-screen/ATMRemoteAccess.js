import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ATMScreens from './ATMScreens';
import { speak, speakPrivate, vibrate, generateSessionCode } from './atmUtils';
import { useAuth } from '../auth/AuthContext';

const ATMRemoteAccess = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [currentStep, setCurrentStep] = useState('hub');
  const [selectedAction, setSelectedAction] = useState(null);
  const [amount, setAmount] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [securityAction, setSecurityAction] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(900);

  const handleActionSelect = (action) => {
    setSelectedAction(action);
    vibrate([50]);
    
    if (action === 'security') {
      setCurrentStep('security-choice');
      speak('ATM Security Settings. Choose to lock or unlock withdrawals for added security');
    } else if (action === 'amount-lock') { 
      setCurrentStep('amount-lock');
      speak('Amount Lock. Lock or unlock specific amounts in your account to secure your funds');
    } else if (action === 'shared-qr') {
      setCurrentStep('shared-qr-method');
      speak('Shared Access QR Withdrawal. Choose scan method: use camera to scan or upload from device');
    } else if (action === 'withdrawal') {
      setCurrentStep('prepare');
      speak('Cash Withdrawal. Enter the amount you want to withdraw');
    } else if (action === 'deposit') {
      setCurrentStep('prepare');
      speak('Cash Deposit. Prepare your deposit on your phone');
    } else {
      setCurrentStep('prepare');
      speak(`Prepare ${action}. Enter amount`);
    }
  };

  const handleSecurityChoice = (action) => {
    setSecurityAction(action);
    const code = generateSessionCode();
    setSessionCode(code);
    setCurrentStep('waiting');
    vibrate([50, 100, 50]);
    
    // Use private audio for session code
    const codeSpoken = code.split('').join(' ');
    speakPrivate(
      `${action === 'lock' ? 'Locking' : 'Unlocking'} ATM withdrawals. ` +
      `Your session code is ${codeSpoken}. ` +
      `Valid for 15 minutes. ` +
      `Go to any OCBC ATM and insert your card to complete the process.`
    );
    
    startTimer();
  };

  const handlePrepareWithdrawal = () => {
    if (!amount || parseFloat(amount) <= 0) {
      speak('Please enter a valid amount greater than zero');
      vibrate([100, 50, 100]);
      return;
    }
    
    const code = generateSessionCode();
    setSessionCode(code);
    setCurrentStep('waiting');
    vibrate([50, 100, 50]);
    
    // Use private audio for withdrawal details
    const codeSpoken = code.split('').join(' ');
    speakPrivate(
      `Withdrawal of ${amount} dollars prepared. ` +
      `Your session code is ${codeSpoken}. ` +
      `Valid for 15 minutes. ` +
      `Go to any OCBC ATM and insert your card to complete the withdrawal.`
    );
    
    startTimer();
  };

  const startTimer = () => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          speak('Session expired. Please create a new session.');
          return 0;
        }
        // Warn when 1 minute remaining
        if (prev === 60) {
          speak('Warning: One minute remaining on your session.');
        }
        // Warn when 5 minutes remaining
        if (prev === 300) {
          speak('Warning: Five minutes remaining on your session.');
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleATMConfirm = () => {
    setCurrentStep('confirm');
    vibrate([100, 50, 100]);
    
    // Announce ATM detection and what to confirm
    if (selectedAction === 'withdrawal') {
      speakPrivate(`ATM card detected. Please confirm withdrawal of ${amount} dollars on your phone.`);
    } else if (selectedAction === 'amount-lock') {
      speakPrivate(`ATM card detected. Please confirm ${securityAction} of ${amount} dollars on your phone.`);
    } else if (selectedAction === 'security') {
      speak(`ATM card detected. Please confirm security action: ${securityAction} withdrawals on your phone.`);
    } else {
      speak(`ATM card detected. Please confirm ${selectedAction} on your phone.`);
    }
  };

  const handleFinalConfirm = () => {
    setCurrentStep('complete');
    vibrate([50, 50, 50, 200]);
    
    // Transaction completion announcements
    if (selectedAction === 'withdrawal') {
      speakPrivate(
        `Withdrawal complete. You can now collect ${amount} dollars from the ATM dispenser. ` +
        `Please ensure you take your card and cash.`
      );
    } else if (selectedAction === 'amount-lock') {
      speakPrivate(
        `Amount lock complete. ${amount} dollars has been ${securityAction}ed in your account. ` +
        `${securityAction === 'lock' 
          ? 'This amount is now secured and cannot be withdrawn.' 
          : 'This amount is now available for use.'}`
      );
    } else if (selectedAction === 'security') {
      speak(
        `Security settings updated. ATM withdrawals are now ${securityAction}ed. ` +
        `${securityAction === 'lock' 
          ? 'You will not be able to withdraw cash from ATMs until you unlock this feature.' 
          : 'You can now withdraw cash from ATMs.'}`
      );
    } else if (selectedAction === 'deposit') {
      speak('Deposit preparation complete. Please insert your cash into the ATM deposit slot.');
    } else {
      speak('Transaction complete.');
    }
  };

  const handleBack = () => {
    if (currentStep === 'prepare' || currentStep === 'security-choice' || currentStep === 'amount-lock' || currentStep === 'shared-qr-method') {
      setCurrentStep('hub');
      setSelectedAction(null);
      setAmount('');
      speak('Returned to main menu. Choose an action.');
    } else if (currentStep === 'waiting') {
      if (selectedAction === 'security' || selectedAction === 'amount-lock') {
        setCurrentStep(selectedAction === 'security' ? 'security-choice' : 'amount-lock');
      } else {
        setCurrentStep('prepare');
      }
      setSessionCode('');
      speak('Session cancelled. Returned to previous screen.');
    } else if (currentStep === 'confirm') {
      setCurrentStep('waiting');
      speak('Confirmation cancelled. Returned to session screen.');
    }
  };

  return (
    <ATMScreens
      currentStep={currentStep}
      selectedAction={selectedAction}
      amount={amount}
      setAmount={setAmount}
      sessionCode={sessionCode}
      securityAction={securityAction}
      timeRemaining={timeRemaining}
      navigate={navigate}
      onActionSelect={handleActionSelect}
      onSecurityChoice={handleSecurityChoice}
      onPrepareWithdrawal={handlePrepareWithdrawal}
      onATMConfirm={handleATMConfirm}
      onFinalConfirm={handleFinalConfirm}
      onBack={handleBack}
      setCurrentStep={setCurrentStep}
      setSessionCode={setSessionCode}
      setSecurityAction={setSecurityAction}
      startTimer={startTimer}
      userId={currentUser?.uid}
      userData={userData}
    />
  );
};

export default ATMRemoteAccess;