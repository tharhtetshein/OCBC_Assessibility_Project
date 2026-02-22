import React from 'react';

const LayoutSelector = ({ currentLayout, onLayoutChange, largeTextMode = false }) => {
  const layouts = [
    {
      id: 'swipeable',
      name: 'Swipeable',
      icon: 'swipe',
      description: 'Swipeable grid with pages'
    },
    {
      id: 'circular',
      name: 'Donut',
      icon: 'donut_large',
      description: 'Interactive donut layout'
    }
  ];

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '20px',
      padding: '15px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #f0f0f0',
      maxWidth: '400px',
      margin: '0 auto 20px'
    }}>
      {layouts.map((layout) => (
        <button
          key={layout.id}
          onClick={() => onLayoutChange(layout.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '12px 16px',
            border: 'none',
            borderRadius: '10px',
            backgroundColor: currentLayout === layout.id ? '#e31837' : 'transparent',
            color: currentLayout === layout.id ? 'white' : '#666',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            minWidth: '80px',
            boxShadow: currentLayout === layout.id ? '0 4px 12px rgba(227, 24, 55, 0.3)' : 'none',
            transform: currentLayout === layout.id ? 'scale(1.05)' : 'scale(1)'
          }}
          onMouseOver={(e) => {
            if (currentLayout !== layout.id) {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseOut={(e) => {
            if (currentLayout !== layout.id) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
        >
          <span 
            className="material-icons" 
            style={{ 
              fontSize: largeTextMode ? '26px' : '22px',
              transition: 'all 0.3s ease'
            }}
          >
            {layout.icon}
          </span>
          <span 
            style={{ 
              fontSize: largeTextMode ? '14px' : '12px',
              fontWeight: '600',
              textAlign: 'center',
              lineHeight: '1.2'
            }}
          >
            {layout.name}
          </span>
        </button>
      ))}
    </div>
  );
};

export default LayoutSelector;