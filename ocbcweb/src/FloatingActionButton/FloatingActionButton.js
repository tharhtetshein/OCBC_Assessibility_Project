import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './FloatingActionButton.css';

function FloatingActionButton({ 
  user, 
  onEnableEyeTracking, 
  isEyeTrackingEnabled,
  onEnableHandTracking,
  isHandTrackingEnabled,
  onVoiceHelpClick,
  hideButton = false
}) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fabRef = useRef(null);
  const dragThreshold = 5;
  const [hasMoved, setHasMoved] = useState(false);

  // Menu items configuration
  const menuItems = [
    {
      id: 'eye-tracking',
      icon: isEyeTrackingEnabled ? '🔴' : '👁️',
      label: isEyeTrackingEnabled ? 'Disable Eye Tracking' : 'Enable Eye Tracking',
      color: isEyeTrackingEnabled ? '#f44336' : '#4CAF50',
      onClick: () => {
        onEnableEyeTracking?.();
        setIsExpanded(false);
      }
    },
    {
      id: 'hand-tracking',
      icon: isHandTrackingEnabled ? '🔴' : '🖐️',
      label: isHandTrackingEnabled ? 'Disable Hand Tracking' : 'Enable Hand Tracking',
      color: isHandTrackingEnabled ? '#f44336' : '#2196F3',
      onClick: () => {
        onEnableHandTracking?.();
        setIsExpanded(false);
      }
    },
    {
      id: 'help',
      icon: '❓',
      label: 'Need Help?',
      color: '#FF9800',
      onClick: () => {
        onVoiceHelpClick?.();
        setIsExpanded(false);
      }
    },
    {
      id: 'atm-remote',
      icon: '🏧',
      label: 'Remote ATM',
      color: '#9C27B0',
      onClick: () => {
        navigate('/atm-remote');
        setIsExpanded(false);
      }
    },
    {
      id: 'emergency-cash',
      icon: '💵',
      label: 'Emergency Cash',
      color: '#f44336',
      onClick: () => {
        navigate('/emergency-withdrawal');
        setIsExpanded(false);
      }
    },
    {
      id: 'shared-access',
      icon: '👥',
      label: 'Shared Access',
      color: '#673AB7',
      onClick: () => {
        navigate('/shared-access');
        setIsExpanded(false);
      }
    },
    {
      id: 'customise',
      icon: '⚙️',
      label: 'Customise Shortcut',
      color: '#607D8B',
      onClick: () => {
        navigate('/customise-shortcut');
        setIsExpanded(false);
      }
    },
    {
      id: 'chatbot',
      icon: '🤖',
      label: 'AI Chatbot',
      color: '#e31837',
      onClick: () => {
        navigate('/chatbot');
        setIsExpanded(false);
      }
    }
  ];

  // Handle drag start
  const handleMouseDown = (e) => {
    if (e.target.closest('.fab-menu-item')) return;
    
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleTouchStart = (e) => {
    if (e.target.closest('.fab-menu-item')) return;
    
    const touch = e.touches[0];
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  // Handle drag move
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      if (Math.abs(newX - position.x) > dragThreshold || 
          Math.abs(newY - position.y) > dragThreshold) {
        setHasMoved(true);
      }
      
      const maxX = window.innerWidth - 70;
      const maxY = window.innerHeight - 70;
      
      setPosition({
        x: Math.max(10, Math.min(newX, maxX)),
        y: Math.max(10, Math.min(newY, maxY))
      });
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      
      if (Math.abs(newX - position.x) > dragThreshold || 
          Math.abs(newY - position.y) > dragThreshold) {
        setHasMoved(true);
      }
      
      const maxX = window.innerWidth - 70;
      const maxY = window.innerHeight - 70;
      
      setPosition({
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
  }, [isDragging, dragStart, position]);

  // Handle FAB click
  const handleFabClick = () => {
    if (!hasMoved) {
      setIsExpanded(!isExpanded);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save/Load position
  useEffect(() => {
    localStorage.setItem('fabPosition', JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    const saved = localStorage.getItem('fabPosition');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition({
          x: Math.max(10, Math.min(parsed.x, window.innerWidth - 70)),
          y: Math.max(10, Math.min(parsed.y, window.innerHeight - 70))
        });
      } catch (e) {
        console.error('Failed to load FAB position');
      }
    }
  }, []);

  if (hideButton) return null;

  return (
    <div 
      ref={fabRef}
      className={`fab-container ${isExpanded ? 'expanded' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Expanded Menu */}
      {isExpanded && (
        <div className="fab-menu">
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              className="fab-menu-item clickable"
              style={{ 
                '--item-color': item.color,
                animationDelay: `${index * 0.05}s`
              }}
              onClick={item.onClick}
            >
              <span className="fab-menu-icon">{item.icon}</span>
              <span className="fab-menu-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        className={`fab-main clickable ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleFabClick}
      >
        <span className={`fab-icon ${isExpanded ? 'rotated' : ''}`}>
          {isExpanded ? '✕' : '☰'}
        </span>
      </button>

      {/* Drag hint */}
      {!isExpanded && (
        <div className="fab-hint">
          Drag to move
        </div>
      )}
    </div>
  );
}

export default FloatingActionButton;