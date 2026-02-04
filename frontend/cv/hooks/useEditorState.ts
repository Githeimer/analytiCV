/**
 * State management hook for the PDF inline editor
 * Uses useReducer for efficient state updates without re-rendering the whole page
 */

'use client';

import { useReducer, useCallback, useMemo } from 'react';
import type {
  EditorState,
  EditorAction,
  PDFExtractionResult,
  BlockWeakness,
  EditableBlockState,
  TextBlock,
} from '@/types/editor';

const initialState: EditorState = {
  pdfFile: null,
  pdfUrl: null,
  extractionResult: null,
  blocks: new Map(),
  weakBlocks: new Map(),
  selectedBlockId: null,
  isAnalyzing: false,
  isExporting: false,
  scale: 1,
  currentPage: 0,
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_PDF':
      return {
        ...state,
        pdfFile: action.payload.file,
        pdfUrl: action.payload.url,
      };

    case 'SET_EXTRACTION_RESULT': {
      const result = action.payload;
      const newBlocks = new Map<string, EditableBlockState>();

      result.blocks.forEach((block: TextBlock) => {
        newBlocks.set(block.id, {
          id: block.id,
          originalText: block.text,
          currentText: block.text,
          isEditing: false,
          isDirty: false,
          weakness: null,
        });
      });

      return {
        ...state,
        extractionResult: result,
        blocks: newBlocks,
        weakBlocks: new Map(),
        selectedBlockId: null,
      };
    }

    case 'UPDATE_BLOCK_TEXT': {
      const { id, text } = action.payload;
      const existingBlock = state.blocks.get(id);

      if (!existingBlock) return state;

      const newBlocks = new Map(state.blocks);
      newBlocks.set(id, {
        ...existingBlock,
        currentText: text,
        isDirty: text !== existingBlock.originalText,
      });

      return {
        ...state,
        blocks: newBlocks,
      };
    }

    case 'SET_BLOCK_EDITING': {
      const { id, isEditing } = action.payload;
      const existingBlock = state.blocks.get(id);

      if (!existingBlock) return state;

      const newBlocks = new Map(state.blocks);
      newBlocks.set(id, {
        ...existingBlock,
        isEditing,
      });

      return {
        ...state,
        blocks: newBlocks,
      };
    }

    case 'SET_WEAK_BLOCKS': {
      const weaknesses = action.payload;
      const newWeakBlocks = new Map<string, BlockWeakness>();

      weaknesses.forEach((weakness) => {
        newWeakBlocks.set(weakness.id, weakness);
      });

      return {
        ...state,
        weakBlocks: newWeakBlocks,
      };
    }

    case 'SELECT_BLOCK':
      return {
        ...state,
        selectedBlockId: action.payload,
      };

    case 'SET_ANALYZING':
      return {
        ...state,
        isAnalyzing: action.payload,
      };

    case 'SET_EXPORTING':
      return {
        ...state,
        isExporting: action.payload,
      };

    case 'SET_SCALE':
      return {
        ...state,
        scale: action.payload,
      };

    case 'SET_PAGE':
      return {
        ...state,
        currentPage: action.payload,
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function useEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const setPdf = useCallback((file: File, url: string) => {
    dispatch({ type: 'SET_PDF', payload: { file, url } });
  }, []);

  const setExtractionResult = useCallback((result: PDFExtractionResult) => {
    dispatch({ type: 'SET_EXTRACTION_RESULT', payload: result });
  }, []);

  const updateBlockText = useCallback((id: string, text: string) => {
    dispatch({ type: 'UPDATE_BLOCK_TEXT', payload: { id, text } });
  }, []);

  const setBlockEditing = useCallback((id: string, isEditing: boolean) => {
    dispatch({ type: 'SET_BLOCK_EDITING', payload: { id, isEditing } });
  }, []);

  const setWeakBlocks = useCallback((weaknesses: BlockWeakness[]) => {
    dispatch({ type: 'SET_WEAK_BLOCKS', payload: weaknesses });
  }, []);

  const selectBlock = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_BLOCK', payload: id });
  }, []);

  const setAnalyzing = useCallback((isAnalyzing: boolean) => {
    dispatch({ type: 'SET_ANALYZING', payload: isAnalyzing });
  }, []);

  const setExporting = useCallback((isExporting: boolean) => {
    dispatch({ type: 'SET_EXPORTING', payload: isExporting });
  }, []);

  const setScale = useCallback((scale: number) => {
    dispatch({ type: 'SET_SCALE', payload: scale });
  }, []);

  const setPage = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', payload: page });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Get modified blocks for export
  const getModifiedBlocks = useCallback(() => {
    const modified: Array<{ id: string; originalText: string; currentText: string }> = [];

    state.blocks.forEach((block, id) => {
      if (block.isDirty) {
        modified.push({
          id,
          originalText: block.originalText,
          currentText: block.currentText,
        });
      }
    });

    return modified;
  }, [state.blocks]);

  // Get current text for all blocks
  const getCurrentTexts = useCallback(() => {
    const texts: Record<string, string> = {};

    state.blocks.forEach((block, id) => {
      texts[id] = block.currentText;
    });

    return texts;
  }, [state.blocks]);

  // Memoized selectors
  const hasUnsavedChanges = useMemo(() => {
    let hasChanges = false;
    state.blocks.forEach((block) => {
      if (block.isDirty) hasChanges = true;
    });
    return hasChanges;
  }, [state.blocks]);

  const weakBlockCount = useMemo(() => state.weakBlocks.size, [state.weakBlocks]);

  return {
    state,
    // Actions
    setPdf,
    setExtractionResult,
    updateBlockText,
    setBlockEditing,
    setWeakBlocks,
    selectBlock,
    setAnalyzing,
    setExporting,
    setScale,
    setPage,
    reset,
    // Utilities
    getModifiedBlocks,
    getCurrentTexts,
    // Computed values
    hasUnsavedChanges,
    weakBlockCount,
  };
}

export type EditorStateHook = ReturnType<typeof useEditorState>;
