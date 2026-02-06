/**
 * PDF Inline Editor Page - FIXED VERSION
 * Document-style inline editor with professional document editing environment
 * 
 * CRITICAL FIX: Sequential Save-Then-Analyze Flow
 * - Step 1: Force save all pending changes
 * - Step 2: Get current blocks from DocumentCanvas (not stale state)
 * - Step 3: Send current blocks to backend for analysis
 * - Step 4: Update ONLY analysis UI (no PDF re-render)
 * 
 * Key Improvements:
 * - Fixed auto-refresh issue - changes no longer trigger page reload
 * - Manual "Analyze" button for ATS recalculation
 * - Auto-save functionality with visual feedback
 * - Better error handling and recovery
 * - Optimized re-rendering prevention
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useEditorState } from '@/hooks/useEditorState';

// Dynamic import with SSR disabled to prevent DOMMatrix errors
const WordStyleEditor = dynamic(
  () => import('@/components/Editor/WordStyleEditor'),
  { 
    ssr: false,
    loading: () => <EditorLoadingSkeleton />,
  }
);

// Loading skeleton shown while PDF components are mounting
function EditorLoadingSkeleton() {
  return (
    <div className="mx-auto bg-white shadow-2xl ring-1 ring-gray-300 animate-pulse" style={{ width: 595, height: 842 }}>
      <div className="p-8 space-y-4">
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="mt-8 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-3 bg-gray-100 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
          ))}
        </div>
        <div className="mt-8 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-3 bg-gray-100 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-[#007DE3] border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-500 font-medium">Loading PDF Editor...</p>
        </div>
      </div>
    </div>
  );
}

import { extractPDFBlocks, analyzeBlocks, updateResumeBlocks } from '@/services/editorApi';
import type { BlockUpdate, ATSScoreDetails } from '@/services/editorApi';
import { exportToPDF, downloadPDF, fileToArrayBuffer } from '@/utils/pdfExport';
import type { DocumentCanvasRef } from '@/components/Editor/WordStyleEditor';

export default function EditorPage() {
  const {
    state,
    setPdf,
    setExtractionResult,
    updateBlockText,
    setWeakBlocks,
    selectBlock,
    setAnalyzing,
    setExporting,
    setScale,
    setPage,
    hasUnsavedChanges,
    weakBlockCount,
  } = useEditorState();

  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsScoreDetails, setAtsScoreDetails] = useState<ATSScoreDetails | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [savedBlocksMap, setSavedBlocksMap] = useState<Map<string, string>>(new Map());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfBytesRef = useRef<ArrayBuffer | null>(null);
  const issueRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const editorRef = useRef<DocumentCanvasRef>(null);

  // Handle pending changes status from DocumentCanvas
  const handlePendingChangesChange = useCallback((pending: boolean) => {
    setHasPendingChanges(pending);
  }, []);

  // Handle manual save
  const handleSave = useCallback(async () => {
    if (!editorRef.current) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const success = await editorRef.current.saveChanges();
      if (success) {
        setHasPendingChanges(false);
        setLastSaveTime(new Date());
        
        // Update saved blocks map for DocumentCanvas to use
        const currentBlocks = editorRef.current.getCurrentBlocks();
        const newMap = new Map(currentBlocks.map(b => [b.id, b.text]));
        setSavedBlocksMap(newMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith('.pdf')) {
        setError('Please upload a PDF file');
        return;
      }

      setIsUploading(true);
      setError(null);
      setAtsScore(null);
      setSavedBlocksMap(new Map()); // Reset saved blocks map

      try {
        pdfBytesRef.current = await fileToArrayBuffer(file);
        const url = URL.createObjectURL(file);
        setPdf(file, url);
        const result = await extractPDFBlocks(file);
        setExtractionResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process PDF');
      } finally {
        setIsUploading(false);
      }
    },
    [setPdf, setExtractionResult]
  );

  // CRITICAL FIX: Handle analyze button click with proper sequential flow
  const handleAnalyze = useCallback(async () => {
    if (!state.extractionResult || !editorRef.current) return;

    setAnalyzing(true);
    setError(null);

    try {
      // STEP 1: Force save any pending changes FIRST
      // This ensures the backend has the latest text (e.g., '2025' not '2024')
      console.log('[EditorPage] Step 1: Checking for pending changes...');
      if (hasPendingChanges) {
        console.log('[EditorPage] Pending changes detected, saving before analysis...');
        setIsSaving(true);
        const saveSuccess = await editorRef.current.saveChanges();
        setIsSaving(false);
        
        if (!saveSuccess) {
          throw new Error('Failed to save changes before analysis');
        }
        
        setHasPendingChanges(false);
        setLastSaveTime(new Date());
        console.log('[EditorPage] ✅ Save completed successfully');
        
        // Update saved blocks map
        const currentBlocks = editorRef.current.getCurrentBlocks();
        const newMap = new Map(currentBlocks.map(b => [b.id, b.text]));
        setSavedBlocksMap(newMap);
        
        // CRITICAL: Wait for the backend to finish processing the save
        // Give it a moment to ensure the saved state is fully committed
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log('[EditorPage] No pending changes, proceeding with analysis...');
      }

      // STEP 2: Get CURRENT blocks from DocumentCanvas (not stale state)
      // This is the actual current state of the editor, including all edits
      console.log('[EditorPage] Step 2: Getting current blocks from DocumentCanvas...');
      const currentBlocks = editorRef.current.getCurrentBlocks();
      console.log('[EditorPage] Current blocks count:', currentBlocks.length);
      
      // Map DocumentCanvas blocks back to extraction result format
      // The DocumentCanvas uses `block-${pageNumber}-${index}` IDs
      // We need to map these back to the original extraction block IDs
      const blocksForAnalysis = state.extractionResult.blocks.map((originalBlock, index) => {
        // Find the corresponding current block by index
        const currentBlock = currentBlocks.find(cb => {
          const spanIndex = parseInt(cb.id.split('-').pop() || '0');
          return spanIndex === index;
        });
        
        if (currentBlock) {
          console.log(`[EditorPage] Block ${index}: Using current text: "${currentBlock.text}"`);
          return {
            ...originalBlock,
            text: currentBlock.text, // Use the CURRENT edited text
          };
        }
        
        console.log(`[EditorPage] Block ${index}: Using original text: "${originalBlock.text}"`);
        return originalBlock;
      });
      
      console.log('[EditorPage] Step 3: Sending blocks to backend for analysis...');
      console.log('[EditorPage] Sample block texts:', blocksForAnalysis.slice(0, 3).map(b => b.text));
      
      // STEP 3: Send to backend for analysis
      // The editorApi.analyzeBlocks() function will merge saved edits from backend
      const result = await analyzeBlocks(blocksForAnalysis);
      
      console.log('[EditorPage] Step 4: Analysis complete, updating UI...');
      
      // STEP 4: Update ONLY analysis state - do NOT re-initialize PDF renderer
      // This prevents the UI from reverting to the original PDF
      setWeakBlocks(result.weak_blocks);
      
      if (result.ats_score !== undefined) {
        setAtsScore(result.ats_score);
        console.log('[EditorPage] ✅ ATS Score updated:', result.ats_score);
      }
      if (result.ats_score_details) {
        setAtsScoreDetails(result.ats_score_details);
      }
      
      console.log('[EditorPage] ✅ Analysis flow completed successfully');
    } catch (err) {
      console.error('[EditorPage] Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze resume');
    } finally {
      setAnalyzing(false);
    }
  }, [state.extractionResult, setAnalyzing, setWeakBlocks, hasPendingChanges]);

  // Handle export button click
  const handleExport = useCallback(async () => {
    if (!state.extractionResult || !pdfBytesRef.current) return;

    // Auto-save before export
    if (hasPendingChanges && editorRef.current) {
      setIsSaving(true);
      try {
        await editorRef.current.saveChanges();
        setHasPendingChanges(false);
        
        // Update saved blocks map
        const currentBlocks = editorRef.current.getCurrentBlocks();
        const newMap = new Map(currentBlocks.map(b => [b.id, b.text]));
        setSavedBlocksMap(newMap);
      } catch (err) {
        setError('Failed to save changes before export');
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }

    setExporting(true);
    setError(null);

    try {
      const blob = await exportToPDF({
        originalPdfBytes: pdfBytesRef.current,
        blocks: state.extractionResult.blocks,
        blockStates: state.blocks,
        filename: state.pdfFile?.name || 'resume.pdf',
      });

      const filename = state.pdfFile?.name?.replace('.pdf', '_edited.pdf') || 'resume_edited.pdf';
      downloadPDF(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  }, [state.extractionResult, state.blocks, state.pdfFile, setExporting, hasPendingChanges]);

  // Handle block text change - UPDATE LOCAL STATE ONLY, no backend call
  const handleBlockTextChange = useCallback(
    (id: string, oldText: string, newText: string) => {
      // Just update local state - don't trigger analysis or backend saves
      updateBlockText(id, newText);
    },
    [updateBlockText]
  );

  // Handle block save - persist to backend and update ATS score
  // This is called by DocumentCanvas when user finishes editing (blur/Enter key)
  const handleBlockSave = useCallback(async (update: BlockUpdate): Promise<void> => {
    console.log('[EditorPage] handleBlockSave called with:', update);
    
    try {
      // Map the DocumentCanvas block ID back to the extraction result block ID
      const spanIndex = parseInt(update.blockId.split('-').pop() || '0');
      const extractionBlock = state.extractionResult?.blocks[spanIndex];
      
      const backendUpdate: BlockUpdate = {
        blockId: extractionBlock?.id || update.blockId,
        oldText: update.oldText,
        newText: update.newText,
        section: update.section || extractionBlock?.section || undefined,
      };

      console.log('[EditorPage] Sending to backend:', backendUpdate);

      // Call the backend API to persist the change
      const response = await updateResumeBlocks([backendUpdate]);
      
      console.log('[EditorPage] Backend response:', response);
      
      // Update ATS score from unified backend calculation
      if (response.atsScore !== undefined) {
        setAtsScore(response.atsScore);
      }
      if (response.atsScoreDetails) {
        setAtsScoreDetails(response.atsScoreDetails);
      }
      
      // Update last save time
      setLastSaveTime(new Date());
      
      // Update saved blocks map
      if (editorRef.current) {
        const currentBlocks = editorRef.current.getCurrentBlocks();
        const newMap = new Map(currentBlocks.map(b => [b.id, b.text]));
        setSavedBlocksMap(newMap);
      }
    } catch (error) {
      // Re-throw to let DocumentCanvas handle the error state
      console.error('[EditorPage] Failed to save block:', error);
      throw error;
    }
  }, [state.extractionResult?.blocks]);

  // Handle block selection
  const handleBlockSelect = useCallback(
    (id: string | null) => {
      selectBlock(id);
    },
    [selectBlock]
  );

  // Handle clicking an issue in sidebar - scroll to block, highlight, and focus for editing
  const handleIssueClick = useCallback((blockId: string) => {
    setSelectedIssueId(blockId);
    selectBlock(blockId);
    
    // Find the editable span by block ID using data attribute
    const blockElement = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
    if (blockElement) {
      // Scroll to the element smoothly, centering it in view
      blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add temporary highlight animation
      blockElement.classList.add('issue-highlight-animation');
      
      // Focus the element after scroll completes
      setTimeout(() => {
        if (blockElement.contentEditable === 'true') {
          blockElement.focus();
          // Place cursor at end of text for natural editing
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(blockElement);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
        
        // Remove the highlight animation class after it completes
        setTimeout(() => {
          blockElement.classList.remove('issue-highlight-animation');
        }, 1500);
      }, 300);
    }
  }, [selectBlock]);

  // Check for PDF from analyzer page (via sessionStorage)
  useEffect(() => {
    const loadFromAnalyzer = async () => {
      const pdfData = sessionStorage.getItem('analyzerPdfData');
      const pdfName = sessionStorage.getItem('analyzerPdfName');
      
      if (pdfData && pdfName) {
        // Clear the sessionStorage data after reading
        sessionStorage.removeItem('analyzerPdfData');
        sessionStorage.removeItem('analyzerPdfName');
        
        try {
          setIsUploading(true);
          
          // Convert base64 back to File
          const response = await fetch(pdfData);
          const blob = await response.blob();
          const file = new File([blob], pdfName, { type: 'application/pdf' });
          
          // Process the file
          pdfBytesRef.current = await fileToArrayBuffer(file);
          const url = URL.createObjectURL(file);
          setPdf(file, url);
          const result = await extractPDFBlocks(file);
          setExtractionResult(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF from analyzer');
        } finally {
          setIsUploading(false);
        }
      }
    };
    
    loadFromAnalyzer();
  }, [setPdf, setExtractionResult]);

  // Handle scale change
  const handleScaleChange = useCallback(
    (newScale: number) => {
      setScale(Math.max(0.5, Math.min(2, newScale)));
    },
    [setScale]
  );

  // Handle page change
  const handlePageChange = useCallback(
    (newPage: number) => {
      const maxPage = (state.extractionResult?.pages.length || 1) - 1;
      setPage(Math.max(0, Math.min(maxPage, newPage)));
    },
    [state.extractionResult?.pages.length, setPage]
  );

  // Trigger file input click
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Get weak blocks as array for sidebar
  const weakBlocksArray = Array.from(state.weakBlocks.entries()).map(([blockId, weakness]) => ({
    blockId,
    ...weakness,
  }));

  // Get section stats
  const sectionStats = state.extractionResult?.sections
    ? Object.entries(state.extractionResult.sections).map(([section, blocks]) => ({
        section,
        count: blocks.length,
        hasIssues: blocks.some((b) => state.weakBlocks.has(b.id)),
      }))
    : [];

  // Format last save time
  const formatLastSaveTime = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gray-100 font-comfortaa">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-mclaren">
                Resume <span className="text-[#007DE3]">Editor</span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Edit your resume directly on the document
                {lastSaveTime && !hasPendingChanges && (
                  <span className="ml-2 text-green-600">
                    • Saved {formatLastSaveTime(lastSaveTime)}
                  </span>
                )}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {state.extractionResult && (
                <>
                  {/* Save Button */}
                  <motion.button
                    whileHover={{ scale: hasPendingChanges ? 1.02 : 1 }}
                    whileTap={{ scale: hasPendingChanges ? 0.98 : 1 }}
                    onClick={handleSave}
                    disabled={isSaving || !hasPendingChanges}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2
                      ${isSaving
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : hasPendingChanges
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        {hasPendingChanges ? 'Save' : 'Saved'}
                      </>
                    )}
                  </motion.button>

                  {/* Analyze Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAnalyze}
                    disabled={state.isAnalyzing || isSaving}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2
                      ${state.isAnalyzing || isSaving
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-300 hover:bg-yellow-100'
                      }
                    `}
                  >
                    {state.isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                        {isSaving ? 'Saving first...' : 'Analyzing...'}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Analyze
                      </>
                    )}
                  </motion.button>

                  {/* Download Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExport}
                    disabled={state.isExporting}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2
                      ${state.isExporting
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-[#007DE3] text-white hover:bg-[#0066b8]'
                      }
                    `}
                  >
                    {state.isExporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </>
                    )}
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">{error}</div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload area */}
        {!state.extractionResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-12 max-w-2xl mx-auto"
          >
            <div
              onClick={handleUploadClick}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                transition-all duration-200
                ${isUploading ? 'border-[#007DE3] bg-blue-50' : 'border-gray-300 hover:border-[#007DE3] hover:bg-gray-50'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />

              {isUploading ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-3 border-[#007DE3] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-600 font-medium">Processing PDF...</p>
                  <p className="text-sm text-gray-500 mt-1">Extracting text blocks</p>
                </div>
              ) : (
                <>
                  <svg
                    className="w-16 h-16 mx-auto text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-xl font-medium text-gray-700 mb-2">
                    Upload your resume PDF
                  </p>
                  <p className="text-gray-500 text-sm">
                    Click to browse or drag and drop
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Editor area */}
        {state.extractionResult && state.pdfUrl && (
          <div className="flex gap-6">
            {/* Left Sidebar - Controls & Info */}
            <div className="w-72 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-md sticky top-20 overflow-hidden">
                {/* File info header */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900 text-sm truncate">
                    {state.pdfFile?.name || 'Resume'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {state.extractionResult.metadata.total_pages} page(s) - {state.extractionResult.blocks.length} text blocks
                  </p>
                </div>

                <div className="p-4 space-y-4">
                  {/* ATS Score Display - Now shows unified score from backend */}
                  {atsScore !== null && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        <span className="text-gray-700 font-medium text-sm">ATS Score:</span>
                        <span className={`font-bold text-xl ${
                          atsScore >= 70 ? 'text-green-600' : 
                          atsScore >= 55 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {atsScore}
                        </span>
                      </div>
                      {/* ATS Score Breakdown */}
                      {atsScoreDetails && (
                        <div className="border-t border-blue-100 p-3 space-y-2">
                          <div className="text-xs text-gray-500 mb-2">{atsScoreDetails.grade}</div>
                          {atsScoreDetails.breakdown.map((item, index) => (
                            <div key={index} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 truncate mr-2">{item.label}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      item.percentage >= 70 ? 'bg-green-500' : 
                                      item.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${item.percentage}%` }}
                                  />
                                </div>
                                <span className="text-gray-500 w-8 text-right">{item.score}/{item.max_score}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Issues found:</span>
                    <span className={`font-bold text-lg ${weakBlockCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {weakBlockCount}
                    </span>
                  </div>

                  {hasPendingChanges && (
                    <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                      <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                      You have unsaved changes
                    </div>
                  )}

                  {/* Zoom controls */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">
                      Zoom: {Math.round(state.scale * 100)}%
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleScaleChange(state.scale - 0.1)}
                        className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 text-lg"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={state.scale * 100}
                        onChange={(e) => handleScaleChange(parseInt(e.target.value) / 100)}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <button
                        onClick={() => handleScaleChange(state.scale + 0.1)}
                        className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Page navigation */}
                  {state.extractionResult.metadata.total_pages > 1 && (
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-2 block">
                        Page: {state.currentPage + 1} / {state.extractionResult.metadata.total_pages}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(state.currentPage - 1)}
                          disabled={state.currentPage === 0}
                          className="flex-1 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Prev
                        </button>
                        <button
                          onClick={() => handlePageChange(state.currentPage + 1)}
                          disabled={state.currentPage >= state.extractionResult.metadata.total_pages - 1}
                          className="flex-1 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sections */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-700 mb-2">Detected Sections</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {sectionStats.map(({ section, count, hasIssues }) => (
                        <div
                          key={section}
                          className={`
                            text-xs py-1.5 px-2 rounded flex items-center justify-between
                            ${hasIssues ? 'bg-yellow-50 text-yellow-800' : 'bg-gray-50 text-gray-600'}
                          `}
                        >
                          <span className="capitalize">{section}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Upload new */}
                  <button
                    onClick={handleUploadClick}
                    className="w-full py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Upload New PDF
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Document Canvas - Center */}
            <div className="flex-1 min-w-0">
              <div className="bg-gray-200 rounded-xl p-8 min-h-[800px] overflow-auto">
                {/* Word Mode Editor - MS Word-style inline editing */}
                <WordStyleEditor
                  ref={editorRef}
                  pdfUrl={state.pdfUrl}
                  extractionResult={state.extractionResult}
                  weakBlocks={state.weakBlocks}
                  scale={state.scale}
                  currentPage={state.currentPage}
                  isAnalyzing={state.isAnalyzing}
                  updatedBlocks={savedBlocksMap}
                  onTextChange={handleBlockTextChange}
                  onBlockSave={handleBlockSave}
                  onPendingChangesChange={handlePendingChangesChange}
                />
              </div>
            </div>

            {/* Right Sidebar - Issues */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-md sticky top-20 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Issues ({weakBlockCount})
                  </h3>
                  {weakBlockCount > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Click "Analyze" after making edits to update
                    </p>
                  )}
                </div>

                <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                  {weakBlocksArray.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium">No issues found</p>
                      <p className="text-xs mt-1">Click "Analyze" to check your resume</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {weakBlocksArray.map((issue) => {
                        const block = state.extractionResult?.blocks.find((b) => b.id === issue.blockId);
                        return (
                          <div
                            key={issue.blockId}
                            ref={(el) => {
                              if (el) issueRefs.current.set(issue.blockId, el);
                            }}
                            onClick={() => handleIssueClick(issue.blockId)}
                            className={`
                              p-4 cursor-pointer transition-colors
                              ${selectedIssueId === issue.blockId ? 'bg-blue-50' : 'hover:bg-gray-50'}
                            `}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`
                                  w-2 h-2 rounded-full mt-1.5 flex-shrink-0
                                  ${issue.severity === 'high' ? 'bg-red-500' : ''}
                                  ${issue.severity === 'medium' ? 'bg-yellow-500' : ''}
                                  ${issue.severity === 'low' ? 'bg-blue-500' : ''}
                                `}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 capitalize mb-1">
                                  {block?.section || 'Unknown'} section
                                </p>
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {issue.issue}
                                </p>
                                <p className="text-xs text-gray-600 line-clamp-2">
                                  {issue.suggestion}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}