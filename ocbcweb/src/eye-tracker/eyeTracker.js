// import { useEffect, useState, useRef } from 'react';
// import './eyeTracker.css';

// function EyeTracker({ onFaceDetected, onFaceLost }) {
//   const [faceDetected, setFaceDetected] = useState(false);
//   const [isTracking, setIsTracking] = useState(false);
//   const [videoStream, setVideoStream] = useState(null);
//   const [gazePosition, setGazePosition] = useState({ x: 0, y: 0 });
//   const [smoothedGaze, setSmoothedGaze] = useState({ x: 0, y: 0 });
//   const [hoveredElement, setHoveredElement] = useState(null);
//   const [blinkDetected, setBlinkDetected] = useState(false);
//   const [dwellProgress, setDwellProgress] = useState(0);
  
//   const gazeHistoryRef = useRef([]);
//   const lastElementRef = useRef(null);
//   const stableCountRef = useRef(0);
//   const blinkCountRef = useRef(0);
//   const lastBlinkTimeRef = useRef(0);
//   const eyesClosedFramesRef = useRef(0);
//   const eyesOpenFramesRef = useRef(0);
//   const dwellTimerRef = useRef(null);
//   const dwellStartTimeRef = useRef(null);
//   const hoveredElementRef = useRef(null);   //to avoid stale state during blink
//   // Tunable parameters
//   const GAZE_HISTORY_SIZE = 8;
//   const MIN_STABLE_FRAMES = 4;
//   const HIT_AREA_EXPANSION = 50;
//   const BLINK_COOLDOWN = 800; // Increased cooldown
//   const EYES_CLOSED_THRESHOLD = 3; // Reduced - easier to trigger
//   const EYES_OPEN_THRESHOLD = 3; 
//   const DWELL_TIME = 1500; // Alternative: dwell for 1.5 seconds to click

//   // Start eye tracking
//   const startTracking = async () => {
//     if (isTracking) {
//       alert('Eye tracking is already active!');
//       return;
//     }

//     try {
//       const webgazer = (await import('webgazer')).default;

//       await webgazer
//         .setGazeListener((data, timestamp) => {
//           if (data == null) {
//             // Face/eyes not detected
//             eyesClosedFramesRef.current++;
//             eyesOpenFramesRef.current = 0;
            
//             // Only trigger blink if we had stable face detection before
//             if (faceDetected && 
//                 eyesClosedFramesRef.current >= EYES_CLOSED_THRESHOLD && 
//                 eyesClosedFramesRef.current <= EYES_CLOSED_THRESHOLD + 3) {
//               console.log('👁️ Potential blink detected (eyes closed)');
//             }
            
//             setFaceDetected(false);
//             if (onFaceLost) onFaceLost();
            
//           } else {
//             // Face detected
//             const wasEyesClosed = eyesClosedFramesRef.current >= EYES_CLOSED_THRESHOLD;
//             eyesOpenFramesRef.current++;
            
//             // UPDATED: blink confirmation
//             if (
//               wasEyesClosed &&
//               eyesOpenFramesRef.current >= EYES_OPEN_THRESHOLD
//             ) {
//               handleBlink();
//               eyesClosedFramesRef.current = 0;
//               eyesOpenFramesRef.current = 0;
//             }
            
//             setFaceDetected(true);
            
//             // Apply smoothing to gaze data
//             const smoothed = smoothGazeData(data.x, data.y);
//             setGazePosition({ x: Math.round(data.x), y: Math.round(data.y) });
//             setSmoothedGaze(smoothed);
            
//             if (onFaceDetected) onFaceDetected(data);
            
//             // Use smoothed gaze for interaction
//             handleGazeInteraction(smoothed.x, smoothed.y);
//           }
//         })
//         .begin();

//       webgazer.showVideoPreview(true);
//       webgazer.showFaceOverlay(true);
//       webgazer.showFaceFeedbackBox(true);

//       setTimeout(() => {
//         const videoElement = document.getElementById('webgazerVideoFeed');
//         if (videoElement && videoElement.srcObject) {
//           setVideoStream(videoElement.srcObject);
//         }
//       }, 1000);

//       setIsTracking(true);
//       console.log('✅ Eye tracking started - Blink to click enabled!');
//       console.log('💡 TIP: Look at a button until it highlights, then BLINK to click');
//       console.log('💡 ALTERNATIVE: Just keep looking at a button for 1.5 seconds to auto-click');

//     } catch (error) {
//       console.error('Eye tracking error:', error);
//       alert('Unable to access camera. Please check permissions.');
//     }
//   };

//   // Handle blink detection
//   const handleBlink = () => {
//     const now = Date.now();
    
//     // Check cooldown period
//     if (now - lastBlinkTimeRef.current < BLINK_COOLDOWN) {
//       console.log('⏳ Blink too soon, cooldown active');
//       return;
//     }
    
//     lastBlinkTimeRef.current = now;
    
//     // Visual feedback
//     setBlinkDetected(true);
//     setTimeout(() => setBlinkDetected(false), 300);
    
//     console.log('👁️💥 BLINK REGISTERED!');
    
//     // If hovering over an element, click it!
//     if (hoveredElementRef.current) {
//       triggerClick(hoveredElementRef.current);
//     } else {
//       console.log('❌ Blink detected but no hovered element');
//     }
//   };

//   // Smooth gaze data using moving average
//   const smoothGazeData = (x, y) => {
//     gazeHistoryRef.current.push({ x, y });

//     if (gazeHistoryRef.current.length > GAZE_HISTORY_SIZE) {
//       gazeHistoryRef.current.shift();
//     }

//     const avgX = gazeHistoryRef.current.reduce((sum, point) => sum + point.x, 0) / gazeHistoryRef.current.length;
//     const avgY = gazeHistoryRef.current.reduce((sum, point) => sum + point.y, 0) / gazeHistoryRef.current.length;

//     return { 
//       x: Math.round(avgX), 
//       y: Math.round(avgY) 
//     };
//   };

//   // Check if gaze is stable on an element
//   const isGazeStable = (element) => {
//     if (lastElementRef.current === element) {
//       stableCountRef.current++;
//     } else {
//       stableCountRef.current = 0;
//       lastElementRef.current = element;
//       // Reset dwell timer when switching elements
//       if (dwellTimerRef.current) {
//         clearTimeout(dwellTimerRef.current);
//         dwellTimerRef.current = null;
//       }
//       dwellStartTimeRef.current = null;
//       setDwellProgress(0);
//     }

//     return stableCountRef.current >= MIN_STABLE_FRAMES;
//   };

//   // Stop eye tracking
//   const stopTracking = async () => {
//     if (!isTracking) return;

//     try {
//       const webgazer = (await import('webgazer')).default;
//       webgazer.end();

//       if (videoStream) {
//         videoStream.getTracks().forEach(track => track.stop());
//         setVideoStream(null);
//       }

//       const videoElement = document.getElementById('webgazerVideoFeed');
//       if (videoElement && videoElement.srcObject) {
//         videoElement.srcObject.getTracks().forEach(track => track.stop());
//         videoElement.srcObject = null;
//       }

//       if (dwellTimerRef.current) {
//         clearTimeout(dwellTimerRef.current);
//       }

//       gazeHistoryRef.current = [];
//       stableCountRef.current = 0;
//       lastElementRef.current = null;
//       eyesClosedFramesRef.current = 0;
//       eyesOpenFramesRef.current = 0;
//       setIsTracking(false);
//       setFaceDetected(false);
//       setGazePosition({ x: 0, y: 0 });
//       setDwellProgress(0);
//       console.log('⏹ Eye tracking stopped');

//     } catch (error) {
//       console.error('Error stopping eye tracker:', error);
//     }
//   };

//   // Handle gaze interaction with stability check + dwell timer
// const handleGazeInteraction = (x, y) => {
//   // Scroll zones
//   const screenHeight = window.innerHeight;
//   const SCROLL_ZONE = 120;
//   const SCROLL_SPEED = 4;

//   if (y < SCROLL_ZONE) {
//     window.scrollBy(0, -SCROLL_SPEED);
//   } else if (y > screenHeight - SCROLL_ZONE) {
//     window.scrollBy(0, SCROLL_SPEED);
//   }

//   // Find clickable elements with expanded hit area
//   const elements = [];
  
//   elements.push(...document.elementsFromPoint(x, y));
  
//   for (let dx = -HIT_AREA_EXPANSION; dx <= HIT_AREA_EXPANSION; dx += HIT_AREA_EXPANSION) {
//     for (let dy = -HIT_AREA_EXPANSION; dy <= HIT_AREA_EXPANSION; dy += HIT_AREA_EXPANSION) {
//       const pointX = Math.max(0, Math.min(window.innerWidth, x + dx));
//       const pointY = Math.max(0, Math.min(window.innerHeight, y + dy));
//       elements.push(...document.elementsFromPoint(pointX, pointY));
//     }
//   }

//   // Filter for ACTUAL clickable elements (exclude root, App, containers)
//   const clickableElement = elements.find(el => {
//     // Skip root containers
//     if (el.id === 'root') {
//       return false;
//     }
    
//     // Check className safely (it might be a string or DOMTokenList)
//     const classNameStr = typeof el.className === 'string' ? el.className : el.className?.toString() || '';
//     if (classNameStr.includes('App')) {
//       return false;
//     }
    
//     // Skip the eye tracker itself
//     if (el.closest('.eye-tracker-container') || 
//         el.closest('.gaze-cursor') ||
//         el.classList.contains('eye-tracker-container') ||
//         el.classList.contains('gaze-cursor')) {
//       return false;
//     }
    
//     // Look for actual interactive elements
//     return (
//       el.tagName === 'BUTTON' || 
//       el.tagName === 'A' || 
//       el.tagName === 'INPUT' ||
//       el.tagName === 'SELECT' ||
//       el.classList.contains('clickable') ||
//       el.onclick !== null ||
//       el.role === 'button' ||
//       el.role === 'link' ||
//       el.getAttribute('tabindex') !== null ||
//       window.getComputedStyle(el).cursor === 'pointer'
//     );
//   });

//   if (clickableElement) {
//     if (isGazeStable(clickableElement)) {
//       if (hoveredElement !== clickableElement) {
//         // New stable element
//         if (hoveredElement) {
//           hoveredElement.classList.remove('gaze-hovered');
//         }
//         setHoveredElement(clickableElement);
//         hoveredElementRef.current = clickableElement;

//         clickableElement.classList.add('gaze-hovered');
//         console.log('🎯 Element hovered:', clickableElement.tagName, clickableElement.textContent?.substring(0, 30));
        
//         // Start dwell timer for auto-click
//         dwellStartTimeRef.current = Date.now();
//         startDwellTimer(clickableElement);
//       } else {
//         // Update dwell progress
//         if (dwellStartTimeRef.current) {
//           const elapsed = Date.now() - dwellStartTimeRef.current;
//           const progress = Math.min((elapsed / DWELL_TIME) * 100, 100);
//           setDwellProgress(progress);
//         }
//       }
//     }
//   } else {
//     // Not looking at anything clickable
//     if (hoveredElement) {
//       hoveredElement.classList.remove('gaze-hovered');
//       setHoveredElement(null);
//       hoveredElementRef.current = null;
//       console.log('👁️ Stopped looking at element');
//     }
//     if (dwellTimerRef.current) {
//       clearTimeout(dwellTimerRef.current);
//       dwellTimerRef.current = null;
//     }
//     dwellStartTimeRef.current = null;
//     setDwellProgress(0);
//     stableCountRef.current = 0;
//     lastElementRef.current = null;
//   }
// };

//   // Start dwell timer for auto-click
//   const startDwellTimer = (element) => {
//     if (dwellTimerRef.current) {
//       clearTimeout(dwellTimerRef.current);
//     }
    
//     dwellTimerRef.current = setTimeout(() => {
//       console.log('⏱️ Dwell time reached - auto clicking!');
//       triggerClick(element);
//     }, DWELL_TIME);
//   };

//   // Trigger click on element
//   const triggerClick = (element) => {
//     console.log('🎯 CLICK TRIGGERED on:', element.tagName, element.textContent?.substring(0, 30));
    
//     // Visual feedback
//     element.classList.add('gaze-clicked');
//     setTimeout(() => element.classList.remove('gaze-clicked'), 400);

//     // Trigger the actual click
//     element.dispatchEvent(
//       new MouseEvent('click', {
//         bubbles: true,
//         cancelable: true,
//         view: window,
//       })
//     );
    
//     // Remove hover state
//     element.classList.remove('gaze-hovered');
//     setHoveredElement(null);
//     stableCountRef.current = 0;
//     lastElementRef.current = null;
    
//     if (dwellTimerRef.current) {
//       clearTimeout(dwellTimerRef.current);
//       dwellTimerRef.current = null;
//     }
//     dwellStartTimeRef.current = null;
//     setDwellProgress(0);
//   };

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (isTracking) {
//         stopTracking();
//       }
//     };
//   }, [isTracking]);

//   return (
//     <div className="eye-tracker-container">
//       {/* Gaze Cursor */}
//       {isTracking && faceDetected && (
//         <div 
//           className={`gaze-cursor ${blinkDetected ? 'blink-flash' : ''}`}
//           style={{
//             left: `${smoothedGaze.x}px`,
//             top: `${smoothedGaze.y}px`,
//           }}
//         />
//       )}

//       {/* Control Buttons */}
//       <div className={`eye-tracker-controls ${isTracking ? 'tracking-mode' : ''}`}>
//         {!isTracking ? (
//           <button 
//             className="eye-tracker-btn start-btn"
//             onClick={startTracking}
//           >
//             <span className="btn-icon">👁️</span>
//             Enable Eye Tracking
//           </button>
//         ) : (
//           <button 
//             className="eye-tracker-btn stop-btn"
//             onClick={stopTracking}
//           >
//             <span className="btn-icon">⏹</span>
//             Disable Eye Tracking
//           </button>
//         )}
//       </div>

//       {/* Status Indicator */}
//       {isTracking && (
//         <div 
//           className={`eye-tracker-status ${faceDetected ? 'active' : 'inactive'}`}
//         >
//           <span className="eye-icon">👁</span>
//           <span>{faceDetected ? 'Tracking Active' : 'Face Not Detected'}</span>
//         </div>
//       )}

//       {/* Instructions */}
//       {isTracking && faceDetected && (
//         <div className="gaze-instructions">
//           <div className="instruction-main">👁️ BLINK to click OR wait 1.5s</div>
//           <div className="instruction-sub">
//             {hoveredElement ? '✅ Button ready - BLINK NOW!' : 'Look at a button to highlight it'}
//           </div>
//           {dwellProgress > 0 && (
//             <div style={{
//               marginTop: '8px',
//               height: '4px',
//               background: 'rgba(255,255,255,0.3)',
//               borderRadius: '2px',
//               overflow: 'hidden'
//             }}>
//               <div style={{
//                 width: `${dwellProgress}%`,
//                 height: '100%',
//                 background: '#4CAF50',
//                 transition: 'width 0.1s linear'
//               }} />
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

// export default EyeTracker;