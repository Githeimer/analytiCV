/**
 * API service for the PDF inline editor - FIXED VERSION
 * 
 * CRITICAL FIX: analyzeBlocks now merges saved edits before analysis
 * - This ensures the backend analyzes the CURRENT state, not the original PDF
 * - Prevents UI reversion after clicking "Analyze"
 * 
 * Key Improvements:
 * - Merges saved edits when extracting PDF blocks
 * - Merges saved edits BEFORE sending to analyze endpoint
 * - Better error handling with retry logic
 * - Request deduplication to prevent duplicate saves
 * - Proper timeout handling
 * - LocalStorage sync for offline recovery
 */

import type {
  PDFExtractionResult,
  AnalysisResult,
  TextBlock,
} from '@/types/editor';
import {
  saveEditsToStorage,
  markEditsSynced,
  getEditsForPdf,
  getStoredEdits,
} from '@/utils/editorStorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const isDev = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => {
  if (isDev) {
    console.log('[editorApi]', ...args);
  }
};

/**
 * Extract text blocks with coordinates from a PDF file
 * IMPORTANT: This now merges saved edits with the extracted blocks
 * Priority: localStorage (dirty) > backend > original
 */
export async function extractPDFBlocks(file: File): Promise<PDFExtractionResult> {
  log('Extracting PDF blocks from:', file.name);
  
  // Step 1: Extract original blocks from PDF
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/extract-pdf-blocks`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to extract PDF blocks');
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error('PDF extraction failed');
  }

  // Step 2: Check localStorage for dirty edits first (survives page refresh)
  const storedEdits = getStoredEdits();
  if (storedEdits && storedEdits.pdfName === file.name && storedEdits.isDirty) {
    log('Found dirty localStorage edits, applying...');
    result.data.blocks = result.data.blocks.map((block: TextBlock) => {
      if (storedEdits.edits[block.id]) {
        log(`  Applying localStorage edit to block ${block.id}`);
        return {
          ...block,
          text: storedEdits.edits[block.id],
        };
      }
      return block;
    });
    log(`Applied ${Object.keys(storedEdits.edits).length} localStorage edits`);
    return result.data;
  }

  // Step 3: Fetch saved edits from backend (if any)
  try {
    log('Fetching saved edits for:', file.name);
    const editsResponse = await fetch(`${API_BASE_URL}/api/get-edits/current_resume`);
    
    if (editsResponse.ok) {
      const editsData = await editsResponse.json();
      const savedEdits = editsData.edits || {};
      
      if (Object.keys(savedEdits).length > 0) {
        log(`Found ${Object.keys(savedEdits).length} saved edits, merging...`);
        
        result.data.blocks = result.data.blocks.map((block: TextBlock) => {
          if (savedEdits[block.id]) {
            log(`  Applying saved edit to block ${block.id}`);
            return {
              ...block,
              text: savedEdits[block.id]
            };
          }
          return block;
        });
        
        log(`✅ Successfully merged ${Object.keys(savedEdits).length} saved edits`);
      } else {
        log('No saved edits found');
      }
    }
  } catch (err) {
    log('⚠️ Could not load saved edits (continuing with original text):', err);
  }

  return result.data;
}

/**
 * CRITICAL FIX: Merge saved edits into blocks before analysis
 * This ensures the backend analyzes the CURRENT state, not the original PDF
 */
async function mergeCurrentEditsIntoBlocks(blocks: TextBlock[]): Promise<TextBlock[]> {
  log('Merging current edits into blocks before analysis...');
  
  // Priority 1: localStorage (dirty, unsaved edits)
  const storedEdits = getStoredEdits();
  if (storedEdits && storedEdits.isDirty && Object.keys(storedEdits.edits).length > 0) {
    log(`Found ${Object.keys(storedEdits.edits).length} dirty localStorage edits`);
    const mergedBlocks = blocks.map(block => {
      if (storedEdits.edits[block.id]) {
        log(`  Applying localStorage edit to block ${block.id}: "${block.text}" -> "${storedEdits.edits[block.id]}"`);
        return {
          ...block,
          text: storedEdits.edits[block.id],
        };
      }
      return block;
    });
    log('✅ Merged localStorage edits into blocks for analysis');
    return mergedBlocks;
  }

  // Priority 2: Backend saved edits (synced)
  try {
    const editsResponse = await fetch(`${API_BASE_URL}/api/get-edits/current_resume`);
    if (editsResponse.ok) {
      const editsData = await editsResponse.json();
      const savedEdits = editsData.edits || {};
      
      if (Object.keys(savedEdits).length > 0) {
        log(`Found ${Object.keys(savedEdits).length} backend saved edits`);
        const mergedBlocks = blocks.map(block => {
          if (savedEdits[block.id]) {
            log(`  Applying backend edit to block ${block.id}: "${block.text}" -> "${savedEdits[block.id]}"`);
            return {
              ...block,
              text: savedEdits[block.id],
            };
          }
          return block;
        });
        log('✅ Merged backend edits into blocks for analysis');
        return mergedBlocks;
      }
    }
  } catch (err) {
    log('⚠️ Could not fetch saved edits for analysis merge:', err);
  }

  // Priority 3: Original blocks (no edits found)
  log('No saved edits found, using original blocks for analysis');
  return blocks;
}

/**
 * Analyze blocks for weaknesses and get improvement suggestions
 * CRITICAL FIX: Now merges saved edits BEFORE sending to backend
 */
export async function analyzeBlocks(
  blocks: TextBlock[],
  jobDescription?: string
): Promise<AnalysisResult> {
  log('analyzeBlocks called with', blocks.length, 'blocks');
  
  // CRITICAL: Merge current edits into blocks before analysis
  const blocksWithEdits = await mergeCurrentEditsIntoBlocks(blocks);
  
  log('Sending blocks to backend for analysis (with merged edits)');
  
  const response = await fetch(`${API_BASE_URL}/api/analyze-blocks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      blocks: blocksWithEdits,  // Send blocks WITH edits applied
      job_description: jobDescription,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to analyze blocks');
  }

  const result = await response.json();
  log('Analysis complete:', result);
  return result;
}

/**
 * Generate PDF from modified resume data
 */
export async function generatePDF(resumeData: Record<string, unknown>): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/generate-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resumeData),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Failed to generate PDF');
  }

  return response.blob();
}

/**
 * Update resume block text on the backend
 * Used for persisting edits made in the inline editor
 */
export interface BlockUpdate {
  blockId: string;
  oldText: string;
  newText: string;
  section?: string;
}

/**
 * ATS Score breakdown item (matches backend ATSBreakdownItem)
 */
export interface ATSBreakdownItem {
  label: string;
  score: number;
  max_score: number;
  percentage: number;
}

/**
 * Detailed ATS Score (matches backend ATSScoreDetails)
 */
export interface ATSScoreDetails {
  total_score: number;
  grade: string;
  breakdown: ATSBreakdownItem[];
}

export interface UpdateResumeResponse {
  success: boolean;
  message: string;
  atsScore?: number;
  atsScoreDetails?: ATSScoreDetails;
  updatedBlocks?: string[];
}

/**
 * Save error type for UI feedback
 */
export interface SaveError {
  message: string;
  code: 'NETWORK_ERROR' | 'SERVER_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
  details?: string;
}

function isSaveError(error: unknown): error is SaveError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

const pendingRequests = new Map<string, Promise<UpdateResumeResponse>>();

/**
 * Create a unique key for a block update to deduplicate requests
 */
function getRequestKey(blocks: BlockUpdate[]): string {
  return blocks.map(b => `${b.blockId}:${b.newText}`).join('|');
}

/**
 * Update resume blocks on the backend with robust error handling.
 * Returns a structured response or throws a SaveError for UI handling.
 * 
 * Features:
 * - Request deduplication
 * - Automatic retry on network errors
 * - Proper timeout handling
 */
export async function updateResumeBlocks(
  blocks: BlockUpdate[],
  options: {
    retry?: number;
    timeout?: number;
  } = {}
): Promise<UpdateResumeResponse> {
  const { retry = 1, timeout = 10000 } = options;
  
  log('updateResumeBlocks called with', blocks.length, 'block(s)');
  
  if (!blocks || blocks.length === 0) {
    log('No blocks to save, returning early');
    return {
      success: true,
      message: 'No changes to save',
    };
  }

  const requestKey = getRequestKey(blocks);
  const existingRequest = pendingRequests.get(requestKey);
  if (existingRequest) {
    log('Duplicate request detected, returning existing promise');
    return existingRequest;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestPromise = (async (): Promise<UpdateResumeResponse> => {
    try {
      log('Making POST request to:', `${API_BASE_URL}/api/update-resume`);
      log('Request payload:', { blocks });

      const response = await fetch(`${API_BASE_URL}/api/update-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blocks }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to save changes';
        let errorCode: SaveError['code'] = 'SERVER_ERROR';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }

        if (response.status === 404) {
          errorCode = 'SERVER_ERROR';
          errorMessage = 'Save endpoint not found. Make sure backend is running on http://localhost:8000';
        } else if (response.status === 422) {
          errorCode = 'VALIDATION_ERROR';
        } else if (response.status >= 500) {
          errorCode = 'SERVER_ERROR';
        }

        const error: SaveError = {
          message: errorMessage,
          code: errorCode,
          details: `HTTP ${response.status}`,
        };
        throw error;
      }

      const result = await response.json();
      log('Save successful:', result);
      
      // Sync to localStorage after successful API save
      saveEditsToStorage(blocks, 'current_resume', false);
      markEditsSynced();
      
      return result as UpdateResumeResponse;

    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        const saveError: SaveError = {
          message: 'Request timed out. Please try again.',
          code: 'NETWORK_ERROR',
        };
        throw saveError;
      }

      if (error instanceof TypeError) {
        if (retry > 0) {
          log(`Network error, retrying... (${retry} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return updateResumeBlocks(blocks, { retry: retry - 1, timeout });
        }
        
        const saveError: SaveError = {
          message: 'Network error. Make sure backend is running on http://localhost:8000',
          code: 'NETWORK_ERROR',
        };
        throw saveError;
      }

      if (isSaveError(error)) {
        throw error;
      }

      const saveError: SaveError = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      };
      throw saveError;
    } finally {
      pendingRequests.delete(requestKey);
    }
  })();

  pendingRequests.set(requestKey, requestPromise);

  return requestPromise;
}

/**
 * Batch update multiple blocks with debouncing handled on frontend.
 * Provides additional validation and filtering of empty updates.
 */
export async function batchUpdateBlocks(
  blocks: BlockUpdate[]
): Promise<UpdateResumeResponse> {
  const validBlocks = blocks.filter(
    (block) => block.oldText !== block.newText && block.newText.trim().length > 0
  );

  if (validBlocks.length === 0) {
    return { success: true, message: 'No changes to save' };
  }

  return updateResumeBlocks(validBlocks);
}

/**
 * Clear all pending requests (useful for cleanup)
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}

/**
 * Get saved edits for a PDF (for debugging)
 */
export async function getSavedEdits(pdfName: string = 'current_resume'): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/get-edits/${pdfName}`);
    if (response.ok) {
      const data = await response.json();
      return data.edits || {};
    }
  } catch (err) {
    log('Failed to get saved edits:', err);
  }
  return {};
}