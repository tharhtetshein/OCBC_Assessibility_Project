import { useState, useEffect } from 'react';
import './OnScreenKeyboard.css';

// Hook to detect mobile screen
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return isMobile;
}

function OnScreenKeyboard({ onKeyPress, onClose, isVisible, activeInput, trackerType = 'eye' }) {
  const [isShift, setIsShift] = useState(false);
  const [isCaps, setIsCaps] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const [showNumbers, setShowNumbers] = useState(false);
  
  const isMobile = useIsMobile();

  // Sync with active input value
  useEffect(() => {
    if (activeInput) {
      setInputValue(activeInput.value || '');
      
      const label = activeInput.getAttribute('placeholder') || 
                    activeInput.getAttribute('aria-label') ||
                    activeInput.getAttribute('name') ||
                    activeInput.id ||
                    'Text Input';
      setInputLabel(label);

      const handleInputChange = () => {
        setInputValue(activeInput.value || '');
      };

      activeInput.addEventListener('input', handleInputChange);
      return () => {
        activeInput.removeEventListener('input', handleInputChange);
      };
    }
  }, [activeInput]);

  // MOBILE LAYOUT - 10 keys per row max (phone-style)
  const mobileLayout = {
    row1: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    row2: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    row3: ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  };

  const mobileShiftLayout = {
    row1: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    row2: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    row3: ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  };

  const mobileNumberLayout = {
    row1: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    row2: ['@', '#', '$', '%', '&', '*', '-', '+', '(', ')'],
    row3: ['!', '"', "'", ':', ';', '/', '?'],
  };

  // DESKTOP LAYOUT - Full keyboard
  const desktopLayout = {
    row1: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
    row2: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    row3: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    row4: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  };

  const desktopShiftLayout = {
    row1: ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'],
    row2: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '{', '}'],
    row3: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':', '"'],
    row4: ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '<', '>', '?'],
  };

  const useShift = isShift || isCaps;
  
  // Select layout based on device and mode
  const getMobileLayout = () => {
    if (showNumbers) return mobileNumberLayout;
    return useShift ? mobileShiftLayout : mobileLayout;
  };
  
  const getDesktopLayout = () => {
    return useShift ? desktopShiftLayout : desktopLayout;
  };

  const handleKeyClick = (key) => {
    onKeyPress(key);
    if (isShift && !isCaps) {
      setIsShift(false);
    }
  };

  const handleShift = () => {
    setIsShift(!isShift);
    setShowNumbers(false);
  };

  const handleCapsLock = () => {
    setIsCaps(!isCaps);
    setIsShift(false);
    setShowNumbers(false);
  };

  const handleNumbers = () => {
    setShowNumbers(!showNumbers);
    setIsShift(false);
    setIsCaps(false);
  };

  const handleSpace = () => {
    onKeyPress(' ');
  };

  const handleBackspace = () => {
    onKeyPress('BACKSPACE');
  };

  const handleEnter = () => {
    onKeyPress('ENTER');
  };

  const handleTab = () => {
    onKeyPress('TAB');
  };

  const handleClear = () => {
    if (activeInput) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(activeInput, '');
      } else {
        activeInput.value = '';
      }
      
      activeInput.dispatchEvent(new Event('input', { bubbles: true }));
      activeInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const getTitle = () => {
    if (trackerType === 'hand') {
      return '🖐️ Hand Keyboard';
    }
    return '👁️ Eye Keyboard';
  };

  if (!isVisible) return null;

  // MOBILE KEYBOARD RENDER
  if (isMobile) {
    const layout = getMobileLayout();
    
    return (
      <div className="osk-overlay">
        <div className="osk-container osk-mobile">
          {/* Compact Header */}
          <div className="osk-header">
            <span className="osk-title">{getTitle()}</span>
            <div className="osk-header-actions">
              <button className="osk-clear-btn clickable" onClick={handleClear}>
                🗑️
              </button>
              <button className="osk-close-btn clickable" onClick={onClose}>
                ✕
              </button>
            </div>
          </div>

          {/* Compact Preview */}
          <div className="osk-preview">
            <div className="osk-preview-content">
              <span className="osk-preview-text">
                {inputValue || <span className="osk-preview-placeholder">Type here...</span>}
              </span>
              <span className="osk-preview-cursor">|</span>
            </div>
          </div>

          {/* Mobile Keyboard */}
          <div className="osk-keyboard osk-keyboard-mobile">
            {/* Row 1 - 10 keys */}
            <div className="osk-row">
              {layout.row1.map((key, index) => (
                <button
                  key={index}
                  className="osk-key clickable"
                  onClick={() => handleKeyClick(key)}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Row 2 - 9 keys (centered) */}
            <div className="osk-row">
              {layout.row2.map((key, index) => (
                <button
                  key={index}
                  className="osk-key clickable"
                  onClick={() => handleKeyClick(key)}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Row 3 - Shift + 7 keys + Backspace */}
            <div className="osk-row">
              <button 
                className={`osk-key osk-key-modifier clickable ${(isShift || isCaps) && !showNumbers ? 'osk-key-active' : ''}`}
                onClick={handleShift}
              >
                ⇧
              </button>
              {layout.row3.map((key, index) => (
                <button
                  key={index}
                  className="osk-key clickable"
                  onClick={() => handleKeyClick(key)}
                >
                  {key}
                </button>
              ))}
              <button className="osk-key osk-key-modifier clickable" onClick={handleBackspace}>
                ⌫
              </button>
            </div>

            {/* Row 4 - 123 + Space + Enter */}
            <div className="osk-row osk-row-bottom">
              <button 
                className={`osk-key osk-key-modifier clickable ${showNumbers ? 'osk-key-active' : ''}`}
                onClick={handleNumbers}
              >
                123
              </button>
              <button className="osk-key osk-key-comma clickable" onClick={() => handleKeyClick(',')}>
                ,
              </button>
              <button className="osk-key osk-key-space clickable" onClick={handleSpace}>
                space
              </button>
              <button className="osk-key osk-key-comma clickable" onClick={() => handleKeyClick('.')}>
                .
              </button>
              <button className="osk-key osk-key-modifier osk-key-enter clickable" onClick={handleEnter}>
                ↵
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DESKTOP KEYBOARD RENDER
  const layout = getDesktopLayout();
  
  return (
    <div className="osk-overlay">
      <div className="osk-container">
        {/* Header */}
        <div className="osk-header">
          <span className="osk-title">{getTitle()}</span>
          <button className="osk-close-btn clickable" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {/* Preview Box */}
        <div className="osk-preview">
          <div className="osk-preview-label">{inputLabel}</div>
          <div className="osk-preview-content">
            <span className="osk-preview-text">
              {inputValue || <span className="osk-preview-placeholder">Start typing...</span>}
            </span>
            <span className="osk-preview-cursor">|</span>
          </div>
          <button className="osk-clear-btn clickable" onClick={handleClear}>
            🗑️ Clear
          </button>
        </div>

        {/* Desktop Keyboard */}
        <div className="osk-keyboard">
          {/* Row 1 - Numbers */}
          <div className="osk-row">
            {layout.row1.map((key, index) => (
              <button
                key={index}
                className="osk-key clickable"
                onClick={() => handleKeyClick(key)}
              >
                {key}
              </button>
            ))}
            <button className="osk-key osk-key-wide clickable" onClick={handleBackspace}>
              ⌫ Back
            </button>
          </div>

          {/* Row 2 - QWERTY */}
          <div className="osk-row">
            <button className="osk-key osk-key-wide clickable" onClick={handleTab}>
              Tab
            </button>
            {layout.row2.map((key, index) => (
              <button
                key={index}
                className="osk-key clickable"
                onClick={() => handleKeyClick(key)}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Row 3 - ASDF */}
          <div className="osk-row">
            <button 
              className={`osk-key osk-key-wide clickable ${isCaps ? 'osk-key-active' : ''}`} 
              onClick={handleCapsLock}
            >
              Caps
            </button>
            {layout.row3.map((key, index) => (
              <button
                key={index}
                className="osk-key clickable"
                onClick={() => handleKeyClick(key)}
              >
                {key}
              </button>
            ))}
            <button className="osk-key osk-key-wide clickable" onClick={handleEnter}>
              Enter ↵
            </button>
          </div>

          {/* Row 4 - ZXCV */}
          <div className="osk-row">
            <button 
              className={`osk-key osk-key-wide clickable ${isShift ? 'osk-key-active' : ''}`} 
              onClick={handleShift}
            >
              ⇧ Shift
            </button>
            {layout.row4.map((key, index) => (
              <button
                key={index}
                className="osk-key clickable"
                onClick={() => handleKeyClick(key)}
              >
                {key}
              </button>
            ))}
            <button 
              className={`osk-key osk-key-wide clickable ${isShift ? 'osk-key-active' : ''}`} 
              onClick={handleShift}
            >
              ⇧ Shift
            </button>
          </div>

          {/* Row 5 - Space */}
          <div className="osk-row">
            <button className="osk-key osk-key-space clickable" onClick={handleSpace}>
              Space
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnScreenKeyboard;