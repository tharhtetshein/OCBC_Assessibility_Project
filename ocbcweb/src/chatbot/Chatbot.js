import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { auth, updateDailyTaskProgress, saveChatSession, getChatHistory, updateAdvancedChatbotSettings, getAdvancedChatbotSettings } from "../services/firebase";

// Interactive Theme Preview Component
const InteractiveThemePreview = ({ themeSettings, botName }) => {
  const [previewMessages, setPreviewMessages] = useState([
    { role: "assistant", content: "Hello! How can I help you today?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const getThemeColor = (colorKey) => {
    const defaults = {
      backgroundColor: '#e8e4f3',
      chatBubbleUser: '#d4d4d4',
      chatBubbleBot: '#ffffff',
      textColor: '#333333',
      accentColor: '#e31837'
    };
    return themeSettings?.[colorKey] || defaults[colorKey];
  };

  // Fixed input options with cycling responses
  const inputOptions = [
    {
      text: "Check Balance",
      responses: [
        "Your current balance is $2,450.75. Is there anything else I can help you with?",
        "Account Balance: $2,450.75 (Savings: $1,200.50, Checking: $1,250.25)",
        "Your balance is $2,450.75. You have 3 pending transactions totaling $125.00."
      ]
    },
    {
      text: "Send $50 to 123456789",
      responses: [
        "I'll help you send $50 to 123456789. Please confirm this transaction.",
        "Transfer of $50 to 123456789 has been initiated. Transaction ID: TXN789123",
        "Payment of $50 to 123456789 is being processed. You'll receive a confirmation shortly."
      ]
    },
    {
      text: "About Chatbot",
      responses: [
        "I'm your OCBC AI Assistant! I can help with banking, transfers, balance checks, and more.",
        "I'm here 24/7 to assist with your banking needs. I can process transactions, answer questions, and provide account information.",
        "As your AI banking assistant, I can help with payments, account management, and financial guidance. How can I assist you today?"
      ]
    }
  ];

  // Track response index for each input type
  const [responseIndexes, setResponseIndexes] = useState({ 0: 0, 1: 0, 2: 0 });

  const handlePreviewSend = (optionIndex) => {
    const option = inputOptions[optionIndex];
    
    // Add user message
    setPreviewMessages(prev => [...prev, { role: "user", content: option.text }]);
    
    // Show typing indicator
    setIsTyping(true);
    
    // Get current response and cycle to next
    const currentResponseIndex = responseIndexes[optionIndex];
    const response = option.responses[currentResponseIndex];
    
    // Update response index for next time (cycle through responses)
    setResponseIndexes(prev => ({
      ...prev,
      [optionIndex]: (currentResponseIndex + 1) % option.responses.length
    }));
    
    // Simulate AI response after delay
    setTimeout(() => {
      setIsTyping(false);
      setPreviewMessages(prev => [...prev, { role: "assistant", content: response }]);
    }, 1500);
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <label style={{
        display: "block",
        marginBottom: "10px",
        color: "#666",
        fontSize: "14px",
        fontWeight: "500"
      }}>
        Interactive Preview
      </label>
      <div style={{
        backgroundColor: getThemeColor('backgroundColor'),
        padding: "15px",
        borderRadius: "12px",
        border: "1px solid #e0e0e0",
        minHeight: "200px",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Messages */}
        <div style={{ flex: 1, marginBottom: "15px", maxHeight: "150px", overflowY: "auto" }}>
          {previewMessages.map((msg, index) => (
            <div key={index} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "10px"
            }}>
              {msg.role === "assistant" && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "4px"
                }}>
                  <div style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: getThemeColor('accentColor'),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "8px",
                    fontWeight: "bold"
                  }}>
                    AI
                  </div>
                  <span style={{ 
                    fontSize: "10px", 
                    color: getThemeColor('textColor'), 
                    fontWeight: "500" 
                  }}>
                    {botName}
                  </span>
                </div>
              )}
              <div style={{
                backgroundColor: msg.role === "user" ? getThemeColor('chatBubbleUser') : getThemeColor('chatBubbleBot'),
                padding: "8px 10px",
                borderRadius: "10px",
                color: getThemeColor('textColor'),
                fontSize: "11px",
                maxWidth: "75%",
                wordWrap: "break-word"
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "4px"
            }}>
              <div style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: getThemeColor('accentColor'),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "8px",
                fontWeight: "bold"
              }}>
                AI
              </div>
              <div style={{
                backgroundColor: getThemeColor('chatBubbleBot'),
                padding: "8px 10px",
                borderRadius: "10px",
                color: getThemeColor('textColor'),
                fontSize: "11px",
                animation: "pulse 1.5s infinite"
              }}>
                Typing...
              </div>
            </div>
          )}
        </div>
        
        {/* Fixed Input Buttons */}
        <div style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap"
        }}>
          {inputOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handlePreviewSend(index)}
              disabled={isTyping}
              style={{
                flex: 1,
                minWidth: "120px",
                padding: "8px 12px",
                backgroundColor: getThemeColor('accentColor'),
                color: "white",
                border: "none",
                borderRadius: "15px",
                fontSize: "10px",
                fontWeight: "500",
                cursor: isTyping ? "not-allowed" : "pointer",
                opacity: isTyping ? 0.6 : 1,
                transition: "all 0.2s"
              }}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const Chatbot = ({ onClose }) => {
  const [showTaskPopup, setShowTaskPopup] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  
  // Advanced settings state
  const [advancedSettings, setAdvancedSettings] = useState({
    botName: 'OCBC AI Assistant',
    simpleMode: false,
    language: 'english',
    familyMembers: [],
    safetyProfile: 'standard',
    personalInfo: {
      nickname: '',
      occupation: '',
      aboutYou: ''
    },
    speechSettings: {
      voiceInput: false,
      voiceOutput: false,
      voiceSpeed: 1.0,
      voicePitch: 1.0
    },
    memorySettings: {
      rememberPreferences: true,
      personalizedResponses: true,
      contextAwareness: true
    },
    themeSettings: {
      backgroundColor: '#e8e4f3',
      chatBubbleUser: '#d4d4d4',
      chatBubbleBot: '#ffffff',
      textColor: '#333333',
      accentColor: '#e31837'
    }
  });
  
  const [tempSettings, setTempSettings] = useState({
    ...advancedSettings,
    personalInfo: {
      nickname: '',
      occupation: '',
      aboutYou: '',
      ...advancedSettings.personalInfo
    },
    themeSettings: {
      backgroundColor: '#e8e4f3',
      chatBubbleUser: '#d4d4d4',
      chatBubbleBot: '#ffffff',
      textColor: '#333333',
      accentColor: '#e31837',
      ...advancedSettings.themeSettings
    }
  });
  const [activeTab, setActiveTab] = useState('companion');
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [synthesis, setSynthesis] = useState(null);

  // Helper function to safely get theme settings with defaults
  const getThemeColor = (colorKey) => {
    const defaults = {
      backgroundColor: '#e8e4f3',
      chatBubbleUser: '#d4d4d4',
      chatBubbleBot: '#ffffff',
      textColor: '#333333',
      accentColor: '#e31837'
    };
    
    return advancedSettings?.themeSettings?.[colorKey] || defaults[colorKey];
  };

  // Helper function for temp settings
  const getTempThemeColor = (colorKey) => {
    const defaults = {
      backgroundColor: '#e8e4f3',
      chatBubbleUser: '#d4d4d4',
      chatBubbleBot: '#ffffff',
      textColor: '#333333',
      accentColor: '#e31837'
    };
    
    return tempSettings?.themeSettings?.[colorKey] || defaults[colorKey];
  };

  const getWelcomeMessage = (name) => {
    return `Hi! I'm ${name}. I can help you with:\n\n• 💰 Check Balance\n• 💸 Send Money\n• 💱 Exchange Currency\n• 📈 Buy/Sell Investments\n• 🔒 Lock/Unlock Account\n• 📊 View Portfolio\n\nHow can I assist you today?`;
  };

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: getWelcomeMessage('OCBC AI Assistant')
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { currentUser } = useAuth();
  const tutorialIntentKeywords = [
    {
      intent: "check_balance",
      keywords: ["balance", "how much", "available", "account"]
    },
    {
      intent: "transfer_money",
      keywords: ["send", "transfer", "paynow", "pay"]
    },
    {
      intent: "account_lock",
      keywords: ["lock", "unlock"]
    },
    {
      intent: "exchange_currency",
      keywords: ["exchange", "convert", "currency", "usd", "eur", "gbp", "jpy", "aud", "cny"]
    },
    {
      intent: "investments",
      keywords: ["invest", "investment", "stock", "shares", "portfolio", "buy", "sell"]
    }
  ];
  const pendingTutorialIntentRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      setRecognition(recognitionInstance);
    }

    if ('speechSynthesis' in window) {
      setSynthesis(window.speechSynthesis);
    }
  }, []);

  // Load advanced settings when component mounts or user changes
  useEffect(() => {
    const loadAdvancedSettings = async () => {
      if (currentUser) {
        setIsLoadingSettings(true);
        const result = await getAdvancedChatbotSettings(currentUser.uid);
        if (result.success) {
          // Ensure themeSettings exist with defaults
          const settingsWithDefaults = {
            ...result.settings,
            personalInfo: {
              nickname: '',
              occupation: '',
              aboutYou: '',
              ...result.settings.personalInfo
            },
            themeSettings: {
              backgroundColor: '#e8e4f3',
              chatBubbleUser: '#d4d4d4',
              chatBubbleBot: '#ffffff',
              textColor: '#333333',
              accentColor: '#e31837',
              ...result.settings.themeSettings
            }
          };
          
          setAdvancedSettings(settingsWithDefaults);
          setTempSettings(settingsWithDefaults);
          
          // Update welcome message with loaded name
          setMessages([{
            role: "assistant",
            content: getWelcomeMessage(settingsWithDefaults.botName)
          }]);
        }
        setIsLoadingSettings(false);
      }
    };

    loadAdvancedSettings();
  }, [currentUser]);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (currentUser) {
        setLoadingHistory(true);
        const result = await getChatHistory(currentUser.uid);
        if (result.success) {
          setChatSessions(result.sessions);
        }
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [currentUser]);

  // Auto-save chat session when messages change (debounced)
  useEffect(() => {
    const saveTimeout = setTimeout(async () => {
      if (currentUser && messages.length > 1) {
        const result = await saveChatSession(currentUser.uid, messages, currentSessionId);
        if (result.success && !currentSessionId) {
          setCurrentSessionId(result.sessionId);
        }
      }
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(saveTimeout);
  }, [messages, currentUser, currentSessionId]);

  const loadChatSession = async (session) => {
    setMessages(session.messages);
    setCurrentSessionId(session.id);
    setShowHistoryPanel(false);
    pendingTutorialIntentRef.current = null;
  };

  const startNewChat = () => {
    setMessages([{
      role: "assistant",
      content: getWelcomeMessage(advancedSettings.botName)
    }]);
    setCurrentSessionId(null);
    setShowHistoryPanel(false);
    pendingTutorialIntentRef.current = null;
  };

  const refreshHistory = async () => {
    if (currentUser) {
      setLoadingHistory(true);
      const result = await getChatHistory(currentUser.uid);
      if (result.success) {
        setChatSessions(result.sessions);
      }
      setLoadingHistory(false);
    }
  };

  // Speech recognition functions
  const startListening = () => {
    if (recognition && advancedSettings.speechSettings.voiceInput) {
      setIsListening(true);
      recognition.start();
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
    }
  };

  const speakMessage = (text) => {
    if (synthesis && advancedSettings.speechSettings.voiceOutput) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = advancedSettings.speechSettings.voiceSpeed;
      utterance.pitch = advancedSettings.speechSettings.voicePitch;
      synthesis.speak(utterance);
    }
  };

  const saveAdvancedSettings = async () => {
    if (!currentUser) return;
    
    try {
      const result = await updateAdvancedChatbotSettings(currentUser.uid, tempSettings);
      if (result.success) {
        setAdvancedSettings(tempSettings);
        setShowCustomization(false);
        
        // Update the welcome message with new name
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[0]?.role === "assistant") {
            newMessages[0] = {
              role: "assistant",
              content: getWelcomeMessage(tempSettings.botName)
            };
          }
          return newMessages;
        });
      } else {
        console.error('Failed to save advanced settings:', result.error);
      }
    } catch (error) {
      console.error('Error saving advanced settings:', error);
    }
  };

  const cancelCustomization = () => {
    setTempSettings(advancedSettings);
    setShowCustomization(false);
  };

  // --- Family Member Management (Chatbot-Customisation) ---
  const addFamilyMember = () => {
    const newMember = {
      id: Date.now(),
      name: '',
      relationship: '',
      email: '',
      shortcut: ''
    };
    setTempSettings(prev => ({
      ...prev,
      familyMembers: [...prev.familyMembers, newMember]
    }));
  };

  const updateFamilyMember = (id, field, value) => {
    setTempSettings(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.map(member =>
        member.id === id ? { ...member, [field]: value } : member
      )
    }));
  };

  const removeFamilyMember = (id) => {
    setTempSettings(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.filter(member => member.id !== id)
    }));
  };

  // --- Tutorial Intent Logic (Tutorial/Help) ---
  const getTutorialIntent = (message) => {
    const normalizedMessage = message.toLowerCase();
    let bestIntent = null;
    let bestScore = 0;

    tutorialIntentKeywords.forEach((entry) => {
      let score = 0;
      entry.keywords.forEach((keyword) => {
        if (normalizedMessage.includes(keyword)) {
          score += keyword.length;
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestIntent = entry.intent;
      }
    });

    return bestIntent;
  };

  const advanceTutorialAfterResponse = () => {
    const tutorialIntent = pendingTutorialIntentRef.current;
    pendingTutorialIntentRef.current = null;

    if (tutorialIntent) {
      window.dispatchEvent(
        new CustomEvent("chatbot:tutorial-progress", {
          detail: { intent: tutorialIntent }
        })
      );
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    pendingTutorialIntentRef.current = getTutorialIntent(userMessage);
    if (auth.currentUser) {
      updateDailyTaskProgress(auth.currentUser.uid, 'chat').then(result => {
        if (result.success && result.taskCompleted) {
          setShowTaskPopup(true);
          setTimeout(() => setShowTaskPopup(false), 3000);
        }
      });
    }
    setIsLoading(true);

    try {
      const response = await fetch("http://3.0.16.15:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userMessage,
          userId: currentUser.uid,
          chatHistory: messages,
          advancedSettings: advancedSettings
        })
      });

      const data = await response.json();

      if (data.success) {
        // Create the assistant message
        const assistantMessage = { role: "assistant", content: data.message };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Speak the response if voice output is enabled (Customisation feature)
        if (advancedSettings.speechSettings.voiceOutput) {
          speakMessage(data.message);
        }

        // Advance tutorial if applicable (Tutorial feature)
        advanceTutorialAfterResponse();
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again."
        }]);
        advanceTutorialAfterResponse();
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting. Please try again later."
      }]);
      advanceTutorialAfterResponse();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 86400000) { // Less than 24 hours
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) { // Less than 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "100dvh", // Use dynamic viewport height for mobile
        maxHeight: "-webkit-fill-available", // Fallback for iOS
        backgroundColor: getThemeColor('backgroundColor'),
        display: "flex",
        flexDirection: "column",
        zIndex: 5000, // Increased z-index to overlay FABs
        overflow: "hidden", // Prevent body scroll
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {showTaskPopup && (
        <div style={{ position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#28a745", color: "white", padding: "12px 24px", borderRadius: "30px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 2000, fontWeight: "600", fontSize: "14px", animation: "slideDown 0.3s ease" }}>
          🎉 Daily Task Completed! Go to Rewards to claim.
        </div>
      )}

      {/* Advanced Customization Modal */}
      {showCustomization && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "20px",
            width: "95%",
            maxWidth: "500px",
            maxHeight: "90vh",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Header */}
            <div style={{
              padding: "20px 25px",
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h3 style={{
                margin: 0,
                color: "#333",
                fontSize: "18px",
                fontWeight: "600"
              }}>
                AI Chatbot Customization
              </h3>
              <button
                onClick={cancelCustomization}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666"
                }}
              >
                ×
              </button>
            </div>

            {/* Tab Navigation */}
            <div style={{
              display: "flex",
              borderBottom: "1px solid #e0e0e0",
              backgroundColor: "#f8f9fa"
            }}>
              {[
                { id: 'companion', label: '🤖 Companion', icon: '🤖' },
                { id: 'context', label: '👨‍👩‍👧‍👦 Context', icon: '👨‍👩‍👧‍👦' },
                { id: 'memory', label: '🧠 Memory', icon: '🧠' },
                { id: 'speech', label: '🎤 Speech', icon: '🎤' },
                { id: 'theme', label: '🎨 Theme', icon: '🎨' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: "12px 8px",
                    border: "none",
                    backgroundColor: activeTab === tab.id ? "white" : "transparent",
                    color: activeTab === tab.id ? getThemeColor('accentColor') : "#666",
                    fontSize: "12px",
                    fontWeight: activeTab === tab.id ? "600" : "400",
                    cursor: "pointer",
                    borderBottom: activeTab === tab.id ? `2px solid ${getThemeColor('accentColor')}` : "none",
                    textAlign: "center"
                  }}
                >
                  <div>{tab.icon}</div>
                  <div style={{ marginTop: "4px" }}>{tab.label.split(' ')[1]}</div>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 25px"
            }}>
              {/* Companion Tab */}
              {activeTab === 'companion' && (
                <div>
                  {/* Bot Configuration Card */}
                  <div className="settings-card">
                    <div className="card-header">
                      <div className="card-icon">🤖</div>
                      <div className="card-title">
                        <h3>Create Your Companion</h3>
                        <p>Customize your AI assistant's basic settings and personality</p>
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="form-group">
                        <label className="form-label">Bot Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={tempSettings.botName}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, botName: e.target.value }))}
                          placeholder="Enter a name (e.g., Helper, Ah Boy)"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Language</label>
                        <select
                          className="form-select"
                          value={tempSettings.language}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, language: e.target.value }))}
                        >
                          <option value="english">🇺🇸 English</option>
                          <option value="chinese">🇨🇳 Chinese</option>
                          <option value="malay">🇲🇾 Malay</option>
                          <option value="tamil">🇮🇳 Tamil</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="toggle-label">
                          <input
                            type="checkbox"
                            className="toggle-input"
                            checked={tempSettings.simpleMode}
                            onChange={(e) => setTempSettings(prev => ({ ...prev, simpleMode: e.target.checked }))}
                          />
                          <span className="toggle-slider"></span>
                          <span className="toggle-text">
                            <strong>Simple Mode</strong>
                            <small>Larger text & simplified answers for easier reading</small>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Context Tab */}
              {activeTab === 'context' && (
                <div>
                  {/* AI Contextual Awareness Card */}
                  <div className="settings-card">
                    <div className="card-header">
                      <div className="card-icon">👤</div>
                      <div className="card-title">
                        <h3>AI Contextual Awareness</h3>
                        <p>Help your AI understand you better for personalized responses</p>
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="form-group">
                        <label className="form-label">Nickname</label>
                        <input
                          type="text"
                          className="form-input"
                          value={tempSettings.personalInfo?.nickname || ''}
                          onChange={(e) => setTempSettings(prev => ({
                            ...prev,
                            personalInfo: {
                              ...prev.personalInfo,
                              nickname: e.target.value
                            }
                          }))}
                          placeholder="What should the AI call you?"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">Occupation</label>
                        <input
                          type="text"
                          className="form-input"
                          value={tempSettings.personalInfo?.occupation || ''}
                          onChange={(e) => setTempSettings(prev => ({
                            ...prev,
                            personalInfo: {
                              ...prev.personalInfo,
                              occupation: e.target.value
                            }
                          }))}
                          placeholder="e.g., Software Engineer, Teacher, Student"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label className="form-label">More about you</label>
                        <textarea
                          className="form-textarea"
                          value={tempSettings.personalInfo?.aboutYou || ''}
                          onChange={(e) => setTempSettings(prev => ({
                            ...prev,
                            personalInfo: {
                              ...prev.personalInfo,
                              aboutYou: e.target.value
                            }
                          }))}
                          placeholder="Interests, values, or preferences to keep in mind"
                          rows="4"
                        />
                        <div style={{
                          fontSize: "12px",
                          color: "#666",
                          marginTop: "6px",
                          fontStyle: "italic"
                        }}>
                          💡 This helps the AI provide more personalized banking advice and responses
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Safety & Accessibility Card */}
                  <div className="settings-card">
                    <div className="card-header">
                      <div className="card-icon">🛡️</div>
                      <div className="card-title">
                        <h3>Safety & Accessibility</h3>
                        <p>Configure security and accessibility preferences</p>
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="form-group">
                        <label className="form-label">Safety Profile</label>
                        <select
                          className="form-select"
                          value={tempSettings.safetyProfile}
                          onChange={(e) => setTempSettings(prev => ({ ...prev, safetyProfile: e.target.value }))}
                        >
                          <option value="standard">🔒 Standard Security</option>
                          <option value="high">🔐 High Security</option>
                          <option value="family">👨‍👩‍👧‍👦 Family Mode</option>
                          <option value="elderly">👴 Elderly Friendly</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Family Shortcuts Card */}
                  <div className="settings-card">
                    <div className="card-header">
                      <div className="card-icon">👨‍👩‍👧‍👦</div>
                      <div className="card-title">
                        <h3>Family Member Shortcuts</h3>
                        <p>Quick shortcuts for sending money to family members</p>
                      </div>
                    </div>
                    <div className="card-content">
                      {tempSettings.familyMembers.map((member, index) => (
                        <div key={member.id} className="family-member-card">
                          <div className="family-member-header">
                            <span className="member-number">#{index + 1}</span>
                            <button
                              className="remove-member-btn"
                              onClick={() => removeFamilyMember(member.id)}
                            >
                              ✕
                            </button>
                          </div>
                          <div className="family-member-fields">
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Name (e.g., Mom, Dad)"
                              value={member.name}
                              onChange={(e) => updateFamilyMember(member.id, 'name', e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Relationship"
                              value={member.relationship}
                              onChange={(e) => updateFamilyMember(member.id, 'relationship', e.target.value)}
                            />
                            <input
                              type="email"
                              className="form-input"
                              placeholder="Gmail/Email (e.g., mom@gmail.com)"
                              value={member.email}
                              onChange={(e) => updateFamilyMember(member.id, 'email', e.target.value)}
                            />
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Quick phrase (e.g., 'send to mom')"
                              value={member.shortcut}
                              onChange={(e) => updateFamilyMember(member.id, 'shortcut', e.target.value)}
                            />
                          </div>
                          <div style={{ 
                            fontSize: "11px", 
                            color: "#666", 
                            marginTop: "6px",
                            fontStyle: "italic"
                          }}>
                            💡 The email will be used to send money to this person via PayNow
                          </div>
                        </div>
                      ))}
                      <button
                        className="add-member-btn"
                        onClick={addFamilyMember}
                      >
                        <span className="add-icon">+</span>
                        Add Family Member
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Memory Tab */}
              {activeTab === 'memory' && (
                <div>
                  {/* Memory Settings Card */}
                  <div className="settings-card">
                    <div className="card-header">
                      <div className="card-icon">🧠</div>
                      <div className="card-title">
                        <h3>Chat History & Memory</h3>
                        <p>Configure how the AI remembers and learns from your conversations</p>
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="form-group">
                        <label className="toggle-label">
                          <input
                            type="checkbox"
                            className="toggle-input"
                            checked={tempSettings.memorySettings.rememberPreferences}
                            onChange={(e) => setTempSettings(prev => ({
                              ...prev,
                              memorySettings: {
                                ...prev.memorySettings,
                                rememberPreferences: e.target.checked
                              }
                            }))}
                          />
                          <span className="toggle-slider"></span>
                          <span className="toggle-text">
                            <strong>Remember Preferences</strong>
                            <small>Save your banking preferences and settings</small>
                          </span>
                        </label>
                      </div>

                      <div className="form-group">
                        <label className="toggle-label">
                          <input
                            type="checkbox"
                            className="toggle-input"
                            checked={tempSettings.memorySettings.personalizedResponses}
                            onChange={(e) => setTempSettings(prev => ({
                              ...prev,
                              memorySettings: {
                                ...prev.memorySettings,
                                personalizedResponses: e.target.checked
                              }
                            }))}
                          />
                          <span className="toggle-slider"></span>
                          <span className="toggle-text">
                            <strong>Personalized Responses</strong>
                            <small>Tailor responses based on your history</small>
                          </span>
                        </label>
                      </div>

                      <div className="form-group">
                        <label className="toggle-label">
                          <input
                            type="checkbox"
                            className="toggle-input"
                            checked={tempSettings.memorySettings.contextAwareness}
                            onChange={(e) => setTempSettings(prev => ({
                              ...prev,
                              memorySettings: {
                                ...prev.memorySettings,
                                contextAwareness: e.target.checked
                              }
                            }))}
                          />
                          <span className="toggle-slider"></span>
                          <span className="toggle-text">
                            <strong>Context Awareness</strong>
                            <small>Reference previous conversations when relevant</small>
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Speech Tab */}
              {activeTab === 'speech' && (
                <div>
                  {/* Speech Settings Card */}
                  <div className="settings-card">
                    <div className="card-header">
                      <div className="card-icon">🎤</div>
                      <div className="card-title">
                        <h3>Text-to-Speech Settings</h3>
                        <p>Configure voice input and output preferences</p>
                      </div>
                    </div>
                    <div className="card-content">
                      <div className="form-group">
                        <label className="toggle-label">
                          <input
                            type="checkbox"
                            className="toggle-input"
                            checked={tempSettings.speechSettings.voiceInput}
                            onChange={(e) => setTempSettings(prev => ({
                              ...prev,
                              speechSettings: {
                                ...prev.speechSettings,
                                voiceInput: e.target.checked
                              }
                            }))}
                          />
                          <span className="toggle-slider"></span>
                          <span className="toggle-text">
                            <strong>Voice Input</strong>
                            <small>Use microphone to speak your messages</small>
                          </span>
                        </label>
                      </div>

                      <div className="form-group">
                        <label className="toggle-label">
                          <input
                            type="checkbox"
                            className="toggle-input"
                            checked={tempSettings.speechSettings.voiceOutput}
                            onChange={(e) => setTempSettings(prev => ({
                              ...prev,
                              speechSettings: {
                                ...prev.speechSettings,
                                voiceOutput: e.target.checked
                              }
                            }))}
                          />
                          <span className="toggle-slider"></span>
                          <span className="toggle-text">
                            <strong>Voice Output</strong>
                            <small>Have the AI speak responses aloud</small>
                          </span>
                        </label>
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Voice Speed: {tempSettings.speechSettings.voiceSpeed}x
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={tempSettings.speechSettings.voiceSpeed}
                          onChange={(e) => setTempSettings(prev => ({
                            ...prev,
                            speechSettings: {
                              ...prev.speechSettings,
                              voiceSpeed: parseFloat(e.target.value)
                            }
                          }))}
                          style={{ 
                            width: "100%",
                            height: "6px",
                            borderRadius: "3px",
                            background: "#e9ecef",
                            outline: "none",
                            cursor: "pointer"
                          }}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          Voice Pitch: {tempSettings.speechSettings.voicePitch}x
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={tempSettings.speechSettings.voicePitch}
                          onChange={(e) => setTempSettings(prev => ({
                            ...prev,
                            speechSettings: {
                              ...prev.speechSettings,
                              voicePitch: parseFloat(e.target.value)
                            }
                          }))}
                          style={{ 
                            width: "100%",
                            height: "6px",
                            borderRadius: "3px",
                            background: "#e9ecef",
                            outline: "none",
                            cursor: "pointer"
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Theme Tab */}
              {activeTab === 'theme' && (
                <div>
                  {/* Header Section */}
                  <div style={{ 
                    marginBottom: "25px",
                    textAlign: "center",
                    padding: "20px",
                    background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                    borderRadius: "12px",
                    border: "1px solid #e0e0e0"
                  }}>
                    <h4 style={{ 
                      margin: "0 0 8px 0", 
                      color: "#2c3e50", 
                      fontSize: "20px",
                      fontWeight: "600"
                    }}>
                      🎨 Theme Customization
                    </h4>
                    <p style={{
                      margin: "0",
                      color: "#6c757d",
                      fontSize: "14px",
                      lineHeight: "1.4"
                    }}>
                      Personalize your chatbot experience with colors and themes
                    </p>
                  </div>
                  
                  {/* Preset Themes Section */}
                  <div style={{ 
                    marginBottom: "30px",
                    padding: "20px",
                    background: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e9ecef",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "15px"
                    }}>
                      <span style={{ fontSize: "18px", marginRight: "8px" }}>⚡</span>
                      <label style={{
                        color: "#495057",
                        fontSize: "16px",
                        fontWeight: "600",
                        margin: "0"
                      }}>
                        Quick Themes
                      </label>
                    </div>
                    <p style={{
                      margin: "0 0 15px 0",
                      color: "#6c757d",
                      fontSize: "13px"
                    }}>
                      Choose from our pre-designed themes for instant customization
                    </p>
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                      gap: "12px"
                    }}>
                      {[
                        { 
                          name: "OCBC Red", 
                          icon: "🏦",
                          colors: { backgroundColor: '#e8e4f3', chatBubbleUser: '#d4d4d4', chatBubbleBot: '#ffffff', textColor: '#333333', accentColor: '#e31837' }
                        },
                        { 
                          name: "Ocean Blue", 
                          icon: "🌊",
                          colors: { backgroundColor: '#e6f3ff', chatBubbleUser: '#b3d9ff', chatBubbleBot: '#ffffff', textColor: '#333333', accentColor: '#0066cc' }
                        },
                        { 
                          name: "Forest Green", 
                          icon: "🌲",
                          colors: { backgroundColor: '#f0f8f0', chatBubbleUser: '#c8e6c8', chatBubbleBot: '#ffffff', textColor: '#333333', accentColor: '#228B22' }
                        },
                        { 
                          name: "Purple", 
                          icon: "💜",
                          colors: { backgroundColor: '#f5f0ff', chatBubbleUser: '#d8bfd8', chatBubbleBot: '#ffffff', textColor: '#333333', accentColor: '#8A2BE2' }
                        },
                        { 
                          name: "Dark Mode", 
                          icon: "🌙",
                          colors: { backgroundColor: '#2c2c2c', chatBubbleUser: '#4a4a4a', chatBubbleBot: '#3a3a3a', textColor: '#ffffff', accentColor: '#ff6b6b' }
                        }
                      ].map(theme => (
                        <button
                          key={theme.name}
                          onClick={() => setTempSettings(prev => ({
                            ...prev,
                            themeSettings: { ...prev.themeSettings, ...theme.colors }
                          }))}
                          style={{
                            padding: "15px 12px",
                            border: "2px solid #e9ecef",
                            borderRadius: "12px",
                            backgroundColor: "#ffffff",
                            color: "#495057",
                            fontSize: "12px",
                            cursor: "pointer",
                            fontWeight: "500",
                            textAlign: "center",
                            transition: "all 0.3s ease",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            position: "relative",
                            overflow: "hidden"
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.borderColor = theme.colors.accentColor;
                            e.target.style.transform = "translateY(-2px)";
                            e.target.style.boxShadow = `0 4px 12px ${theme.colors.accentColor}20`;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.borderColor = "#e9ecef";
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "none";
                          }}
                        >
                          <div style={{
                            position: "absolute",
                            top: "0",
                            left: "0",
                            right: "0",
                            height: "4px",
                            background: theme.colors.accentColor,
                            borderRadius: "12px 12px 0 0"
                          }}></div>
                          <span style={{ fontSize: "20px" }}>{theme.icon}</span>
                          <span>{theme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Colors Section */}
                  <div style={{ 
                    marginBottom: "30px",
                    padding: "20px",
                    background: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e9ecef",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "15px"
                    }}>
                      <span style={{ fontSize: "18px", marginRight: "8px" }}>🎯</span>
                      <label style={{
                        color: "#495057",
                        fontSize: "16px",
                        fontWeight: "600",
                        margin: "0"
                      }}>
                        Custom Colors
                      </label>
                    </div>
                    <p style={{
                      margin: "0 0 20px 0",
                      color: "#6c757d",
                      fontSize: "13px"
                    }}>
                      Fine-tune individual colors to create your perfect theme
                    </p>
                    
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
                      gap: "20px" 
                    }}>
                      {[
                        { key: 'backgroundColor', label: 'Background Color', icon: '🖼️', description: 'Main chat background' },
                        { key: 'accentColor', label: 'Accent Color', icon: '✨', description: 'Buttons and highlights' },
                        { key: 'chatBubbleUser', label: 'Your Messages', icon: '💬', description: 'Your message bubbles' },
                        { key: 'chatBubbleBot', label: 'Bot Messages', icon: '🤖', description: 'AI response bubbles' },
                        { key: 'textColor', label: 'Text Color', icon: '📝', description: 'Main text color' }
                      ].map(colorOption => (
                        <div key={colorOption.key} style={{
                          padding: "16px",
                          background: "#f8f9fa",
                          borderRadius: "10px",
                          border: "1px solid #e9ecef"
                        }}>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "10px"
                          }}>
                            <span style={{ fontSize: "16px", marginRight: "8px" }}>{colorOption.icon}</span>
                            <div>
                              <label style={{
                                display: "block",
                                color: "#495057",
                                fontSize: "14px",
                                fontWeight: "600",
                                margin: "0"
                              }}>
                                {colorOption.label}
                              </label>
                              <small style={{
                                color: "#6c757d",
                                fontSize: "12px"
                              }}>
                                {colorOption.description}
                              </small>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                              position: "relative",
                              width: "50px",
                              height: "50px",
                              borderRadius: "10px",
                              border: "3px solid #ffffff",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                              overflow: "hidden",
                              cursor: "pointer"
                            }}>
                              <input
                                type="color"
                                value={getTempThemeColor(colorOption.key)}
                                onChange={(e) => setTempSettings(prev => ({
                                  ...prev,
                                  themeSettings: {
                                    ...prev.themeSettings,
                                    [colorOption.key]: e.target.value
                                  }
                                }))}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  border: "none",
                                  cursor: "pointer"
                                }}
                              />
                            </div>
                            <input
                              type="text"
                              value={getTempThemeColor(colorOption.key)}
                              onChange={(e) => setTempSettings(prev => ({
                                ...prev,
                                themeSettings: {
                                  ...prev.themeSettings,
                                  [colorOption.key]: e.target.value
                                }
                              }))}
                              style={{
                                flex: 1,
                                padding: "12px",
                                border: "2px solid #e9ecef",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontFamily: "monospace",
                                backgroundColor: "#ffffff",
                                transition: "border-color 0.3s ease"
                              }}
                              onFocus={(e) => e.target.style.borderColor = getTempThemeColor('accentColor')}
                              onBlur={(e) => e.target.style.borderColor = "#e9ecef"}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Preview */}
                  <div style={{ 
                    padding: "20px",
                    background: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e9ecef",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "15px"
                    }}>
                      <span style={{ fontSize: "18px", marginRight: "8px" }}>👀</span>
                      <label style={{
                        color: "#495057",
                        fontSize: "16px",
                        fontWeight: "600",
                        margin: "0"
                      }}>
                        Live Preview
                      </label>
                    </div>
                    <p style={{
                      margin: "0 0 15px 0",
                      color: "#6c757d",
                      fontSize: "13px"
                    }}>
                      See how your theme looks in real-time
                    </p>
                    <InteractiveThemePreview 
                      themeSettings={tempSettings.themeSettings || {}}
                      botName={tempSettings.botName}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "15px 25px",
              borderTop: "1px solid #e0e0e0",
              display: "flex",
              gap: "10px",
              justifyContent: "flex-end"
            }}>
              <button
                onClick={cancelCustomization}
                style={{
                  padding: "10px 20px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "10px",
                  backgroundColor: "white",
                  color: "#666",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveAdvancedSettings}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "10px",
                  backgroundColor: getThemeColor('accentColor'),
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat History Panel */}
      {showHistoryPanel && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 1100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px"
          }}
          onClick={() => setShowHistoryPanel(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "400px",
              maxHeight: "70vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e5e5e5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Chat History</h3>
              <button
                onClick={() => setShowHistoryPanel(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#666"
                }}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
              {loadingHistory ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
                  Loading history...
                </div>
              ) : chatSessions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
                  No previous chats found
                </div>
              ) : (
                chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => loadChatSession(session)}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      marginBottom: "8px",
                      backgroundColor: currentSessionId === session.id ? getThemeColor('accentColor') : "#f5f5f5",
                      color: currentSessionId === session.id ? "white" : getThemeColor('textColor'),
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{
                      fontSize: "14px",
                      fontWeight: "500",
                      marginBottom: "4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {session.messages && session.messages.length > 1
                        ? session.messages[1].content.substring(0, 50) + "..."
                        : "New conversation"}
                    </div>
                    <div style={{
                      fontSize: "12px",
                      opacity: 0.7,
                      display: "flex",
                      justifyContent: "space-between"
                    }}>
                      <span>{session.messages?.length || 0} messages</span>
                      <span>{formatDate(session.updatedAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: "12px", borderTop: "1px solid #e5e5e5" }}>
              <button
                onClick={startNewChat}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: getThemeColor('accentColor'),
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Start New Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          backgroundColor: getThemeColor('backgroundColor'),
          padding: "15px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            padding: "5px",
            color: getThemeColor('textColor')
          }}
        >
          ✕
        </button>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "20px",
            padding: "8px 20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            cursor: "pointer"
          }}
          onClick={() => setShowCustomization(true)}
        >
          <span style={{ fontSize: "20px" }}>🤖</span>
          <span style={{ color: getThemeColor('accentColor'), fontWeight: "600", fontSize: "14px" }}>
            {advancedSettings.botName}
          </span>
          <span style={{ fontSize: "12px", color: "#999" }}>✏️</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={startNewChat}
            title="New Chat"
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              padding: "5px",
              color: getThemeColor('textColor')
            }}
          >
            ➕
          </button>
          <button
            onClick={() => { setShowHistoryPanel(true); refreshHistory(); }}
            title="Chat History"
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              padding: "5px",
              color: getThemeColor('textColor')
            }}
          >
            📋
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div
        data-help-id="chatbot-messages"
        style={{
          flex: 1,
          minHeight: 0, // Critical for flex scrolling
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          WebkitOverflowScrolling: "touch" // Smooth scrolling on iOS
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start"
            }}
          >
            {msg.role === "assistant" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "5px"
                }}
              >
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    backgroundColor: getThemeColor('accentColor'),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: "bold"
                  }}
                >
                  AI
                </div>
                <span style={{ fontSize: "13px", color: getThemeColor('textColor'), fontWeight: "500" }}>
                  {advancedSettings.botName}
                </span>
              </div>
            )}
            <div
              style={{
                maxWidth: "85%",
                padding: "15px 18px",
                borderRadius: "15px",
                backgroundColor: msg.role === "user" ? getThemeColor('chatBubbleUser') : getThemeColor('chatBubbleBot'),
                color: getThemeColor('textColor'),
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                fontSize: advancedSettings.simpleMode ? "16px" : "14px",
                lineHeight: advancedSettings.simpleMode ? "1.6" : "1.5",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word"
              }}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div
                style={{
                  fontSize: "11px",
                  color: getThemeColor('textColor'),
                  opacity: 0.7,
                  marginTop: "3px",
                  marginRight: "5px"
                }}
              >
                You
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                backgroundColor: getThemeColor('accentColor'),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "12px",
                fontWeight: "bold"
              }}
            >
              AI
            </div>
            <div
              style={{
                padding: "15px 18px",
                borderRadius: "15px",
                backgroundColor: getThemeColor('chatBubbleBot'),
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                fontSize: "14px",
                color: getThemeColor('textColor'),
                opacity: 0.7
              }}
            >
              Typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Security Advisory */}
      <div
        style={{
          padding: "12px 20px",
          backgroundColor: getThemeColor('backgroundColor'),
          fontSize: "11px",
          color: advancedSettings.themeSettings.textColor,
          opacity: 0.8,
          textAlign: "center",
          lineHeight: "1.4"
        }}
      >
        Security advisory: Be aware of e-commerce scams. Do not click links or scan QR codes to make/collect payments - if an offer seems too good to be true, it likely is.{" "}
        <span style={{ color: getThemeColor('accentColor'), textDecoration: "underline", cursor: "pointer" }}>
          Learn more
        </span>
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: "15px 20px 25px", // Reverted padding
          backgroundColor: getThemeColor('backgroundColor')
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "white",
            borderRadius: "25px",
            padding: "8px 15px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        >
          <button
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              padding: "5px",
              color: getThemeColor('textColor')
            }}
          >
            📎
          </button>
          <input
            data-help-id="chatbot-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type Here"
            disabled={isLoading}
            className="chatbot-input"
            style={{ 
              flex: 1, 
              minWidth: 0, // Critical for flexbox text overflow
              backgroundColor: "transparent",
              border: "none",
              outline: "none",
              color: getThemeColor('textColor')
            }}
          />
          {advancedSettings.speechSettings.voiceInput && (
            <button
              onClick={startListening}
              disabled={isListening || isLoading}
              style={{
                background: "none",
                border: "none",
                cursor: isListening || isLoading ? "not-allowed" : "pointer",
                fontSize: "20px",
                padding: "5px",
                color: isListening ? getThemeColor('accentColor') : getThemeColor('textColor'),
                opacity: isListening || isLoading ? 0.5 : 1
              }}
              title="Voice input"
            >
              {isListening ? "🔴" : "🎤"}
            </button>
          )}
          <button
            data-help-id="chatbot-send"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              background: "none",
              border: "none",
              cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
              fontSize: "24px",
              padding: "5px",
              opacity: isLoading || !input.trim() ? 0.3 : 1,
              transform: "rotate(-45deg)",
              color: getThemeColor('accentColor')
            }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;