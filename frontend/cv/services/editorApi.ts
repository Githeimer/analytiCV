/**
 * API service for the PDF inline editor - FINAL FIXED VERSION
 * 
 * Key Improvements:
 * - Merges saved edits when extracting PDF blocks
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

// Use Next.js process.env for environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Conditional logging helper
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
        
        // Step 3: Merge saved edits with original blocks
        result.data.blocks = result.data.blocks.map((block: TextBlock) => {
          if (savedEdits[block.id]) {
            log(`  Applying saved edit to block ${block.id}`);
            return {
              ...block,
              text: savedEdits[block.id]  // Use saved text instead of original
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
    // Continue with original text if can't load edits
  }

  return result.data;
}

/**
 * Analyze blocks for weaknesses and get improvement suggestions
 */
export async function analyzeBlocks(
  blocks: TextBlock[],
  jobDescription?: string
): Promise<AnalysisResult> {
  log('Analyzing', blocks.length, 'blocks');
  
  const response = await fetch(`${API_BASE_URL}/api/analyze-blocks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      blocks,
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

export interface UpdateResumeResponse {
  success: boolean;
  message: string;
  atsScore?: number;
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

// Type guard for SaveError
function isSaveError(error: unknown): error is SaveError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

// Request deduplication map - prevents duplicate saves
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
  
  // Validate input before making request
  if (!blocks || blocks.length === 0) {
    log('No blocks to save, returning early');
    return {
      success: true,
      message: 'No changes to save',
    };
  }

  // Check for duplicate request
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
        // Try to parse error response
        let errorMessage = 'Failed to save changes';
        let errorCode: SaveError['code'] = 'SERVER_ERROR';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // Response body not JSON, use status text
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
      // This marks the edits as "synced" (not dirty)
      saveEditsToStorage(blocks, 'current_resume', false);
      markEditsSynced();
      
      return result as UpdateResumeResponse;

    } catch (error: unknown) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        const saveError: SaveError = {
          message: 'Request timed out. Please try again.',
          code: 'NETWORK_ERROR',
        };
        throw saveError;
      }

      // Handle network errors with retry
      if (error instanceof TypeError) {
        if (retry > 0) {
          log(`Network error, retrying... (${retry} attempts left)`);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          return updateResumeBlocks(blocks, { retry: retry - 1, timeout });
        }
        
        const saveError: SaveError = {
          message: 'Network error. Make sure backend is running on http://localhost:8000',
          code: 'NETWORK_ERROR',
        };
        throw saveError;
      }

      // Re-throw SaveError as-is
      if (isSaveError(error)) {
        throw error;
      }

      // Unknown error
      const saveError: SaveError = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      };
      throw saveError;
    } finally {
      // Clean up pending request
      pendingRequests.delete(requestKey);
    }
  })();

  // Store the promise to deduplicate concurrent requests
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
  // Filter out blocks where text did not actually change
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