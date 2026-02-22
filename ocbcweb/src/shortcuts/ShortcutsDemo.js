import React from 'react';
import ShortcutsLayoutManager from './ShortcutsLayoutManager';
import { defaultShortcuts } from './shortcutsConfig';

const ShortcutsDemo = () => {
  const demoShortcuts = [
    ...defaultShortcuts,
    { id: 'rewards', icon: 'card_giftcard', label: 'Rewards', usageCount: 5 },
    { id: 'investments', icon: 'trending_up', label: 'Investments', usageCount: 2 },
    { id: 'insurance', icon: 'security', label: 'Insurance', usageCount: 1 },
    { id: 'loans', icon: 'account_balance', label: 'Loans', usageCount: 3 }
  ];

  const handleShortcutClick = (shortcut) => {
    console.log('Demo shortcut clicked:', shortcut.label);
    alert(`${shortcut.label} clicked! (Demo mode)`);
  };

  const handleAddClick = () => {
    console.log('Add shortcut clicked');
    alert('Add shortcut clicked! (Demo mode)');
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#e31837',
          marginBottom: '10px',
          fontSize: '28px',
          fontWeight: '700'
        }}>
          Shortcuts Donut Layout Demo
        </h1>
        
        <p style={{
          textAlign: 'center',
          color: '#666',
          marginBottom: '30px',
          fontSize: '16px'
        }}>
          Try the interactive donut layout: Spin, swipe, and navigate!
        </p>

        <ShortcutsLayoutManager
          shortcuts={demoShortcuts}
          onShortcutClick={handleShortcutClick}
          onAddClick={handleAddClick}
          showUsageCount={true}
          largeTextMode={false}
          showLayoutSelector={true}
          defaultLayout="circular"
        />

        <div style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#e31837', marginBottom: '15px' }}>Layout Features:</h3>
          <ul style={{ color: '#666', lineHeight: '1.6' }}>
            <li><strong>Swipeable Layout:</strong> Paginated grid with smooth swipe transitions</li>
            <li><strong>Donut Layout:</strong> Interactive donut with spinning controls and center navigation</li>
            <li><strong>Spin Controls:</strong> Manual left/right rotation and auto-spin functionality</li>
            <li><strong>Center Navigation:</strong> Page controls integrated in the donut hole</li>
            <li><strong>Layout Persistence:</strong> Your preferred layout is saved automatically</li>
            <li><strong>Touch Gestures:</strong> Swipe left/right to navigate between pages/donuts</li>
            <li><strong>Responsive Design:</strong> Adapts to different screen sizes</li>
            <li><strong>Settings Integration:</strong> Layout selector available in Customise Shortcuts page</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsDemo;