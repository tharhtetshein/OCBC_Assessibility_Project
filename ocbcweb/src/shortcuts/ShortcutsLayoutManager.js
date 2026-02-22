import React, { useState, useEffect } from 'react';
import SwipeableShortcutsGrid from './SwipeableShortcutsGrid';
import CircularShortcutsGrid from './CircularShortcutsGrid';
import LayoutSelector from './LayoutSelector';

const ShortcutsLayoutManager = ({ 
  shortcuts, 
  onShortcutClick, 
  onAddClick, 
  showUsageCount = false, 
  largeTextMode = false,
  showLayoutSelector = true,
  defaultLayout = 'swipeable',
  onShortcutInfo = null // New prop for info callback
}) => {
  const [currentLayout, setCurrentLayout] = useState(() => {
    // Load saved layout preference from localStorage
    const savedLayout = localStorage.getItem('shortcutsLayout');
    return savedLayout || defaultLayout;
  });

  // Save layout preference when it changes
  useEffect(() => {
    localStorage.setItem('shortcutsLayout', currentLayout);
  }, [currentLayout]);

  const handleLayoutChange = (layoutId) => {
    setCurrentLayout(layoutId);
  };

  const renderShortcutsComponent = () => {
    const commonProps = {
      shortcuts,
      onShortcutClick,
      onAddClick,
      showUsageCount,
      largeTextMode,
      onShortcutInfo
    };

    switch (currentLayout) {
      case 'circular':
        return <CircularShortcutsGrid {...commonProps} radius={120} />;
      
      case 'swipeable':
      default:
        return <SwipeableShortcutsGrid {...commonProps} />;
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {showLayoutSelector && (
        <LayoutSelector
          currentLayout={currentLayout}
          onLayoutChange={handleLayoutChange}
          largeTextMode={largeTextMode}
        />
      )}
      
      <div style={{
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        opacity: 1
      }}>
        {renderShortcutsComponent()}
      </div>
    </div>
  );
};

export default ShortcutsLayoutManager;