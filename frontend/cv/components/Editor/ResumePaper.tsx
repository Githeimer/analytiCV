/**
 * ResumePaper Component
 * A4-sized container with proper z-index layering:
 * - Layer 0: White background
 * - Layer 1: PDF canvas (visual reference only)
 * - Layer 2: Editable text overlays (interactive)
 */

'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import PDFRenderer from './PDFRenderer';
import EditableBlock from './EditableBlock';
import type { ResumePaperProps, TextBlock } from '@/types/editor';

const ResumePaper = memo(function ResumePaper({
  pdfUrl,
  extractionResult,
  blocks,
  weakBlocks,
  selectedBlockId,
  scale,
  currentPage,
  onBlockTextChange,
  onBlockSelect,
  onApplySuggestion,
  onBlockClick,
}: ResumePaperProps & { onBlockClick?: (blockId: string) => void }) {
  const [isPdfReady, setIsPdfReady] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Handle page load from PDF renderer
  const handlePageLoad = useCallback((dimensions: { width: number; height: number }) => {
    setPageDimensions(dimensions);
  }, []);

  // Handle PDF render complete
  const handleRenderComplete = useCallback(() => {
    setIsPdfReady(true);
  }, []);

  // Handle click outside blocks to deselect
  const handlePaperClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only deselect if clicking on the paper background, not on blocks
      if (target.classList.contains('resume-paper-bg') || target.classList.contains('resume-paper-overlay')) {
        onBlockSelect(null);
      }
    },
    [onBlockSelect]
  );

  // Get page info for current page
  const currentPageInfo = useMemo(() => {
    return extractionResult.pages.find((p) => p.page_number === currentPage);
  }, [extractionResult.pages, currentPage]);

  // Filter blocks for current page
  const pageBlocks = useMemo(() => {
    return extractionResult.blocks.filter((block) => block.page === currentPage);
  }, [extractionResult.blocks, currentPage]);

  // Calculate paper dimensions based on PDF page or fallback to A4
  const paperStyle = useMemo(() => {
    if (pageDimensions) {
      return {
        width: pageDimensions.width,
        height: pageDimensions.height,
      };
    }
    if (currentPageInfo) {
      return {
        width: currentPageInfo.width * scale,
        height: currentPageInfo.height * scale,
      };
    }
    // A4 fallback at 96 DPI
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    return {
      width: (A4_WIDTH_MM / 25.4) * 96 * scale,
      height: (A4_HEIGHT_MM / 25.4) * 96 * scale,
    };
  }, [pageDimensions, currentPageInfo, scale]);

  return (
    <div
      className="relative mx-auto bg-white shadow-2xl resume-paper-bg"
      style={{
        width: paperStyle.width,
        height: paperStyle.height,
      }}
      onClick={handlePaperClick}
    >
      {/* Layer 1: PDF Background - z-index 0, no pointer events (clicks pass through) */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ zIndex: 0 }}
      >
        <PDFRenderer
          pdfUrl={pdfUrl}
          pageNumber={currentPage + 1}
          scale={scale}
          onPageLoad={handlePageLoad}
          onRenderComplete={handleRenderComplete}
        />
      </div>

      {/* Layer 2: Transparent Edit Layer - z-index 10, receives all interactions */}
      <div 
        className="absolute inset-0 resume-paper-overlay"
        style={{ 
          zIndex: 10,
          // Position absolutely at top-left to match PDF coordinates
          top: 0,
          left: 0,
          // Hide text overlays until PDF is ready to prevent garbled appearance
          opacity: isPdfReady ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          // Ensure this layer receives all pointer events
          pointerEvents: 'auto',
        }}
      >
        {pageBlocks.map((block: TextBlock) => {
          const blockState = blocks.get(block.id);
          const weakness = weakBlocks.get(block.id) || null;

          if (!blockState) return null;

          return (
            <EditableBlock
              key={block.id}
              block={block}
              state={blockState}
              weakness={weakness}
              scale={scale}
              onTextChange={onBlockTextChange}
              onSelect={onBlockSelect}
              onApplySuggestion={onApplySuggestion}
              onBlockClick={onBlockClick}
            />
          );
        })}
      </div>

      {/* Loading overlay while PDF renders */}
      {!isPdfReady && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-white/90"
          style={{ zIndex: 20 }}
        >
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-[#007DE3] border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-sm text-gray-500">Loading document...</p>
          </div>
        </div>
      )}

      {/* Selection indicator */}
      {selectedBlockId && isPdfReady && (
        <div 
          className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full"
          style={{ zIndex: 30 }}
        >
          Editing: {extractionResult.blocks.find((b) => b.id === selectedBlockId)?.section || 'block'}
        </div>
      )}
    </div>
  );
});

export default ResumePaper;
