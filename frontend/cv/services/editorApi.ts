/**
 * API service for the PDF inline editor
 */

import type {
  PDFExtractionResult,
  AnalysisResult,
  TextBlock,
} from '@/types/editor';

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
 */
export async function extractPDFBlocks(file: File): Promise<PDFExtractionResult> {
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

  return result.data;
}

/**
 * Analyze blocks for weaknesses and get improvement suggestions
 */
export async function analyzeBlocks(
  blocks: TextBlock[],
  jobDescription?: string
): Promise<AnalysisResult> {
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

  return response.json();
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

// Fixed: Type guard for SaveError
function isSaveError(error: unknown): error is SaveError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

/**
 * Update resume blocks on the backend with robust error handling.
 * Returns a structured response or throws a SaveError for UI handling.
 */
export async function updateResumeBlocks(
  blocks: BlockUpdate[]
): Promise<UpdateResumeResponse> {
  log('updateResumeBlocks called with', blocks.length, 'block(s)');
  
  // Validate input before making request
  if (!blocks || blocks.length === 0) {
    log('No blocks to save, returning early');
    return {
      success: true,
      message: 'No changes to save',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    log('Making POST request to:', `${API_BASE_URL}/api/update-resume`);
    log('Request body:', JSON.stringify({ blocks }, null, 2));

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
        errorMessage = 'Save endpoint not found. Please check server configuration.';
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
    return result as UpdateResumeResponse;

  } catch (error: unknown) {
    clearTimeout(timeoutId); // Fixed: Ensure timeout is cleared on error too

    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      const saveError: SaveError = {
        message: 'Request timed out. Please try again.',
        code: 'NETWORK_ERROR',
      };
      throw saveError;
    }

    // Handle network errors (Fixed: more robust check)
    if (error instanceof TypeError) {
      const saveError: SaveError = {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      };
      throw saveError;
    }

    // Re-throw SaveError as-is (Fixed: proper type guard)
    if (isSaveError(error)) {
      throw error;
    }

    // Unknown error
    const saveError: SaveError = {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
    throw saveError;
  }
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
