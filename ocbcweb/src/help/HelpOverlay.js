import React, { useState, useEffect, useRef, useCallback } from 'react';

const HelpOverlay = ({ steps, title, onClose, onNavigate, initialStep = 0 }) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [targetRect, setTargetRect] = useState(null);
  const [pendingStepIndex, setPendingStepIndex] = useState(null);
  const [isWaitingForTarget, setIsWaitingForTarget] = useState(false);
  const [isStepCompleted, setIsStepCompleted] = useState(false);
  const [isTargetDisabled, setIsTargetDisabled] = useState(false);
  const [tooltipSize, setTooltipSize] = useState({ width: 300, height: 150 });
  const overlayRef = useRef(null);
  const tooltipRef = useRef(null);
  const hasScrolledRef = useRef(false);
  const completionRef = useRef(false);
  const autoAdvanceRef = useRef(false);
  const currentStepRef = useRef(currentStep);

  const step = steps[currentStep];

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    completionRef.current = false;
    autoAdvanceRef.current = false;
    setIsStepCompleted(false);
  }, [step, currentStep]);

  // Memoize getTargetElement as it's used in effects
  const getTargetElement = useCallback((selector) => {
    if (!selector) return null;
    try {
      return document.querySelector(selector);
    } catch (error) {
      return null;
    }
  }, []);

  const checkForcedStep = useCallback(() => {
    const forcedIndex = steps.findIndex(
      (candidate) => candidate?.forceWhenVisible && candidate.target && getTargetElement(candidate.target)
    );

    if (forcedIndex === -1) return;
    if (forcedIndex === currentStepRef.current) return;

    setIsWaitingForTarget(false);
    setPendingStepIndex(null);
    setCurrentStep(forcedIndex);
  }, [steps, getTargetElement]);

  useEffect(() => {
    if (!tooltipRef.current) return;
    const element = tooltipRef.current;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width && rect.height) {
        setTooltipSize({ width: rect.width, height: rect.height });
      }
    };

    measure();

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(element);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [step, currentStep]);

  // Update step state (positioning, scrolling) and trigger re-renders
  const updateStepState = useCallback(() => {
    if (!step) return;

    const targetElement = getTargetElement(step.target);
    if (targetElement) {
      setTargetRect(targetElement.getBoundingClientRect());
      targetElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      checkForcedStep();
    } else {
      setTargetRect(null);
    }
    // Check for forced steps even if current target isn't found
    // But checkForcedStep uses getTargetElement internaly
    if (!targetElement) {
        checkForcedStep();
    }
  }, [step, getTargetElement, checkForcedStep]);

  useEffect(() => {
    // Initial position & state
    updateStepState();

    const observer = new MutationObserver(() => {
      updateStepState();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'data-disabled', 'class', 'style', 'hidden']
    });

    // Update on resize/scroll
    window.addEventListener('resize', updateStepState);
    window.addEventListener('scroll', updateStepState);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateStepState);
      window.removeEventListener('scroll', updateStepState);
    };
  }, [step, currentStep, updateStepState]);

  const findNextAvailableStep = (startIndex) => {
    let index = startIndex;
    console.log(`[HelpOverlay] Finding next step from index ${startIndex}`);
    while (index < steps.length) {
      const candidate = steps[index];
      if (!candidate) return null;
      
      const element = candidate.target ? getTargetElement(candidate.target) : null;
      console.log(`[HelpOverlay] Checking step ${index}:`, {
          target: candidate.target,
          found: !!element,
          skipIfMissing: candidate.skipIfMissing
      });

      if (!candidate.target) return index;
      if (element) return index;
      
      if (candidate.skipIfMissing) {
        console.log(`[HelpOverlay] Skipping step ${index} (missing + skipIfMissing)`);
        index += 1;
        continue;
      }
      
      console.log(`[HelpOverlay] Selected step ${index} (missing but required)`);
      return index;
    }
    return null;
  };

  useEffect(() => {
    hasScrolledRef.current = false;
  }, [currentStep]);


  useEffect(() => {
    if (!step || !step.target) {
      setTargetRect(null);
      setIsTargetDisabled(false); // Reset disabled state when target is missing
      return;
    }

    const updateStepState = () => {
      const element = getTargetElement(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        
        // Check disabled state
        const disabled = Boolean(
          element.disabled ||
          element.getAttribute('aria-disabled') === 'true' ||
          element.getAttribute('data-disabled') === 'true' ||
          element.classList.contains('disabled')
        );
        setIsTargetDisabled(disabled);
        
        // Scroll element into view
        if (!hasScrolledRef.current) {
          element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
          hasScrolledRef.current = true;
        }
        checkForcedStep();
        return true;
      } else {
        setTargetRect(null);
        // If element is gone, it's not disabled...
        setIsTargetDisabled(false);
      }
      return false;
    };

    // Initial position & state
    updateStepState();

    const observer = new MutationObserver(() => {
      updateStepState();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'data-disabled', 'class', 'style', 'hidden']
    });

    // Update on resize/scroll
    window.addEventListener('resize', updateStepState);
    window.addEventListener('scroll', updateStepState);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateStepState);
      window.removeEventListener('scroll', updateStepState);
    };
  }, [step, currentStep]);

  useEffect(() => {
    if (!step || !step.skipIfMissing || !step.target) return;

    if (getTargetElement(step.target)) return;

    const timeoutId = setTimeout(() => {
      if (getTargetElement(step.target)) return;
      const nextIndex = findNextAvailableStep(currentStep + 1);
      if (nextIndex === null) {
        onClose();
        return;
      }
      setCurrentStep(nextIndex);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [step, currentStep]);

  useEffect(() => {
    if (pendingStepIndex === null) return;
    const pendingStep = steps[pendingStepIndex];
    if (!pendingStep || !pendingStep.target) {
      setPendingStepIndex(null);
      setIsWaitingForTarget(false);
      return;
    }

    if (pendingStep.skipIfMissing && !getTargetElement(pendingStep.target)) {
      const nextIndex = findNextAvailableStep(pendingStepIndex + 1);
      if (nextIndex === null) {
        setPendingStepIndex(null);
        setIsWaitingForTarget(false);
        onClose();
        return;
      }
      setPendingStepIndex(nextIndex);
      return;
    }

    let rafId = null;
    const checkForTarget = () => {
      if (getTargetElement(pendingStep.target)) {
        setCurrentStep(pendingStepIndex);
        setPendingStepIndex(null);
        setIsWaitingForTarget(false);
        return;
      }
      rafId = requestAnimationFrame(checkForTarget);
    };

    rafId = requestAnimationFrame(checkForTarget);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [pendingStepIndex, steps]);

  const advanceToStepIndex = (nextIndex) => {
    if (nextIndex === null) {
      onClose();
      return;
    }

    const nextStep = steps[nextIndex];
    if (nextStep && nextStep.navigateTo) {
      window.location.href = nextStep.navigateTo;
      localStorage.setItem('helpOverlayState', JSON.stringify({
        title,
        steps,
        currentStep: nextIndex
      }));
      return;
    }

    if (nextStep?.target && !getTargetElement(nextStep.target)) {
      setIsWaitingForTarget(true);
      setPendingStepIndex(nextIndex);
      return;
    }

    setIsWaitingForTarget(false);
    setPendingStepIndex(null);
    setCurrentStep(nextIndex);
  };

  const handleNext = () => {
    const nextIndex = findNextAvailableStep(currentStep + 1);
    const needsUserCompletion = Boolean(step?.waitForSelectors?.length && !step?.action);
    
    if (step?.action === 'click') {
      handleStepClick();
      return;
    }

    // Check DOM directly to avoid stale state from isTargetDisabled
    const element = getTargetElement(step.target);
    const isElementDisabled = element && (
      element.disabled ||
      element.getAttribute('aria-disabled') === 'true' ||
      element.getAttribute('data-disabled') === 'true' ||
      element.classList.contains('disabled')
    );
    
    console.log('[HelpOverlay] handleNext:', {
       currentStep,
       target: step.target,
       isElementDisabled,
       needsUserCompletion,
       completionRef: completionRef.current
    });

    /* 
       BLOCKING CONDITION REMOVED
       If the user explicitly clicks "Next", we should allow them to proceed 
       even if the step action wasn't completed. 
       The waitForSelectors logic is mainly for auto-advancement or highlighting.
    */
    // if (needsUserCompletion && !completionRef.current && !isElementDisabled) {
    //   console.log('[HelpOverlay] BLOCKED: Waiting for user completion');
    //   return;
    // }
    
    // const nextIndex = findNextAvailableStep(currentStep + 1); // Removed duplicate
    console.log('[HelpOverlay] Next Index Calculated:', nextIndex);
    
    if (nextIndex !== null) {
        const nextStep = steps[nextIndex];
        console.log('[HelpOverlay] Next Step:', {
            index: nextIndex,
            target: nextStep.target, 
            exists: !!getTargetElement(nextStep.target),
            skipIfMissing: nextStep.skipIfMissing
        });
    }

    advanceToStepIndex(nextIndex);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsWaitingForTarget(false);
      setPendingStepIndex(null);
      setCurrentStep(prev => prev - 1);
    }
  };

  useEffect(() => {
    if (!step?.waitForSelectors?.length) return;

    const selectors = step.waitForSelectors;
    const handleCompletionClick = (event) => {
      if (completionRef.current) return;
      let target = event.target;
      if (!target) return;
      
      // Handle text nodes
      if (target.nodeType === 3) {
        target = target.parentNode;
      }

      if (!target || !target.closest) return;

      const matched = selectors.some((selector) => Boolean(target.closest(selector)));
      if (!matched) return;

      completionRef.current = true;
      setIsStepCompleted(true);

      if (!step.action) {
        const nextIndex = findNextAvailableStep(currentStepRef.current + 1);
        setTimeout(() => {
          advanceToStepIndex(nextIndex);
        }, 100);
      }
    };

    document.addEventListener('click', handleCompletionClick, true);
    return () => document.removeEventListener('click', handleCompletionClick, true);
  }, [step, steps]);

  const handleStepClick = () => {
    if (step.action === 'click' && step.target) {
      const element = getTargetElement(step.target);
      if (element) {
        // If this step has navigation, handle it
        if (step.navigateTo) {
          localStorage.setItem('helpOverlayState', JSON.stringify({
            title,
            steps,
            currentStep: currentStep + 1
          }));
          element.click();
          return;
        }
        
        element.click();
        // Move to next step after a short delay
        setTimeout(() => {
          if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
          } else {
            onClose();
          }
        }, 500);
      }
    }
  };

  // Track if target is disabled
  useEffect(() => {
    if (!step || !step.target) {
      setIsTargetDisabled(false);
      return;
    }

    const checkDisabled = () => {
      const element = getTargetElement(step.target);
      if (element) {
        const disabled = Boolean(
          element.disabled ||
          element.getAttribute('aria-disabled') === 'true' ||
          element.getAttribute('data-disabled') === 'true' ||
          element.classList.contains('disabled')
        );
        setIsTargetDisabled(disabled);
      }
    };

    checkDisabled();
    const observer = new MutationObserver(checkDisabled);
    const element = getTargetElement(step.target);
    
    if (element) {
      observer.observe(element, { 
        attributes: true, 
        attributeFilter: ['disabled', 'aria-disabled', 'data-disabled', 'class'] 
      });
    }

    return () => observer.disconnect();
  }, [step, currentStep]);

  useEffect(() => {
    const hasIntentSteps = steps.some((candidate) => candidate.intentKey);
    if (!hasIntentSteps) {
      return;
    }

    const handleChatbotTutorialProgress = (event) => {
      const intent = event?.detail?.intent;
      const currentIndex = currentStepRef.current;
      let nextIndex = null;

      if (intent) {
        const matchedIndex = steps.findIndex(
          (candidate, index) =>
            index >= currentIndex && candidate.intentKey === intent
        );
        if (matchedIndex !== -1) {
          nextIndex = findNextAvailableStep(matchedIndex + 1);
        }
      }

      if (nextIndex === null) {
        nextIndex = findNextAvailableStep(currentIndex + 1);
      }

      advanceToStepIndex(nextIndex);
    };

    window.addEventListener("chatbot:tutorial-progress", handleChatbotTutorialProgress);
    return () => {
      window.removeEventListener("chatbot:tutorial-progress", handleChatbotTutorialProgress);
    };
  }, [advanceToStepIndex, findNextAvailableStep, steps]);

  useEffect(() => {
    const handleAdvanceToTarget = (event) => {
      const targetSelector = event?.detail?.target;
      const fromTargets = event?.detail?.fromTargets;
      if (!targetSelector) return;

      if (Array.isArray(fromTargets) && fromTargets.length) {
        const current = steps[currentStepRef.current];
        if (!current || !fromTargets.includes(current.target)) {
          return;
        }
      }

      const currentIndex = currentStepRef.current;
      const matchedIndex = steps.findIndex(
        (candidate, index) => index >= currentIndex && candidate.target === targetSelector
      );

      if (matchedIndex === -1) return;
      advanceToStepIndex(matchedIndex);
    };

    window.addEventListener('help:advance-to-target', handleAdvanceToTarget);
    return () => {
      window.removeEventListener('help:advance-to-target', handleAdvanceToTarget);
    };
  }, [advanceToStepIndex, steps]);

  useEffect(() => {
    const handleSetStepByTarget = (event) => {
      const targetSelector = event?.detail?.target;
      if (!targetSelector) return;

      const matchedIndex = steps.findIndex((candidate) => candidate.target === targetSelector);
      if (matchedIndex === -1) return;

      const waitUntilVisible = () => {
        if (getTargetElement(targetSelector)) {
          setIsWaitingForTarget(false);
          setPendingStepIndex(null);
          setCurrentStep(matchedIndex);
          return true;
        }
        return false;
      };

      if (waitUntilVisible()) return;

      let rafId = null;
      const tick = () => {
        if (waitUntilVisible()) return;
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('help:set-step-by-target', handleSetStepByTarget);
    return () => {
      window.removeEventListener('help:set-step-by-target', handleSetStepByTarget);
    };
  }, [steps]);

  useEffect(() => {
    if (!step?.autoAdvanceToTarget) return;

    let rafId = null;
    const targetSelector = step.autoAdvanceToTarget;

    const checkForTarget = () => {
      const element = getTargetElement(targetSelector);
      if (element) {
        const currentIndex = currentStepRef.current;
        const matchedIndex = steps.findIndex(
          (candidate, index) => index >= currentIndex && candidate.target === targetSelector
        );

        if (matchedIndex !== -1) {
          advanceToStepIndex(matchedIndex);
          return;
        }
      }
      rafId = requestAnimationFrame(checkForTarget);
    };

    rafId = requestAnimationFrame(checkForTarget);
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [advanceToStepIndex, step, steps]);

  // Calculate tooltip position
  const getTooltipPlacement = () => {
    if (!targetRect) {
      return {
        style: {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        },
        position: 'center'
      };
    }

    const padding = 20;
    const tooltipWidth = tooltipSize.width || 300;
    const tooltipHeight = tooltipSize.height || 150;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
    const safeMargin = 10;
    const avoidPadding = 12;
    const preferred = step.position || 'bottom';
    const fallbackOrder = {
      top: ['top', 'bottom', 'left', 'right'],
      bottom: ['bottom', 'top', 'left', 'right'],
      left: ['left', 'right', 'top', 'bottom'],
      right: ['right', 'left', 'top', 'bottom'],
      center: ['bottom', 'top', 'right', 'left']
    };

    const computePosition = (position) => {
      switch (position) {
        case 'top':
          return {
            top: targetRect.top - tooltipHeight - padding,
            left: targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2)
          };
        case 'bottom':
          return {
            top: targetRect.bottom + padding,
            left: targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2)
          };
        case 'left':
          return {
            top: targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2),
            left: targetRect.left - tooltipWidth - padding
          };
        case 'right':
          return {
            top: targetRect.top + (targetRect.height / 2) - (tooltipHeight / 2),
            left: targetRect.right + padding
          };
        default:
          return {
            top: targetRect.bottom + padding,
            left: targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2)
          };
      }
    };

    const hasOverlap = (top, left) => {
      const tooltipRect = {
        top,
        left,
        right: left + tooltipWidth,
        bottom: top + tooltipHeight
      };
      const paddedTarget = {
        top: targetRect.top - avoidPadding,
        left: targetRect.left - avoidPadding,
        right: targetRect.right + avoidPadding,
        bottom: targetRect.bottom + avoidPadding
      };

      return !(
        tooltipRect.right < paddedTarget.left ||
        tooltipRect.left > paddedTarget.right ||
        tooltipRect.bottom < paddedTarget.top ||
        tooltipRect.top > paddedTarget.bottom
      );
    };

    const positions = fallbackOrder[preferred] || fallbackOrder.bottom;
    for (const position of positions) {
      const { top, left } = computePosition(position);
      const clampedTop = clamp(top, safeMargin, viewportHeight - tooltipHeight - safeMargin);
      const clampedLeft = clamp(left, safeMargin, viewportWidth - tooltipWidth - safeMargin);

      if (!hasOverlap(clampedTop, clampedLeft)) {
        return {
          style: { top: `${clampedTop}px`, left: `${clampedLeft}px` },
          position
        };
      }
    }

    const { top, left } = computePosition(preferred);
    const clampedTop = clamp(top, safeMargin, viewportHeight - tooltipHeight - safeMargin);
    const clampedLeft = clamp(left, safeMargin, viewportWidth - tooltipWidth - safeMargin);
    return {
      style: { top: `${clampedTop}px`, left: `${clampedLeft}px` },
      position: preferred
    };
  };

  // Calculate arrow position
  const getArrowStyle = (position) => {
    if (!targetRect || position === 'center') return { display: 'none' };
    
    switch (position) {
      case 'top':
        return {
          bottom: '-12px',
          left: '50%',
          transform: 'translateX(-50%) rotate(180deg)'
        };
      case 'bottom':
        return {
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          right: '-12px',
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)'
        };
      case 'right':
        return {
          left: '-12px',
          top: '50%',
          transform: 'translateY(-50%) rotate(90deg)'
        };
      default:
        return {
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)'
        };
    }
  };

  useEffect(() => {
    if (!step?.autoAdvanceWhenDisabled || !step.target) return;

    const element = getTargetElement(step.target);
    if (!element) return;

    const isDisabled = Boolean(
      element.disabled ||
      element.getAttribute('aria-disabled') === 'true' ||
      element.getAttribute('data-disabled') === 'true'
    );

    if (isDisabled && !autoAdvanceRef.current) {
      autoAdvanceRef.current = true;
      const nextIndex = findNextAvailableStep(currentStepRef.current + 1);
      setTimeout(() => {
        advanceToStepIndex(nextIndex);
      }, 150);
    }
  }, [step, currentStep, targetRect]);



  // Synchronously calculate disabled state for render consistency
  const getIsTargetDisabled = () => {
    if (!step || !step.target) return false;
    const element = getTargetElement(step.target);
    if (!element) return false;
    return Boolean(
      element.disabled ||
      element.getAttribute('aria-disabled') === 'true' ||
      element.getAttribute('data-disabled') === 'true' ||
      element.classList.contains('disabled')
    );
  };

  const isCurrentTargetDisabled = getIsTargetDisabled();

  const getStepText = () => {
    if (!step) return '';
    if (!step.target) return step.text;

    if (isCurrentTargetDisabled && step.textWhenDisabled) {
      return step.textWhenDisabled;
    }

    if (!isCurrentTargetDisabled && step.textWhenEnabled) {
      return step.textWhenEnabled;
    }

    return step.text;
  };

  const tooltipPlacement = getTooltipPlacement();

  // Determine if we should enable the next button despite waitForSelectors
  const shouldEnableNext = isCurrentTargetDisabled || (!step?.waitForSelectors?.length) || step?.action === 'click' || isStepCompleted;

  return (
    <div
      className="help-overlay"
      ref={overlayRef}
      style={{ pointerEvents: 'none' }}
    >
      {/* Darkened backdrop with spotlight cutout */}
      <svg 
        className="help-backdrop" 
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1999, pointerEvents: 'none' }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Highlighted element border */}
      {targetRect && (
        <div
          className="help-spotlight-border"
          onClick={handleStepClick}
          style={{
            position: 'fixed',
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            border: '3px solid #e31837',
            borderRadius: '12px',
            boxShadow: '0 0 0 4px rgba(227, 24, 55, 0.3), 0 0 30px rgba(227, 24, 55, 0.4)',
            zIndex: 2000,
            cursor: step.action === 'click' ? 'pointer' : 'default',
            pointerEvents: step.action === 'click' ? 'auto' : 'none',
            animation: 'pulse-spotlight 2s infinite'
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="help-tooltip"
        ref={tooltipRef}
        style={{
          position: 'fixed',
          ...tooltipPlacement.style,
          width: '300px',
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          zIndex: 2001,
          animation: 'fadeSlideIn 0.3s ease',
          pointerEvents: 'auto'
        }}
      >
        {/* Arrow */}
        <div
          className="tooltip-arrow"
          style={{
            position: 'absolute',
            ...getArrowStyle(tooltipPlacement.position),
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderBottom: '12px solid white'
          }}
        />

        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '12px' 
        }}>
          <span style={{ 
            fontSize: '12px', 
            color: '#e31837', 
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: '#999',
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Step content */}
        <p style={{ 
          margin: '0 0 16px', 
          fontSize: '15px', 
          color: '#333', 
          lineHeight: '1.5' 
        }}>
          {getStepText()}
        </p>
        {/* Warning text removed to prevent blocking */}
        
        {/* Progress & Navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {steps.map((_, index) => (
              <div
                key={index}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: index === currentStep ? '#e31837' : '#ddd',
                  transition: 'background 0.2s'
                }}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#666',
                  cursor: 'pointer'
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              /* disabled attribute removed to always allow clicking */
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: '8px',
                background: '#e31837', // Always red
                fontSize: '13px',
                fontWeight: '600',
                color: 'white',
                cursor: 'pointer' // Always pointer
              }}
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse-spotlight {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(227, 24, 55, 0.3), 0 0 30px rgba(227, 24, 55, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(227, 24, 55, 0.2), 0 0 50px rgba(227, 24, 55, 0.5);
          }
        }
        
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default HelpOverlay;
