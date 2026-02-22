import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./VoiceHelp.css";

const VoiceHelpButton = ({ onHelpRequest, onNavigate, containerId = null, hideButton = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFallbackInput, setShowFallbackInput] = useState(false);
  const [fallbackText, setFallbackText] = useState("");
  const [error, setError] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);
  const recognitionRef = useRef(null);
  const lastTranscriptRef = useRef("");
  const hasProcessedRef = useRef(false);

  // Check for Speech Recognition support
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSupported = !!SpeechRecognition;
  const isSecureContext =
    window.isSecureContext || window.location.hostname === "localhost";
  const hasMediaDevices = !!navigator.mediaDevices?.getUserMedia;

  const getSupportIssue = () => {
    if (!isSupported) {
      return "Voice recognition is not supported in this browser. Try Chrome or Edge.";
    }
    if (!isSecureContext) {
      return "Voice recognition requires HTTPS or localhost.";
    }
    if (!hasMediaDevices) {
      return "Microphone access is not available in this browser.";
    }
    return "";
  };

  const requestMicrophoneAccess = async () => {
    if (!hasMediaDevices) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
  };

  const initializeRecognition = () => {
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      hasProcessedRef.current = false;
      lastTranscriptRef.current = "";
      setIsListening(true);
      setError(null);
      setTranscript("");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptChunk;
        } else {
          interimTranscript += transcriptChunk;
        }
      }

      const combinedTranscript = (finalTranscript || interimTranscript).trim();
      setTranscript(combinedTranscript);

      if (finalTranscript.trim()) {
        hasProcessedRef.current = true;
        processVoiceQuery(finalTranscript.trim());
      } else if (combinedTranscript) {
        lastTranscriptRef.current = combinedTranscript;
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError(
          "Microphone access denied. Please enable it in your browser settings.",
        );
      } else if (event.error === "audio-capture") {
        setError("No microphone detected. Check your device audio input.");
      } else if (event.error === "no-speech") {
        setError("No speech detected. Try typing your question instead.");
      } else if (event.error === "network") {
        setError("Network error. Check your connection and try again.");
      } else {
        setError("Voice recognition failed. Try typing your question instead.");
      }
      setShowFallbackInput(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!hasProcessedRef.current && lastTranscriptRef.current) {
        processVoiceQuery(lastTranscriptRef.current);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  useEffect(() => {
    if (!isSupported) {
      console.log("Speech Recognition not supported in this browser");
      return;
    }

    const recognition = initializeRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.onstart = null;
      }
    };
  }, [isSupported]);

  useEffect(() => {
    if (!containerId) {
      setPortalTarget(null);
      return;
    }

    let rafId = null;
    const findTarget = () => {
      const target = document.getElementById(containerId);
      if (target) {
        setPortalTarget(target);
        return;
      }
      rafId = requestAnimationFrame(findTarget);
    };

    findTarget();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [containerId]);

  const startListening = async () => {
    const supportIssue = getSupportIssue();
    if (supportIssue) {
      setError(supportIssue);
      setShowFallbackInput(true);
      return;
    }

    try {
      await requestMicrophoneAccess();
    } catch (error) {
      console.error("Microphone permission error:", error);
      setError(
        "Microphone access denied. Please allow mic access in your browser settings.",
      );
      setShowFallbackInput(true);
      return;
    }

    try {
      if (!recognitionRef.current) {
        initializeRecognition();
      }
      hasProcessedRef.current = true;
      lastTranscriptRef.current = "";
      recognitionRef.current?.abort();
      recognitionRef.current?.start();
    } catch (error) {
      console.error("Failed to start recognition:", error);
      setError("Unable to start voice recognition. Try typing instead.");
      setShowFallbackInput(true);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const processVoiceQuery = async (query) => {
    const cleanedQuery = query?.trim();
    if (!cleanedQuery) {
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("http://3.0.16.15:5000/api/help-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: cleanedQuery }),
      });

      const data = await response.json();

      if (data.success && data.intent) {
        onHelpRequest(data.intent, data.steps, data.title);
      } else {
        setError(
          data.message ||
            "Could not understand your request. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error processing help request:", error);
      setError("Failed to process your request. Please try again.");
    } finally {
      setIsProcessing(false);
      setTranscript("");
    }
  };

  const handleFallbackSubmit = (e) => {
    e.preventDefault();
    if (fallbackText.trim()) {
      processVoiceQuery(fallbackText.trim());
      setFallbackText("");
      setShowFallbackInput(false);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const isInline = Boolean(portalTarget);

  const buttonStyle = hideButton ? { display: 'none' } : undefined;

  const helpButton = (
    <button
      className={`voice-help-button ${isListening ? "listening" : ""} ${isProcessing ? "processing" : ""} ${isInline ? "inline" : ""}`}
      onClick={handleMicClick}
      disabled={isProcessing}
      title="Need help? Tap to ask"
      aria-label="Need help? Tap to ask"
      data-help-id="voice-help-button"
      style={buttonStyle}
    >
      {isProcessing ? (
        <div className="spinner"></div>
      ) : (
        <div className={`voice-help-content ${isInline ? "inline" : ""}`}>
          {isInline && (
            <span className="material-icons voice-help-icon" aria-hidden="true">
              support_agent
            </span>
          )}
          <div className="voice-help-text">
            <span className="voice-help-label">
              {isListening ? "Listening..." : "Need Help?"}
            </span>
            {isInline && (
              <span className="voice-help-subtitle">
                Voice and guided help
              </span>
            )}
          </div>
        </div>
      )}
    </button>
  );

  return (
    <>
      {/* Floating or Docked Help Button */}
      {portalTarget ? createPortal(helpButton, portalTarget) : helpButton}

      {/* Listening Overlay */}
      {(isListening || transcript) && (
        <div className="voice-listening-overlay">
          <div className="listening-card">
            <div className="listening-indicator">
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay-1"></div>
              <div className="pulse-ring delay-2"></div>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#e31837">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </div>
            <p className="listening-text">
              {isListening ? "Listening..." : "Processing..."}
            </p>
            {transcript && <p className="transcript-text">"{transcript}"</p>}
            <button className="cancel-listening" onClick={stopListening}>
              Cancel
            </button>
            <button 
              className="type-instead-button" 
              onClick={() => { stopListening(); setShowFallbackInput(true); }}
              style={{
                marginTop: '10px',
                background: 'none',
                border: 'none',
                color: '#e31837',
                fontSize: '14px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Type instead
            </button>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="voice-error-toast" onClick={() => setError(null)}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Fallback Text Input */}
      {showFallbackInput && (
        <div
          className="voice-fallback-overlay"
          onClick={() => setShowFallbackInput(false)}
        >
          <form
            className="fallback-input-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleFallbackSubmit}
          >
            <h3>🎤 Voice unavailable</h3>
            <p>Type your question instead:</p>
            <input
              type="text"
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              placeholder="e.g., How do I transfer money?"
              autoFocus
            />
            <div className="fallback-actions">
              <button type="button" onClick={() => setShowFallbackInput(false)}>
                Cancel
              </button>
              <button type="submit" disabled={!fallbackText.trim()}>
                Ask
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default VoiceHelpButton;
