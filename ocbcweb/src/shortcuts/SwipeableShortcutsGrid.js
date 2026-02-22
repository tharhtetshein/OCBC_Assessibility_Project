import React, { useState, useRef, useEffect } from 'react';

const SwipeableShortcutsGrid = ({ shortcuts, onShortcutClick, onAddClick, showUsageCount = false, largeTextMode = false }) => {
  const SHORTCUTS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const containerRef = useRef(null);

  // Calculate total pages
  const totalPages = Math.ceil((shortcuts.length + 1) / SHORTCUTS_PER_PAGE); // +1 for add button

  // Show swipe hint on first load if multiple pages
  useEffect(() => {
    const hasSeenHint = localStorage.getItem('hasSeenSwipeHint');
    if (!hasSeenHint && totalPages > 1) {
      setShowSwipeHint(true);
      setTimeout(() => {
        setShowSwipeHint(false);
        localStorage.setItem('hasSeenSwipeHint', 'true');
      }, 3000);
    }
  }, [totalPages]);
  
  // Get shortcuts for current page
  const getCurrentPageShortcuts = () => {
    const start = currentPage * SHORTCUTS_PER_PAGE;
    const end = start + SHORTCUTS_PER_PAGE;
    return shortcuts.slice(start, end);
  };

  const getIconDisplay = (shortcut) => {
    const iconSize = largeTextMode ? "50px" : "40px";
    
    // Use Material Icons consistently like in Customisation Page
    return <span className="material-icons" style={{ fontSize: iconSize, color: '#333' }}>{shortcut.icon}</span>;
  };

  // Handle touch events for swipe with live drag
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    
    // Calculate drag offset for live preview
    const offset = currentTouch - touchStart;
    // Get container width for mobile constraint
    const containerWidth = containerRef.current?.offsetWidth || 300;
    // Limit drag to 20% of container width to prevent layout issues in mobile
    const maxDrag = containerWidth * 0.2;
    const limitedOffset = Math.max(-maxDrag, Math.min(maxDrag, offset));
    setDragOffset(limitedOffset);
  };

  const handleTouchEnd = () => {
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
    
    // Reset animation flag after smoother transition
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToPage = (pageIndex) => {
    if (pageIndex === currentPage) return;
    setIsAnimating(true);
    setCurrentPage(pageIndex);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const pageShortcuts = getCurrentPageShortcuts();
  const showAddButton = pageShortcuts.length < SHORTCUTS_PER_PAGE;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto 30px", position: "relative", overflow: "hidden" }}>
      {/* Swipe Hint */}
      {showSwipeHint && totalPages > 1 && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 100,
          backgroundColor: "rgba(227, 24, 55, 0.95)",
          color: "white",
          padding: "15px 25px",
          borderRadius: "30px",
          fontSize: "14px",
          fontWeight: "600",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          animation: "pulse 1.5s infinite, fadeInUp 0.5s ease-out",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          pointerEvents: "none"
        }}>
          <span style={{ fontSize: "20px" }}>👆</span>
          Swipe to see more shortcuts
          <span style={{ fontSize: "20px" }}>👉</span>
        </div>
      )}

      {/* Swipeable Container */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          overflow: "hidden",
          position: "relative",
          isolation: "isolate",
          contain: "layout style paint",
          willChange: isDragging || isAnimating ? "transform" : "auto",
          width: "100%",
          maxWidth: "100%"
        }}
      >
        {/* Swipe Direction Indicators */}
        {isDragging && dragOffset > 30 && currentPage > 0 && (
          <div style={{
            position: "absolute",
            left: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            fontSize: "40px",
            color: "#e31837",
            animation: "slideInFromLeft 0.3s ease-out",
            pointerEvents: "none"
          }}>
            ◀
          </div>
        )}
        {isDragging && dragOffset < -30 && currentPage < totalPages - 1 && (
          <div style={{
            position: "absolute",
            right: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            fontSize: "40px",
            color: "#e31837",
            animation: "slideInFromRight 0.3s ease-out",
            pointerEvents: "none"
          }}>
            ▶
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "25px",
            padding: "25px",
            backgroundColor: "white",
            borderRadius: "15px",
            boxShadow: isAnimating 
              ? "0 12px 32px rgba(227, 24, 55, 0.2)" 
              : isDragging
                ? "0 8px 20px rgba(227, 24, 55, 0.15)"
                : "0 4px 12px rgba(0,0,0,0.08)",
            border: isDragging ? "2px solid rgba(227, 24, 55, 0.3)" : "1px solid #e0e0e0",
            transition: isAnimating 
              ? "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)" 
              : isDragging 
                ? "box-shadow 0.2s ease, border 0.2s ease"
                : "all 0.3s ease",
            transform: isDragging 
              ? `translate3d(${dragOffset}px, 0, 0) scale3d(0.99, 0.99, 1)` 
              : isAnimating 
                ? "translate3d(0, 0, 0) scale3d(1.005, 1.005, 1)" 
                : "translate3d(0, 0, 0) scale3d(1, 1, 1)",
            opacity: isDragging ? 0.95 : 1,
            willChange: isDragging || isAnimating ? "transform, opacity" : "auto",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            isolation: "isolate",
            width: "100%",
            boxSizing: "border-box"
          }}
        >
          {pageShortcuts.map((shortcut, index) => (
            <div
              key={shortcut.id || index}
              className="shortcut-item"
              data-shortcut={shortcut.id}
              onClick={() => onShortcutClick(shortcut)}
              style={{
                textAlign: "center",
                cursor: "pointer",
                padding: largeTextMode ? "12px 8px" : "15px 10px",
                borderRadius: "12px",
                transition: "all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                position: "relative",
                animation: isAnimating ? `fadeInUpBounce 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${index * 0.06}s both` : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: largeTextMode ? "100px" : "90px",
                willChange: "transform, background-color",
                backfaceVisibility: "hidden"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#f8f9fa";
                e.currentTarget.style.transform = "translate3d(0, -2px, 0)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.transform = "translate3d(0, 0, 0)";
              }}
            >
              {showUsageCount && shortcut.usageCount > 0 && (
                <div style={{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  backgroundColor: "#e31837",
                  color: "white",
                  borderRadius: "12px",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: "600",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                }}>
                  {shortcut.usageCount}
                </div>
              )}
              <div className="shortcut-icon" style={{ marginBottom: largeTextMode ? "10px" : "12px" }}>
                {getIconDisplay(shortcut)}
              </div>
              <div
                className="shortcut-label"
                style={{ 
                  fontSize: largeTextMode ? "16px" : "14px", 
                  fontWeight: largeTextMode ? "600" : "500", 
                  color: "#333",
                  lineHeight: "1.3",
                  wordBreak: "break-word",
                  maxWidth: "100%"
                }}
              >
                {shortcut.label}
              </div>
            </div>
          ))}

          {showAddButton && (
            <div
              className="shortcut-item"
              onClick={onAddClick}
              style={{
                textAlign: "center",
                cursor: "pointer",
                padding: "15px 10px",
                borderRadius: "12px",
                transition: "all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                animation: isAnimating ? `fadeInUp 0.4s ease-out ${pageShortcuts.length * 0.05}s both` : "none",
                willChange: "transform, background-color",
                backfaceVisibility: "hidden"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#f8f9fa";
                e.currentTarget.style.transform = "translate3d(0, -2px, 0)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.transform = "translate3d(0, 0, 0)";
              }}
            >
              <div
                className="shortcut-icon"
                style={{ fontSize: largeTextMode ? "50px" : "40px", marginBottom: "12px" }}
              >
                +
              </div>
              <div
                className="shortcut-label"
                style={{ 
                  fontSize: largeTextMode ? "18px" : "14px", 
                  fontWeight: largeTextMode ? "600" : "500", 
                  color: "#333",
                  lineHeight: largeTextMode ? "1.4" : "1.2"
                }}
              >
                Add
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page Indicators */}
      {totalPages > 1 && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px",
          marginTop: "15px"
        }}>
          {/* Previous Button */}
          <button
            onClick={() => {
              if (currentPage > 0) {
                goToPage(currentPage - 1);
              }
            }}
            disabled={currentPage === 0}
            style={{
              background: currentPage === 0 ? "#e0e0e0" : "#e31837",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: currentPage === 0 ? "not-allowed" : "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: currentPage === 0 ? "none" : "0 2px 8px rgba(227, 24, 55, 0.3)"
            }}
            onMouseEnter={(e) => {
              if (currentPage > 0) {
                e.currentTarget.style.transform = "scale(1.15)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(227, 24, 55, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = currentPage === 0 ? "none" : "0 2px 8px rgba(227, 24, 55, 0.3)";
            }}
          >
            <span className="material-icons" style={{ color: "white", fontSize: "20px" }}>
              chevron_left
            </span>
          </button>

          {/* Page Dots */}
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToPage(index)}
              style={{
                width: currentPage === index ? "28px" : "8px",
                height: "8px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: currentPage === index ? "#e31837" : "#d0d0d0",
                cursor: "pointer",
                transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                padding: 0,
                boxShadow: currentPage === index ? "0 2px 8px rgba(227, 24, 55, 0.4)" : "none",
                transform: currentPage === index ? "scale(1.1)" : "scale(1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = currentPage === index ? "scale(1.1)" : "scale(1)";
              }}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}

          {/* Next Button */}
          <button
            onClick={() => {
              if (currentPage < totalPages - 1) {
                goToPage(currentPage + 1);
              }
            }}
            disabled={currentPage === totalPages - 1}
            style={{
              background: currentPage === totalPages - 1 ? "#e0e0e0" : "#e31837",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: currentPage === totalPages - 1 ? "not-allowed" : "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: currentPage === totalPages - 1 ? "none" : "0 2px 8px rgba(227, 24, 55, 0.3)"
            }}
            onMouseEnter={(e) => {
              if (currentPage < totalPages - 1) {
                e.currentTarget.style.transform = "scale(1.15)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(227, 24, 55, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = currentPage === totalPages - 1 ? "none" : "0 2px 8px rgba(227, 24, 55, 0.3)";
            }}
          >
            <span className="material-icons" style={{ color: "white", fontSize: "20px" }}>
              chevron_right
            </span>
          </button>
        </div>
      )}

      {/* Page Counter */}
      {totalPages > 1 && (
        <div style={{
          textAlign: "center",
          marginTop: "10px",
          fontSize: largeTextMode ? "16px" : "13px",
          color: "#666",
          fontWeight: largeTextMode ? "600" : "500"
        }}>
          Page {currentPage + 1} of {totalPages}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeInUpBounce {
          0% {
            opacity: 0;
            transform: translate3d(0, 30px, 0) scale3d(0.95, 0.95, 1);
          }
          60% {
            opacity: 1;
            transform: translate3d(0, -2px, 0) scale3d(1.01, 1.01, 1);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate3d(0, 20px, 0) scale3d(0.98, 0.98, 1);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
          }
        }

        @keyframes slideInFromRight {
          0% {
            transform: translate3d(50px, -50%, 0) scale3d(0.9, 0.9, 1);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, -50%, 0) scale3d(1, 1, 1);
            opacity: 1;
          }
        }

        @keyframes slideInFromLeft {
          0% {
            transform: translate3d(-50px, -50%, 0) scale3d(0.9, 0.9, 1);
            opacity: 0;
          }
          100% {
            transform: translate3d(0, -50%, 0) scale3d(1, 1, 1);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale3d(1, 1, 1);
          }
          50% {
            transform: scale3d(1.05, 1.05, 1);
          }
        }

        /* Smooth hover effects */
        .shortcut-item:hover {
          animation: none !important;
        }

        /* Page indicator hover effect */
        button:hover {
          transform: scale3d(1.1, 1.1, 1);
        }
      `}</style>
    </div>
  );
};

export default SwipeableShortcutsGrid;
