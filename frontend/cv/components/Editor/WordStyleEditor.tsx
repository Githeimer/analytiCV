'use client';

import { memo, useCallback, useMemo, useState, useRef, useEffect, forwardRef } from 'react';
import DocumentCanvas, { type ResumeBlock, type BlockUpdate, type DocumentCanvasRef } from './DocumentCanvas';
import type { PDFExtractionResult, BlockWeakness } from '@/types/editor';

const A4_DIMENSIONS = {
  WIDTH_MM: 210,
  HEIGHT_MM: 297,
  DPI: 96,
  MM_TO_INCH: 25.4,
} as const;

export type { DocumentCanvasRef } from './DocumentCanvas';

interface WordStyleEditorProps {
  pdfUrl: string;
  extractionResult: PDFExtractionResult;
  weakBlocks: Map<string, BlockWeakness>;
  scale: number;
  currentPage: number;
  isAnalyzing?: boolean;
  updatedBlocks?: Map<string, string>; 
  onTextChange?: (blockId: string, oldText: string, newText: string) => void;
  onBlockSave?: (update: BlockUpdate) => Promise<void>;
  onATSRecalculate?: () => void;
  onBlocksExtracted?: (blocks: ResumeBlock[]) => void;
  onError?: (error: Error, context: 'load' | 'save' | 'render') => void;
  onPendingChangesChange?: (hasPendingChanges: boolean) => void;
  onPageChange?: (page: number) => void;
}

const WordStyleEditor = memo(forwardRef<DocumentCanvasRef, WordStyleEditorProps>(function WordStyleEditor({
  pdfUrl,
  extractionResult,
  weakBlocks,
  scale,
  currentPage,
  isAnalyzing = false,
  updatedBlocks, // NEW: Receive updatedBlocks from parent
  onTextChange,
  onBlockSave,
  onATSRecalculate,
  onBlocksExtracted,
  onError,
  onPendingChangesChange,
  onPageChange,
}, ref) {
  // FIX #7: Use ref instead of state to avoid unnecessary re-renders
  const extractedBlocksRef = useRef<ResumeBlock[]>([]);
  const [blockCount, setBlockCount] = useState(0);
  
  // FIX #4: Track changes with cleanup
  const changesMapRef = useRef<Map<string, { oldText: string; newText: string }>>(new Map());
  
  // FIX #9: Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // FIX #1: Create a mapping between DocumentCanvas blocks and extraction blocks
  // This is built when blocks are extracted and used for lookups
  const blockMappingRef = useRef<Map<string, string>>(new Map()); // DocumentCanvas ID -> Extraction ID

  // FIX #15: Use ref for onBlockSave to prevent stale closures
  const onBlockSaveRef = useRef(onBlockSave);
  useEffect(() => {
    onBlockSaveRef.current = onBlockSave;
  }, [onBlockSave]);

  // FIX #6: Validate page is within bounds
  const isValidPage = useMemo(() => {
    const totalPages = extractionResult.metadata?.total_pages || 0;
    return currentPage >= 0 && currentPage < totalPages;
  }, [currentPage, extractionResult.metadata]);

  // FIX #1: Build highlighted block IDs directly from weakBlocks
  // Since analysis now returns DocumentCanvas IDs, we can use them directly
  const highlightedBlockIds = useMemo(() => {
    const ids = new Set<string>();
    
    // weakBlocks keys are now DocumentCanvas IDs (e.g., "block-1-5")
    weakBlocks.forEach((_, blockId) => {
      ids.add(blockId);
    });
    
    return ids;
  }, [weakBlocks]);

  // FIX #3: Error handler
  const handleError = useCallback((error: Error, context: 'load' | 'save' | 'render') => {
    console.error(`[WordStyleEditor ${context}]`, error);
    
    if (onError) {
      onError(error, context);
    }
    
    // Stop loading on error
    if (context === 'load' || context === 'render') {
      setIsLoading(false);
    }
  }, [onError]);

  // FIX #1: Handle blocks extracted with proper mapping
  const handleBlocksExtracted = useCallback((blocks: ResumeBlock[]) => {
    extractedBlocksRef.current = blocks;
    setBlockCount(blocks.length);
    setIsLoading(false);
    
    // Build mapping between DocumentCanvas blocks and extraction blocks
    // Strategy: Match by text content and approximate position
    blockMappingRef.current.clear();
    
    const currentPageExtractedBlocks = extractionResult.blocks?.filter(
      block => block.page === currentPage
    ) || [];
    
    blocks.forEach((canvasBlock) => {
      // Try to find matching extraction block by text similarity
      const matchingExtractionBlock = currentPageExtractedBlocks.find(exBlock => {
        // Normalize text for comparison
        const canvasText = canvasBlock.text.trim().toLowerCase();
        const exText = exBlock.text?.trim().toLowerCase() || '';
        
        // Check for exact match or substring match
        if (canvasText === exText) return true;
        if (canvasText.includes(exText) || exText.includes(canvasText)) return true;
        
        // Check if texts are very similar (allowing for minor differences)
        const similarity = calculateTextSimilarity(canvasText, exText);
        return similarity > 0.8;
      });
      
      if (matchingExtractionBlock) {
        blockMappingRef.current.set(canvasBlock.id, matchingExtractionBlock.id);
      }
    });
    
    if (onBlocksExtracted) {
      onBlocksExtracted(blocks);
    }
  }, [extractionResult.blocks, currentPage, onBlocksExtracted]);

  // Helper function to calculate text similarity
  const calculateTextSimilarity = (text1: string, text2: string): number => {
    if (text1 === text2) return 1.0;
    if (!text1 || !text2) return 0.0;
    
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // Levenshtein distance for text similarity
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // FIX #2: Proper text change handling with correct mapping
  const handleTextChange = useCallback((canvasBlockId: string, oldText: string, newText: string) => {
    changesMapRef.current.set(canvasBlockId, { oldText, newText });

    // Get the extraction block ID from our mapping
    const extractionBlockId = blockMappingRef.current.get(canvasBlockId);
    
    if (extractionBlockId && onTextChange) {
      onTextChange(extractionBlockId, oldText, newText);
    } else {
      // Fallback: try to find by text match
      const matchingBlock = extractionResult.blocks?.find(block => {
        return block.page === currentPage && 
               block.text?.trim() === oldText.trim();
      });
      
      if (matchingBlock && onTextChange) {
        onTextChange(matchingBlock.id, oldText, newText);
        // Update mapping for future use
        blockMappingRef.current.set(canvasBlockId, matchingBlock.id);
      }
    }
  }, [extractionResult.blocks, currentPage, onTextChange]);

  // FIX #4: Handle block save with cleanup - use ref to prevent stale closures
  const handleBlockSave = useCallback(async (update: BlockUpdate) => {
    const saveCallback = onBlockSaveRef.current;
    if (saveCallback) {
      await saveCallback(update);
      changesMapRef.current.delete(update.blockId);
    }
  }, []);

  // FIX #5: Calculate paper dimensions with validation
  const paperStyle = useMemo(() => {
    const pageInfo = extractionResult.pages?.find(p => p.page_number === currentPage);
    
    if (pageInfo && 
        typeof pageInfo.width === 'number' && 
        typeof pageInfo.height === 'number' &&
        pageInfo.width > 0 &&
        pageInfo.height > 0) {
      return {
        width: pageInfo.width * scale,
        height: pageInfo.height * scale,
      };
    }
    
    // A4 fallback with extracted constants
    return {
      width: (A4_DIMENSIONS.WIDTH_MM / A4_DIMENSIONS.MM_TO_INCH) * A4_DIMENSIONS.DPI * scale,
      height: (A4_DIMENSIONS.HEIGHT_MM / A4_DIMENSIONS.MM_TO_INCH) * A4_DIMENSIONS.DPI * scale,
    };
  }, [extractionResult.pages, currentPage, scale]);

  // FIX #4: Clear changes when page changes
  useEffect(() => {
    return () => {
      changesMapRef.current.clear();
    };
  }, [currentPage]);

  // FIX #8: Clear state when scale changes
  useEffect(() => {
    setIsLoading(true);
    setBlockCount(0);
    blockMappingRef.current.clear();
  }, [scale]);

  // FIX #9: Reset loading when page changes
  useEffect(() => {
    setIsLoading(true);
  }, [currentPage]);

  // FIX #11: Keyboard navigation for pages
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't interfere if user is editing
      if (document.activeElement?.getAttribute('contenteditable') === 'true') {
        return;
      }

      const totalPages = extractionResult.metadata?.total_pages || 0;
      
      if (e.key === 'PageDown' && currentPage < totalPages - 1 && onPageChange) {
        e.preventDefault();
        onPageChange(currentPage + 1);
      } else if (e.key === 'PageUp' && currentPage > 0 && onPageChange) {
        e.preventDefault();
        onPageChange(currentPage - 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, extractionResult.metadata, onPageChange]);

  // FIX #6: Early return for invalid page
  if (!isValidPage) {
    return (
      <div className="mx-auto text-center p-8">
        <p className="text-red-600 font-medium">Invalid page number</p>
        <p className="text-sm text-gray-500 mt-2">
          Page {currentPage + 1} does not exist
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* FIX #10: Improved semantic HTML with accessibility */}
      <article 
        className="mx-auto relative"
        role="article"
        aria-label={`Resume page ${currentPage + 1} of ${extractionResult.metadata?.total_pages || 0}`}
        style={{
          width: paperStyle.width,
          height: paperStyle.height,
        }}
      >
        {/* FIX #9: Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-40 rounded-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600">Loading page...</p>
            </div>
          </div>
        )}

        <DocumentCanvas
          ref={ref}
          pdfUrl={pdfUrl}
          pageNumber={currentPage + 1}
          scale={scale}
          isLocked={isAnalyzing}
          updatedBlocks={updatedBlocks} // CRITICAL FIX: Forward updatedBlocks to DocumentCanvas
          onBlocksExtracted={handleBlocksExtracted}
          onTextChange={handleTextChange}
          onBlockSave={handleBlockSave}
          onATSRecalculate={onATSRecalculate}
          onError={handleError}
          onPendingChangesChange={onPendingChangesChange}
          highlightedBlockIds={highlightedBlockIds}
        />
      </article>

      {/* FIX #14: Document info with better positioning */}
      <footer 
        className="mt-6 text-center text-xs text-gray-500"
        aria-label="Document information"
      >
        <div className="flex items-center justify-center gap-4">
          <span>{blockCount} text blocks</span>
          <span className="text-gray-300">•</span>
          <span>
            Page {currentPage + 1} of {extractionResult.metadata?.total_pages || 0}
          </span>
          {onPageChange && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-gray-400 text-[10px]">
                Use PageUp/PageDown to navigate
              </span>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}));

export default WordStyleEditor;