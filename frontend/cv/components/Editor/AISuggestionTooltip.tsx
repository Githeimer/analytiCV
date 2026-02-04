/**
 * AISuggestionTooltip Component
 * Lightweight tooltip for showing AI feedback on hover
 * For quick hints without the full popover interaction
 */

'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import type { BlockWeakness } from '@/types/editor';

interface AISuggestionTooltipProps {
  weakness: BlockWeakness;
  children: React.ReactNode;
  onRequestDetails?: () => void;
}

const severityColors = {
  low: {
    bg: 'bg-blue-900',
    border: 'border-blue-700',
    text: 'text-blue-100',
    badge: 'bg-blue-700 text-blue-100',
  },
  medium: {
    bg: 'bg-yellow-900',
    border: 'border-yellow-700',
    text: 'text-yellow-100',
    badge: 'bg-yellow-700 text-yellow-100',
  },
  high: {
    bg: 'bg-red-900',
    border: 'border-red-700',
    text: 'text-red-100',
    badge: 'bg-red-700 text-red-100',
  },
};

const AISuggestionTooltip = memo(function AISuggestionTooltip({
  weakness,
  children,
  onRequestDetails,
}: AISuggestionTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const colors = severityColors[weakness.severity];

  // Calculate tooltip position
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

  // Show tooltip with delay
  const handleMouseEnter = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Update position after state change
      requestAnimationFrame(updatePosition);
    }, 300);
  }, [updatePosition]);

  // Hide tooltip
  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Update position when visible
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

      {/* Tooltip Portal */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-[100] max-w-xs px-3 py-2 rounded-lg shadow-lg border ${colors.bg} ${colors.border} ${colors.text}`}
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
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${colors.badge}`}>
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
            className={`absolute w-2 h-2 ${colors.bg} transform rotate-45 border-l border-t ${colors.border}`}
            style={{
              bottom: -4,
              left: '50%',
              marginLeft: -4,
            }}
          />
        </div>
      )}
    </div>
  );
});

export default AISuggestionTooltip;
