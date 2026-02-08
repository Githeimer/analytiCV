/**
 * AI Suggestion Components
 * Consolidated tooltip and popover for AI feedback on resume blocks
 */

'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BlockWeakness, SuggestionPopoverProps } from '@/types/editor';

// ============================================================================
// Shared Styles
// ============================================================================

const severityStyles = {
  low: {
    // Tooltip (dark theme)
    tooltipBg: 'bg-blue-900',
    tooltipBorder: 'border-blue-700',
    tooltipText: 'text-blue-100',
    tooltipBadge: 'bg-blue-700 text-blue-100',
    // Popover (light theme)
    popoverBorder: 'border-blue-300',
    popoverBg: 'bg-blue-50',
    popoverBadge: 'bg-blue-100 text-blue-800',
    popoverIcon: 'text-blue-500',
  },
  medium: {
    tooltipBg: 'bg-yellow-900',
    tooltipBorder: 'border-yellow-700',
    tooltipText: 'text-yellow-100',
    tooltipBadge: 'bg-yellow-700 text-yellow-100',
    popoverBorder: 'border-yellow-300',
    popoverBg: 'bg-yellow-50',
    popoverBadge: 'bg-yellow-100 text-yellow-800',
    popoverIcon: 'text-yellow-500',
  },
  high: {
    tooltipBg: 'bg-red-900',
    tooltipBorder: 'border-red-700',
    tooltipText: 'text-red-100',
    tooltipBadge: 'bg-red-700 text-red-100',
    popoverBorder: 'border-red-300',
    popoverBg: 'bg-red-50',
    popoverBadge: 'bg-red-100 text-red-800',
    popoverIcon: 'text-red-500',
  },
};

// ============================================================================
// AISuggestionTooltip - Lightweight hover tooltip
// ============================================================================

interface AISuggestionTooltipProps {
  weakness: BlockWeakness;
  children: React.ReactNode;
  onRequestDetails?: () => void;
}

export const AISuggestionTooltip = memo(function AISuggestionTooltip({
  weakness,
  children,
  onRequestDetails,
}: AISuggestionTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const styles = severityStyles[weakness.severity];

  const updatePosition = useCallback(() => {
    if (!containerRef.current || !tooltipRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = containerRect.top - tooltipRect.height - 8;
    let left = containerRect.left + (containerRect.width - tooltipRect.width) / 2;

    // Flip to bottom if not enough space above
    if (top < 10) {
      top = containerRect.bottom + 8;
    }

    // Keep within horizontal viewport bounds
    if (left < 10) {
      left = 10;
    } else if (left + tooltipRect.width > viewportWidth - 10) {
      left = viewportWidth - tooltipRect.width - 10;
    }

    // Keep within vertical viewport bounds
    if (top + tooltipRect.height > viewportHeight - 10) {
      top = viewportHeight - tooltipRect.height - 10;
    }

    setPosition({ top, left });
  }, []);

  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      requestAnimationFrame(updatePosition);
    }, 300);
  }, [updatePosition]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible, updatePosition]);

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-[100] max-w-xs px-3 py-2 rounded-lg shadow-lg border ${styles.tooltipBg} ${styles.tooltipBorder} ${styles.tooltipText}`}
          style={{
            top: position.top,
            left: position.left,
            opacity: position.top === 0 ? 0 : 1,
            transition: 'opacity 0.15s ease-out',
          }}
          role="tooltip"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${styles.tooltipBadge}`}>
              {weakness.severity.toUpperCase()}
            </span>
          </div>

          {/* Issue */}
          <p className="text-sm font-medium mb-1">{weakness.issue}</p>

          {/* Quick suggestion preview */}
          <p className="text-xs opacity-80 line-clamp-2">{weakness.suggestion}</p>

          {/* View details link */}
          {onRequestDetails && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRequestDetails();
              }}
              className="mt-2 text-xs font-medium underline hover:no-underline opacity-80 hover:opacity-100"
            >
              Click for details
            </button>
          )}

          {/* Arrow indicator */}
          <div
            className={`absolute w-2 h-2 ${styles.tooltipBg} transform rotate-45 border-l border-t ${styles.tooltipBorder}`}
            style={{ bottom: -4, left: '50%', marginLeft: -4 }}
          />
        </div>
      )}
    </div>
  );
});

// ============================================================================
// SuggestionPopover - Full popover with actions
// ============================================================================

export const SuggestionPopover = memo(function SuggestionPopover({
  weakness,
  position,
  isVisible,
  onApply,
  onDismiss,
}: SuggestionPopoverProps) {
  const styles = severityStyles[weakness.severity];

  const getTransformOrigin = () => {
    switch (position.placement) {
      case 'top': return 'bottom center';
      case 'bottom': return 'top center';
      case 'left': return 'right center';
      case 'right': return 'left center';
      default: return 'center center';
    }
  };

  const getPositionStyles = () => {
    const offset = 12;
    switch (position.placement) {
      case 'top':
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: offset };
      case 'bottom':
        return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: offset };
      case 'left':
        return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: offset };
      case 'right':
        return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: offset };
      default:
        return { top: position.y, left: position.x };
    }
  };

  const getArrowStyles = () => {
    switch (position.placement) {
      case 'bottom':
        return { top: -6, left: '50%', marginLeft: -6 };
      case 'top':
        return { bottom: -6, left: '50%', marginLeft: -6, transform: 'rotate(-135deg)' };
      case 'right':
        return { left: -6, top: '50%', marginTop: -6, transform: 'rotate(-45deg)' };
      case 'left':
        return { right: -6, top: '50%', marginTop: -6, transform: 'rotate(135deg)' };
      default:
        return {};
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            ...getPositionStyles(),
            transformOrigin: getTransformOrigin(),
            position: 'absolute',
            zIndex: 100,
          }}
          className={`w-80 rounded-lg shadow-lg border ${styles.popoverBorder} ${styles.popoverBg} p-4`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className={`w-5 h-5 ${styles.popoverIcon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles.popoverBadge}`}>
                {weakness.severity.toUpperCase()}
              </span>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss suggestion"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Issue */}
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-800 mb-1">Issue</h4>
            <p className="text-sm text-gray-600">{weakness.issue}</p>
          </div>

          {/* Suggestion */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-1">Suggestion</h4>
            <p className="text-sm text-gray-600">{weakness.suggestion}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {weakness.improved_text && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onApply(weakness.improved_text || '')}
                className="flex-1 px-3 py-2 bg-[#007DE3] text-white text-sm font-medium rounded-md hover:bg-[#0066b8] transition-colors"
              >
                Apply Suggestion
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onDismiss}
              className="flex-1 px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Dismiss
            </motion.button>
          </div>

          {/* Arrow indicator */}
          <div
            className={`absolute w-3 h-3 ${styles.popoverBg} border-l border-t ${styles.popoverBorder} transform rotate-45`}
            style={getArrowStyles()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// Default export for backwards compatibility
export default { AISuggestionTooltip, SuggestionPopover };
