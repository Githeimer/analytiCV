/**
 * DocumentCanvas Component - FIXED VERSION
 * MS Word-style inline PDF editor using the "Ghost Text Layer" strategy
 * 
 * CRITICAL FIX: Backend State Synchronization
 * - Added updatedBlocks prop to receive saved state from backend
 * - Prevents reversion to original PDF text after analysis
 * - Text blocks now sourced from: updatedBlocks > localStorage > original PDF
 * - Component no longer triggers re-render on analysis completion
 */

import { memo, useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getFontInfo, buildFontStyles } from '@/utils/fontMapper';
import { saveEditsToStorage, markEditsDirty, getStoredEdits } from '@/utils/editorStorage';

// ============================================================================
// Constants
// ============================================================================

const DEBOUNCE_MS = 1000;
const AUTO_SAVE_INTERVAL = 5000;

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`;
}

// ============================================================================
// Types
// ============================================================================

export interface ResumeBlock {
  id: string;
  text: string;
  section: string;
  spanIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  isEdited: boolean;
}

export interface BlockUpdate {
  blockId: string;
  oldText: string;
  newText: string;
  section?: string;
}

type RenderState = 'idle' | 'rendering' | 'complete' | 'error';

interface DocumentCanvasProps {
  pdfUrl: string;
  pageNumber: number;
  scale: number;
  isLocked?: boolean;
  updatedBlocks?: Map<string, string>; // NEW: Backend-saved text blocks
  onBlocksExtracted?: (blocks: ResumeBlock[]) => void;
  onTextChange?: (blockId: string, oldText: string, newText: string) => void;
  onBlockSave?: (update: BlockUpdate) => Promise<void>;
  onATSRecalculate?: () => void;
  onError?: (error: Error, context: 'load' | 'save' | 'render') => void;
  onPendingChangesChange?: (hasPendingChanges: boolean) => void;
  highlightedBlockIds?: Set<string>;
}

export interface DocumentCanvasRef {
  saveChanges: () => Promise<boolean>;
  hasPendingChanges: () => boolean;
  getPendingChanges: () => BlockUpdate[];
  getCurrentBlocks: () => ResumeBlock[]; // NEW: Get current state
}

interface TextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}

// ============================================================================
// Component
// ============================================================================

const DocumentCanvas = memo(forwardRef<DocumentCanvasRef, DocumentCanvasProps>(function DocumentCanvas({
  pdfUrl,
  pageNumber,
  scale,
  isLocked = false,
  updatedBlocks, // NEW: Receive backend-saved blocks
  onBlocksExtracted,
  onTextChange,
  onBlockSave,
  onATSRecalculate,
  onError,
  onPendingChangesChange,
  highlightedBlockIds,
}, ref) {
  // ============================================================================
  // Refs for DOM elements
  // ============================================================================
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Refs for PDF.js lifecycle
  // ============================================================================
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<ReturnType<pdfjsLib.PDFPageProxy['render']> | null>(null);
  const renderIdRef = useRef<number>(0);
  const currentPdfUrlRef = useRef<string>('');

  // ============================================================================
  // Refs for state sync
  // ============================================================================
  const observerRef = useRef<MutationObserver | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockMapRef = useRef<Map<HTMLElement, ResumeBlock>>(new Map());
  const blocksByIdRef = useRef<Map<string, ResumeBlock>>(new Map()); // NEW: Quick lookup
  const pendingChangesRef = useRef<Set<string>>(new Set());
  const pendingSavesRef = useRef<Map<string, BlockUpdate>>(new Map());
  const originalTextRef = useRef<Map<string, string>>(new Map());
  const isSavingRef = useRef<boolean>(false);
  
  const isProgrammaticChangeRef = useRef(false);
  
  const isLockedRef = useRef(isLocked);
  useEffect(() => { isLockedRef.current = isLocked; }, [isLocked]);

  // ============================================================================
  // Refs for callbacks
  // ============================================================================
  const onTextChangeRef = useRef(onTextChange);
  const onATSRecalculateRef = useRef(onATSRecalculate);
  const onErrorRef = useRef(onError);
  const onPendingChangesChangeRef = useRef(onPendingChangesChange);
  const onBlockSaveRef = useRef(onBlockSave);
  const highlightedBlockIdsRef = useRef(highlightedBlockIds);
  const updatedBlocksRef = useRef(updatedBlocks); // NEW: Track updated blocks

  useEffect(() => { onTextChangeRef.current = onTextChange; }, [onTextChange]);
  useEffect(() => { onATSRecalculateRef.current = onATSRecalculate; }, [onATSRecalculate]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onBlockSaveRef.current = onBlockSave; }, [onBlockSave]);
  useEffect(() => { onPendingChangesChangeRef.current = onPendingChangesChange; }, [onPendingChangesChange]);
  useEffect(() => { highlightedBlockIdsRef.current = highlightedBlockIds; }, [highlightedBlockIds]);
  useEffect(() => { updatedBlocksRef.current = updatedBlocks; }, [updatedBlocks]);

  // ============================================================================
  // Component state
  // ============================================================================
  const [renderState, setRenderState] = useState<RenderState>('idle');
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    onPendingChangesChangeRef.current?.(hasPendingChanges);
  }, [hasPendingChanges]);

  // ============================================================================
  // Core utility functions
  // ============================================================================

  const cancelCurrentRender = useCallback(() => {
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // Task may already be complete
      }
      renderTaskRef.current = null;
    }
  }, []);

  const handleError = useCallback((error: Error, context: 'load' | 'save' | 'render') => {
    console.error(`[DocumentCanvas ${context}] Error:`, error);
    onErrorRef.current?.(error, context);
  }, []);

  // ============================================================================
  // NEW: Get resolved text for a block (priority: updatedBlocks > localStorage > original)
  // ============================================================================
  const getResolvedText = useCallback((blockId: string, originalText: string): string => {
    // Priority 1: Backend-saved blocks (from parent after save)
    if (updatedBlocksRef.current?.has(blockId)) {
      return updatedBlocksRef.current.get(blockId)!;
    }

    // Priority 2: localStorage (survives refresh)
    const storedEdits = getStoredEdits();
    if (storedEdits && storedEdits.edits[blockId]) {
      return storedEdits.edits[blockId];
    }

    // Priority 3: Original PDF text
    return originalText;
  }, []);

  // ============================================================================
  // Save functionality
  // ============================================================================

  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (pendingSavesRef.current.size === 0 || isSavingRef.current) {
      return true;
    }

    isSavingRef.current = true;

    try {
      const updates = Array.from(pendingSavesRef.current.values());
      const saveCallback = onBlockSaveRef.current;
      
      if (saveCallback) {
        await Promise.all(updates.map(update => saveCallback(update)));
      }

      pendingSavesRef.current.clear();
      pendingChangesRef.current.clear();
      setHasPendingChanges(false);
      return true;
    } catch (error) {
      console.error('[DocumentCanvas] Save failed:', error);
      handleError(error instanceof Error ? error : new Error('Save failed'), 'save');
      return false;
    } finally {
      isSavingRef.current = false;
    }
  }, [handleError]);

  const queueBlockSave = useCallback((blockId: string, oldText: string, newText: string, section?: string) => {
    if (oldText === newText) return;

    pendingSavesRef.current.set(blockId, { blockId, oldText, newText, section });
    pendingChangesRef.current.add(blockId);
    setHasPendingChanges(true);
  }, []);

  useEffect(() => {
    const autoSave = async () => {
      if (pendingSavesRef.current.size > 0 && !isSavingRef.current) {
        await saveChanges();
      }
    };

    autoSaveTimerRef.current = setInterval(autoSave, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [saveChanges]);

  // NEW: Expose current blocks state
  const getCurrentBlocks = useCallback((): ResumeBlock[] => {
    return Array.from(blocksByIdRef.current.values());
  }, []);

  useImperativeHandle(ref, () => ({
    saveChanges,
    hasPendingChanges: () => pendingSavesRef.current.size > 0,
    getPendingChanges: () => Array.from(pendingSavesRef.current.values()),
    getCurrentBlocks, // NEW: Expose current state
  }), [saveChanges, getCurrentBlocks]);

  // ============================================================================
  // Event Delegation Handlers
  // ============================================================================

  const getSpanAndBlock = useCallback((target: EventTarget | null): { span: HTMLSpanElement; block: ResumeBlock } | null => {
    if (!target) return null;
    const span = (target as Element).closest?.('.text-layer-span') as HTMLSpanElement | null;
    if (!span) return null;
    const block = blockMapRef.current.get(span);
    if (!block) return null;
    return { span, block };
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isLockedRef.current) {
      e.preventDefault();
      return;
    }
    
    const result = getSpanAndBlock(e.target);
    if (!result) return;
    const { span, block } = result;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      span.blur();
    }
    
    if (e.key === 'Escape') {
      e.preventDefault();
      isProgrammaticChangeRef.current = true;
      const originalText = originalTextRef.current.get(block.id);
      if (originalText !== undefined) {
        span.textContent = originalText;
      }
      isProgrammaticChangeRef.current = false;
      span.blur();
    }
  }, [getSpanAndBlock]);

  const handleFocus = useCallback((e: FocusEvent) => {
    if (isLockedRef.current) {
      (e.target as HTMLElement)?.blur();
      return;
    }
    
    const result = getSpanAndBlock(e.target);
    if (!result) return;
    const { span, block } = result;

    const currentText = span.textContent || '';
    originalTextRef.current.set(block.id, currentText);
    
    span.style.color = '#1a1a1a';
    span.style.background = 'rgba(255, 255, 255, 1)';
    span.style.zIndex = '10';
  }, [getSpanAndBlock]);

  const handleBlur = useCallback((e: FocusEvent) => {
    const result = getSpanAndBlock(e.target);
    if (!result) return;
    const { span, block } = result;

    const newText = span.textContent || '';
    const originalText = originalTextRef.current.get(block.id) || block.text;

    const hasChanged = newText !== originalText;
    
    if (hasChanged) {
      block.text = newText;
      block.isEdited = true;
      
      // Update both maps
      blocksByIdRef.current.set(block.id, block);
      originalTextRef.current.set(block.id, newText);
      
      span.dataset.edited = 'true';
      
      saveEditsToStorage(
        [{ blockId: block.id, oldText: originalText, newText, section: block.section }],
        'current_resume',
        true
      );
      markEditsDirty();
      
      queueBlockSave(block.id, originalText, newText, block.section);
      
      onTextChangeRef.current?.(block.id, originalText, newText);
    }

    const highlighted = highlightedBlockIdsRef.current?.has(block.id);
    const isEdited = block.isEdited || hasChanged;
    
    if (isEdited) {
      span.style.color = '#1a1a1a';
      span.style.background = 'rgba(255, 255, 255, 1)';
      span.style.boxShadow = highlighted ? 'inset 0 -2px 0 0 #f59e0b' : 'none';
      span.style.zIndex = '5';
    } else if (highlighted) {
      span.style.color = 'transparent';
      span.style.background = 'rgba(245, 158, 11, 0.15)';
      span.style.boxShadow = 'inset 0 -2px 0 0 #f59e0b';
      span.style.zIndex = '';
    } else {
      span.style.color = 'transparent';
      span.style.background = 'transparent';
      span.style.boxShadow = 'none';
      span.style.zIndex = '';
    }
  }, [getSpanAndBlock, queueBlockSave]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const result = getSpanAndBlock(e.target);
    if (!result) return;

    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain');
    if (text) {
      document.execCommand('insertText', false, text);
    }
  }, [getSpanAndBlock]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    const result = getSpanAndBlock(e.target);
    if (!result) return;
    const { span } = result;

    const focusedElement = document.activeElement;
    if (focusedElement && focusedElement !== span && focusedElement.classList.contains('text-layer-span')) {
      (focusedElement as HTMLElement).blur();
    }
  }, [getSpanAndBlock]);

  // ============================================================================
  // Mutation Observer
  // ============================================================================

  const handleTextMutation = useCallback((mutations: MutationRecord[]) => {
    if (isProgrammaticChangeRef.current) return;

    for (const mutation of mutations) {
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        const target = mutation.target as Node;
        const span = target.nodeType === Node.TEXT_NODE 
          ? target.parentElement 
          : target as HTMLElement;
        
        if (!span?.classList.contains('text-layer-span')) continue;

        const block = blockMapRef.current.get(span);
        if (!block) continue;

        const newText = span.textContent || '';
        if (newText !== block.text) {
          pendingChangesRef.current.add(block.id);
        }
      }
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  const setupObserver = useCallback(() => {
    if (!textLayerRef.current) return;

    observerRef.current?.disconnect();

    const observer = new MutationObserver((mutations) => {
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

  // ============================================================================
  // Setup Event Delegation
  // ============================================================================

  useEffect(() => {
    const textLayer = textLayerRef.current;
    if (!textLayer) return;

    textLayer.addEventListener('keydown', handleKeyDown as EventListener);
    textLayer.addEventListener('focusin', handleFocus as EventListener);
    textLayer.addEventListener('focusout', handleBlur as EventListener);
    textLayer.addEventListener('paste', handlePaste as EventListener);
    textLayer.addEventListener('mousedown', handleMouseDown as EventListener);

    return () => {
      textLayer.removeEventListener('keydown', handleKeyDown as EventListener);
      textLayer.removeEventListener('focusin', handleFocus as EventListener);
      textLayer.removeEventListener('focusout', handleBlur as EventListener);
      textLayer.removeEventListener('paste', handlePaste as EventListener);
      textLayer.removeEventListener('mousedown', handleMouseDown as EventListener);
    };
  }, [handleKeyDown, handleFocus, handleBlur, handlePaste, handleMouseDown]);

  // ============================================================================
  // Main Render Function - FIXED: Uses resolved text from backend/localStorage
  // ============================================================================

  const renderPage = useCallback(async () => {
    const currentRenderId = ++renderIdRef.current;
    
    if (!viewportRef.current || !canvasRef.current || !textLayerRef.current || !pdfUrl) {
      return;
    }

    cancelCurrentRender();

    if (currentRenderId !== renderIdRef.current) return;

    setRenderState('rendering');

    try {
      if (!pdfDocRef.current || currentPdfUrlRef.current !== pdfUrl) {
        pdfDocRef.current?.destroy();
        currentPdfUrlRef.current = pdfUrl;
        
        try {
          const loadingTask = pdfjsLib.getDocument({
            url: pdfUrl,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.530/cmaps/',
            cMapPacked: true,
          });
          pdfDocRef.current = await loadingTask.promise;
        } catch (err) {
          handleError(err instanceof Error ? err : new Error('PDF load failed'), 'load');
          setRenderState('error');
          return;
        }
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

      renderTaskRef.current = page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      } as Parameters<typeof page.render>[0]);
      
      await renderTaskRef.current.promise;

      if (currentRenderId !== renderIdRef.current) return;
      renderTaskRef.current = null;

      const textContent = await page.getTextContent();
      
      if (currentRenderId !== renderIdRef.current) return;

      // CRITICAL FIX: Save current DOM state before clearing
      const savedTexts = new Map<string, string>();
      blockMapRef.current.forEach((block, span) => {
        const currentText = span.textContent || '';
        savedTexts.set(block.id, currentText);
      });

      isProgrammaticChangeRef.current = true;
      textLayer.innerHTML = '';
      blockMapRef.current.clear();
      blocksByIdRef.current.clear(); // NEW: Clear ID map
      isProgrammaticChangeRef.current = false;

      const extractedBlocks: ResumeBlock[] = [];
      let sectionGuess = 'content';

      textContent.items.forEach((item, index) => {
        if (!('str' in item)) return;
        
        const textItem = item as TextItem;
        if (!textItem.str.trim()) return;

        const tx = pdfjsLib.Util.transform(viewport.transform, textItem.transform);
        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
        const x = tx[4];
        const y = tx[5] - fontSize;
        const width = textItem.width * scale;

        const textLower = textItem.str.toLowerCase();
        if (textLower.includes('experience') || textLower.includes('work')) {
          sectionGuess = 'experience';
        } else if (textLower.includes('education')) {
          sectionGuess = 'education';
        } else if (textLower.includes('skill')) {
          sectionGuess = 'skills';
        } else if (textLower.includes('project')) {
          sectionGuess = 'projects';
        } else if (textLower.includes('summary') || textLower.includes('objective')) {
          sectionGuess = 'summary';
        }

        const blockId = `block-${pageNumber}-${index}`;
        
        // CRITICAL FIX: Multi-source text resolution
        // Priority: current DOM > backend > localStorage > original PDF
        let textToUse: string;
        if (savedTexts.has(blockId)) {
          // If we have current DOM state, use it (preserves unsaved edits)
          textToUse = savedTexts.get(blockId)!;
        } else {
          // Otherwise, resolve from backend/localStorage/original
          textToUse = getResolvedText(blockId, textItem.str);
        }
        
        const wasEdited = textToUse !== textItem.str;
        
        const fontInfo = getFontInfo(textItem.fontName || 'sans-serif');
        const fontStyles = buildFontStyles(fontInfo, fontSize);
        
        const block: ResumeBlock = {
          id: blockId,
          text: textToUse,
          section: sectionGuess,
          spanIndex: index,
          x, y, width,
          height: fontSize,
          fontSize,
          fontFamily: textItem.fontName || 'sans-serif',
          isEdited: wasEdited,
        };

        const span = document.createElement('span');
        span.className = 'text-layer-span';
        span.contentEditable = 'true';
        span.spellcheck = false;
        span.textContent = textToUse;
        span.dataset.blockId = block.id;
        span.dataset.section = block.section;
        span.dataset.fontName = textItem.fontName || 'sans-serif';
        
        if (wasEdited) {
          span.dataset.edited = 'true';
        }

        span.setAttribute('role', 'textbox');
        span.setAttribute('aria-label', `Editable text in ${block.section} section`);
        span.setAttribute('tabindex', '0');

        const isHighlighted = highlightedBlockIds?.has(block.id);
        
        const textColor = wasEdited ? '#1a1a1a' : 'transparent';
        const bgColor = wasEdited 
          ? 'rgba(255, 255, 255, 1)' 
          : (isHighlighted ? 'rgba(245, 158, 11, 0.15)' : 'transparent');
        const zIndex = wasEdited ? '5' : '';
        
        span.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          font-size: ${fontStyles.fontSize};
          font-family: ${fontStyles.fontFamily};
          font-weight: ${fontStyles.fontWeight};
          font-style: ${fontStyles.fontStyle};
          white-space: pre-wrap;
          display: inline;
          line-height: 1.2;
          color: ${textColor};
          caret-color: #000000;
          outline: none;
          cursor: text;
          min-width: ${width}px;
          padding: 0 1px;
          margin: 0;
          border: none;
          border-radius: 0;
          background: ${bgColor};
          box-shadow: ${isHighlighted ? 'inset 0 -2px 0 0 #f59e0b' : 'none'};
          transition: color 0.1s ease, background 0.1s ease;
          user-select: text;
          -webkit-user-select: text;
          z-index: ${zIndex};
        `;

        blockMapRef.current.set(span, block);
        blocksByIdRef.current.set(block.id, block); // NEW: Store by ID
        extractedBlocks.push(block);
        textLayer.appendChild(span);
        
        originalTextRef.current.set(block.id, textToUse);
      });

      setupObserver();
      onBlocksExtracted?.(extractedBlocks);
      setRenderState('complete');

    } catch (err) {
      if (err instanceof Error && err.name === 'RenderingCancelledException') {
        return;
      }
      handleError(err instanceof Error ? err : new Error('Render failed'), 'render');
      setRenderState('error');
    }
  }, [pdfUrl, pageNumber, scale, cancelCurrentRender, setupObserver, highlightedBlockIds, onBlocksExtracted, handleError, getResolvedText]);

  // CRITICAL: Only re-render when these specific dependencies change
  // DO NOT include updatedBlocks here to prevent re-render after analysis
  useEffect(() => {
    renderPage();
  }, [pdfUrl, pageNumber, scale]); // Removed: renderPage, highlightedBlockIds

  // NEW: Separate effect to update highlights without re-rendering
  useEffect(() => {
    if (!textLayerRef.current || renderState !== 'complete') return;

    // Update highlights on existing spans without re-rendering
    blockMapRef.current.forEach((block, span) => {
      const isHighlighted = highlightedBlockIds?.has(block.id);
      const isEdited = block.isEdited;

      if (isEdited) {
        span.style.boxShadow = isHighlighted ? 'inset 0 -2px 0 0 #f59e0b' : 'none';
      } else if (isHighlighted) {
        span.style.background = 'rgba(245, 158, 11, 0.15)';
        span.style.boxShadow = 'inset 0 -2px 0 0 #f59e0b';
      } else {
        span.style.background = 'transparent';
        span.style.boxShadow = 'none';
      }
    });
  }, [highlightedBlockIds, renderState]);

  // ============================================================================
  // Canvas Context Loss Handling
  // ============================================================================

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setRenderState('error');
    };

    const handleContextRestored = () => {
      renderPage();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [renderPage]);

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      renderIdRef.current++;
      cancelCurrentRender();
      
      observerRef.current?.disconnect();
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
      
      pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
    };
  }, [cancelCurrentRender]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div 
      ref={containerRef}
      role="document"
      aria-label="PDF Document Editor"
      className="relative bg-white shadow-2xl ring-1 ring-gray-300"
    >
      <div
        ref={viewportRef}
        className="relative"
        style={{
          width: dimensions?.width || 'auto',
          height: dimensions?.height || 'auto',
        }}
      >
        {hasPendingChanges && (
          <div className="absolute -top-2 -right-2 z-50">
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span>Unsaved changes</span>
            </div>
          </div>
        )}

        {renderState === 'rendering' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/95 z-30">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-2 text-sm text-gray-500">Loading document...</p>
            </div>
          </div>
        )}

        {renderState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-30">
            <div className="text-center p-6">
              <p className="text-sm text-red-600 font-medium">Failed to render PDF</p>
              <p className="text-xs text-gray-500 mt-1">Please try uploading again</p>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="block"
          style={{
            pointerEvents: 'none',
          }}
        />

        <div
          ref={textLayerRef}
          className="absolute top-0 left-0 textLayer"
          style={{
            width: dimensions?.width || '100%',
            height: dimensions?.height || '100%',
            opacity: renderState === 'complete' ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out',
            pointerEvents: 'auto',
            color: 'transparent',
          }}
        />
      </div>
    </div>
  );
}));

export default DocumentCanvas;
export type { DocumentCanvasProps };