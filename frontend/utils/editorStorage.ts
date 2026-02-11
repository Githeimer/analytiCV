/**
 * Editor Storage Utility
 * Manages localStorage persistence for resume edits
 * 
 * Features:
 * - Syncs edits to localStorage immediately after API success
 * - Tracks "dirty" state for unsaved changes
 * - Compares timestamps to determine if localStorage version is newer
 * - Provides recovery from browser refresh
 * - CRITICAL FIX: Added clearEditsFromStorage() to prevent stale edits on new uploads
 */

import type { BlockUpdate } from '@/services/editorApi';

// Storage keys
const STORAGE_KEYS = {
  EDITS: 'analyticv_editor_edits',
  TIMESTAMP: 'analyticv_editor_timestamp',
  PDF_NAME: 'analyticv_editor_pdf_name',
  DIRTY_FLAG: 'analyticv_editor_dirty',
} as const;

// Stored edit data structure
export interface StoredEdits {
  edits: Record<string, string>; // blockId -> newText
  timestamp: number;
  pdfName: string;
  isDirty: boolean;
}

/**
 * Save edits to localStorage after successful API call
 */
export function saveEditsToStorage(
  updates: BlockUpdate[],
  pdfName: string,
  markDirty: boolean = false
): void {
  try {
    // Get existing edits
    const existing = getStoredEdits();
    const edits = existing?.pdfName === pdfName ? existing.edits : {};

    // Merge new updates
    for (const update of updates) {
      edits[update.blockId] = update.newText;
    }

    // Save to localStorage
    const storageData: StoredEdits = {
      edits,
      timestamp: Date.now(),
      pdfName,
      isDirty: markDirty,
    };

    localStorage.setItem(STORAGE_KEYS.EDITS, JSON.stringify(edits));
    localStorage.setItem(STORAGE_KEYS.TIMESTAMP, String(storageData.timestamp));
    localStorage.setItem(STORAGE_KEYS.PDF_NAME, pdfName);
    localStorage.setItem(STORAGE_KEYS.DIRTY_FLAG, String(markDirty));

    console.log('[EditorStorage] Saved edits to localStorage:', {
      count: updates.length,
      totalEdits: Object.keys(edits).length,
      pdfName,
      isDirty: markDirty,
    });
  } catch (error) {
    console.error('[EditorStorage] Failed to save edits:', error);
  }
}

/**
 * Get stored edits from localStorage
 */
export function getStoredEdits(): StoredEdits | null {
  try {
    const editsJson = localStorage.getItem(STORAGE_KEYS.EDITS);
    const timestamp = localStorage.getItem(STORAGE_KEYS.TIMESTAMP);
    const pdfName = localStorage.getItem(STORAGE_KEYS.PDF_NAME);
    const isDirty = localStorage.getItem(STORAGE_KEYS.DIRTY_FLAG);

    if (!editsJson || !timestamp || !pdfName) {
      return null;
    }

    return {
      edits: JSON.parse(editsJson),
      timestamp: parseInt(timestamp, 10),
      pdfName,
      isDirty: isDirty === 'true',
    };
  } catch (error) {
    console.error('[EditorStorage] Failed to get stored edits:', error);
    return null;
  }
}

/**
 * Mark edits as synced (not dirty) after successful API save
 */
export function markEditsSynced(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DIRTY_FLAG, 'false');
    localStorage.setItem(STORAGE_KEYS.TIMESTAMP, String(Date.now()));
    console.log('[EditorStorage] Marked edits as synced');
  } catch (error) {
    console.error('[EditorStorage] Failed to mark edits synced:', error);
  }
}

/**
 * Mark edits as dirty (unsaved local changes)
 */
export function markEditsDirty(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DIRTY_FLAG, 'true');
    console.log('[EditorStorage] Marked edits as dirty');
  } catch (error) {
    console.error('[EditorStorage] Failed to mark edits dirty:', error);
  }
}

/**
 * Check if there are dirty (unsaved) edits for a specific PDF
 */
export function hasDirtyEdits(pdfName: string): boolean {
  const stored = getStoredEdits();
  return stored !== null && stored.pdfName === pdfName && stored.isDirty;
}

/**
 * Check if localStorage has a newer version of edits than a given timestamp
 */
export function hasNewerEdits(pdfName: string, compareTimestamp: number): boolean {
  const stored = getStoredEdits();
  if (!stored || stored.pdfName !== pdfName) {
    return false;
  }
  return stored.timestamp > compareTimestamp;
}

/**
 * Get edits for a specific PDF if they exist
 */
export function getEditsForPdf(pdfName: string): Record<string, string> | null {
  const stored = getStoredEdits();
  if (!stored || stored.pdfName !== pdfName) {
    return null;
  }
  return stored.edits;
}

/**
 * Clear all stored edits
 */
export function clearStoredEdits(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.EDITS);
    localStorage.removeItem(STORAGE_KEYS.TIMESTAMP);
    localStorage.removeItem(STORAGE_KEYS.PDF_NAME);
    localStorage.removeItem(STORAGE_KEYS.DIRTY_FLAG);
    console.log('[EditorStorage] Cleared all stored edits');
  } catch (error) {
    console.error('[EditorStorage] Failed to clear edits:', error);
  }
}

/**
 * CRITICAL FIX: Clear all edits from localStorage
 * Called when uploading a new PDF to prevent stale edits
 * 
 * This is an alias for clearStoredEdits() to match the naming convention
 * used in the fixed editorApi.ts file
 */
export function clearEditsFromStorage(): void {
  clearStoredEdits();
  console.log('[EditorStorage] ✅ Cleared all edits from localStorage (new PDF upload)');
}

/**
 * Clear edits only for a specific PDF
 */
export function clearEditsForPdf(pdfName: string): void {
  const stored = getStoredEdits();
  if (stored?.pdfName === pdfName) {
    clearStoredEdits();
  }
}

/**
 * Merge stored edits with extracted blocks
 * Returns the block text with any saved edits applied
 */
export function mergeWithStoredEdits(
  blockId: string,
  originalText: string,
  pdfName: string
): string {
  const stored = getStoredEdits();
  if (!stored || stored.pdfName !== pdfName) {
    return originalText;
  }

  const savedText = stored.edits[blockId];
  return savedText !== undefined ? savedText : originalText;
}

/**
 * Get storage info for debugging
 */
export function getStorageInfo(): {
  hasEdits: boolean;
  editCount: number;
  pdfName: string | null;
  timestamp: Date | null;
  isDirty: boolean;
} {
  const stored = getStoredEdits();
  return {
    hasEdits: stored !== null,
    editCount: stored ? Object.keys(stored.edits).length : 0,
    pdfName: stored?.pdfName || null,
    timestamp: stored ? new Date(stored.timestamp) : null,
    isDirty: stored?.isDirty || false,
  };
}