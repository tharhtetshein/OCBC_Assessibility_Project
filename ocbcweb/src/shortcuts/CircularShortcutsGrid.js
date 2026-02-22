import React, { useState, useRef } from 'react';

const CircularShortcutsGrid = ({ 
  shortcuts, 
  onShortcutClick, 
  onAddClick, 
  showUsageCount = false, 
  largeTextMode = false,
  radius = 120, // Increased radius for better spacing and large text support
  isPreview = false, // New prop for preview mode
  allowSpinInPreview = false, // New prop to allow spinning in preview mode
  onShortcutInfo = null // New prop for info button callback
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [donutRotation, setDonutRotation] = useState(0);
  const [lastTouchAngle, setLastTouchAngle] = useState(0);
  const [isDonutTouching, setIsDonutTouching] = useState(false);
  const containerRef = useRef(null);

  // Maximum shortcuts per donut (back to 6)
  const SHORTCUTS_PER_DONUT = 6;
  const totalPages = Math.ceil((shortcuts.length + 1) / SHORTCUTS_PER_DONUT);

  // Get shortcuts for current page
  const getCurrentPageShortcuts = () => {
    const start = currentPage * SHORTCUTS_PER_DONUT;
    const end = start + SHORTCUTS_PER_DONUT;
    return shortcuts.slice(start, end);
  };

  const getIconDisplay = (shortcut) => {
    const iconSize = largeTextMode ? "32px" : "28px";
    return (
      <span className="material-icons" style={{ fontSize: iconSize, color: '#333' }}>
        {shortcut.icon}
      </span>
    );
  };

  // Calculate position for each shortcut in the donut
  const getDonutPosition = (index, total, centerX = 0, centerY = 0) => {
    // Start from top (-90 degrees) and distribute evenly
    const baseAngle = (index * 360 / total) - 90;
    const angle = baseAngle + donutRotation;
    const radian = (angle * Math.PI) / 180;
    
    const x = centerX + radius * Math.cos(radian);
    const y = centerY + radius * Math.sin(radian);
    
    return { x, y, angle };
  };

  // Calculate angle from center to touch point
  const getTouchAngle = (touch, centerX, centerY) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    
    const x = touch.clientX - rect.left - centerX;
    const y = touch.clientY - rect.top - centerY;
    return Math.atan2(y, x) * (180 / Math.PI);
  };

  // Handle donut spinning with touch
  const handleDonutTouchStart = (e) => {
    if (isPreview && !allowSpinInPreview) return; // Disable touch in preview mode unless allowed
    e.stopPropagation();
    setIsDonutTouching(true);
    const centerX = 170;
    const centerY = 170;
    const angle = getTouchAngle(e.touches[0], centerX, centerY);
    setLastTouchAngle(angle);
  };

  const handleDonutTouchMove = (e) => {
    if (!isDonutTouching || (isPreview && !allowSpinInPreview)) return; // Disable touch in preview mode unless allowed
    e.stopPropagation();
    
    const centerX = 170;
    const centerY = 170;
    const currentAngle = getTouchAngle(e.touches[0], centerX, centerY);
    const angleDiff = currentAngle - lastTouchAngle;
    
    // Handle angle wrap-around
    let adjustedDiff = angleDiff;
    if (angleDiff > 180) adjustedDiff -= 360;
    if (angleDiff < -180) adjustedDiff += 360;
    
    setDonutRotation(prev => prev + adjustedDiff);
    setLastTouchAngle(currentAngle);
  };

  const handleDonutTouchEnd = (e) => {
    if (isPreview && !allowSpinInPreview) return; // Disable touch in preview mode unless allowed
    e.stopPropagation();
    setIsDonutTouching(false);
  };

  const goToPage = (pageIndex) => {
    if (pageIndex === currentPage) return;
    setIsAnimating(true);
    setCurrentPage(pageIndex);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const pageShortcuts = getCurrentPageShortcuts();
  const showAddButton = pageShortcuts.length < SHORTCUTS_PER_DONUT;
  const totalItems = showAddButton ? pageShortcuts.length + 1 : pageShortcuts.length;

  return (
    <div style={{ maxWidth: "380px", margin: "0 auto 30px", position: "relative" }}>
      {/* Donut Container */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "340px",
          height: "340px",
          margin: "0 auto",
          perspective: "1000px"
        }}
      >
        {/* Donut Background - Professional styling with gradients and shadows */}
        <div 
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: `${radius * 2 + 100}px`,
            height: `${radius * 2 + 100}px`,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
            boxShadow: isAnimating 
              ? "0 20px 40px rgba(227, 24, 55, 0.15), 0 8px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)" 
              : isDonutTouching
                ? "0 12px 24px rgba(227, 24, 55, 0.2), 0 4px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)"
                : "0 8px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
            border: isDonutTouching 
              ? "2px solid rgba(227, 24, 55, 0.4)" 
              : "1px solid rgba(227, 24, 55, 0.1)",
            transition: isAnimating 
              ? "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" 
              : isDonutTouching
                ? "all 0.2s ease-out"
                : "all 0.3s ease",
            transform: isAnimating 
              ? "translate(-50%, -50%) scale(1.02)" 
              : isDonutTouching
                ? "translate(-50%, -50%) scale(0.98)"
                : "translate(-50%, -50%) scale(1)",
            transformStyle: "preserve-3d",
            cursor: isPreview && !allowSpinInPreview ? "default" : (isDonutTouching ? "grabbing" : "grab"),
            pointerEvents: isPreview && !allowSpinInPreview ? "none" : "auto", // Disable interactions in preview mode unless spinning allowed
            // Add subtle inner shadow for depth
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '10px',
              left: '10px',
              right: '10px',
              bottom: '10px',
              borderRadius: '50%',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }
          }}
          onTouchStart={handleDonutTouchStart}
          onTouchMove={handleDonutTouchMove}
          onTouchEnd={handleDonutTouchEnd}
        />

        {/* Donut Hole - Premium OCBC styling */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "110px",
          height: "110px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #e31837 0%, #c41230 50%, #a50e26 100%)",
          border: "3px solid rgba(255,255,255,0.2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `
            0 8px 16px rgba(227, 24, 55, 0.4),
            0 4px 8px rgba(0,0,0,0.2),
            inset 0 1px 0 rgba(255,255,255,0.3),
            inset 0 -1px 0 rgba(0,0,0,0.2)
          `,
          zIndex: 15,
          gap: "6px",
          // Add subtle animation
          animation: totalPages === 1 ? "subtlePulse 3s ease-in-out infinite" : "none"
        }}>
          {/* Page Navigation for Multiple Donuts */}
          {totalPages > 1 ? ( // Show navigation in preview mode too
            <>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  onClick={() => {
                    if (currentPage > 0) {
                      goToPage(currentPage - 1);
                    }
                  }}
                  disabled={currentPage === 0}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    border: "none",
                    background: currentPage === 0 
                      ? "rgba(255,255,255,0.2)" 
                      : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                    color: currentPage === 0 ? "rgba(255,255,255,0.4)" : "#e31837",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: currentPage === 0 ? "not-allowed" : "pointer",
                    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    boxShadow: currentPage === 0 
                      ? "none" 
                      : "0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
                    transform: "scale(1)"
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage > 0) {
                      e.currentTarget.style.transform = "scale(1.1)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = currentPage === 0 
                      ? "none" 
                      : "0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)";
                  }}
                >
                  <span className="material-icons" style={{ fontSize: "18px", fontWeight: "600" }}>
                    chevron_left
                  </span>
                </button>

                <button
                  onClick={() => {
                    if (currentPage < totalPages - 1) {
                      goToPage(currentPage + 1);
                    }
                  }}
                  disabled={currentPage === totalPages - 1}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    border: "none",
                    background: currentPage === totalPages - 1 
                      ? "rgba(255,255,255,0.2)" 
                      : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                    color: currentPage === totalPages - 1 ? "rgba(255,255,255,0.4)" : "#e31837",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: currentPage === totalPages - 1 ? "not-allowed" : "pointer",
                    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    boxShadow: currentPage === totalPages - 1 
                      ? "none" 
                      : "0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
                    transform: "scale(1)"
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage < totalPages - 1) {
                      e.currentTarget.style.transform = "scale(1.1)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = currentPage === totalPages - 1 
                      ? "none" 
                      : "0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)";
                  }}
                >
                  <span className="material-icons" style={{ fontSize: "18px", fontWeight: "600" }}>
                    chevron_right
                  </span>
                </button>
              </div>
              
              <div style={{ 
                fontSize: "11px", 
                color: "rgba(255,255,255,0.9)", 
                fontWeight: "700", 
                textAlign: "center",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                letterSpacing: "0.5px"
              }}>
                {currentPage + 1} of {totalPages}
              </div>
            </>
          ) : (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px"
            }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.2)"
              }}>
                <span className="material-icons" style={{ 
                  fontSize: "20px", 
                  color: "white",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                }}>
                  {isPreview ? "visibility" : "donut_large"}
                </span>
              </div>
              <div style={{ 
                fontSize: "9px", 
                color: "rgba(255,255,255,0.9)", 
                fontWeight: "600", 
                textAlign: "center",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                letterSpacing: "0.3px"
              }}>
                {isPreview ? "Preview" : "Touch & Spin"}
              </div>
            </div>
          )}
        </div>

        {/* Donut Shortcuts - Fixed positions, donut rotates behind them */}
        {pageShortcuts.map((shortcut, index) => {
          const position = getDonutPosition(index, totalItems, 170, 170);
          return (
            <div
              key={shortcut.id || index}
              className="donut-shortcut-item"
              onClick={() => !(isPreview && !allowSpinInPreview) && onShortcutClick && onShortcutClick(shortcut)} // Disable click in preview mode unless spinning allowed
              style={{
                position: "absolute",
                left: `${position.x - 35}px`,
                top: `${position.y - 35}px`,
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                border: "1px solid rgba(227, 24, 55, 0.1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: isPreview && !allowSpinInPreview ? "default" : "pointer", // Change cursor in preview mode
                transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
                animation: isAnimating ? `donutFadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.1}s both` : "none",
                zIndex: 20,
                transform: "translateZ(0)", // Hardware acceleration
                pointerEvents: isPreview && !allowSpinInPreview ? "none" : "auto" // Disable interactions in preview mode unless spinning allowed
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #ffffff 0%, #f0f8ff 100%)";
                e.currentTarget.style.transform = "translateZ(0) scale(1.1) translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(227, 24, 55, 0.15), 0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)";
                e.currentTarget.style.borderColor = "rgba(227, 24, 55, 0.3)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)";
                e.currentTarget.style.transform = "translateZ(0) scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)";
                e.currentTarget.style.borderColor = "rgba(227, 24, 55, 0.1)";
              }}
            >
              {showUsageCount && shortcut.usageCount > 0 && (
                <div style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  background: "linear-gradient(135deg, #e31837 0%, #c41230 100%)",
                  color: "white",
                  borderRadius: "12px",
                  padding: "3px 7px",
                  fontSize: "10px",
                  fontWeight: "700",
                  boxShadow: "0 2px 6px rgba(227, 24, 55, 0.4), 0 1px 2px rgba(0,0,0,0.2)",
                  border: "2px solid white",
                  zIndex: 25,
                  minWidth: "18px",
                  textAlign: "center",
                  letterSpacing: "0.3px"
                }}>
                  {shortcut.usageCount}
                </div>
              )}
              {onShortcutInfo && !isPreview && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShortcutInfo(shortcut);
                  }}
                  style={{
                    position: "absolute",
                    bottom: "-6px",
                    right: "-6px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: "2px solid white",
                    background: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 6px rgba(23, 162, 184, 0.3)",
                    zIndex: 25
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)";
                    e.currentTarget.style.background = "linear-gradient(135deg, #20c4e8 0%, #17a2b8 100%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.background = "linear-gradient(135deg, #17a2b8 0%, #138496 100%)";
                  }}
                >
                  <span className="material-icons" style={{ fontSize: "12px" }}>info</span>
                </button>
              )}
              <div className="shortcut-icon" style={{ marginBottom: "2px" }}>
                {getIconDisplay(shortcut)}
              </div>
              <div
                className="shortcut-label"
                style={{ 
                  fontSize: largeTextMode ? "9px" : "8px", 
                  fontWeight: "600", 
                  color: "#333",
                  textAlign: "center",
                  lineHeight: "1.1",
                  maxWidth: "60px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {shortcut.label}
              </div>
            </div>
          );
        })}

        {/* Add Button - Fixed position */}
        {showAddButton && !isPreview && ( // Hide Add button in preview mode
          <div
            className="donut-shortcut-item"
            onClick={onAddClick}
            style={{
              position: "absolute",
              left: `${getDonutPosition(pageShortcuts.length, totalItems, 170, 170).x - 35}px`,
              top: `${getDonutPosition(pageShortcuts.length, totalItems, 170, 170).y - 35}px`,
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ffffff 0%, #fef7f7 100%)",
              border: "2px dashed rgba(227, 24, 55, 0.4)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              boxShadow: "0 4px 12px rgba(227, 24, 55, 0.08), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
              animation: isAnimating ? `donutFadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${pageShortcuts.length * 0.1}s both` : "none",
              zIndex: 20,
              transform: "translateZ(0)"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #fef7f7 0%, #fce8e8 100%)";
              e.currentTarget.style.transform = "translateZ(0) scale(1.1) translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(227, 24, 55, 0.2), 0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)";
              e.currentTarget.style.borderColor = "rgba(227, 24, 55, 0.6)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #ffffff 0%, #fef7f7 100%)";
              e.currentTarget.style.transform = "translateZ(0) scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(227, 24, 55, 0.08), 0 2px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)";
              e.currentTarget.style.borderColor = "rgba(227, 24, 55, 0.4)";
            }}
          >
            <div
              className="shortcut-icon"
              style={{ fontSize: largeTextMode ? "32px" : "28px", color: "#e31837", marginBottom: "2px" }}
            >
              +
            </div>
            <div
              className="shortcut-label"
              style={{ 
                fontSize: largeTextMode ? "9px" : "8px", 
                fontWeight: "600", 
                color: "#e31837",
                textAlign: "center"
              }}
            >
              Add
            </div>
          </div>
        )}

        {/* Rotating Donut Visual Elements - Enhanced decorative ring */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) rotate(${donutRotation}deg)`,
          width: `${radius * 2 + 100}px`,
          height: `${radius * 2 + 100}px`,
          borderRadius: "50%",
          border: "4px dashed rgba(227, 24, 55, 0.3)",
          transition: isDonutTouching ? "none" : "transform 0.3s ease",
          zIndex: 5,
          pointerEvents: "none",
          // Add subtle gradient overlay
          background: `conic-gradient(
            from ${donutRotation}deg,
            transparent 0deg,
            rgba(227, 24, 55, 0.08) 60deg,
            transparent 120deg,
            rgba(227, 24, 55, 0.08) 180deg,
            transparent 240deg,
            rgba(227, 24, 55, 0.08) 300deg,
            transparent 360deg
          )`,
          mask: `radial-gradient(circle, transparent ${radius - 10}px, black ${radius - 5}px, black ${radius + 55}px, transparent ${radius + 60}px)`,
          WebkitMask: `radial-gradient(circle, transparent ${radius - 10}px, black ${radius - 5}px, black ${radius + 55}px, transparent ${radius + 60}px)`
        }} />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes donutFadeIn {
          0% {
            opacity: 0;
            transform: translateZ(0) scale(0.3) rotate(-180deg);
          }
          60% {
            opacity: 1;
            transform: translateZ(0) scale(1.1) rotate(10deg);
          }
          80% {
            transform: translateZ(0) scale(0.95) rotate(-5deg);
          }
          100% {
            opacity: 1;
            transform: translateZ(0) scale(1) rotate(0deg);
          }
        }

        @keyframes subtlePulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 
              0 8px 16px rgba(227, 24, 55, 0.4),
              0 4px 8px rgba(0,0,0,0.2),
              inset 0 1px 0 rgba(255,255,255,0.3),
              inset 0 -1px 0 rgba(0,0,0,0.2);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.02);
            box-shadow: 
              0 12px 24px rgba(227, 24, 55, 0.5),
              0 6px 12px rgba(0,0,0,0.25),
              inset 0 1px 0 rgba(255,255,255,0.4),
              inset 0 -1px 0 rgba(0,0,0,0.25);
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

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        /* Smooth hover effects */
        .donut-shortcut-item:hover {
          animation: none !important;
        }

        /* Hardware acceleration for smooth performance */
        .donut-shortcut-item {
          will-change: transform;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        /* Spinning animation */
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Professional gradient animations */
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
};

export default CircularShortcutsGrid;