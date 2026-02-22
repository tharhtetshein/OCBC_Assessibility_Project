import { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import OnScreenKeyboard from '../eye-tracker/OnScreenKeyboard';
import './HandTracker.css';

function HandTrackerPython({ onHandDetected, onHandLost, autoStart = false, onStopTracking }) {
  const [isTracking, setIsTracking] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [videoFrame, setVideoFrame] = useState(null);
  const [connected, setConnected] = useState(false);
  const [gesture, setGesture] = useState('none');
  const [dwellProgress, setDwellProgress] = useState(0);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  
  // Draggable camera state - same format as eye tracker
  const [cameraPosition, setCameraPosition] = useState(() => {
    const saved = localStorage.getItem('handTrackerCameraPosition');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { x: window.innerWidth - 240, y: window.innerHeight - 280 };
      }
    }
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
  
  const DWELL_TIME = 2000;
  const MIN_STABLE_FRAMES = 3;
  const CURSOR_RADIUS = 50;

  // Handle keyboard key press - same as eye tracker
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

    if (activeInput.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(activeInput, newValue);
    } else if (nativeInputValueSetter) {
      nativeInputValueSetter.call(activeInput, newValue);
    } else {
      activeInput.value = newValue;
    }

    const inputEvent = new Event('input', { bubbles: true });
    activeInput.dispatchEvent(inputEvent);

    const changeEvent = new Event('change', { bubbles: true });
    activeInput.dispatchEvent(changeEvent);

    console.log('⌨️ Hand Typed:', key, '| New value:', newValue);
  }, [activeInput]);

  // Close keyboard
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
    
    // Check for input fields - these will open keyboard
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
    
    console.log('✅ HAND CLICK:', element.tagName, element.textContent?.slice(0, 30));
    
    // Check if it's an input field
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.focus();
      setActiveInput(element);
      setShowKeyboard(true);
      console.log('⌨️ Opening keyboard for input (hand)');
    } else {
      // Normal click
      element.classList.remove('hand-hovered');
      element.classList.add('hand-clicked');
      element.click();
      
      setTimeout(() => {
        if (element) {
          element.classList.remove('hand-clicked');
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

  const handleCursorInteraction = useCallback((x, y, isPinchClick) => {
    // Pinch gesture = instant click
    if (isPinchClick) {
      const element = getClickableElement(x, y);
      if (element) {
        performClick(element);
        return;
      }
    }

    // Scroll zones (same as eye tracker)
    const SCROLL_ZONE = 80;
    if (y < SCROLL_ZONE && !showKeyboard) {
      window.scrollBy(0, -3);
    } else if (y > window.innerHeight - SCROLL_ZONE && !showKeyboard) {
      window.scrollBy(0, 3);
    }

    const pointsToCheck = [
      { x, y },
      { x: x - CURSOR_RADIUS, y },
      { x: x + CURSOR_RADIUS, y },
      { x, y: y - CURSOR_RADIUS },
      { x, y: y + CURSOR_RADIUS },
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
          hoveredElementRef.current.classList.remove('hand-hovered');
        }
      }

      if (stableCountRef.current >= MIN_STABLE_FRAMES) {
        if (hoveredElementRef.current !== clickableElement) {
          clickableElement.classList.add('hand-hovered');
          hoveredElementRef.current = clickableElement;
          startDwellTimer(clickableElement);
        }
      }
    } else {
      if (hoveredElementRef.current) {
        hoveredElementRef.current.classList.remove('hand-hovered');
        hoveredElementRef.current = null;
      }
      cancelDwellTimer();
      stableCountRef.current = 0;
      lastElementRef.current = null;
    }
  }, [getClickableElement, performClick, startDwellTimer, cancelDwellTimer, showKeyboard]);

  // Socket connection
  useEffect(() => {
    socketRef.current = io('http://localhost:5002');
    
    socketRef.current.on('connect', () => {
      console.log('✅ Connected to Hand Tracker');
      setConnected(true);
      socketRef.current.emit('get_status');
    });

    socketRef.current.on('disconnect', () => {
      setConnected(false);
    });

    socketRef.current.on('tracking_status', (data) => {
      console.log('📊 Hand Tracker Status:', data);
      if (data.is_tracking) {
        setIsTracking(true);
      }
    });
    
    socketRef.current.on('hand_data', (data) => {
      if (!isTracking) {
        setIsTracking(true);
      }
      
      if (data.hand_detected) {
        setHandDetected(true);
        setGesture(data.gesture);
        
        if (data.image) {
          setVideoFrame(`data:image/jpeg;base64,${data.image}`);
        }

        const rawX = data.x * window.innerWidth;
        const rawY = data.y * window.innerHeight;

        const padding = 30;
        const clampedX = Math.min(window.innerWidth - padding, Math.max(padding, rawX));
        const clampedY = Math.min(window.innerHeight - padding, Math.max(padding, rawY));
        
        setCursorPosition({ x: clampedX, y: clampedY });
        
        if (onHandDetected) onHandDetected(data);
        handleCursorInteraction(clampedX, clampedY, data.click);
      } else {
        setHandDetected(false);
        cancelDwellTimer();
        if (onHandLost) onHandLost();
      }
    });
    
    return () => {
      cancelDwellTimer();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [onHandDetected, onHandLost, handleCursorInteraction, cancelDwellTimer, isTracking]);

  // Handle autoStart prop changes from FAB button
  useEffect(() => {
    if (!socketRef.current) return;
    
    if (autoStart && connected) {
      console.log('🚀 Auto-starting hand tracking from FAB');
      socketRef.current.emit('start_tracking');
      setIsTracking(true);
    } else if (!autoStart && connected) {
      console.log('⏹ Auto-stopping hand tracking from FAB');
      socketRef.current.emit('stop_tracking');
      setIsTracking(false);
      setHandDetected(false);
      setVideoFrame(null);
      setShowKeyboard(false);
      setActiveInput(null);
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setDwellProgress(0);
      if (hoveredElementRef.current) {
        hoveredElementRef.current.classList.remove('hand-hovered');
        hoveredElementRef.current = null;
      }
    }
  }, [autoStart, connected]);

  const startTracking = () => {
    if (!connected) return;
    socketRef.current.emit('start_tracking');
    setIsTracking(true);
  };

  const stopTracking = () => {
    socketRef.current.emit('stop_tracking');
    setIsTracking(false);
    setHandDetected(false);
    setVideoFrame(null);
    setShowKeyboard(false);
    setActiveInput(null);
    cancelDwellTimer();
    if (hoveredElementRef.current) {
      hoveredElementRef.current.classList.remove('hand-hovered');
      hoveredElementRef.current = null;
    }
    // Call parent callback to update FAB state
    if (onStopTracking) {
      onStopTracking();
    }
  };

  // Camera drag handlers - same as eye tracker
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

  // Camera drag move effect
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
    localStorage.setItem('handTrackerCameraPosition', JSON.stringify(cameraPosition));
  }, [cameraPosition]);

  // Don't render anything if not tracking
  if (!isTracking && !autoStart) {
    return null;
  }

  return (
    <div className="hand-tracker-container">
      {/* Hand Cursor */}
      {isTracking && handDetected && (
        <div 
          className={`hand-cursor ${gesture}`}
          style={{ 
            left: `${cursorPosition.x}px`, 
            top: `${cursorPosition.y}px` 
          }}
        >
          <svg className="progress-ring" width="120" height="120">
            <circle
              className="progress-ring-bg"
              cx="60"
              cy="60"
              r="55"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="6"
            />
            <circle
              className="progress-ring-fill"
              cx="60"
              cy="60"
              r="55"
              fill="none"
              stroke="#4CAF50"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 55}`}
              strokeDashoffset={`${2 * Math.PI * 55 * (1 - dwellProgress / 100)}`}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="hand-cursor-dot">
            {gesture === 'pinch' ? '👌' : gesture === 'point' ? '👆' : '🖐️'}
          </div>
        </div>
      )}

      {/* Camera Feed - Draggable, same format as eye tracker */}
      {isTracking && videoFrame && (
        <div 
          ref={cameraRef}
          className={`hand-tracker-camera-fixed ${isDragging ? 'dragging' : ''}`}
          style={{
            left: `${cameraPosition.x}px`,
            top: `${cameraPosition.y}px`,
            right: 'auto',
            bottom: 'auto'
          }}
          onMouseDown={handleCameraMouseDown}
          onTouchStart={handleCameraTouchStart}
        >
          <div className="camera-header hand-camera-header">
            <span className="camera-drag-hint">⋮⋮</span>
            <span className="camera-title">🖐️ Hand Tracker</span>
            <button 
              className="camera-stop-btn clickable"
              onClick={stopTracking}
              title="Stop Hand Tracking"
            >
              ✕
            </button>
          </div>
          <img src={videoFrame} alt="Hand Tracker Feed" className="camera-feed" />
          <div className="feed-status hand-feed-status">
            {showKeyboard ? '⌨️ Keyboard Active' : handDetected ? `✅ ${gesture === 'pinch' ? '👌 Pinch' : gesture === 'point' ? '👆 Pointing' : '🖐️ Open'}` : '🔍 Looking for hand...'}
          </div>
        </div>
      )}

      {/* Connection error indicator */}
      {autoStart && !connected && (
        <div className="hand-tracker-connection-error">
          ⚠️ Hand tracker server not connected
        </div>
      )}

      {/* On-Screen Keyboard */}
      <OnScreenKeyboard
        isVisible={showKeyboard}
        onKeyPress={handleKeyPress}
        onClose={handleCloseKeyboard}
        activeInput={activeInput}
        trackerType="hand"
      />
    </div>
  );
}

export default HandTrackerPython;