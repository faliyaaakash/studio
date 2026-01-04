"use client";

import { useEffect, useRef } from 'react';

interface UseCheatingDetectionProps {
  onViolation: (count: number) => void;
  enabled?: boolean;
}

const useCheatingDetection = ({ onViolation, enabled = true }: UseCheatingDetectionProps) => {
  const violationCount = useRef(0);
  const isPageVisible = useRef(true);
  
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page became hidden
        isPageVisible.current = false;
        violationCount.current += 1;
        onViolation(violationCount.current);
      } else {
        // Page became visible
        isPageVisible.current = true;
      }
    };

    const handleBlur = () => {
       // Only trigger a violation on blur if the page was previously visible.
       // This prevents double-counting when visibilitychange also fires.
       // We use a timeout to give visibilitychange a moment to fire first.
      setTimeout(() => {
        if (isPageVisible.current && !document.hasFocus()) {
            isPageVisible.current = false; // Treat blur as making the page "not visible" for our logic
            violationCount.current += 1;
            onViolation(violationCount.current);
        }
      }, 300);
    };

    const handleFocus = () => {
        isPageVisible.current = true;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, onViolation]);
};

export default useCheatingDetection;
