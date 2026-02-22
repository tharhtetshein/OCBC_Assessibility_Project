import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import io from 'socket.io-client';
import OnScreenKeyboard from './OnScreenKeyboard';
import './eyeTracker.css';

// --- Main Component ---
function EyeTrackerPython({ 
  onFaceDetected, 
  onFaceLost, 
  autoStart = false, 
  controlsContainerId = null, 
  compactControls = false,
  onStopTracking // Callback to parent when stopped internally
}) {
  const [isTracking, setIsTracking] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [gazePosition, setGazePosition] = useState({ x: 0, y: 0 });
  const [videoFrame, setVideoFrame] = useState(null);
  const [connected, setConnected] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  
  // Controls Target for Portal (HEAD logic)
  const [controlsTarget, setControlsTarget] = useState(null);
  
  // Draggable camera state - same format as HandTracker
  const [cameraPosition, setCameraPosition] = useState(() => {
    const saved = localStorage.getItem('eyeTrackerCameraPosition');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate position is within reasonable bounds
        if (parsed.x >= 0 && parsed.x < window.innerWidth - 50 &&
            parsed.y >= 0 && parsed.y < window.innerHeight - 50) {
          return parsed;
        }
      } catch (e) {
        // Fall through to default
      }
    }
    // Default position: bottom-right corner
    return { x: window.innerWidth - 240, y: window.innerHeight - 280 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const socketRef = useRef(null);
  const lastElementRef = useRef(null);
  const hoveredElementRef = useRef(null);
  const dwellTimerRef = useRef(null);
  const dwellStartTimeRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const stableCountRef = useRef(0);
  const cameraRef = useRef(null);
  
  const DWELL_TIME = 2500;
  const MIN_STABLE_FRAMES = 5;
  const GAZE_RADIUS = 60;

  // Find Portal Target (HEAD)
  useEffect(() => {
    if (!controlsContainerId) {
      setControlsTarget(null);
      return;
    }

    let rafId = null;
    const findTarget = () => {
      const target = document.getElementById(controlsContainerId);
      if (target) {
        setControlsTarget(target);
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
  }, [controlsContainerId]);

  // Handle Input Value Setting (Merged Logic)
  const setInputValue = useCallback((input, value) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    )?.set;

    if (nativeSetter) {
      nativeSetter.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, []);

  // Handle Keyboard Presses (Merged Logic)
  const handleKeyPress = useCallback((key) => {
    if (!activeInput) return;

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    let newValue = activeInput.value;

    if (key === 'BACKSPACE') {
      newValue = activeInput.value.slice(0, -1);
    } else if (key === 'ENTER') {
      if (activeInput.tagName === 'INPUT') {
        const form = activeInput.closest('form');
        if (form) {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
        activeInput.blur();
        setShowKeyboard(false);
        setActiveInput(null);
        return;
      } else {
        newValue = activeInput.value + '\n';
      }
    } else if (key === 'TAB') {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      const currentIndex = inputs.indexOf(activeInput);
      const nextInput = inputs[currentIndex + 1];
      if (nextInput) {
        nextInput.focus();
        setActiveInput(nextInput);
      }
      return;
    } else {
      newValue = activeInput.value + key;
    }

    // Apply value using native setters
    if (activeInput.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(activeInput, newValue);
    } else if (nativeInputValueSetter) {
      nativeInputValueSetter.call(activeInput, newValue);
    } else {
      activeInput.value = newValue;
    }

    // Dispatch events
    const inputEvent = new Event('input', { bubbles: true });
    activeInput.dispatchEvent(inputEvent);

    const changeEvent = new Event('change', { bubbles: true });
    activeInput.dispatchEvent(changeEvent);

    console.log('⌨️ Typed:', key, '| New value:', newValue);
  }, [activeInput]);

  const handleCloseKeyboard = useCallback(() => {
    setShowKeyboard(false);
    if (activeInput) {
      activeInput.blur();
    }
    setActiveInput(null);
  }, [activeInput]);

  const getClickableElement = useCallback((x, y) => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;
    
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      return element;
    }
    
    const clickable = element.closest('button, a, [role="button"], input[type="submit"], input[type="button"], .clickable');
    if (clickable) return clickable;
    
    if (element.onclick || window.getComputedStyle(element).cursor === 'pointer') {
      return element;
    }
    
    return null;
  }, []);

  const performClick = useCallback((element) => {
    if (!element) return;
    
    console.log('✅ DWELL CLICK:', element.tagName);
    
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.focus();
      setActiveInput(element);
      setShowKeyboard(true);
    } else {
      element.classList.remove('gaze-hovered');
      element.classList.add('gaze-clicked');
      element.style.outline = '5px solid #4CAF50';
      element.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
      
      element.click();
      
      setTimeout(() => {
        if (element) {
          element.classList.remove('gaze-clicked');
          element.style.outline = '';
          element.style.backgroundColor = '';
        }
      }, 500);
    }
    setDwellProgress(0);
  }, []);

  const startDwellTimer = useCallback((element) => {
    if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    dwellStartTimeRef.current = Date.now();
    setDwellProgress(0);
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - dwellStartTimeRef.current;
      const progress = Math.min((elapsed / DWELL_TIME) * 100, 100);
      setDwellProgress(progress);
    }, 50);
    
    dwellTimerRef.current = setTimeout(() => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setDwellProgress(100);
      performClick(element);
      
      hoveredElementRef.current = null;
      lastElementRef.current = null;
      stableCountRef.current = 0;
    }, DWELL_TIME);
  }, [performClick]);

  const cancelDwellTimer = useCallback(() => {
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setDwellProgress(0);
  }, []);

  const handleGazeInteraction = useCallback((x, y) => {
    const SCROLL_ZONE = 80;
    if (y < SCROLL_ZONE && !showKeyboard) {
      window.scrollBy(0, -3);
    } else if (y > window.innerHeight - SCROLL_ZONE && !showKeyboard) {
      window.scrollBy(0, 3);
    }

    const pointsToCheck = [
      { x: x, y: y },
      { x: x - GAZE_RADIUS, y: y },
      { x: x + GAZE_RADIUS, y: y },
      { x: x, y: y - GAZE_RADIUS },
      { x: x, y: y + GAZE_RADIUS },
      { x: x - GAZE_RADIUS/2, y: y - GAZE_RADIUS/2 },
      { x: x + GAZE_RADIUS/2, y: y - GAZE_RADIUS/2 },
      { x: x - GAZE_RADIUS/2, y: y + GAZE_RADIUS/2 },
      { x: x + GAZE_RADIUS/2, y: y + GAZE_RADIUS/2 },
    ];

    let clickableElement = null;
    for (const point of pointsToCheck) {
      clickableElement = getClickableElement(point.x, point.y);
      if (clickableElement) break;
    }

    if (clickableElement) {
      if (lastElementRef.current === clickableElement) {
        stableCountRef.current++;
      } else {
        stableCountRef.current = 1;
        lastElementRef.current = clickableElement;
        cancelDwellTimer();
        
        if (hoveredElementRef.current && hoveredElementRef.current !== clickableElement) {
          hoveredElementRef.current.classList.remove('gaze-hovered');
          hoveredElementRef.current.style.outline = '';
          hoveredElementRef.current.style.boxShadow = '';
        }
      }

      if (stableCountRef.current >= MIN_STABLE_FRAMES) {
        if (hoveredElementRef.current !== clickableElement) {
          clickableElement.classList.add('gaze-hovered');
          clickableElement.style.outline = '5px solid #e31837';
          clickableElement.style.outlineOffset = '3px';
          clickableElement.style.boxShadow = '0 0 20px rgba(227, 24, 55, 0.6)';
          
          hoveredElementRef.current = clickableElement;
          startDwellTimer(clickableElement);
        }
      }
    } else {
      if (hoveredElementRef.current) {
        hoveredElementRef.current.classList.remove('gaze-hovered');
        hoveredElementRef.current.style.outline = '';
        hoveredElementRef.current.style.boxShadow = '';
        hoveredElementRef.current = null;
      }
      cancelDwellTimer();
      stableCountRef.current = 0;
      lastElementRef.current = null;
    }
  }, [getClickableElement, startDwellTimer, cancelDwellTimer, showKeyboard]);

  // Connect to Python backend
  useEffect(() => {
    socketRef.current = io('http://localhost:5001');
    
    socketRef.current.on('connect', () => {
      console.log('✅ Connected to Python eye tracker');
      setConnected(true);
      socketRef.current.emit('get_status');
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Disconnected from Python eye tracker');
      setConnected(false);
    });

    socketRef.current.on('tracking_status', (data) => {
      if (data.is_tracking) {
        setIsTracking(true);
        setFaceDetected(true);
      }
    });
    
    socketRef.current.on('gaze_data', (data) => {
      if (data.face_detected) {
        if (!isTracking) setIsTracking(true);
        setFaceDetected(true);
        
        if (data.image) setVideoFrame(`data:image/jpeg;base64,${data.image}`);

        let rawX = data.x * window.innerWidth;
        let rawY = data.y * window.innerHeight;

        const padding = 30;
        const clampedX = Math.min(window.innerWidth - padding, Math.max(padding, rawX));
        const clampedY = Math.min(window.innerHeight - padding, Math.max(padding, rawY));
        
        setGazePosition({ x: clampedX, y: clampedY });
        
        if (onFaceDetected) onFaceDetected(data);
        handleGazeInteraction(clampedX, clampedY);
      } else {
        setFaceDetected(false);
        cancelDwellTimer();
        if (onFaceLost) onFaceLost();
      }
    });
    
    return () => {
      cancelDwellTimer();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [onFaceDetected, onFaceLost, handleGazeInteraction, cancelDwellTimer, isTracking]);

  // Handle autoStart prop changes (from FAB or Global State)
  useEffect(() => {
    if (!socketRef.current || !connected) return;
    
    // Only auto-start if not already tracking
    if (autoStart && !isTracking) {
      console.log('🚀 Auto-starting eye tracking');
      socketRef.current.emit('start_tracking');
      setIsTracking(true);
    } 
    // Only stop if autoStart becomes false AND we are tracking
    else if (!autoStart && isTracking) {
      console.log('⏹ Auto-stopping eye tracking');
      stopTracking(); 
    }
  }, [autoStart, connected, isTracking]);

  const startTracking = () => {
    if (!connected) return;
    socketRef.current.emit('start_tracking');
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (socketRef.current) {
      socketRef.current.emit('stop_tracking');
    }
    setIsTracking(false);
    setFaceDetected(false);
    setVideoFrame(null);
    setShowKeyboard(false);
    setActiveInput(null);
    cancelDwellTimer();
    
    if (hoveredElementRef.current) {
      hoveredElementRef.current.classList.remove('gaze-hovered');
      hoveredElementRef.current.style.outline = '';
      hoveredElementRef.current = null;
    }

    // Call parent callback to sync global state (e.g., update FAB)
    if (onStopTracking) {
      onStopTracking();
    }
  };

  // Camera drag handlers - same as HandTracker
  const handleCameraMouseDown = (e) => {
    if (e.target.closest('.camera-stop-btn')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - cameraPosition.x,
      y: e.clientY - cameraPosition.y
    });
  };

  const handleCameraTouchStart = (e) => {
    if (e.target.closest('.camera-stop-btn')) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - cameraPosition.x,
      y: touch.clientY - cameraPosition.y
    });
  };

  // Camera drag move effect - same as HandTracker
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      const maxX = window.innerWidth - 220;
      const maxY = window.innerHeight - 200;
      setCameraPosition({
        x: Math.max(10, Math.min(newX, maxX)),
        y: Math.max(10, Math.min(newY, maxY))
      });
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      const maxX = window.innerWidth - 220;
      const maxY = window.innerHeight - 200;
      setCameraPosition({
        x: Math.max(10, Math.min(newX, maxX)),
        y: Math.max(10, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => setIsDragging(false);
    const handleTouchEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStart]);

  // Save camera position to localStorage
  useEffect(() => {
    localStorage.setItem('eyeTrackerCameraPosition', JSON.stringify(cameraPosition));
  }, [cameraPosition]);

  // --- UI Rendering Logic ---

  const compactContent = (label, subtitle, iconName) => (
    <div className="eye-tracker-compact-content">
      <span className="material-icons eye-tracker-compact-icon" aria-hidden="true">
        {iconName}
      </span>
      <div className="eye-tracker-compact-text">
        <span className="eye-tracker-compact-title">{label}</span>
        <span className="eye-tracker-compact-subtitle">{subtitle}</span>
      </div>
    </div>
  );

  const compactSubtitle = !connected
    ? "Python server not connected"
    : isTracking
    ? "Tracking is active"
    : "Hands-free navigation";

  // Shared controls render function
  const renderControlsContent = (isDocked) => (
    <div className={isDocked && compactControls ? "eye-tracker-compact-wrapper" : "panel-content"}>
      {!isDocked && !connected && (
        <div className="connection-status error">⚠️ Not connected</div>
      )}

      {!isTracking ? (
        <button
          className={`eye-tracker-btn start-btn ${!isDocked ? 'clickable' : ''}`}
          onClick={startTracking}
          disabled={!connected}
          type="button"
        >
          {isDocked && compactControls
            ? compactContent("Enable Eye Tracking", compactSubtitle, "visibility")
            : (<span>👁️ Start</span>)}
        </button>
      ) : (
        <button
          className={`eye-tracker-btn stop-btn ${!isDocked ? 'clickable' : ''}`}
          onClick={stopTracking}
          type="button"
        >
           {isDocked && compactControls
            ? compactContent("Disable Eye Tracking", compactSubtitle, "visibility_off")
            : (<span>⏹ Stop</span>)}
        </button>
      )}
    </div>
  );

  // If not tracking and not auto-starting (and not docked), render nothing
  // EXCEPT if docked, we usually want to show the "Enable" button
  if (!isTracking && !autoStart && !controlsTarget) {
    return null;
  }

  return (
    <div className={`eye-tracker-wrapper ${controlsTarget ? 'docked-mode' : 'floating-mode'}`}>
      
      {/* Gaze Cursor (Always Visible when tracking) */}
      {isTracking && faceDetected && (
        <div
          className="gaze-cursor"
          style={{ left: `${gazePosition.x}px`, top: `${gazePosition.y}px` }}
        >
          <svg className="progress-ring" width="120" height="120">
            <circle className="progress-ring-bg" cx="60" cy="60" r="55" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="6" />
            <circle
              className="progress-ring-fill"
              cx="60" cy="60" r="55"
              fill="none" stroke="#4CAF50" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 55}`}
              strokeDashoffset={`${2 * Math.PI * 55 * (1 - dwellProgress / 100)}`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="gaze-cursor-dot"></div>
        </div>
      )}

      {/* --- RENDER STRATEGY: DOCKED VS FLOATING --- */}

      {/* 1. DOCKED MODE (Uses Portal to Dashboard) */}
      {controlsTarget && createPortal(
        <div className={`eye-tracker-panel ${compactControls ? "compact" : ""}`}>
          {renderControlsContent(true)}
          
          {/* If Docked & NOT Compact, show video/instructions inline if active */}
          {isTracking && !compactControls && (
             <>
               {videoFrame && (
                 <div className="camera-feed-container">
                   <img src={videoFrame} alt="Eye Tracker Feed" className="camera-feed" />
                   <div className="feed-status">{showKeyboard ? 'Keyboard Active' : 'Tracking Active'}</div>
                 </div>
               )}
               {faceDetected && (
                 <div className="gaze-instructions">
                   <div className="instruction-main">Look at a button for 2.5s</div>
                 </div>
               )}
             </>
          )}
        </div>,
        controlsTarget
      )}

      {/* 2. FLOATING MODE - Camera Feed (same format as HandTracker) */}
      {!controlsTarget && isTracking && videoFrame && (
        <div 
          ref={cameraRef}
          className={`eye-tracker-camera-fixed ${isDragging ? 'dragging' : ''}`}
          style={{
            left: `${cameraPosition.x}px`,
            top: `${cameraPosition.y}px`,
            right: 'auto',
            bottom: 'auto'
          }}
          onMouseDown={handleCameraMouseDown}
          onTouchStart={handleCameraTouchStart}
        >
          <div className="camera-header">
            <span className="camera-drag-hint">⋮⋮</span>
            <span className="camera-title">👁️ Eye Tracker</span>
            <button 
              className="camera-stop-btn clickable"
              onClick={stopTracking}
              title="Stop Eye Tracking"
            >
              ✕
            </button>
          </div>
          <img src={videoFrame} alt="Eye Tracker Feed" className="camera-feed" />
          <div className="feed-status">
            {showKeyboard ? '⌨️ Keyboard Active' : faceDetected ? '✅ Tracking Active' : '🔍 Looking for face...'}
          </div>
        </div>
      )}

      {/* Connection error indicator (floating mode only) */}
      {!controlsTarget && autoStart && !connected && (
        <div className="eye-tracker-connection-error">
          ⚠️ Eye tracker server not connected
        </div>
      )}

      {/* On-Screen Keyboard */}
      <OnScreenKeyboard
        isVisible={showKeyboard}
        onKeyPress={handleKeyPress}
        onClose={handleCloseKeyboard}
        activeInput={activeInput}
      />
    </div>
  );
}

export default EyeTrackerPython;