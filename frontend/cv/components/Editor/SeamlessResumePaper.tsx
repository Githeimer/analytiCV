/**
 * SeamlessResumePaper Component
 * Uses pdf.js native text layer with contentEditable for seamless click-and-edit.
 * No visible overlays - text is edited directly in place at exact coordinates.
 * Perfect alignment: when you click '2024', the cursor appears exactly there.
 */

'use client';

import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import EditableTextLayer from './EditableTextLayer';
import type { PDFExtractionResult, BlockWeakness } from '@/types/editor';

interface SeamlessResumePaperProps {
  pdfUrl: string;
  extractionResult: PDFExtractionResult;
  weakBlocks: Map<string, BlockWeakness>;
  scale: number;
  currentPage: number;
  onTextChange?: (spanIndex: number, oldText: string, newText: string) => void;
  onATSRecalculate?: () => void;
}

// Map block IDs to span indices for AI highlighting
function mapBlocksToSpanIndices(
  extractionResult: PDFExtractionResult,
  weakBlocks: Map<string, BlockWeakness>,
  currentPage: number
): Map<number, { severity: 'low' | 'medium' | 'high'; issue: string }> {
  const highlightedSpans = new Map<number, { severity: 'low' | 'medium' | 'high'; issue: string }>();
  
  // Get blocks for current page
  const pageBlocks = extractionResult.blocks.filter(b => b.page === currentPage);
  
  // Map weak blocks to approximate span indices
  // This is a simplified mapping - in production, you would match by coordinates
  pageBlocks.forEach((block, index) => {
    const weakness = weakBlocks.get(block.id);
    if (weakness) {
      highlightedSpans.set(index, {
        severity: weakness.severity,
        issue: weakness.issue,
      });
    }
  });
  
  return highlightedSpans;
}

const SeamlessResumePaper = memo(function SeamlessResumePaper({
  pdfUrl,
  extractionResult,
  weakBlocks,
  scale,
  currentPage,
  onTextChange,
  onATSRecalculate,
}: SeamlessResumePaperProps) {
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number } | null>(null);
  const atsRecalcTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Map<number, { oldText: string; newText: string }>>(new Map());

  // Get page info for current page
  const currentPageInfo = useMemo(() => {
    return extractionResult.pages.find((p) => p.page_number === currentPage);
  }, [extractionResult.pages, currentPage]);

  // Map weak blocks to span highlights
  const highlightedSpans = useMemo(() => {
    return mapBlocksToSpanIndices(extractionResult, weakBlocks, currentPage);
  }, [extractionResult, weakBlocks, currentPage]);

  // Calculate paper dimensions
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
    // A4 fallback
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    return {
      width: (A4_WIDTH_MM / 25.4) * 96 * scale,
      height: (A4_HEIGHT_MM / 25.4) * 96 * scale,
    };
  }, [pageDimensions, currentPageInfo, scale]);

  // Handle text changes from the editable text layer
  const handleTextChange = useCallback((spanIndex: number, oldText: string, newText: string) => {
    // Store the change
    pendingChangesRef.current.set(spanIndex, { oldText, newText });
    
    // Notify parent immediately for local state update
    if (onTextChange) {
      onTextChange(spanIndex, oldText, newText);
    }

    // Debounce ATS recalculation (1500ms after user stops typing)
    if (atsRecalcTimerRef.current) {
      clearTimeout(atsRecalcTimerRef.current);
    }

    atsRecalcTimerRef.current = setTimeout(() => {
      if (onATSRecalculate && pendingChangesRef.current.size > 0) {
        onATSRecalculate();
        pendingChangesRef.current.clear();
      }
    }, 1500);
  }, [onTextChange, onATSRecalculate]);

  // Handle text layer ready - get dimensions
  const handleTextLayerReady = useCallback((spans: Array<{ width: number; height: number }>) => {
    // Text layer is ready - could be used for additional processing
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (atsRecalcTimerRef.current) {
        clearTimeout(atsRecalcTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative mx-auto bg-white shadow-2xl"
      style={{
        width: paperStyle.width,
        height: paperStyle.height,
      }}
    >
      {/* Single layer: PDF with editable text overlay */}
      <EditableTextLayer
        pdfUrl={pdfUrl}
        pageNumber={currentPage + 1}
        scale={scale}
        onTextChange={handleTextChange}
        onTextLayerReady={handleTextLayerReady}
        highlightedSpans={highlightedSpans}
        debounceMs={300}
      />

      {/* Info indicator */}
      <div 
        className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full opacity-50 hover:opacity-100 transition-opacity"
        style={{ zIndex: 30 }}
      >
        Click any text to edit
      </div>
    </div>
  );
});

export default SeamlessResumePaper;
