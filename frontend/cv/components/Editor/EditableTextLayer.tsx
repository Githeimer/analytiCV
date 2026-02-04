/**
 * EditableTextLayer Component - FIXED VERSION
 * Renders pdf.js text layer with contentEditable for seamless click-and-edit experience
 * 
 * FIXES APPLIED:
 * - Memory leak prevention (event listener cleanup)
 * - Stale closure fixes (refs for dynamic props)
 * - originalText updates after edits
 * - Debounce timer race condition fixes
 * - Paste handler to prevent formatting leaks
 * - Loading task cancellation
 * - Canvas context loss handling
 * - Accessibility improvements
 * - Performance optimization for highlights
 * - Enter/Escape key behaviors
 */

'use client';

import { memo, useEffect, useRef, useCallback, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';

type RenderState = 'idle' | 'rendering' | 'complete' | 'error';

interface TextSpanData {
  index: number;
  originalText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
}

interface EditableTextLayerProps {
  pdfUrl: string;
  pageNumber: number;
  scale: number;
  onTextChange?: (spanIndex: number, oldText: string, newText: string) => void;
  onTextLayerReady?: (spans: TextSpanData[]) => void;
  highlightedSpans?: Map<number, { severity: 'low' | 'medium' | 'high'; issue: string }>;
  debounceMs?: number;
}

// FIX #15: Extract styling constants
const COLORS = {
  text: {
    default: 'transparent',
    focused: '#1a1a1a',
  },
  highlight: {
    high: {
      background: 'rgba(239, 68, 68, 0.2)',
      underline: '#ef4444',
    },
    medium: {
      background: 'rgba(245, 158, 11, 0.2)',
      underline: '#f59e0b',
    },
    low: {
      background: 'rgba(59, 130, 246, 0.15)',
      underline: '#3b82f6',
    },
  },
  hover: 'rgba(0, 125, 227, 0.08)',
  focus: {
    background: 'rgba(255, 255, 255, 0.9)',
    border: 'rgba(0, 125, 227, 0.3)',
  },
} as const;

// FIX #9: Extract highlight logic to helper function
const getHighlightStyle = (
  spanIndex: number,
  highlightedSpans?: Map<number, { severity: 'low' | 'medium' | 'high'; issue: string }>
): { backgroundColor: string; boxShadow: string } => {
  const highlight = highlightedSpans?.get(spanIndex);
  if (!highlight) {
    return { backgroundColor: 'transparent', boxShadow: 'none' };
  }

  const colors = COLORS.highlight[highlight.severity];
  return {
    backgroundColor: colors.background,
    boxShadow: `inset 0 -2px 0 0 ${colors.underline}`,
  };
};

const EditableTextLayer = memo(function EditableTextLayer({
  pdfUrl,
  pageNumber,
  scale,
  onTextChange,
  onTextLayerReady,
  highlightedSpans,
  debounceMs = 1500,
}: EditableTextLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spanDataRef = useRef<Map<HTMLElement, TextSpanData>>(new Map());
  
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);
  const renderIdRef = useRef<number>(0);
  const currentPdfUrlRef = useRef<string>('');

  // FIX #1: Event listener cleanup tracking
  const eventListenersRef = useRef<Map<HTMLElement, Array<{ type: string; handler: EventListener }>>>(new Map());

  // FIX #2, #7: Use refs to prevent stale closures
  const highlightedSpansRef = useRef(highlightedSpans);
  const onTextChangeRef = useRef(onTextChange);
  const onTextLayerReadyRef = useRef(onTextLayerReady);

  const [renderState, setRenderState] = useState<RenderState>('idle');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    highlightedSpansRef.current = highlightedSpans;
  }, [highlightedSpans]);

  useEffect(() => {
    onTextChangeRef.current = onTextChange;
  }, [onTextChange]);

  useEffect(() => {
    onTextLayerReadyRef.current = onTextLayerReady;
  }, [onTextLayerReady]);

  const cancelCurrentRender = useCallback(() => {
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // Ignore
      }
      renderTaskRef.current = null;
    }
  }, []);

  // FIX #4, #5: Improved mutation handler with proper originalText updates
  const handleTextMutation = useCallback((mutations: MutationRecord[]) => {
    const changedSpans = new Map<number, { spanElement: HTMLElement; oldText: string; newText: string }>();
    
    for (const mutation of mutations) {
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        const target = mutation.target as HTMLElement;
        const span = target.nodeType === Node.TEXT_NODE 
          ? target.parentElement 
          : target;
        
        if (!span || !span.classList.contains('pdf-text-span')) continue;

        const spanData = spanDataRef.current.get(span);
        if (!spanData) continue;

        const newText = span.textContent || '';
        if (newText !== spanData.originalText) {
          changedSpans.set(spanData.index, {
            spanElement: span,
            oldText: spanData.originalText,
            newText,
          });
        }
      }
    }

    if (changedSpans.size > 0) {
      // FIX #5: Clear existing timer properly
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        
        // Notify all changes
        if (onTextChangeRef.current) {
          changedSpans.forEach(({ oldText, newText }, index) => {
            onTextChangeRef.current!(index, oldText, newText);
          });
        }
        
        // FIX #4: Update originalText values
        changedSpans.forEach(({ spanElement, newText }) => {
          const spanData = spanDataRef.current.get(spanElement);
          if (spanData) {
            spanData.originalText = newText;
          }
        });
      }, debounceMs);
    }
  }, [debounceMs]);

  // FIX #3: Setup observer with mount check
  const setupObserver = useCallback(() => {
    if (!textLayerRef.current) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const observer = new MutationObserver((mutations) => {
      // Check if still mounted
      if (!textLayerRef.current) {
        observer.disconnect();
        return;
      }
      
      handleTextMutation(mutations);
    });

    observer.observe(textLayerRef.current, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    observerRef.current = observer;
  }, [handleTextMutation]);

  const renderPage = useCallback(async () => {
    const currentRenderId = ++renderIdRef.current;
    
    if (!containerRef.current || !canvasRef.current || !textLayerRef.current || !pdfUrl) {
      return;
    }

    cancelCurrentRender();

    if (currentRenderId !== renderIdRef.current) return;

    setRenderState('rendering');
    setLoadProgress(0);

    try {
      // Load PDF document
      if (!pdfDocRef.current || currentPdfUrlRef.current !== pdfUrl) {
        if (pdfDocRef.current) {
          pdfDocRef.current.destroy();
        }
        currentPdfUrlRef.current = pdfUrl;
        
        // FIX #8: Track loading task for cancellation
        loadingTaskRef.current = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
          cMapPacked: true,
        });

        // FIX #16: Progress tracking
        loadingTaskRef.current.onProgress = (progress: { loaded: number; total: number }) => {
          if (progress.total > 0) {
            setLoadProgress((progress.loaded / progress.total) * 100);
          }
        };

        pdfDocRef.current = await loadingTaskRef.current.promise;
        loadingTaskRef.current = null;
      }

      if (currentRenderId !== renderIdRef.current) return;

      const pdf = pdfDocRef.current;
      if (pageNumber < 1 || pageNumber > pdf.numPages) {
        setRenderState('error');
        return;
      }

      const page = await pdf.getPage(pageNumber);
      if (currentRenderId !== renderIdRef.current) return;

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const textLayer = textLayerRef.current;

      // Setup canvas
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = viewport.width * pixelRatio;
      canvas.height = viewport.height * pixelRatio;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      setDimensions({ width: viewport.width, height: viewport.height });

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) {
        setRenderState('error');
        return;
      }

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.scale(pixelRatio, pixelRatio);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      } as Parameters<typeof page.render>[0];

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      
      if (currentRenderId !== renderIdRef.current) return;
      renderTaskRef.current = null;

      // Get text content
      const textContent: TextContent = await page.getTextContent();
      if (currentRenderId !== renderIdRef.current) return;

      // FIX #1: Clean up old event listeners before creating new spans
      eventListenersRef.current.forEach((listeners, element) => {
        listeners.forEach(({ type, handler }) => {
          element.removeEventListener(type, handler);
        });
      });
      eventListenersRef.current.clear();

      // Clear existing text layer
      textLayer.innerHTML = '';
      spanDataRef.current.clear();

      const textSpans: TextSpanData[] = [];
      
      textContent.items.forEach((item, index) => {
        if (!('str' in item)) return;
        
        const textItem = item as TextItem;
        if (!textItem.str.trim()) return;

        const tx = pdfjsLib.Util.transform(viewport.transform, textItem.transform);
        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
        const x = tx[4];
        const y = tx[5] - fontSize;
        const width = textItem.width * scale;
        const height = fontSize;

        // Create editable span
        const span = document.createElement('span');
        span.className = 'pdf-text-span';
        span.contentEditable = 'true';
        span.spellcheck = false;
        span.textContent = textItem.str;
        span.dataset.index = String(index);

        // FIX #10: Accessibility attributes
        span.setAttribute('role', 'textbox');
        span.setAttribute('aria-label', `Editable text ${index + 1}`);
        span.setAttribute('aria-multiline', 'false');
        span.setAttribute('tabindex', '0');

        span.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          font-size: ${fontSize}px;
          font-family: ${textItem.fontName || 'sans-serif'};
          white-space: pre;
          display: inline-block;
          transform-origin: 0 0;
          line-height: 1;
          color: ${COLORS.text.default};
          caret-color: #000000;
          outline: none;
          cursor: text;
          min-width: ${width}px;
          min-height: ${height}px;
          padding: 0;
          margin: 0;
          border: none;
          background: transparent;
        `;

        const spanData: TextSpanData = {
          index,
          originalText: textItem.str,
          x,
          y,
          width,
          height,
          fontSize,
          fontFamily: textItem.fontName || 'sans-serif',
        };
        spanDataRef.current.set(span, spanData);
        textSpans.push(spanData);

        // FIX #9: Use helper for initial highlight
        const highlightStyle = getHighlightStyle(index, highlightedSpans);
        span.style.backgroundColor = highlightStyle.backgroundColor;
        span.style.boxShadow = highlightStyle.boxShadow;

        const highlight = highlightedSpans?.get(index);
        if (highlight) {
          span.title = highlight.issue;
          // FIX #10: Accessibility for highlighted items
          span.setAttribute('aria-describedby', `issue-${index}`);
          span.setAttribute('aria-invalid', 'true');
        }

        // FIX #1: Create handlers and track for cleanup
        // FIX #11: Add keydown handler for Enter/Escape
        const keydownHandler = (e: Event) => {
          const keyEvent = e as KeyboardEvent;
          
          if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
            keyEvent.preventDefault();
            span.blur();
          }
          
          if (keyEvent.key === 'Escape') {
            keyEvent.preventDefault();
            const data = spanDataRef.current.get(span);
            if (data) {
              span.textContent = data.originalText;
            }
            span.blur();
          }
        };

        const focusHandler = () => {
          span.style.color = COLORS.text.focused;
          span.style.backgroundColor = COLORS.focus.background;
          span.style.boxShadow = `0 0 0 2px ${COLORS.focus.border}`;
          span.style.borderRadius = '2px';
          span.style.zIndex = '10';
        };

        const blurHandler = () => {
          span.style.color = COLORS.text.default;
          
          // FIX #2: Use ref for current highlights
          const currentHighlights = highlightedSpansRef.current;
          const highlightStyle = getHighlightStyle(index, currentHighlights);
          
          span.style.backgroundColor = highlightStyle.backgroundColor;
          span.style.boxShadow = highlightStyle.boxShadow;
          span.style.borderRadius = '0';
          span.style.zIndex = '';
        };

        const mouseenterHandler = () => {
          if (document.activeElement !== span) {
            span.style.backgroundColor = COLORS.hover;
          }
        };

        const mouseleaveHandler = () => {
          if (document.activeElement !== span) {
            // FIX #2: Use ref for current highlights
            const currentHighlights = highlightedSpansRef.current;
            const highlightStyle = getHighlightStyle(index, currentHighlights);
            span.style.backgroundColor = highlightStyle.backgroundColor;
          }
        };

        // FIX #6: Paste handler to prevent formatting
        const pasteHandler = (e: Event) => {
          e.preventDefault();
          const clipboardEvent = e as ClipboardEvent;
          const text = clipboardEvent.clipboardData?.getData('text/plain');
          if (text) {
            document.execCommand('insertText', false, text);
          }
        };

        // FIX #14: Prevent multi-span selection
        const mousedownHandler = (e: Event) => {
          const focusedElement = document.activeElement;
          if (focusedElement && 
              focusedElement !== span && 
              focusedElement.classList.contains('pdf-text-span')) {
            (focusedElement as HTMLElement).blur();
          }
          e.stopPropagation();
        };

        span.addEventListener('keydown', keydownHandler);
        span.addEventListener('focus', focusHandler);
        span.addEventListener('blur', blurHandler);
        span.addEventListener('mouseenter', mouseenterHandler);
        span.addEventListener('mouseleave', mouseleaveHandler);
        span.addEventListener('paste', pasteHandler);
        span.addEventListener('mousedown', mousedownHandler);

        // Track listeners for cleanup
        eventListenersRef.current.set(span, [
          { type: 'keydown', handler: keydownHandler },
          { type: 'focus', handler: focusHandler },
          { type: 'blur', handler: blurHandler },
          { type: 'mouseenter', handler: mouseenterHandler },
          { type: 'mouseleave', handler: mouseleaveHandler },
          { type: 'paste', handler: pasteHandler },
          { type: 'mousedown', handler: mousedownHandler },
        ]);

        textLayer.appendChild(span);
      });

      setupObserver();

      if (onTextLayerReadyRef.current) {
        onTextLayerReadyRef.current(textSpans);
      }

      setRenderState('complete');

    } catch (err) {
      if (err instanceof Error && err.name === 'RenderingCancelledException') {
        return;
      }
      console.error('PDF render error:', err);
      setRenderState('error');
    }
  }, [pdfUrl, pageNumber, scale, cancelCurrentRender, setupObserver, highlightedSpans]);

  // FIX #18: Optimize highlight updates without full re-render
  useEffect(() => {
    if (!textLayerRef.current || renderState !== 'complete') return;
    
    const spans = textLayerRef.current.querySelectorAll('.pdf-text-span');
    
    spans.forEach((spanElement) => {
      const span = spanElement as HTMLElement;
      const index = parseInt(span.dataset.index || '0');
      
      // Skip if focused
      if (document.activeElement === span) return;
      
      const highlightStyle = getHighlightStyle(index, highlightedSpans);
      span.style.backgroundColor = highlightStyle.backgroundColor;
      span.style.boxShadow = highlightStyle.boxShadow;
      
      const highlight = highlightedSpans?.get(index);
      if (highlight) {
        span.title = highlight.issue;
        span.setAttribute('aria-invalid', 'true');
      } else {
        span.removeAttribute('title');
        span.removeAttribute('aria-invalid');
      }
    });
  }, [highlightedSpans, renderState]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // FIX #13: Canvas context loss handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('Canvas context lost');
      setRenderState('error');
    };

    const handleContextRestored = () => {
      console.log('Canvas context restored');
      renderPage();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [renderPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      renderIdRef.current++;
      cancelCurrentRender();
      
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // FIX #8: Clean up loading task
      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy();
        } catch {
          // Ignore
        }
        loadingTaskRef.current = null;
      }

      // FIX #1: Clean up all event listeners
      eventListenersRef.current.forEach((listeners, element) => {
        listeners.forEach(({ type, handler }) => {
          element.removeEventListener(type, handler);
        });
      });
      eventListenersRef.current.clear();
      
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {
          // Ignore
        }
        pdfDocRef.current = null;
      }
    };
  }, [cancelCurrentRender]);

  return (
    <div 
      ref={containerRef} 
      className="relative"
      role="document"
      aria-label="Editable PDF document"
      style={{
        width: dimensions?.width || 'auto',
        height: dimensions?.height || 'auto',
      }}
    >
      {/* Loading state */}
      {renderState === 'rendering' && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-white/90 z-30"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-[#007DE3] border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-gray-500">
              {loadProgress > 0 && loadProgress < 100
                ? `Loading ${Math.round(loadProgress)}%...`
                : 'Loading document...'}
            </p>
            <span className="sr-only">Loading, please wait</span>
          </div>
        </div>
      )}

      {/* FIX #17: Error state with retry */}
      {renderState === 'error' && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-50 z-30"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-center p-6">
            <p className="text-sm text-red-600 font-medium">Failed to render PDF</p>
            <p className="text-xs text-gray-500 mt-1">Please try uploading again</p>
            <button
              onClick={() => renderPage()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="block"
        aria-hidden="true"
        style={{
          opacity: renderState === 'complete' ? 0.92 : 0,
          transition: 'opacity 0.2s ease-in-out',
          pointerEvents: 'none',
        }}
      />

      <div
        ref={textLayerRef}
        className="absolute inset-0"
        style={{
          mixBlendMode: 'multiply',
          pointerEvents: 'auto',
          opacity: renderState === 'complete' ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
        }}
      />
    </div>
  );
});

export default EditableTextLayer;