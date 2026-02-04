/**
 * SuggestionPopover Component
 * Displays AI suggestions for improving weak resume blocks
 * Uses framer-motion for smooth animations
 */

'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SuggestionPopoverProps } from '@/types/editor';

const severityStyles = {
  low: {
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-800',
    icon: 'text-blue-500',
  },
  medium: {
    border: 'border-yellow-300',
    bg: 'bg-yellow-50',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: 'text-yellow-500',
  },
  high: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    badge: 'bg-red-100 text-red-800',
    icon: 'text-red-500',
  },
};

const SuggestionPopover = memo(function SuggestionPopover({
  weakness,
  position,
  isVisible,
  onApply,
  onDismiss,
}: SuggestionPopoverProps) {
  const styles = severityStyles[weakness.severity];

  // Calculate transform origin based on placement
  const getTransformOrigin = () => {
    switch (position.placement) {
      case 'top':
        return 'bottom center';
      case 'bottom':
        return 'top center';
      case 'left':
        return 'right center';
      case 'right':
        return 'left center';
      default:
        return 'center center';
    }
  };

  // Calculate position offset based on placement
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
          className={`w-80 rounded-lg shadow-lg border ${styles.border} ${styles.bg} p-4`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg
                className={`w-5 h-5 ${styles.icon}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles.badge}`}>
                {weakness.severity.toUpperCase()}
              </span>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss suggestion"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
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
            className={`absolute w-3 h-3 ${styles.bg} border-l border-t ${styles.border} transform rotate-45`}
            style={{
              ...(position.placement === 'bottom' && { top: -6, left: '50%', marginLeft: -6 }),
              ...(position.placement === 'top' && { bottom: -6, left: '50%', marginLeft: -6, transform: 'rotate(-135deg)' }),
              ...(position.placement === 'right' && { left: -6, top: '50%', marginTop: -6, transform: 'rotate(-45deg)' }),
              ...(position.placement === 'left' && { right: -6, top: '50%', marginTop: -6, transform: 'rotate(135deg)' }),
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default SuggestionPopover;
