import React, { useState, useRef } from 'react';
import CircularShortcutsGrid from './CircularShortcutsGrid';

const PreviewModal = ({ shortcuts, onClose, onSave, largeTextMode, shortcutsPerPage }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentLayout, setCurrentLayout] = useState(() => {
    return localStorage.getItem('shortcutsLayout') || 'swipeable';
  });
  const containerRef = useRef(null);

  const totalPages = Math.ceil((shortcuts.length + 1) / shortcutsPerPage);

  const getCurrentPageShortcuts = () => {
    const start = currentPage * shortcutsPerPage;
    const end = start + shortcutsPerPage;
    return shortcuts.slice(start, end);
  };

  const handleTouchStart = (e) => {
    if (currentLayout === 'circular') return; // Disable swipe for circular layout
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || currentLayout === 'circular') return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    
    const offset = currentTouch - touchStart;
    const maxDrag = containerRef.current?.offsetWidth || 600;
    const limitedOffset = Math.max(-maxDrag * 0.3, Math.min(maxDrag * 0.3, offset));
    setDragOffset(limitedOffset);
  };

  const handleTouchEnd = () => {
    if (currentLayout === 'circular') return;
    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    setIsAnimating(true);
    
    if (isLeftSwipe && currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    } else if (isRightSwipe && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }

    setIsDragging(false);
    setDragOffset(0);
    setTouchStart(0);
    setTouchEnd(0);
    
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToPage = (pageIndex) => {
    if (pageIndex === currentPage || currentLayout === 'circular') return;
    setIsAnimating(true);
    setCurrentPage(pageIndex);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const pageShortcuts = getCurrentPageShortcuts();
  const showAddButton = pageShortcuts.length < shortcutsPerPage;

  const renderGridLayout = () => (
    <div style={{ padding: '20px 15px', flex: 1 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          transition: isAnimating 
            ? 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' 
            : isDragging 
              ? 'none'
              : 'all 0.3s ease',
          transform: isDragging 
            ? `translateX(${dragOffset}px) scale(0.97)` 
            : isAnimating 
              ? 'scale(1.02)' 
              : 'scale(1)',
          opacity: isDragging ? 0.85 : 1
        }}
      >
        {pageShortcuts.map((shortcut, index) => (
          <div
            key={shortcut.id || index}
            style={{
              textAlign: 'center',
              padding: '16px 12px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: '2px solid rgba(227, 24, 55, 0.1)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              animation: isAnimating ? `fadeInUpBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.08}s both` : 'none',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              minWidth: 0 // Allow items to shrink
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                margin: '0 auto',
                background: 'linear-gradient(135deg, #e31837 0%, #c41230 100%)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(227, 24, 55, 0.3)'
              }}>
                <span className="material-icons" style={{ 
                  fontSize: largeTextMode ? '28px' : '24px',
                  color: 'white'
                }}>
                  {shortcut.icon}
                </span>
              </div>
            </div>
            <div style={{ 
              fontSize: largeTextMode ? '13px' : '11px',
              fontWeight: '600',
              color: '#1a1a1a',
              lineHeight: '1.2',
              wordBreak: 'break-word',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {shortcut.label}
            </div>
          </div>
        ))}

        {showAddButton && (
          <div style={{
            textAlign: 'center',
            padding: '16px 12px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            border: '2px dashed rgba(227, 24, 55, 0.3)',
            animation: isAnimating ? `fadeInUp 0.4s ease-out ${pageShortcuts.length * 0.05}s both` : 'none',
            minWidth: 0 // Allow items to shrink
          }}>
            <div style={{ marginBottom: '10px' }}>
              <div style={{
                width: '52px',
                height: '52px',
                margin: '0 auto',
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)'
              }}>
                <span className="material-icons" style={{ 
                  fontSize: largeTextMode ? '28px' : '24px',
                  color: 'white'
                }}>
                  add
                </span>
              </div>
            </div>
            <div style={{ 
              fontSize: largeTextMode ? '13px' : '11px',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              Add More
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCircularLayout = () => (
    <div style={{ 
      padding: '40px 20px', 
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '450px',
      overflow: 'visible' // Ensure nothing gets clipped
    }}>
      <div style={{ 
        transform: 'scale(0.85)', // Reduced scale to fit properly
        transformOrigin: 'center'
      }}>
        <CircularShortcutsGrid 
          shortcuts={shortcuts} // Show all shortcuts to demonstrate pagination
          onShortcutClick={() => {}} // Disabled in preview
          largeTextMode={largeTextMode}
          isPreview={true}
          allowSpinInPreview={true} // Enable spinning in preview
          radius={120} // Back to standard radius
        />
      </div>
    </div>
  );

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal enhanced-preview" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header enhanced-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <span className="material-icons" style={{ fontSize: '28px', color: 'white' }}>visibility</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>Layout Preview</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                {currentLayout === 'circular' ? 'Circular Donut Layout' : 'Swipeable Grid Layout'}
              </p>
            </div>
          </div>
          <button className="close-preview enhanced-close" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="preview-content enhanced-content">
          {/* Layout Toggle */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Choose Layout to Preview</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                Switch between different layout styles
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setCurrentLayout('swipeable')}
                style={{
                  background: currentLayout === 'swipeable' 
                    ? 'rgba(255, 255, 255, 0.3)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  border: currentLayout === 'swipeable' 
                    ? '2px solid rgba(255, 255, 255, 0.5)' 
                    : '2px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <span className="material-icons" style={{ fontSize: '20px' }}>grid_view</span>
                Grid Layout
              </button>
              <button
                onClick={() => setCurrentLayout('circular')}
                style={{
                  background: currentLayout === 'circular' 
                    ? 'rgba(255, 255, 255, 0.3)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  border: currentLayout === 'circular' 
                    ? '2px solid rgba(255, 255, 255, 0.5)' 
                    : '2px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <span className="material-icons" style={{ fontSize: '20px' }}>donut_small</span>
                Donut Layout
              </button>
            </div>
          </div>

          {/* Enhanced instruction banner */}
          {currentLayout === 'swipeable' && (
            <div style={{
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              color: 'white',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: largeTextMode ? '16px' : '14px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}>
              <span className="material-icons" style={{ fontSize: '24px' }}>swipe</span>
              <span>Swipe or use arrows to navigate • Page {currentPage + 1} of {totalPages}</span>
            </div>
          )}

          {currentLayout === 'circular' && (
            <div style={{
              background: 'linear-gradient(135deg, #e31837 0%, #c41230 100%)',
              color: 'white',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: largeTextMode ? '16px' : '14px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(227, 24, 55, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}>
              <span className="material-icons" style={{ fontSize: '24px' }}>360</span>
              <span>Touch and spin the donut to rotate • Interactive preview!</span>
            </div>
          )}

          {/* Clean preview container - Optimized for Full Donut Visibility */}
          <div style={{
            maxWidth: '800px',
            width: '95%',
            margin: '0 auto',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)',
            borderRadius: '24px',
            overflow: 'visible', // Allow donut to be fully visible
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(227, 24, 55, 0.1)'
          }}>
            <div
              ref={containerRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                position: 'relative',
                minHeight: currentLayout === 'circular' ? '550px' : '600px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'visible' // Ensure donut sides are visible
              }}
            >

              {/* Swipe indicators for grid layout */}
              {currentLayout === 'swipeable' && isDragging && dragOffset > 30 && currentPage > 0 && (
                <div style={{
                  position: 'absolute',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  fontSize: '40px',
                  color: '#e31837',
                  animation: 'slideInFromLeft 0.3s ease-out'
                }}>
                  ◀
                </div>
              )}
              {currentLayout === 'swipeable' && isDragging && dragOffset < -30 && currentPage < totalPages - 1 && (
                <div style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  fontSize: '40px',
                  color: '#e31837',
                  animation: 'slideInFromRight 0.3s ease-out'
                }}>
                  ▶
                </div>
              )}

              {/* Layout content */}
              {currentLayout === 'circular' ? renderCircularLayout() : renderGridLayout()}

              {/* Page indicators for grid layout only */}
              {currentLayout === 'swipeable' && totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '20px 0 25px',
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, #ffffff 100%)'
                }}>
                  <button
                    onClick={() => currentPage > 0 && goToPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    style={{
                      background: currentPage === 0 
                        ? 'linear-gradient(135deg, #e0e0e0 0%, #d0d0d0 100%)' 
                        : 'linear-gradient(135deg, #e31837 0%, #c41230 100%)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      boxShadow: currentPage === 0 ? 'none' : '0 4px 12px rgba(227, 24, 55, 0.3)'
                    }}
                  >
                    <span className="material-icons" style={{ color: 'white', fontSize: '20px' }}>
                      chevron_left
                    </span>
                  </button>

                  {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToPage(index)}
                      style={{
                        width: currentPage === index ? '32px' : '12px',
                        height: '12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: currentPage === index 
                          ? 'linear-gradient(135deg, #e31837 0%, #c41230 100%)' 
                          : '#d0d0d0',
                        cursor: 'pointer',
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        padding: 0,
                        boxShadow: currentPage === index ? '0 2px 8px rgba(227, 24, 55, 0.4)' : 'none'
                      }}
                      aria-label={`Go to page ${index + 1}`}
                    />
                  ))}

                  <button
                    onClick={() => currentPage < totalPages - 1 && goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages - 1}
                    style={{
                      background: currentPage === totalPages - 1 
                        ? 'linear-gradient(135deg, #e0e0e0 0%, #d0d0d0 100%)' 
                        : 'linear-gradient(135deg, #e31837 0%, #c41230 100%)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      boxShadow: currentPage === totalPages - 1 ? 'none' : '0 4px 12px rgba(227, 24, 55, 0.3)'
                    }}
                  >
                    <span className="material-icons" style={{ color: 'white', fontSize: '20px' }}>
                      chevron_right
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced tips section */}
          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: 'linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%)',
            borderRadius: '16px',
            fontSize: '14px',
            color: '#856404',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            border: '2px solid rgba(255, 193, 7, 0.3)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255, 193, 7, 0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <span className="material-icons" style={{ fontSize: '24px', color: '#856404' }}>lightbulb</span>
            </div>
            <div>
              <strong style={{ fontSize: '16px' }}>Preview Tips:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '16px', lineHeight: '1.6' }}>
                <li>This shows exactly how your shortcuts will appear on the dashboard</li>
                <li>{currentLayout === 'circular' 
                  ? 'In Donut layout, you can spin to rotate and access all shortcuts' 
                  : `Grid layout shows ${shortcutsPerPage} shortcuts per page with swipe navigation`}
                </li>
                <li>Switch between layout types using the buttons above</li>
                <li>The preview is interactive - try the layout switching!</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="preview-footer enhanced-footer">
          <button className="preview-close-btn enhanced-close-btn" onClick={onClose} style={{ 
            fontSize: largeTextMode ? '17px' : '15px', 
            padding: largeTextMode ? '16px 32px' : '14px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span className="material-icons" style={{ fontSize: '22px' }}>close</span>
            Close Preview
          </button>
          <button className="preview-save-btn enhanced-save-btn" onClick={onSave} style={{ 
            fontSize: largeTextMode ? '17px' : '15px', 
            padding: largeTextMode ? '16px 32px' : '14px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span className="material-icons" style={{ fontSize: '22px' }}>check_circle</span>
            Looks Perfect - Save Now
          </button>
        </div>
      </div>

      <style>{`
        .enhanced-preview {
          max-width: 1100px !important;
          width: 95% !important;
          background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%) !important;
        }

        .enhanced-header {
          background: linear-gradient(135deg, #e31837 0%, #c41230 50%, #a50e26 100%) !important;
          padding: 30px 35px !important;
          box-shadow: 0 8px 32px rgba(227, 24, 55, 0.4) !important;
        }

        .enhanced-close {
          width: 48px !important;
          height: 48px !important;
          background: rgba(255, 255, 255, 0.2) !important;
          backdrop-filter: blur(15px) !important;
          border: 2px solid rgba(255, 255, 255, 0.3) !important;
        }

        .enhanced-close:hover {
          background: rgba(255, 255, 255, 0.3) !important;
          transform: rotate(90deg) scale(1.1) !important;
          border-color: rgba(255, 255, 255, 0.5) !important;
        }

        .enhanced-content {
          padding: 40px 35px !important;
          background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%) !important;
        }

        .enhanced-footer {
          padding: 30px 35px !important;
          background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%) !important;
          border-top: 2px solid rgba(227, 24, 55, 0.1) !important;
          gap: 20px !important;
        }

        .enhanced-close-btn {
          background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%) !important;
          border-radius: 16px !important;
          font-weight: 700 !important;
          box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4) !important;
        }

        .enhanced-close-btn:hover {
          background: linear-gradient(135deg, #7c8691 0%, #6a7278 100%) !important;
          transform: translateY(-3px) scale(1.02) !important;
          box-shadow: 0 8px 24px rgba(108, 117, 125, 0.5) !important;
        }

        .enhanced-save-btn {
          background: linear-gradient(135deg, #e31837 0%, #c41230 50%, #a50e26 100%) !important;
          border-radius: 16px !important;
          font-weight: 800 !important;
          box-shadow: 0 6px 20px rgba(227, 24, 55, 0.4) !important;
        }

        .enhanced-save-btn:hover {
          background: linear-gradient(135deg, #f31947 0%, #d41240 50%, #b50e36 100%) !important;
          transform: translateY(-3px) scale(1.02) !important;
          box-shadow: 0 8px 24px rgba(227, 24, 55, 0.5) !important;
        }

        @keyframes fadeInUpBounce {
          0% {
            opacity: 0;
            transform: translateY(40px) scale(0.9);
          }
          60% {
            opacity: 1;
            transform: translateY(-5px) scale(1.02);
          }
          80% {
            transform: translateY(2px) scale(0.99);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes slideInFromRight {
          0% {
            transform: translateX(100%) scale(0.8);
            opacity: 0;
          }
          60% {
            transform: translateX(-5%) scale(1.05);
            opacity: 1;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes slideInFromLeft {
          0% {
            transform: translateX(-100%) scale(0.8);
            opacity: 0;
          }
          60% {
            transform: translateX(5%) scale(1.05);
            opacity: 1;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default PreviewModal;
