/**
 * EditableBlock Component
 * ContentEditable div positioned precisely over PDF text blocks
 * Transparent text by default to show PDF underneath
 * Visible caret for editing, text shows on hover/focus/highlight
 * Uses FontMapper for correct font display matching PDF
 */

'use client';

import { memo, useRef, useCallback, useState, useEffect, useMemo } from 'react';
import type { EditableBlockProps, PopoverPosition } from '@/types/editor';
import SuggestionPopover from './SuggestionPopover';
import { getFontInfo, getFontWeightValue, getFontStyleValue } from '@/utils/fontMapper';

// Debounce utility for state updates
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface ExtendedEditableBlockProps extends EditableBlockProps {
  onBlockClick?: (blockId: string) => void;
}

const EditableBlock = memo(function EditableBlock({
  block,
  state,
  weakness,
  scale,
  onTextChange,
  onSelect,
  onApplySuggestion,
  onBlockClick,
}: ExtendedEditableBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [localText, setLocalText] = useState(state.currentText);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>({
    x: 0,
    y: 0,
    placement: 'right',
  });

  // Debounce text changes to prevent excessive re-renders
  const debouncedText = useDebounce(localText, 300);

  // Sync debounced text to parent state
  useEffect(() => {
    if (debouncedText !== state.currentText) {
      onTextChange(block.id, debouncedText);
    }
  }, [debouncedText, block.id, onTextChange, state.currentText]);

  // Calculate scaled position and dimensions
  const scaledX = block.x * scale;
  const scaledY = block.y * scale;
  const scaledWidth = block.width * scale;
  const scaledHeight = block.height * scale;
  const scaledFontSize = Math.max(8, block.font_size * scale);

  // Sync contenteditable with state when external changes occur
  useEffect(() => {
    if (contentRef.current && !isFocused) {
      const currentContent = contentRef.current.textContent || '';
      if (currentContent !== state.currentText) {
        contentRef.current.textContent = state.currentText;
        setLocalText(state.currentText);
      }
    }
  }, [state.currentText, isFocused]);

  // Sync local text when state changes externally (e.g., suggestion applied)
  useEffect(() => {
    if (!isFocused) {
      setLocalText(state.currentText);
    }
  }, [state.currentText, isFocused]);

  // Handle text input - update local state immediately, parent state is debounced
  const handleInput = useCallback(() => {
    if (contentRef.current) {
      const newText = contentRef.current.textContent || '';
      setLocalText(newText);
    }
  }, []);

  // Handle block click
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(block.id);

      // Notify parent about block click for sidebar sync
      if (onBlockClick) {
        onBlockClick(block.id);
      }

      // Show popover if there is a weakness
      if (weakness) {
        const rect = contentRef.current?.getBoundingClientRect();
        if (rect) {
          const viewportWidth = window.innerWidth;
          let placement: PopoverPosition['placement'] = 'right';

          if (rect.right + 320 > viewportWidth) {
            placement = 'left';
          }
          if (rect.top < 200) {
            placement = 'bottom';
          }

          setPopoverPosition({
            x: rect.left,
            y: rect.top,
            placement,
          });
          setShowPopover(true);
        }
      }
    },
    [block.id, onSelect, weakness, onBlockClick]
  );

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onSelect(block.id);
  }, [block.id, onSelect]);

  // Handle blur - immediately sync to parent
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Immediately update parent on blur to ensure state is saved
    if (localText !== state.currentText) {
      onTextChange(block.id, localText);
    }
  }, [localText, state.currentText, block.id, onTextChange]);

  // Handle applying suggestion
  const handleApplySuggestion = useCallback(
    (newText: string) => {
      if (contentRef.current) {
        contentRef.current.textContent = newText;
      }
      onApplySuggestion(block.id, newText);
      setShowPopover(false);
    },
    [block.id, onApplySuggestion]
  );

  // Handle dismissing popover
  const handleDismissPopover = useCallback(() => {
    setShowPopover(false);
  }, []);

  // Determine if text should be visible
  const shouldShowText = useMemo(() => {
    return isFocused || isHovered || weakness !== null || state.isDirty;
  }, [isFocused, isHovered, weakness, state.isDirty]);

  // Determine highlight styles based on state
  const getBlockStyles = useCallback(() => {
    let baseStyles = 'transition-all duration-150 rounded-sm';
    
    // Weakness highlighting with semi-transparent background
    if (weakness) {
      switch (weakness.severity) {
        case 'high':
          baseStyles += ' bg-red-200/30 ring-1 ring-red-400';
          break;
        case 'medium':
          baseStyles += ' bg-yellow-200/30 ring-1 ring-yellow-400';
          break;
        case 'low':
          baseStyles += ' bg-blue-200/30 ring-1 ring-blue-300';
          break;
      }
    }

    // Modified indicator
    if (state.isDirty && !weakness) {
      baseStyles += ' border-l-2 border-green-500 bg-green-50/30';
    }

    return baseStyles;
  }, [weakness, state.isDirty]);

  // Determine if font is bold based on font name - use FontMapper
  const fontInfo = useMemo(() => getFontInfo(block.font_name), [block.font_name]);
  const fontWeight = getFontWeightValue(fontInfo.weight);
  const fontStyle = getFontStyleValue(fontInfo.style);

  return (
    <div
      className="absolute"
      style={{
        left: scaledX,
        top: scaledY,
        width: scaledWidth,
        minHeight: scaledHeight,
        zIndex: isFocused ? 15 : 10,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Transparent Edit Layer - positioned exactly over PDF text */}
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        onClick={handleClick}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        spellCheck={false}
        className={`
          outline-none cursor-text px-0.5
          ${getBlockStyles()}
          hover:bg-blue-50/20 hover:ring-1 hover:ring-[#007DE3]/30
          focus:bg-white/50 focus:shadow-md focus:ring-2 focus:ring-[#007DE3]/50 focus:text-black
        `}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          fontSize: `${scaledFontSize}px`,
          fontFamily: fontInfo.displayFont,
          fontWeight: fontWeight,
          fontStyle: fontStyle,
          lineHeight: block.block_type === 'bullet' ? 1.3 : 1.15,
          letterSpacing: '-0.01em',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          minHeight: scaledHeight,
          // For edited blocks, keep text visible with white background
          // For non-edited blocks, transparent text shows PDF through
          color: (shouldShowText || state.isDirty) ? '#1a1a1a' : 'transparent',
          WebkitTextFillColor: (shouldShowText || state.isDirty) ? '#1a1a1a' : 'transparent',
          caretColor: '#000000',
          // Edited blocks: white background to hide canvas text beneath
          backgroundColor: state.isDirty ? 'rgba(255, 255, 255, 1)' : (weakness ? undefined : 'transparent'),
        }}
        data-block-id={block.id}
        data-block-type={block.block_type}
        data-block-section={block.section}
      >
        {localText}
      </div>

      {/* Weakness indicator badge */}
      {weakness && (
        <button
          onClick={handleClick}
          className={`
            absolute -right-2 -top-2 w-5 h-5 rounded-full flex items-center justify-center
            shadow-md cursor-pointer transition-transform hover:scale-110 z-20
            ${weakness.severity === 'high' ? 'bg-red-500' : ''}
            ${weakness.severity === 'medium' ? 'bg-yellow-500' : ''}
            ${weakness.severity === 'low' ? 'bg-blue-500' : ''}
          `}
          title={`${weakness.severity.charAt(0).toUpperCase() + weakness.severity.slice(1)} priority: ${weakness.issue}`}
        >
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 9v2m0 4h.01"
            />
          </svg>
        </button>
      )}

      {/* Suggestion Popover */}
      {weakness && showPopover && (
        <SuggestionPopover
          weakness={weakness}
          position={popoverPosition}
          isVisible={showPopover}
          onApply={handleApplySuggestion}
          onDismiss={handleDismissPopover}
        />
      )}
    </div>
  );
});

export default EditableBlock;
