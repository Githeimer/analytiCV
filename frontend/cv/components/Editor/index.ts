/**
 * Editor Components Index
 * Export all components for the document-style inline editor
 */

// Original block-based editing components
export { default as EditableBlock } from './EditableBlock';
export { default as PDFRenderer } from './PDFRenderer';
export { default as ResumePaper } from './ResumePaper';
export { default as SuggestionPopover } from './SuggestionPopover';
export { default as AISuggestionTooltip } from './AISuggestionTooltip';

// Seamless text layer editing components
export { default as EditableTextLayer } from './EditableTextLayer';
export { default as SeamlessResumePaper } from './SeamlessResumePaper';

// MS Word-style inline editing components (Ghost Text Layer strategy)
export { default as DocumentCanvas } from './DocumentCanvas';
export { default as WordStyleEditor } from './WordStyleEditor';
