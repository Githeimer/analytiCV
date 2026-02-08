/**
 * PDFRenderer Component - FIXED VERSION
 * Renders PDF pages as canvas using pdf.js with local worker
 * 
 * FIXES APPLIED:
 * - Race condition in isRenderingRef (try-finally pattern)
 * - Canvas context loss handling
 * - Stale closure prevention (callback refs)
 * - Proper render task cleanup
 * - Error recovery with retry mechanism
 * - Loading task cancellation
 * - Accessibility improvements
 * - Performance optimizations
 * - Type safety improvements
 */

'use client';

import { memo, useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { RenderParameters } from 'pdfjs-dist/types/src/display/api';

// Constants
const RENDER_CANCEL_DELAY_MS = 100;
const ERROR_RETRY_BASE_DELAY_MS = 1000;
const MAX_RETRY_ATTEMPTS = 3;

// Worker initialization tracking
const workerInitializedRef = { current: false };
const workerInitPromiseRef = { current: null as Promise<void> | null };

// Configure pdf.js worker with fallback to CDN if local file fails
if (typeof window !== 'undefined' && !workerInitPromiseRef.current) {
  const localWorkerPath = '/pdf.worker.min.js';
  const cdnWorkerPath = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerPath;
  
  workerInitPromiseRef.current = fetch(localWorkerPath, { method: 'HEAD' })
    .then(response => {
      if (!response.ok) {
        console.warn('Local PDF worker not found, using CDN fallback');
        pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorkerPath;
      }
      workerInitializedRef.current = true;
    })
    .catch(() => {
      console.warn('Local PDF worker check failed, using CDN fallback');
      pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorkerPath;
      workerInitializedRef.current = true;
    });
}

interface PDFRendererProps {
  pdfUrl: string;
  pageNumber: number;
  scale: number;
  onPageLoad?: (dimensions: { width: number; height: number }) => void;
  onRenderComplete?: () => void;
  onError?: (error: Error) => void;
}

interface ErrorState {
  message: string;
  canRetry: boolean;
}

const PDFRenderer = memo(function PDFRenderer({
  pdfUrl,
  pageNumber,
  scale,
  onPageLoad,
  onRenderComplete,
  onError,
}: PDFRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs to manage PDF.js lifecycle
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);
  const isRenderingRef = useRef<boolean>(false);
  const renderIdRef = useRef<number>(0);
  const currentPdfUrlRef = useRef<string>('');
  const prevDimensionsRef = useRef({ width: 0, height: 0 });

  // FIX #3: Callback refs to prevent stale closures
  const onPageLoadRef = useRef(onPageLoad);
  const onRenderCompleteRef = useRef(onRenderComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onPageLoadRef.current = onPageLoad;
  }, [onPageLoad]);

  useEffect(() => {
    onRenderCompleteRef.current = onRenderComplete;
  }, [onRenderComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // FIX #8: Reset state when URL changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    setLoadProgress(0);
  }, [pdfUrl]);

  // Helper to determine if error should auto-retry
  const shouldAutoRetry = useCallback((error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('timeout') ||
           message.includes('fetch') ||
           message.includes('load');
  }, []);

  // Helper to create structured error messages
  const createError = useCallback((context: string, error: unknown): string => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `Failed to ${context}: ${message}`;
  }, []);

  // Cancel any ongoing render task safely
  const cancelCurrentRender = useCallback(() => {
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // Ignore cancel errors
      }
      renderTaskRef.current = null;
    }
  }, []);

  // FIX #5: Retry mechanism
  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount(prev => prev + 1);
    // renderPage will be called via useEffect
  }, []);

  const renderPage = useCallback(async () => {
    // FIX #11: Wait for worker initialization
    if (workerInitPromiseRef.current && !workerInitializedRef.current) {
      await workerInitPromiseRef.current;
    }

    const currentRenderId = ++renderIdRef.current;
    
    if (!canvasRef.current || !pdfUrl) {
      isRenderingRef.current = false;
      return;
    }

    // Cancel any ongoing render
    cancelCurrentRender();

    // If already rendering, wait for cancellation
    if (isRenderingRef.current) {
      await new Promise(resolve => setTimeout(resolve, RENDER_CANCEL_DELAY_MS));
    }

    // Check if render is still valid
    if (currentRenderId !== renderIdRef.current) {
      return;
    }

    // FIX #1: Use try-finally to guarantee isRenderingRef cleanup
    try {
      isRenderingRef.current = true;
      setIsLoading(true);
      setError(null);
      setLoadProgress(0);

      // Load PDF document
      if (!pdfDocRef.current || currentPdfUrlRef.current !== pdfUrl) {
        if (pdfDocRef.current && currentPdfUrlRef.current !== pdfUrl) {
          pdfDocRef.current.destroy();
          pdfDocRef.current = null;
        }
        
        currentPdfUrlRef.current = pdfUrl;
        
        // FIX #12: Track loading task for cancellation
        loadingTaskRef.current = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
          cMapPacked: true,
        });

        // FIX #9: Progress tracking
        loadingTaskRef.current.onProgress = (progress: { loaded: number; total: number }) => {
          if (progress.total > 0) {
            const percent = (progress.loaded / progress.total) * 100;
            setLoadProgress(percent);
          }
        };

        pdfDocRef.current = await loadingTaskRef.current.promise;
        loadingTaskRef.current = null;
      }

      if (currentRenderId !== renderIdRef.current) return;

      const pdf = pdfDocRef.current;

      // Validate page number
      if (pageNumber < 1 || pageNumber > pdf.numPages) {
        throw new Error(`Invalid page number: ${pageNumber} (document has ${pdf.numPages} pages)`);
      }

      const page = await pdf.getPage(pageNumber);

      if (currentRenderId !== renderIdRef.current) return;

      // Calculate viewport
      const viewport = page.getViewport({ scale });

      // Get canvas and context
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas element not available');
      }

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Account for device pixel ratio
      const pixelRatio = window.devicePixelRatio || 1;
      const scaledWidth = viewport.width * pixelRatio;
      const scaledHeight = viewport.height * pixelRatio;

      // FIX #6: Only resize if dimensions changed
      const dimensionsChanged = 
        prevDimensionsRef.current.width !== scaledWidth ||
        prevDimensionsRef.current.height !== scaledHeight;

      if (dimensionsChanged) {
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        
        prevDimensionsRef.current = { width: scaledWidth, height: scaledHeight };
      }

      // Clear canvas and set transform
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.scale(pixelRatio, pixelRatio);

      // FIX #7: Render context for PDF.js
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        background: 'transparent',
        intent: 'display',
      } as Parameters<typeof page.render>[0];

      renderTaskRef.current = page.render(renderContext);
      
      await renderTaskRef.current.promise;

      if (currentRenderId !== renderIdRef.current) return;

      // FIX #4: Clean up in try block, also in finally
      renderTaskRef.current = null;

      // Notify parent
      if (onPageLoadRef.current) {
        onPageLoadRef.current({
          width: viewport.width,
          height: viewport.height,
        });
      }

      if (onRenderCompleteRef.current) {
        onRenderCompleteRef.current();
      }

      // FIX #5: Reset retry count on success
      setRetryCount(0);
      setIsLoading(false);

    } catch (err) {
      // Ignore cancellation errors
      if (err instanceof Error && err.name === 'RenderingCancelledException') {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to render PDF';
      const canRetry = retryCount < MAX_RETRY_ATTEMPTS;
      
      console.error('PDF render error:', err);
      setError({ message: errorMessage, canRetry });
      setIsLoading(false);

      // Notify parent of error
      if (onErrorRef.current && err instanceof Error) {
        onErrorRef.current(err);
      }

      // FIX #5: Auto-retry for recoverable errors
      if (canRetry && shouldAutoRetry(err)) {
        const delay = ERROR_RETRY_BASE_DELAY_MS * (retryCount + 1);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, delay);
      }

    } finally {
      // FIX #1: ALWAYS reset rendering flag
      isRenderingRef.current = false;
      
      // FIX #4: Clean up render task reference
      if (renderTaskRef.current) {
        renderTaskRef.current = null;
      }
    }
  }, [pdfUrl, pageNumber, scale, cancelCurrentRender, retryCount, shouldAutoRetry]);

  // Render when dependencies change
  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // FIX #2: Canvas context loss handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('Canvas context lost');
      setError({ 
        message: 'Canvas context lost. Attempting to restore...', 
        canRetry: true 
      });
    };

    const handleContextRestored = () => {
      console.log('Canvas context restored');
      setError(null);
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
      
      // FIX #12: Cancel loading task if in progress
      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy();
        } catch {
          // Ignore
        }
        loadingTaskRef.current = null;
      }
      
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {
          // Ignore
        }
        pdfDocRef.current = null;
      }
      
      currentPdfUrlRef.current = '';
      isRenderingRef.current = false;
    };
  }, [cancelCurrentRender]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full"
      role="img"
      aria-label={`PDF page ${pageNumber}`}
      aria-busy={isLoading}
    >
      {/* FIX #10: Loading overlay with accessibility */}
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-white z-20"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-3 border-[#007DE3] border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-gray-500 font-medium">
              {loadProgress > 0 && loadProgress < 100
                ? `Loading... ${Math.round(loadProgress)}%`
                : `Rendering PDF page ${pageNumber}...`}
            </p>
            <span className="sr-only">Loading, please wait</span>
          </div>
        </div>
      )}

      {/* FIX #10: Error display with accessibility and retry button */}
      {error && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20"
          role="alert"
          aria-live="assertive"
        >
          <div className="text-center p-6 max-w-md">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-red-600 font-medium mb-1">{error.message}</p>
            <p className="text-xs text-gray-500 mb-3">
              {retryCount > 0 && `Retry attempt ${retryCount} of ${MAX_RETRY_ATTEMPTS}`}
            </p>
            
            {/* FIX #5: Manual retry button */}
            {error.canRetry && (
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                aria-label="Retry rendering PDF"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Canvas for PDF rendering */}
      <canvas
        ref={canvasRef}
        className="block pointer-events-none"
        aria-hidden="true"
        style={{
          opacity: isLoading || error ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out',
        }}
      />
    </div>
  );
});

export default PDFRenderer;