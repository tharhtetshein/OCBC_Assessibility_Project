import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { updateUserShortcuts } from '../services/firebase';
import {
  defaultShortcuts,
  cardServiceShortcuts,
  shortcutCategories,
  SHORTCUTS_PER_PAGE,
  slugifyShortcutId
} from './shortcutsConfig';
import PreviewModal from './PreviewModal';
import LayoutSelector from './LayoutSelector';

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
  },
  'report-lost-card': {
    title: 'Report Lost Card',
    description: 'Immediately report your lost or stolen debit/credit card to prevent unauthorized use.',
    features: [
      'Instant card blocking',
      '24/7 reporting service',
      'Request replacement card',
      'Emergency cash advance'
    ],
    usage: 'Select the lost card, confirm blocking, and request a replacement if needed.',
    category: 'Card Management'
  },
  'lock-unlock-card': {
    title: 'Lock/Unlock Card',
    description: 'Temporarily lock or unlock your debit/credit cards for security or convenience.',
    features: [
      'Instant card locking/unlocking',
      'Temporary security measure',
      'No need to call bank',
      'Immediate activation'
    ],
    usage: 'Select your card and toggle the lock/unlock status as needed.',
    category: 'Card Management'
  },
  'manage-card-limit': {
    title: 'Manage Card Limit',
    description: 'Set and modify spending limits on your debit and credit cards for better control.',
    features: [
      'Set daily spending limits',
      'Modify ATM withdrawal limits',
      'Online transaction limits',
      'Overseas spending controls'
    ],
    usage: 'Select your card, choose limit type, and set your preferred spending limits.',
    category: 'Card Management'
  },
  'cancel-card': {
    title: 'Cancel Card',
    description: 'Permanently cancel your debit or credit card when you no longer need it.',
    features: [
      'Permanent card cancellation',
      'Stop all card transactions',
      'Clear outstanding balances',
      'Confirmation required'
    ],
    usage: 'Select the card to cancel, confirm your decision, and follow the cancellation process.',
    category: 'Card Management'
  },
  'reset-pin': {
    title: 'Reset PIN',
    description: 'Change or reset your card PIN for enhanced security and easy access.',
    features: [
      'Secure PIN reset process',
      'Choose your own PIN',
      'Immediate activation',
      'Enhanced security'
    ],
    usage: 'Select your card, verify your identity, and set a new PIN of your choice.',
    category: 'Card Management'
  },
  'manage-overseas-usage': {
    title: 'Manage Overseas Usage',
    description: 'Enable or disable your card for international transactions and travel.',
    features: [
      'Enable/disable overseas transactions',
      'Set travel dates',
      'Country-specific settings',
      'Fraud protection'
    ],
    usage: 'Select your card, choose countries/regions, and set overseas usage preferences.',
    category: 'Card Settings'
  },
  'manage-nets-contactless': {
    title: 'Manage NETS Contactless',
    description: 'Control your NETS contactless payment settings and transaction limits.',
    features: [
      'Enable/disable contactless payments',
      'Set contactless limits',
      'View contactless transactions',
      'Security settings'
    ],
    usage: 'Access NETS settings, modify contactless preferences, and set spending limits.',
    category: 'Card Settings'
  },
  'dispute-transaction': {
    title: 'Dispute Transaction',
    description: 'Report and dispute unauthorized or incorrect transactions on your accounts.',
    features: [
      'Report unauthorized transactions',
      'Submit dispute claims',
      'Track dispute status',
      'Upload supporting documents'
    ],
    usage: 'Select the disputed transaction, provide details, and submit your dispute claim.',
    category: 'Support'
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

const CustomiseShortcut = () => {
  const navigate = useNavigate();
  const { currentUser, userData, refreshUserData } = useAuth();
  const [selectedShortcut, setSelectedShortcut] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pulsingIndex, setPulsingIndex] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [autoOrganize, setAutoOrganize] = useState(false);
  const [largeTextMode, setLargeTextMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shakeIndex, setShakeIndex] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentLayout, setCurrentLayout] = useState(() => {
    return localStorage.getItem('shortcutsLayout') || 'swipeable';
  });

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [currentRecognition, setCurrentRecognition] = useState(null);

  // Saved Shortcuts Folder state
  const [savedShortcutFolders, setSavedShortcutFolders] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedShortcutInfo, setSelectedShortcutInfo] = useState(null);

  // Initialize with defaults that have usageCount
  const [shortcuts, setShortcuts] = useState(() => 
    defaultShortcuts.map(s => ({ ...s, usageCount: s.usageCount || 0 }))
  );

  // Initialize voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setVoiceSupported(true);
    }
    
    // Cleanup function to stop recognition on unmount
    return () => {
      if (currentRecognition && isListening) {
        currentRecognition.stop();
      }
    };
  }, [currentRecognition, isListening]);

  // Voice recognition handlers
  const startVoiceRecognition = () => {
    if (!voiceSupported || isListening) return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      setIsListening(true);
      setCurrentRecognition(recognition);
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      
      // Clean up the transcript by removing punctuation and extra spaces
      let cleanedTranscript = transcript
        .replace(/[.,!?;:'"()[\]{}\-_]/g, '') // Remove common punctuation
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim(); // Remove leading/trailing spaces
      
      // Apply common voice recognition corrections for banking terms
      const corrections = {
        'pay now': 'paynow',
        'pay no': 'paynow',
        'pain now': 'paynow',
        'pain no': 'paynow',
        'scan pay': 'scan pay',
        'scan and pay': 'scan pay',
        'transfer money': 'transfer',
        'overseas transfer': 'overseas transfer',
        'international transfer': 'overseas transfer',
        'bill payment': 'bills',
        'bill payments': 'bills',
        'pay bills': 'bills',
        'payment list': 'payment list',
        'card management': 'card',
        'manage card': 'card',
        'lost card': 'report lost card',
        'stolen card': 'report lost card',
        'block card': 'lock unlock card',
        'freeze card': 'lock unlock card',
        'unblock card': 'lock unlock card',
        'card limit': 'manage card limit',
        'spending limit': 'manage card limit',
        'pin reset': 'reset pin',
        'change pin': 'reset pin',
        'reset password': 'reset pin',
        'overseas usage': 'manage overseas usage',
        'international usage': 'manage overseas usage',
        'contactless': 'nets contactless',
        'nets': 'nets contactless',
        'dispute': 'dispute transaction',
        'report transaction': 'dispute transaction',
        'wrong transaction': 'dispute transaction'
      };
      
      // Apply corrections
      const lowerTranscript = cleanedTranscript.toLowerCase();
      let correctionApplied = false;
      for (const [incorrect, correct] of Object.entries(corrections)) {
        if (lowerTranscript.includes(incorrect)) {
          cleanedTranscript = correct;
          correctionApplied = true;
          break;
        }
      }
      
      setSearchQuery(cleanedTranscript);
      setIsListening(false);
      setCurrentRecognition(null);
      
      // Show success message with what was recognized
      if (cleanedTranscript) {
        const message = correctionApplied 
          ? `🎤 Recognized & corrected: "${cleanedTranscript}"` 
          : `🎤 Recognized: "${cleanedTranscript}"`;
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(''), 2500);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setCurrentRecognition(null);
      if (event.error === 'not-allowed') {
        setSuccessMessage('🎤 Microphone access denied. Please enable microphone permissions.');
      } else {
        setSuccessMessage('🎤 Voice recognition error. Please try again.');
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    };
    
    recognition.onend = () => {
      setIsListening(false);
      setCurrentRecognition(null);
    };
    
    try {
      recognition.start();
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      setIsListening(false);
      setCurrentRecognition(null);
      setSuccessMessage('🎤 Voice recognition failed to start. Please try again.');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const stopVoiceRecognition = () => {
    if (currentRecognition && isListening) {
      currentRecognition.stop();
    }
    setIsListening(false);
    setCurrentRecognition(null);
  };

  // Load shortcuts from persisted storage
  useEffect(() => {
    if (currentUser && userData) {
      // Logged in user - load from Firebase
      if (userData.shortcuts?.length) {
        const shortcutsWithUsage = userData.shortcuts.map(s => ({
          ...s,
          usageCount: s.usageCount || 0
        }));
        setShortcuts(shortcutsWithUsage);
      } else {
        // Initialize with defaults if no shortcuts in Firebase
        const defaultsWithUsage = defaultShortcuts.map(s => ({ 
          ...s, 
          usageCount: s.usageCount || 0 
        }));
        setShortcuts(defaultsWithUsage);
      }
      
      // Load settings from Firebase
      if (userData.settings) {
        if (userData.settings.autoOrganize !== undefined) {
          setAutoOrganize(userData.settings.autoOrganize);
        }
        if (userData.settings.largeTextMode !== undefined) {
          setLargeTextMode(userData.settings.largeTextMode);
        }
      }

      // Load saved shortcut folders from Firebase
      if (userData.savedShortcutFolders) {
        setSavedShortcutFolders(userData.savedShortcutFolders);
      }
      return;
    }

    // Guest user - load from localStorage
    const savedAutoOrganize = localStorage.getItem('autoOrganizeShortcuts');
    if (savedAutoOrganize) {
      setAutoOrganize(savedAutoOrganize === 'true');
    }

    const savedLargeTextMode = localStorage.getItem('largeTextMode');
    if (savedLargeTextMode) {
      setLargeTextMode(savedLargeTextMode === 'true');
    }

    // Load saved shortcut folders from localStorage for guests
    const savedFolders = localStorage.getItem('savedShortcutFolders');
    if (savedFolders) {
      try {
        const parsed = JSON.parse(savedFolders);
        if (Array.isArray(parsed)) {
          setSavedShortcutFolders(parsed);
        }
      } catch (error) {
        console.error('Error loading saved shortcut folders:', error);
      }
    }

    const guestShortcuts = localStorage.getItem('guestShortcuts');
    if (guestShortcuts) {
      try {
        const parsed = JSON.parse(guestShortcuts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const shortcutsWithUsage = parsed.map(s => ({
            ...s,
            usageCount: s.usageCount || 0
          }));
          setShortcuts(shortcutsWithUsage);
          return;
        }
      } catch (error) {
        console.error('Error loading guest shortcuts:', error);
      }
    }
    
    // Fallback to defaults for guests
    const defaultsWithUsage = defaultShortcuts.map(s => ({ 
      ...s, 
      usageCount: s.usageCount || 0 
    }));
    setShortcuts(defaultsWithUsage);
  }, [currentUser, userData]);

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [touchStartPos, setTouchStartPos] = useState(null);
  const [isDraggingTouch, setIsDraggingTouch] = useState(false);

  const handleEditClick = (index) => {
    setSelectedShortcut(index);
    setIsAddingNew(false);
  };

  // Simple swap function
  const swapShortcuts = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    const newShortcuts = [...shortcuts];
    const temp = newShortcuts[fromIndex];
    newShortcuts[fromIndex] = newShortcuts[toIndex];
    newShortcuts[toIndex] = temp;
    
    setShortcuts(newShortcuts);
  };

  // Drag and Drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    swapShortcuts(draggedIndex, dropIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e, index) => {
    if (e.target.closest('button')) return;
    
    setTouchStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setDraggedIndex(index);
    setIsDraggingTouch(true);
  };

  const handleTouchMove = (e) => {
    if (!isDraggingTouch || draggedIndex === null) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element) {
      const shortcutItem = element.closest('.shortcut-item');
      if (shortcutItem) {
        const allItems = Array.from(document.querySelectorAll('.shortcut-item'));
        const hoverIndex = allItems.indexOf(shortcutItem);
        if (hoverIndex !== -1 && hoverIndex !== draggedIndex) {
          setDragOverIndex(hoverIndex);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (isDraggingTouch && draggedIndex !== null && dragOverIndex !== null) {
      swapShortcuts(draggedIndex, dragOverIndex);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTouchStartPos(null);
    setIsDraggingTouch(false);
  };

  const handleAddClick = () => {
    setIsAddingNew(true);
    setSelectedShortcut(null);
  };

  const handleRemoveShortcut = (index) => {
    if (shortcuts.length > 1) {
      // Save to history for undo
      saveToHistory(shortcuts);
      
      const removedLabel = shortcuts[index].label;
      const newShortcuts = shortcuts.filter((_, i) => i !== index);
      setShortcuts(newShortcuts);
      setSelectedShortcut(null);
      setIsAddingNew(false);
      
      setSuccessMessage(`🗑️ "${removedLabel}" removed`);
      setTimeout(() => setSuccessMessage(''), 2000);
    } else {
      setSuccessMessage('⚠️ You must have at least one shortcut!');
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  const triggerPulseAnimation = (index, message) => {
    setPulsingIndex(index);
    setSuccessMessage(message);
    
    // Remove pulse after animation completes
    setTimeout(() => {
      setPulsingIndex(null);
      setSuccessMessage('');
    }, 2000);
  };

  const buildShortcutFromService = (service) => ({
    id: slugifyShortcutId(service.id || service.label),
    icon: service.icon,
    label: service.label
  });

  // History management for undo/redo
  const saveToHistory = (currentShortcuts) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...currentShortcuts]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setShortcuts([...history[historyIndex - 1]]);
      setSuccessMessage('↶ Undo');
      setTimeout(() => setSuccessMessage(''), 1500);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setShortcuts([...history[historyIndex + 1]]);
      setSuccessMessage('↷ Redo');
      setTimeout(() => setSuccessMessage(''), 1500);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all shortcuts to defaults? This cannot be undone.')) {
      saveToHistory(shortcuts);
      const defaultsWithUsage = defaultShortcuts.map(s => ({ 
        ...s, 
        usageCount: 0 
      }));
      setShortcuts(defaultsWithUsage);
      setSuccessMessage('🔄 Reset to defaults');
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  // Confetti effect
  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Handle layout change
  const handleLayoutChange = (layoutId) => {
    setCurrentLayout(layoutId);
    localStorage.setItem('shortcutsLayout', layoutId);
  };

  // Saved Shortcuts Folder Functions
  const handleSaveCurrentShortcuts = async () => {
    if (!newFolderName.trim()) {
      setSuccessMessage('⚠️ Please enter a folder name');
      setTimeout(() => setSuccessMessage(''), 2000);
      return;
    }

    // Check if folder name already exists
    const existingFolder = savedShortcutFolders.find(folder => 
      folder.name.toLowerCase() === newFolderName.trim().toLowerCase()
    );

    if (existingFolder) {
      setSuccessMessage('⚠️ Folder name already exists');
      setTimeout(() => setSuccessMessage(''), 2000);
      return;
    }

    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      shortcuts: [...shortcuts],
      layout: currentLayout,
      createdAt: new Date().toISOString(),
      settings: {
        autoOrganize,
        largeTextMode
      }
    };

    const updatedFolders = [...savedShortcutFolders, newFolder];
    setSavedShortcutFolders(updatedFolders);

    try {
      if (currentUser) {
        // Save to Firebase for logged-in users
        const { updateUserData } = await import('../services/firebase');
        await updateUserData(currentUser.uid, {
          savedShortcutFolders: updatedFolders
        });
      } else {
        // Save to localStorage for guests
        localStorage.setItem('savedShortcutFolders', JSON.stringify(updatedFolders));
      }

      setSuccessMessage(`💾 "${newFolderName}" saved successfully!`);
      setNewFolderName('');
      setShowSaveDialog(false);
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Error saving shortcut folder:', error);
      setSuccessMessage('❌ Failed to save folder');
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  const handleLoadShortcutFolder = async (folder) => {
    try {
      // Save current state to history before loading
      saveToHistory(shortcuts);

      // Load the folder's shortcuts and settings
      setShortcuts([...folder.shortcuts]);
      setCurrentLayout(folder.layout);
      localStorage.setItem('shortcutsLayout', folder.layout);
      
      if (folder.settings) {
        setAutoOrganize(folder.settings.autoOrganize || false);
        setLargeTextMode(folder.settings.largeTextMode || false);
      }

      setSuccessMessage(`📁 "${folder.name}" loaded successfully!`);
      setShowLoadDialog(false);
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Error loading shortcut folder:', error);
      setSuccessMessage('❌ Failed to load folder');
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  const handleDeleteShortcutFolder = async (folderId) => {
    if (!window.confirm('Are you sure you want to delete this saved shortcut folder?')) {
      return;
    }

    const updatedFolders = savedShortcutFolders.filter(folder => folder.id !== folderId);
    setSavedShortcutFolders(updatedFolders);

    try {
      if (currentUser) {
        // Update Firebase for logged-in users
        const { updateUserData } = await import('../services/firebase');
        await updateUserData(currentUser.uid, {
          savedShortcutFolders: updatedFolders
        });
      } else {
        // Update localStorage for guests
        localStorage.setItem('savedShortcutFolders', JSON.stringify(updatedFolders));
      }

      setSuccessMessage('🗑️ Folder deleted successfully');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Error deleting shortcut folder:', error);
      setSuccessMessage('❌ Failed to delete folder');
      setTimeout(() => setSuccessMessage(''), 2000);
    }
  };

  const handleServiceClick = (service) => {
    // Check if this service already exists in shortcuts
    const isDuplicate = shortcuts.some(shortcut => shortcut.label === service.label);
    
    if (isAddingNew) {
      // Check for duplicates when adding
      if (isDuplicate) {
        // Trigger shake animation
        const duplicateIndex = shortcuts.findIndex(s => s.label === service.label);
        setShakeIndex(duplicateIndex);
        setTimeout(() => setShakeIndex(null), 600);
        setSuccessMessage(`⚠️ "${service.label}" is already added!`);
        setTimeout(() => setSuccessMessage(''), 2000);
        return;
      }
      // Add new shortcut
      const newShortcut = buildShortcutFromService(service);
      const newShortcuts = [...shortcuts, newShortcut];
      
      // Save to history for undo
      saveToHistory(shortcuts);
      
      setShortcuts(newShortcuts);
      setIsAddingNew(false);
      
      // Trigger pulse animation on the newly added shortcut
      triggerPulseAnimation(newShortcuts.length - 1, `✓ "${service.label}" added!`);
    } else if (selectedShortcut !== null) {
      // Check for duplicates when replacing (excluding the one being replaced)
      const isDuplicateInOthers = shortcuts.some(
        (shortcut, index) => index !== selectedShortcut && shortcut.label === service.label
      );
      
      if (isDuplicateInOthers) {
        // Trigger shake animation
        const duplicateIndex = shortcuts.findIndex((s, i) => i !== selectedShortcut && s.label === service.label);
        setShakeIndex(duplicateIndex);
        setTimeout(() => setShakeIndex(null), 600);
        setSuccessMessage(`⚠️ "${service.label}" is already added!`);
        setTimeout(() => setSuccessMessage(''), 2000);
        return;
      }
      
      // Save to history for undo
      saveToHistory(shortcuts);
      
      // Replace existing shortcut
      const newShortcuts = [...shortcuts];
      newShortcuts[selectedShortcut] = buildShortcutFromService(service);
      setShortcuts(newShortcuts);
      
      // Trigger pulse animation on the replaced shortcut
      triggerPulseAnimation(selectedShortcut, `✓ Replaced with "${service.label}"!`);
      setSelectedShortcut(null);
    }
  };

  const persistShortcuts = async (updatedShortcuts) => {
    if (currentUser) {
      // Logged in - save to Firebase
      const result = await updateUserShortcuts(currentUser.uid, updatedShortcuts);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save shortcuts');
      }
      await refreshUserData();
      localStorage.setItem('shortcuts', JSON.stringify(updatedShortcuts));
    } else {
      // Guest - save to guestShortcuts
      localStorage.setItem('guestShortcuts', JSON.stringify(updatedShortcuts));
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await persistShortcuts(shortcuts);
      
      // Save settings
      if (currentUser) {
        // Save to Firebase for logged-in users
        const { updateUserSettings } = await import('../services/firebase');
        await updateUserSettings(currentUser.uid, {
          autoOrganize,
          largeTextMode
        });
        // Refresh user data to get updated settings
        await refreshUserData();
      } else {
        // Save to localStorage for guests
        localStorage.setItem('autoOrganizeShortcuts', autoOrganize.toString());
        localStorage.setItem('largeTextMode', largeTextMode.toString());
      }
      
      // Trigger confetti celebration!
      triggerConfetti();
      
      setSuccessMessage(
        currentUser
          ? '🎉 Shortcuts and settings saved to your account!'
          : '🎉 Shortcuts and settings saved on this device!'
      );
      
      setTimeout(() => {
        navigate(-1);
      }, 1500);
    } catch (error) {
      alert(error.message || 'Failed to save shortcuts and settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoOrganizeToggle = () => {
    const newValue = !autoOrganize;
    setAutoOrganize(newValue);
    
    // Save to localStorage immediately (will be synced to Firebase on Save button)
    localStorage.setItem('autoOrganizeShortcuts', newValue.toString());
    
    if (newValue) {
      // Sort immediately when enabled
      const sorted = [...shortcuts].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
      setShortcuts(sorted);
    }
  };

  const handleLargeTextModeToggle = () => {
    const newValue = !largeTextMode;
    setLargeTextMode(newValue);
    
    // Save to localStorage immediately (will be synced to Firebase on Save button)
    localStorage.setItem('largeTextMode', newValue.toString());
  };

  // Helper function for fuzzy matching
  const fuzzyMatch = (searchTerm, targetText) => {
    const search = searchTerm.toLowerCase();
    const target = targetText.toLowerCase();
    
    // Exact match gets highest priority
    if (target.includes(search)) return 3;
    
    // Check if all characters of search term exist in target (in order)
    let searchIndex = 0;
    for (let i = 0; i < target.length && searchIndex < search.length; i++) {
      if (target[i] === search[searchIndex]) {
        searchIndex++;
      }
    }
    if (searchIndex === search.length) return 2;
    
    // Check for partial word matches
    const searchWords = search.split(' ').filter(word => word.length > 0);
    const targetWords = target.split(' ').filter(word => word.length > 0);
    
    const matchingWords = searchWords.filter(searchWord => 
      targetWords.some(targetWord => 
        targetWord.includes(searchWord) || searchWord.includes(targetWord)
      )
    );
    
    if (matchingWords.length > 0) return 1;
    
    return 0;
  };

  // Filter card services based on search query with improved matching
  const filteredCardServices = cardServiceShortcuts.filter(service => {
    const searchTerm = searchQuery.toLowerCase().trim();
    
    // If no search query, show all services
    if (!searchTerm) return true;
    
    // Use fuzzy matching
    return fuzzyMatch(searchTerm, service.label) > 0;
  }).sort((a, b) => {
    // Sort by match quality (higher scores first)
    const searchTerm = searchQuery.toLowerCase().trim();
    return fuzzyMatch(searchTerm, b.label) - fuzzyMatch(searchTerm, a.label);
  });

  return (
    <div className="customise-shortcut-container">
      {/* Confetti Effect */}
      {showConfetti && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999,
          overflow: 'hidden'
        }}>
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${Math.random() * 100}%`,
                top: '-10px',
                width: '10px',
                height: '10px',
                backgroundColor: ['#e31837', '#ffd700', '#4caf50', '#2196f3', '#ff9800'][Math.floor(Math.random() * 5)],
                animation: `confettiFall ${2 + Math.random() * 2}s linear forwards`,
                transform: `rotate(${Math.random() * 360}deg)`,
                opacity: 0.8
              }}
            />
          ))}
        </div>
      )}

      <div className="customise-header" style={{
        padding: '32px 32px 24px 32px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 30%, #e9ecef 70%, #dee2e6 100%)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '3px solid rgba(227, 24, 55, 0.2)',
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        animation: 'headerSlideIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px'
      }}>
        {/* Header Row - Back Button and Title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button className="back-button animated-back-btn" onClick={() => navigate(-1)} style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%)',
            border: '3px solid rgba(227, 24, 55, 0.25)',
            cursor: 'pointer',
            padding: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '20px',
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.12), inset 0 2px 0 rgba(255,255,255,0.9)',
            minWidth: '64px',
            minHeight: '64px',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.15) rotate(-8deg)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(227, 24, 55, 0.3), inset 0 2px 0 rgba(255,255,255,0.9)';
            e.currentTarget.style.borderColor = 'rgba(227, 24, 55, 0.5)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #fff0f0 0%, #ffe8e8 50%, #ffd6d6 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12), inset 0 2px 0 rgba(255,255,255,0.9)';
            e.currentTarget.style.borderColor = 'rgba(227, 24, 55, 0.25)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(1.05) rotate(-4deg)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.15) rotate(-8deg)';
          }}
          >
            <span className="material-icons animated-arrow" style={{ 
              fontSize: '32px', 
              color: '#e31837', 
              fontWeight: '700',
              filter: 'drop-shadow(0 2px 4px rgba(227, 24, 55, 0.3))'
            }}>arrow_back</span>
          </button>
          
          <div className="header-title-section" style={{ 
            textAlign: 'center', 
            flex: 1, 
            margin: '0 24px',
            animation: 'titleFadeIn 1s ease-out 0.3s both'
          }}>
            <h2 className="animated-title" style={{ 
              margin: 0, 
              fontSize: '32px', 
              fontWeight: '900',
              background: 'linear-gradient(135deg, #e31837 0%, #c41230 30%, #a50e26 70%, #8b0c1f 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-1px',
              textShadow: '0 4px 8px rgba(227, 24, 55, 0.15)',
              position: 'relative',
              animation: 'titleGlow 3s ease-in-out infinite alternate',
              filter: 'drop-shadow(0 2px 4px rgba(227, 24, 55, 0.1))'
            }}>
              <span className="sparkle-icon" style={{
                position: 'absolute',
                left: '-40px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '28px',
                animation: 'sparkle 2s ease-in-out infinite',
                filter: 'drop-shadow(0 2px 4px rgba(255, 215, 0, 0.4))'
              }}>✨</span>
              Customise Shortcuts
              <span className="sparkle-icon" style={{
                position: 'absolute',
                right: '-40px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '28px',
                animation: 'sparkle 2s ease-in-out infinite 1s',
                filter: 'drop-shadow(0 2px 4px rgba(255, 215, 0, 0.4))'
              }}>✨</span>
            </h2>
            <p className="animated-subtitle" style={{
              margin: '12px 0 0 0',
              fontSize: '18px',
              color: '#555',
              fontWeight: '600',
              letterSpacing: '0.3px',
              animation: 'subtitleSlide 0.8s ease-out 0.5s both',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              <span className="material-icons" style={{ 
                fontSize: '22px', 
                verticalAlign: 'middle', 
                marginRight: '8px',
                color: '#e31837',
                filter: 'drop-shadow(0 1px 2px rgba(227, 24, 55, 0.3))'
              }}>palette</span>
              Personalize your banking experience
            </p>
          </div>

          {/* Empty space to balance the layout */}
          <div style={{ minWidth: '64px' }}></div>
        </div>
      </div>

      {/* Action Buttons Section - Between Header and Quick Actions */}
      <div className="header-actions-section" style={{ 
        padding: '24px 32px',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
        borderBottom: '2px solid rgba(227, 24, 55, 0.12)',
        animation: 'actionsSlideIn 0.8s ease-out 0.6s both',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Floating background decoration */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-10%',
          width: '120%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(227, 24, 55, 0.03) 0%, transparent 70%)',
          animation: 'floatingBg 8s ease-in-out infinite alternate',
          pointerEvents: 'none'
        }} />
        
        {/* Primary Actions Row */}
        <div style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 1
        }}>
          <button 
            className="preview-button animated-preview-btn" 
            onClick={() => setShowPreview(true)}
            style={{
              background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 30%, #495057 70%, #343a40 100%)',
              color: 'white',
              border: 'none',
              padding: '18px 28px',
              borderRadius: '18px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: '0 8px 24px rgba(108, 117, 125, 0.4), inset 0 2px 0 rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              whiteSpace: 'nowrap',
              minHeight: '64px',
              position: 'relative',
              overflow: 'hidden',
              width: '190px',
              transform: 'perspective(1000px) rotateX(0deg)',
              filter: 'drop-shadow(0 4px 8px rgba(108, 117, 125, 0.2))'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(-5deg) scale(1.08) translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 16px 40px rgba(108, 117, 125, 0.5), inset 0 2px 0 rgba(255,255,255,0.35)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #7c8691 0%, #6a7278 30%, #596067 70%, #454b52 100%)';
              e.currentTarget.style.filter = 'drop-shadow(0 8px 16px rgba(108, 117, 125, 0.3))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) scale(1) translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(108, 117, 125, 0.4), inset 0 2px 0 rgba(255,255,255,0.25)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #6c757d 0%, #5a6268 30%, #495057 70%, #343a40 100%)';
              e.currentTarget.style.filter = 'drop-shadow(0 4px 8px rgba(108, 117, 125, 0.2))';
            }}
          >
            <span className="material-icons animated-icon" style={{ 
              fontSize: '24px',
              animation: 'iconBounce 2s ease-in-out infinite',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
            }}>visibility</span>
            Preview
          </button>

          <button 
            className="save-folder-button animated-save-folder-btn" 
            onClick={() => setShowSaveDialog(true)}
            style={{
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 50%, #17a2b8 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: '0 6px 20px rgba(40, 167, 69, 0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              whiteSpace: 'nowrap',
              minHeight: '56px',
              position: 'relative',
              overflow: 'hidden',
              width: '180px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(40, 167, 69, 0.5), inset 0 2px 0 rgba(255,255,255,0.3)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #34ce57 0%, #2dd4aa 50%, #20c4e8 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4), inset 0 2px 0 rgba(255,255,255,0.2)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 50%, #17a2b8 100%)';
            }}
          >
            <span className="material-icons animated-icon" style={{ 
              fontSize: '22px',
              animation: 'iconBounce 2s ease-in-out infinite 0.5s'
            }}>create_new_folder</span>
            Save Layout
          </button>

          <button 
            className="load-folder-button animated-load-folder-btn" 
            onClick={() => setShowLoadDialog(true)}
            disabled={savedShortcutFolders.length === 0}
            style={{
              background: savedShortcutFolders.length === 0 
                ? 'linear-gradient(135deg, #ccc 0%, #bbb 100%)' 
                : 'linear-gradient(135deg, #fd7e14 0%, #e83e8c 50%, #6f42c1 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '16px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: savedShortcutFolders.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: savedShortcutFolders.length === 0 
                ? 'none' 
                : '0 6px 20px rgba(253, 126, 20, 0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              whiteSpace: 'nowrap',
              minHeight: '56px',
              position: 'relative',
              overflow: 'hidden',
              width: '180px'
            }}
            onMouseEnter={(e) => {
              if (savedShortcutFolders.length > 0) {
                e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(253, 126, 20, 0.5), inset 0 2px 0 rgba(255,255,255,0.3)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #ff8c42 0%, #f06292 50%, #8e24aa 100%)';
              }
            }}
            onMouseLeave={(e) => {
              if (savedShortcutFolders.length > 0) {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(253, 126, 20, 0.4), inset 0 2px 0 rgba(255,255,255,0.2)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #fd7e14 0%, #e83e8c 50%, #6f42c1 100%)';
              }
            }}
          >
            <span className="material-icons animated-icon" style={{ 
              fontSize: '22px',
              animation: savedShortcutFolders.length > 0 ? 'iconBounce 2s ease-in-out infinite 1s' : 'none'
            }}>folder_open</span>
            Load Layout ({savedShortcutFolders.length})
          </button>
        </div>

        {/* Save Changes Button - Full Width */}
        <div style={{
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button 
            className="save-button animated-save-btn" 
            onClick={handleSave} 
            disabled={isSaving}
            style={{
              background: isSaving 
                ? 'linear-gradient(135deg, #ccc 0%, #bbb 100%)' 
                : 'linear-gradient(135deg, #e31837 0%, #c41230 50%, #a50e26 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: '800',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: isSaving 
                ? 'none' 
                : '0 6px 20px rgba(227, 24, 55, 0.4), inset 0 2px 0 rgba(255,255,255,0.2)',
              whiteSpace: 'nowrap',
              minHeight: '56px',
              minWidth: '200px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!isSaving) {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(227, 24, 55, 0.5), inset 0 2px 0 rgba(255,255,255,0.3)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #f31947 0%, #d41240 50%, #b50e36 100%)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaving) {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(227, 24, 55, 0.4), inset 0 2px 0 rgba(255,255,255,0.2)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #e31837 0%, #c41230 50%, #a50e26 100%)';
              }
            }}
          >
            {isSaving ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="loading-spinner" style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Saving...
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons animated-save-icon" style={{ 
                  fontSize: '22px',
                  animation: 'saveIconPulse 2s ease-in-out infinite'
                }}>save</span>
                Save Changes
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div style={{
        maxWidth: '600px',
        margin: '15px auto',
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          style={{
            backgroundColor: historyIndex <= 0 ? '#e0e0e0' : '#fff',
            border: '2px solid #e31837',
            color: historyIndex <= 0 ? '#999' : '#e31837',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span className="material-icons" style={{ fontSize: '18px' }}>undo</span>
          Undo
        </button>
        <button
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
          style={{
            backgroundColor: historyIndex >= history.length - 1 ? '#e0e0e0' : '#fff',
            border: '2px solid #e31837',
            color: historyIndex >= history.length - 1 ? '#999' : '#e31837',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span className="material-icons" style={{ fontSize: '18px' }}>redo</span>
          Redo
        </button>
        <button
          onClick={handleResetToDefaults}
          style={{
            backgroundColor: '#fff',
            border: '2px solid #ff9800',
            color: '#ff9800',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span className="material-icons" style={{ fontSize: '18px' }}>refresh</span>
          Reset
        </button>
      </div>

      {/* Success Toast Notification */}
      {successMessage && (
        <div className="success-toast" style={{
          animation: 'slideInDown 0.5s ease-out'
        }}>
          {successMessage}
        </div>
      )}

      <div className="shortcuts-section">
        {/* Enhanced Settings Panel */}
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%)',
          padding: '32px',
          borderRadius: '20px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.12)',
          border: '2px solid rgba(227, 24, 55, 0.12)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Floating background decoration */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle, rgba(227, 24, 55, 0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'floatingCircle 6s ease-in-out infinite alternate',
            pointerEvents: 'none'
          }} />
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px',
            paddingBottom: '20px',
            borderBottom: '3px solid rgba(227, 24, 55, 0.15)',
            position: 'relative',
            zIndex: 1
          }}>
            <span className="material-icons" style={{ 
              fontSize: '32px', 
              color: '#e31837', 
              marginRight: '16px',
              filter: 'drop-shadow(0 2px 4px rgba(227, 24, 55, 0.3))',
              animation: 'settingsRotate 4s ease-in-out infinite'
            }}>
              settings
            </span>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: '800', 
                color: '#1a1a1a',
                letterSpacing: '-0.5px',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                Settings & Preferences
              </h3>
              <p style={{ 
                margin: '6px 0 0 0', 
                fontSize: '16px', 
                color: '#666',
                fontWeight: '500'
              }}>
                Customize your shortcuts experience
              </p>
            </div>
          </div>

          {/* Auto-Organize Toggle */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            padding: '16px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(227, 24, 55, 0.05)'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: '600', 
                fontSize: '16px', 
                color: '#1a1a1a', 
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span className="material-icons" style={{ fontSize: '20px', color: '#e31837' }}>
                  auto_awesome
                </span>
                Auto-organize by usage
              </div>
              <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
                Shortcuts will be automatically sorted by usage frequency when you return to the dashboard
              </div>
            </div>
            <label style={{
              position: 'relative',
              display: 'inline-block',
              width: '56px',
              height: '32px',
              marginLeft: '20px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={autoOrganize}
                onChange={handleAutoOrganizeToggle}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: autoOrganize 
                  ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' 
                  : 'linear-gradient(135deg, #dee2e6 0%, #adb5bd 100%)',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                borderRadius: '32px',
                boxShadow: autoOrganize 
                  ? '0 2px 8px rgba(40, 167, 69, 0.3)' 
                  : '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '',
                  height: '24px',
                  width: '24px',
                  left: autoOrganize ? '28px' : '4px',
                  bottom: '4px',
                  backgroundColor: 'white',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  borderRadius: '50%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }} />
              </span>
            </label>
          </div>

          {/* Large Text Mode Toggle */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '16px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(227, 24, 55, 0.05)'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: '600', 
                fontSize: '16px', 
                color: '#1a1a1a', 
                marginBottom: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span className="material-icons" style={{ fontSize: '20px', color: '#e31837' }}>
                  accessibility
                </span>
                Large Text Mode
              </div>
              <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
                Increase text size and spacing for better readability and accessibility
              </div>
            </div>
            <label style={{
              position: 'relative',
              display: 'inline-block',
              width: '56px',
              height: '32px',
              marginLeft: '20px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={largeTextMode}
                onChange={handleLargeTextModeToggle}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: largeTextMode 
                  ? 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)' 
                  : 'linear-gradient(135deg, #dee2e6 0%, #adb5bd 100%)',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                borderRadius: '32px',
                boxShadow: largeTextMode 
                  ? '0 2px 8px rgba(0, 123, 255, 0.3)' 
                  : '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '',
                  height: '24px',
                  width: '24px',
                  left: largeTextMode ? '28px' : '4px',
                  bottom: '4px',
                  backgroundColor: 'white',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  borderRadius: '50%',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </span>
            </label>
          </div>
        </div>

        {/* Layout Selector */}
        <div style={{
          backgroundColor: '#fff',
          padding: '15px 20px',
          borderRadius: '12px',
          marginBottom: '15px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e0e0e0'
        }}>
          <div style={{ fontWeight: '600', fontSize: '15px', color: '#333', marginBottom: '10px' }}>
            🎨 Layout Style
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
            Choose how your shortcuts are displayed
          </div>
          <LayoutSelector
            currentLayout={currentLayout}
            onLayoutChange={handleLayoutChange}
            largeTextMode={largeTextMode}
          />
        </div>

        <div style={{
          backgroundColor: '#e8f4ff',
          padding: '10px 15px',
          borderRadius: '8px',
          marginBottom: '15px',
          textAlign: 'center',
          color: '#004085',
          fontSize: largeTextMode ? '16px' : '13px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '5px' }}>
            💡 Drag & drop shortcuts to reorder them
          </div>
          <div>
            {shortcuts.length} shortcuts • {Math.ceil(shortcuts.length / SHORTCUTS_PER_PAGE)} page{Math.ceil(shortcuts.length / SHORTCUTS_PER_PAGE) !== 1 ? 's' : ''} ({SHORTCUTS_PER_PAGE} per page)
          </div>
        </div>
        {selectedShortcut !== null && (
          <div className="selection-notice" style={{
            backgroundColor: '#fff3cd',
            padding: '10px 15px',
            borderRadius: '8px',
            marginBottom: '15px',
            textAlign: 'center',
            color: '#856404',
            fontWeight: '500',
            fontSize: largeTextMode ? '16px' : '14px'
          }}>
            Click on a card service below to replace "{shortcuts[selectedShortcut].label}"
          </div>
        )}
        {isAddingNew && (
          <div className="selection-notice" style={{
            backgroundColor: '#d4edda',
            padding: '10px 15px',
            borderRadius: '8px',
            marginBottom: '15px',
            textAlign: 'center',
            color: '#155724',
            fontWeight: '500',
            fontSize: largeTextMode ? '16px' : '14px'
          }}>
            Click on a card service below to add a new shortcut
          </div>
        )}
        <div className="shortcut-grid">
          {shortcuts.map((shortcut, index) => (
            <div 
              key={index} 
              className={`shortcut-item ${pulsingIndex === index ? 'pulse-success' : ''} ${shakeIndex === index ? 'shake-error' : ''}`}
              draggable={true}
              onDragStart={(e) => {
                if (e.target.closest('button')) {
                  e.preventDefault();
                  return;
                }
                handleDragStart(e, index);
              }}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                cursor: draggedIndex === index ? 'grabbing' : 'grab',
                transition: shakeIndex === index ? 'none' : 'all 0.3s ease',
                opacity: draggedIndex === index ? 0.4 : 1,
                transform: dragOverIndex === index ? 'scale(1.1)' : draggedIndex === index ? 'scale(0.95)' : 'scale(1)',
                backgroundColor: dragOverIndex === index ? '#e8f4ff' : shakeIndex === index ? '#ffe8e8' : 'transparent',
                border: dragOverIndex === index ? '2px dashed #e31837' : shakeIndex === index ? '2px solid #e31837' : '2px solid transparent',
                position: 'relative',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitUserDrag: 'element',
                touchAction: 'none'
              }}
            >
              <div className={`shortcut-icon-wrapper ${selectedShortcut === index ? 'selected' : ''} ${draggedIndex === index ? 'dragging' : ''}`}>
                <span className="material-icons" style={{ pointerEvents: 'none' }}>{shortcut.icon}</span>
                <button 
                  className={`edit-icon ${selectedShortcut === index ? 'active' : 'inactive'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(index);
                  }}
                  onDragStart={(e) => e.preventDefault()}
                  title="Edit this shortcut"
                >
                  <span className="material-icons">edit</span>
                </button>
                {shortcuts.length > 1 && (
                  <button 
                    className="remove-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveShortcut(index);
                    }}
                    onDragStart={(e) => e.preventDefault()}
                    title="Remove this shortcut"
                  >
                    <span className="material-icons">close</span>
                  </button>
                )}
              </div>
              <p style={{ fontSize: largeTextMode ? '16px' : '14px', fontWeight: largeTextMode ? '600' : '500' }}>{shortcut.label}</p>
            </div>
          ))}
          
          <div className="shortcut-item">
            <div 
              className={`shortcut-icon-wrapper add-button ${isAddingNew ? 'selected' : ''}`}
              onClick={handleAddClick}
              style={{ cursor: 'pointer' }}
            >
              <span className="material-icons" style={{ fontSize: largeTextMode ? '56px' : '48px', color: '#e31837' }}>add_circle</span>
            </div>
            <p style={{ fontSize: largeTextMode ? '16px' : '14px', fontWeight: largeTextMode ? '600' : '500' }}>Add</p>
          </div>
        </div>
      </div>

      <div className="card-services-section">
        {/* Search Bar - Above Card Services */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '25px',
          padding: '0 20px'
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
            <span className="material-icons" style={{
              position: 'absolute',
              left: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#999',
              fontSize: '26px'
            }}>search</span>
            <input
              type="text"
              placeholder={isListening ? "🎤 Listening... Speak now" : "Search shortcuts..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: largeTextMode ? '20px 28px 20px 65px' : '18px 24px 18px 60px',
                paddingRight: voiceSupported ? (largeTextMode ? '110px' : '100px') : (searchQuery ? '65px' : '28px'),
                border: '3px solid #e0e0e0',
                borderRadius: '35px',
                fontSize: largeTextMode ? '22px' : '20px',
                outline: 'none',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxSizing: 'border-box',
                fontWeight: '500',
                boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#e31837';
                e.target.style.boxShadow = '0 0 0 5px rgba(227, 24, 55, 0.15), 0 8px 25px rgba(0,0,0,0.15)';
                e.target.style.transform = 'scale(1.02)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
                e.target.style.transform = 'scale(1)';
              }}
              onKeyDown={(e) => {
                // Ctrl/Cmd + M to trigger voice recognition
                if ((e.ctrlKey || e.metaKey) && e.key === 'm' && voiceSupported && !isListening) {
                  e.preventDefault();
                  startVoiceRecognition();
                }
                // Escape to stop voice recognition
                if (e.key === 'Escape' && isListening) {
                  e.preventDefault();
                  stopVoiceRecognition();
                }
              }}
            />
            
            {voiceSupported && (
              <button
                onClick={startVoiceRecognition}
                disabled={isListening}
                style={{
                  position: 'absolute',
                  right: searchQuery ? '65px' : '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: isListening 
                    ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' 
                    : 'linear-gradient(135deg, #e31837 0%, #c41230 100%)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '45px',
                  height: '45px',
                  cursor: isListening ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: isListening 
                    ? '0 0 30px rgba(220, 53, 69, 0.8), 0 8px 20px rgba(220, 53, 69, 0.5)' 
                    : '0 8px 20px rgba(227, 24, 55, 0.4)',
                  animation: isListening ? 'voicePulse 1.5s ease-in-out infinite' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isListening) {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.15)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(227, 24, 55, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isListening) {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(227, 24, 55, 0.4)';
                  }
                }}
                title={isListening ? 'Listening...' : 'Voice search (Ctrl+M)'}
              >
                <span className="material-icons" style={{ 
                  color: 'white', 
                  fontSize: '24px',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                }}>
                  {isListening ? 'mic' : 'mic_none'}
                </span>
              </button>
            )}
            
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f0f0f0';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                }}
                title="Clear search"
              >
                <span className="material-icons" style={{ color: '#999', fontSize: '22px' }}>close</span>
              </button>
            )}
          </div>
        </div>

        {/* Card Services Header */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: largeTextMode ? '24px' : '20px', fontWeight: '700', color: '#333' }}>Card Services</h3>
        </div>
        
        {filteredCardServices.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#999'
          }}>
            <span className="material-icons" style={{ fontSize: '48px', marginBottom: '10px', display: 'block' }}>search_off</span>
            <p>No shortcuts found matching "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              style={{
                backgroundColor: '#e31837',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '20px',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Clear Search
            </button>
          </div>
        ) : searchQuery ? (
          // Show filtered results when searching
          <div>
            <div style={{
              padding: '10px 15px',
              backgroundColor: '#e8f4ff',
              borderRadius: '8px',
              marginBottom: '15px',
              textAlign: 'center',
              fontSize: largeTextMode ? '16px' : '14px',
              color: '#004085'
            }}>
              🔍 Found {filteredCardServices.length} result{filteredCardServices.length !== 1 ? 's' : ''} for "{searchQuery}"
              {filteredCardServices.length === 0 && (
                <div style={{ marginTop: '8px', fontSize: largeTextMode ? '14px' : '12px', color: '#666' }}>
                  💡 Try saying "PayNow", "Transfer", "Bills", or "Card Management"
                </div>
              )}
            </div>
            <div className="card-services-grid">
              {filteredCardServices.map((service, index) => {
            const isAlreadyAdded = shortcuts.some(shortcut => shortcut.label === service.label);
            const isClickable = (selectedShortcut !== null || isAddingNew) && !isAlreadyAdded;
            
            return (
              <div 
                key={index}
                className={`card-service-item ${isClickable ? 'clickable' : ''} ${isAlreadyAdded ? 'already-added' : ''}`}
                onClick={() => handleServiceClick(service)}
                style={{
                  cursor: isClickable ? 'pointer' : 'not-allowed',
                  position: 'relative',
                  opacity: isAlreadyAdded ? 1 : ((selectedShortcut !== null || isAddingNew) ? 1 : 0.7), // Full opacity when selected
                  transition: 'all 0.3s ease'
                }}
              >
                <span className="material-icons" style={{ fontSize: largeTextMode ? '42px' : '36px' }}>{service.icon}</span>
                <p style={{ fontSize: largeTextMode ? '15px' : '13px', fontWeight: largeTextMode ? '600' : '500' }}>{service.label}</p>
                
                {/* Red Tick button (Selected Icon) - Centered position */}
                {isAlreadyAdded && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    backgroundColor: '#dc3545', // Red color like in example
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(220, 53, 69, 0.4), 0 2px 6px rgba(0,0,0,0.2)',
                    border: '2px solid white',
                    zIndex: 30,
                    animation: 'tickBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                    cursor: 'pointer'
                    // Removed opacity override - will inherit from parent card
                  }}>
                    <span className="material-icons" style={{ 
                      fontSize: '16px', 
                      color: 'white',
                      fontWeight: 'bold'
                    }}>check</span>
                  </div>
                )}

                {/* Gray Info button - Centered position */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedShortcutInfo(service);
                    setShowInfoModal(true);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: '2px solid white',
                    background: '#6c757d', // Gray color like in example
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(108, 117, 125, 0.4), 0 2px 6px rgba(0,0,0,0.2)',
                    zIndex: 25
                    // Removed opacity override - will inherit from parent card
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.background = '#5a6268';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = '#6c757d';
                  }}
                  title="Learn more about this shortcut"
                >
                  <span className="material-icons" style={{ 
                    fontSize: '14px', 
                    color: 'white'
                  }}>info</span>
                </button>
              </div>
            );
          })}
            </div>
          </div>
        ) : (
          // Show organized by categories when not searching
          <div>
            {shortcutCategories.map((category, catIndex) => (
              <div key={catIndex} style={{ marginBottom: '30px' }}>
                <h4 style={{ 
                  fontSize: largeTextMode ? '18px' : '16px', 
                  fontWeight: '600', 
                  color: '#e31837', 
                  marginBottom: '15px',
                  paddingBottom: '8px',
                  borderBottom: '2px solid #e31837'
                }}>
                  {category.name}
                </h4>
                <div className="card-services-grid">
                  {category.shortcuts.map((service, index) => {
                    const isAlreadyAdded = shortcuts.some(shortcut => shortcut.label === service.label);
                    const isClickable = (selectedShortcut !== null || isAddingNew) && !isAlreadyAdded;
                    
                    return (
                      <div 
                        key={index}
                        className={`card-service-item ${isClickable ? 'clickable' : ''} ${isAlreadyAdded ? 'already-added' : ''}`}
                        onClick={() => handleServiceClick(service)}
                        style={{
                          cursor: isClickable ? 'pointer' : 'not-allowed',
                          position: 'relative',
                          opacity: isAlreadyAdded ? 1 : ((selectedShortcut !== null || isAddingNew) ? 1 : 0.7), // Full opacity when selected
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <span className="material-icons" style={{ fontSize: largeTextMode ? '42px' : '36px' }}>{service.icon}</span>
                        <p style={{ fontSize: largeTextMode ? '15px' : '13px', fontWeight: largeTextMode ? '600' : '500' }}>{service.label}</p>
                        
                        {/* Red Tick button (Selected Icon) - Centered position */}
                        {isAlreadyAdded && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            backgroundColor: '#dc3545', // Red color like in example
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(220, 53, 69, 0.4), 0 2px 6px rgba(0,0,0,0.2)',
                            border: '2px solid white',
                            zIndex: 30,
                            animation: 'tickBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                            cursor: 'pointer'
                            // Removed opacity override - will inherit from parent card
                          }}>
                            <span className="material-icons" style={{ 
                              fontSize: '16px', 
                              color: 'white',
                              fontWeight: 'bold'
                            }}>check</span>
                          </div>
                        )}

                        {/* Gray Info button - Centered position */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShortcutInfo(service);
                            setShowInfoModal(true);
                          }}
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            border: '2px solid white',
                            background: '#6c757d', // Gray color like in example
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 12px rgba(108, 117, 125, 0.4), 0 2px 6px rgba(0,0,0,0.2)',
                            zIndex: 25
                            // Removed opacity override - will inherit from parent card
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.background = '#5a6268';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = '#6c757d';
                          }}
                          title="Learn more about this shortcut"
                        >
                          <span className="material-icons" style={{ 
                            fontSize: '14px', 
                            color: 'white'
                          }}>info</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dev-notice">
        <p>There will be more in dev process</p>
      </div>

      <div className="security-advisory">
        <p>
          Security advisory: Be aware of e-commerce scams. Do not click links
          or scan QR codes to make/collect payments - if an offer seems too
          good to be true, it likely is. <button onClick={() => alert('Security information')}>Learn more</button>
        </p>
      </div>

      {/* Preview Modal */}
      {showPreview && <PreviewModal 
        shortcuts={shortcuts} 
        onClose={() => setShowPreview(false)}
        onSave={() => {
          setShowPreview(false);
          handleSave();
        }}
        largeTextMode={largeTextMode}
        shortcutsPerPage={SHORTCUTS_PER_PAGE}
      />}

      {/* Save Shortcut Folder Dialog */}
      {showSaveDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'slideInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span className="material-icons" style={{ 
                fontSize: '48px', 
                color: '#28a745',
                marginBottom: '12px',
                display: 'block'
              }}>create_new_folder</span>
              <h3 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: '700',
                color: '#1a1a1a',
                marginBottom: '8px'
              }}>Save Current Layout</h3>
              <p style={{ 
                margin: 0, 
                color: '#666',
                fontSize: '16px'
              }}>Give your shortcut arrangement a name</p>
            </div>
            
            <input
              type="text"
              placeholder="Enter folder name (e.g., 'Work Setup', 'Personal')"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveCurrentShortcuts()}
              style={{
                width: '100%',
                padding: '16px 20px',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                transition: 'all 0.3s',
                marginBottom: '24px',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#28a745';
                e.target.style.boxShadow = '0 0 0 3px rgba(40, 167, 69, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.boxShadow = 'none';
              }}
              autoFocus
            />
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewFolderName('');
                }}
                style={{
                  padding: '12px 24px',
                  border: '2px solid #6c757d',
                  background: 'transparent',
                  color: '#6c757d',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#6c757d';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#6c757d';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCurrentShortcuts}
                disabled={!newFolderName.trim()}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  background: newFolderName.trim() 
                    ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' 
                    : '#ccc',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: newFolderName.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  if (newFolderName.trim()) {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.background = 'linear-gradient(135deg, #34ce57 0%, #2dd4aa 100%)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (newFolderName.trim()) {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
                  }
                }}
              >
                Save Layout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Shortcut Folder Dialog */}
      {showLoadDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'slideInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span className="material-icons" style={{ 
                fontSize: '48px', 
                color: '#fd7e14',
                marginBottom: '12px',
                display: 'block'
              }}>folder_open</span>
              <h3 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: '700',
                color: '#1a1a1a',
                marginBottom: '8px'
              }}>Load Saved Layout</h3>
              <p style={{ 
                margin: 0, 
                color: '#666',
                fontSize: '16px'
              }}>Choose a saved shortcut arrangement</p>
            </div>
            
            {savedShortcutFolders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <span className="material-icons" style={{ 
                  fontSize: '64px', 
                  color: '#ccc',
                  marginBottom: '16px',
                  display: 'block'
                }}>folder_off</span>
                <p style={{ color: '#999', fontSize: '18px' }}>No saved layouts yet</p>
                <p style={{ color: '#666', fontSize: '14px' }}>Save your current layout to see it here</p>
              </div>
            ) : (
              <div style={{ marginBottom: '24px' }}>
                {savedShortcutFolders.map((folder) => (
                  <div key={folder.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    marginBottom: '12px',
                    transition: 'all 0.3s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#fd7e14';
                    e.currentTarget.style.background = '#fff8f0';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onClick={() => handleLoadShortcutFolder(folder)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        marginBottom: '8px'
                      }}>
                        <span className="material-icons" style={{ 
                          color: '#fd7e14',
                          fontSize: '24px'
                        }}>folder</span>
                        <h4 style={{ 
                          margin: 0, 
                          fontSize: '18px', 
                          fontWeight: '600',
                          color: '#1a1a1a'
                        }}>{folder.name}</h4>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: folder.layout === 'circular' 
                            ? 'linear-gradient(135deg, #e31837 0%, #c41230 100%)' 
                            : 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                          color: 'white'
                        }}>
                          <span className="material-icons" style={{ fontSize: '16px' }}>
                            {folder.layout === 'circular' ? 'donut_small' : 'grid_view'}
                          </span>
                          {folder.layout === 'circular' ? 'Donut' : 'Grid'}
                        </div>
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#666',
                        display: 'flex',
                        gap: '16px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-icons" style={{ fontSize: '16px' }}>event</span>
                          {new Date(folder.createdAt).toLocaleDateString()}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-icons" style={{ fontSize: '16px' }}>apps</span>
                          {folder.shortcuts.length} shortcuts
                        </span>
                        {folder.settings?.autoOrganize && (
                          <span style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            color: '#28a745',
                            fontWeight: '500'
                          }}>
                            <span className="material-icons" style={{ fontSize: '16px' }}>auto_awesome</span>
                            Auto-organize
                          </span>
                        )}
                        {folder.settings?.largeTextMode && (
                          <span style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            color: '#007bff',
                            fontWeight: '500'
                          }}>
                            <span className="material-icons" style={{ fontSize: '16px' }}>accessibility</span>
                            Large Text
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteShortcutFolder(folder.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc3545',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#dc3545';
                        e.target.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'none';
                        e.target.style.color = '#dc3545';
                      }}
                      title="Delete folder"
                    >
                      <span className="material-icons" style={{ fontSize: '20px' }}>delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowLoadDialog(false)}
                style={{
                  padding: '12px 24px',
                  border: '2px solid #6c757d',
                  background: 'transparent',
                  color: '#6c757d',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#6c757d';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#6c757d';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Shortcut Info Modal */}
      {showInfoModal && selectedShortcutInfo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'slideInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowInfoModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666',
                padding: '8px',
                borderRadius: '50%',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f0f0f0';
                e.target.style.color = '#333';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = '#666';
              }}
            >
              <span className="material-icons">close</span>
            </button>

            {(() => {
              const info = getShortcutInfo(selectedShortcutInfo);
              return (
                <>
                  {/* Header */}
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      margin: '0 auto 16px',
                      background: 'linear-gradient(135deg, #e31837 0%, #c41230 100%)',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(227, 24, 55, 0.3)'
                    }}>
                      <span className="material-icons" style={{ 
                        fontSize: '40px', 
                        color: 'white' 
                      }}>
                        {selectedShortcutInfo.icon}
                      </span>
                    </div>
                    <h2 style={{ 
                      margin: 0, 
                      fontSize: '28px', 
                      fontWeight: '700',
                      color: '#1a1a1a',
                      marginBottom: '8px'
                    }}>
                      {info.title}
                    </h2>
                    <div style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {info.category}
                    </div>
                  </div>

                  {/* Description */}
                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ 
                      fontSize: '16px', 
                      color: '#666', 
                      lineHeight: '1.6',
                      margin: 0,
                      textAlign: 'center'
                    }}>
                      {info.description}
                    </p>
                  </div>

                  {/* Features */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      color: '#1a1a1a',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span className="material-icons" style={{ fontSize: '20px', color: '#e31837' }}>
                        star
                      </span>
                      Key Features
                    </h3>
                    <ul style={{ 
                      margin: 0, 
                      paddingLeft: '0',
                      listStyle: 'none'
                    }}>
                      {info.features.map((feature, index) => (
                        <li key={index} style={{ 
                          padding: '8px 0',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          fontSize: '14px',
                          color: '#555'
                        }}>
                          <span className="material-icons" style={{ 
                            fontSize: '16px', 
                            color: '#28a745',
                            marginTop: '2px'
                          }}>
                            check_circle
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Usage */}
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      color: '#1a1a1a',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span className="material-icons" style={{ fontSize: '20px', color: '#e31837' }}>
                        help_outline
                      </span>
                      How to Use
                    </h3>
                    <div style={{
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(227, 24, 55, 0.1)'
                    }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '14px', 
                        color: '#555',
                        lineHeight: '1.5'
                      }}>
                        {info.usage}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => setShowInfoModal(false)}
                      style={{
                        background: 'linear-gradient(135deg, #e31837 0%, #c41230 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        margin: '0 auto'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.background = 'linear-gradient(135deg, #f31947 0%, #d41240 100%)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.background = 'linear-gradient(135deg, #e31837 0%, #c41230 100%)';
                      }}
                    >
                      <span className="material-icons" style={{ fontSize: '18px' }}>check</span>
                      Got it!
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Enhanced CSS Animations */}
      <style>{`
        @keyframes floatingBg {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          100% {
            transform: translateY(-10px) rotate(5deg);
          }
        }

        @keyframes floatingCircle {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          100% {
            transform: translate(-10px, -10px) scale(1.1);
            opacity: 0.1;
          }
        }

        @keyframes settingsRotate {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(5deg);
          }
          75% {
            transform: rotate(-5deg);
          }
        }

        /* Header Animations */
        @keyframes headerSlideIn {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes titleFadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes titleGlow {
          0% {
            text-shadow: 0 2px 4px rgba(227, 24, 55, 0.1);
            filter: drop-shadow(0 2px 4px rgba(227, 24, 55, 0.1)) brightness(1);
          }
          100% {
            text-shadow: 0 4px 8px rgba(227, 24, 55, 0.3), 0 0 20px rgba(227, 24, 55, 0.1);
            filter: drop-shadow(0 4px 8px rgba(227, 24, 55, 0.2)) brightness(1.1);
          }
        }

        @keyframes subtitleSlide {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes actionsSlideIn {
          0% {
            opacity: 0;
            transform: translateX(30px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes sparkle {
          0%, 100% {
            opacity: 0.4;
            transform: translateY(-50%) scale(0.8) rotate(0deg);
            filter: drop-shadow(0 2px 4px rgba(255, 215, 0, 0.4)) hue-rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: translateY(-50%) scale(1.3) rotate(180deg);
            filter: drop-shadow(0 4px 8px rgba(255, 215, 0, 0.6)) hue-rotate(45deg);
          }
        }

        @keyframes iconBounce {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-4px) scale(1.1);
          }
        }

        @keyframes saveIconPulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          }
          50% {
            transform: scale(1.15);
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
          }
        }

        /* Enhanced Button Hover Effects */
        .animated-back-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(227, 24, 55, 0.1), transparent);
          transition: left 0.5s;
        }

        .animated-back-btn:hover::before {
          left: 100%;
        }

        .animated-preview-btn::before,
        .animated-save-folder-btn::before,
        .animated-load-folder-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .animated-preview-btn:hover::before,
        .animated-save-folder-btn:hover::before,
        .animated-load-folder-btn:hover::before {
          left: 100%;
        }

        .animated-save-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .animated-save-btn:hover::before {
          left: 100%;
        }

        /* Modal Animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Existing animations */
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes shake-error {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }

        .shake-error {
          animation: shake-error 0.6s ease-in-out;
        }

        @keyframes slideInDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes pulse-success {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
          }
        }

        .pulse-success {
          animation: pulse-success 1s ease-in-out;
          background-color: #e8f5e9 !important;
          border-color: #4caf50 !important;
        }

        .success-toast {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
          color: white;
          padding: 15px 30px;
          border-radius: 30px;
          font-size: 16px;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(76, 175, 80, 0.4);
          z-index: 10000;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Enhanced hover effects */
        .shortcut-item:hover {
          transform: translateY(-4px) scale(1.03) !important;
          box-shadow: 0 8px 32px rgba(227, 24, 55, 0.25) !important;
          background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 50%, #ddeeff 100%) !important;
        }

        .card-service-item.clickable:hover {
          transform: translateY(-6px) scale(1.06) !important;
          box-shadow: 0 12px 40px rgba(227, 24, 55, 0.35) !important;
          background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 50%, #c3e6cb 100%) !important;
        }

        /* Quick action button hover */
        button:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
          filter: brightness(1.05);
        }

        button:active:not(:disabled) {
          transform: translateY(-1px) scale(0.98);
        }

        /* Enhanced CSS Styles */
        .customise-shortcut-container {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 30%, #dee2e6 70%, #ced4da 100%);
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .customise-shortcut-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            radial-gradient(circle at 20% 80%, rgba(227, 24, 55, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(227, 24, 55, 0.02) 0%, transparent 50%);
          pointer-events: none;
          z-index: -1;
        }

        .success-toast {
          position: fixed;
          top: 90px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #28a745 0%, #20c997 50%, #17a2b8 100%);
          color: white;
          padding: 16px 32px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 16px;
          box-shadow: 0 8px 32px rgba(40, 167, 69, 0.4), 0 4px 12px rgba(0,0,0,0.1);
          z-index: 10000;
          border: 2px solid rgba(255,255,255,0.3);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          animation: toastSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

      .shortcut-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        max-width: 600px;
        margin: 0 auto 30px;
        padding: 32px;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%);
        border-radius: 20px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04);
        border: 2px solid rgba(227, 24, 55, 0.12);
        position: relative;
        overflow: hidden;
      }

      .shortcut-grid::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(227, 24, 55, 0.02) 0%, transparent 70%);
        animation: gridBgRotate 20s linear infinite;
        pointer-events: none;
      }

      @keyframes gridBgRotate {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .shortcut-item {
        text-align: center;
        cursor: pointer;
        padding: 16px 12px;
        border-radius: 12px;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border: 2px solid transparent;
        position: relative;
        min-height: 100px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .shortcut-item:hover {
        background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 8px 20px rgba(227, 24, 55, 0.15);
        border-color: rgba(227, 24, 55, 0.3);
      }

      .shortcut-item.drag-over {
        background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        border-color: #ff9800;
        transform: scale(1.05);
      }

      .shortcut-item.dragging {
        opacity: 0.5;
        transform: rotate(5deg) scale(0.95);
      }

      .card-services-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 16px; /* Reduced gap since icons are now inside cards */
        margin-top: 16px;
        padding: 4px; /* Reduced padding */
      }

      .card-service-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px 16px;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border-radius: 12px;
        border: 2px solid transparent;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        min-height: 120px;
        position: relative;
        overflow: visible; /* Allow buttons to be visible outside card bounds */
      }

      .card-service-item.clickable:hover {
        background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%);
        border-color: rgba(40, 167, 69, 0.3);
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 8px 20px rgba(40, 167, 69, 0.15);
      }

      .card-service-item.already-added {
        background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
        border-color: rgba(40, 167, 69, 0.3);
        box-shadow: 0 4px 12px rgba(40, 167, 69, 0.1);
      }

      .pulse-success {
        animation: pulseSuccess 0.6s ease-out;
      }

      .shake-error {
        animation: shakeError 0.5s ease-out;
      }

      @keyframes slideInDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      @keyframes pulseSuccess {
        0% { transform: scale(1); }
        50% { 
          transform: scale(1.1); 
          background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
          border-color: #28a745;
        }
        100% { transform: scale(1); }
      }

      @keyframes tickBounce {
        0% {
          transform: scale(0) rotate(-180deg);
          opacity: 0;
        }
        30% {
          transform: scale(1.4) rotate(-90deg);
          opacity: 1;
        }
        60% {
          transform: scale(0.8) rotate(0deg);
        }
        80% {
          transform: scale(1.1) rotate(0deg);
        }
        100% {
          transform: scale(1) rotate(0deg);
          opacity: 1;
        }
      }

      @keyframes shakeError {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
        20%, 40%, 60%, 80% { transform: translateX(8px); }
      }

      @keyframes shakeError {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }

      @keyframes confettiFall {
        0% {
          transform: translateY(-100vh) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        @keyframes toastSlideIn {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        @keyframes voicePulse {
          0%, 100% {
            transform: translateY(-50%) scale(1);
            box-shadow: 0 0 25px rgba(220, 53, 69, 0.7), 0 6px 16px rgba(220, 53, 69, 0.4);
          }
          50% {
            transform: translateY(-50%) scale(1.15);
            box-shadow: 0 0 35px rgba(220, 53, 69, 0.9), 0 8px 24px rgba(220, 53, 69, 0.6);
          }
        }

        .shortcut-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 16px;
        }
        
        .card-services-grid {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
        }

        .customise-header {
          padding: 20px 16px 16px 16px !important;
        }

        .header-actions-section {
          padding: 16px !important;
        }

        .header-actions-section > div:first-child {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 12px !important;
          margin-bottom: 12px !important;
        }

        .header-actions-section button {
          width: 100% !important;
          min-width: auto !important;
          padding: 12px 20px !important;
          font-size: 14px !important;
          min-height: 48px !important;
        }

        .header-title-section h2 {
          font-size: 22px !important;
        }

        .header-title-section .sparkle-icon {
          display: none !important;
        }

        .animated-title {
          font-size: 20px !important;
        }

        .animated-subtitle {
          font-size: 14px !important;
        }
      }

      /* Enhanced scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
      }

      ::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #e31837 0%, #c41230 100%);
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #c41230 0%, #a50e26 100%);
      }
    `}</style>
    </div>
  );
};

export default CustomiseShortcut;
