/**
 * Types for the Document-Style Inline PDF Editor
 * Strict interfaces to eliminate 'implicit any' TypeScript errors
 */

// Strict interface for PDF text block positioning and styling
// Used for precise overlay placement in the Virtual Text Layer
export interface PDFTextBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
}

// Text block extracted from PDF with coordinates
export interface TextBlock {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  font_size: number;
  font_name: string;
  block_type: BlockType;
  section: SectionType | null;
}

export type BlockType = 
  | 'header'
  | 'paragraph'
  | 'bullet'
  | 'contact'
  | 'date_entry';

export type SectionType = 
  | 'header'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'summary'
  | 'contact'
  | 'other';

// Page information from PDF
export interface PageInfo {
  page_number: number;
  width: number;
  height: number;
  width_mm: number;
  height_mm: number;
}

// PDF extraction response
export interface PDFExtractionResult {
  pages: PageInfo[];
  blocks: TextBlock[];
  sections: Record<SectionType | string, TextBlock[]>;
  metadata: {
    total_pages: number;
    filename: string;
  };
}

// Weakness analysis for a block
export interface BlockWeakness {
  id: string;
  section?: string;  // Section name for display
  issue: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
  improved_text?: string;
}

// ATS Score breakdown item (matches backend structure)
export interface ATSBreakdownItem {
  label: string;
  score: number;
  max_score: number;
  percentage: number;
}

// ATS Score details (matches backend structure)
export interface ATSScoreDetails {
  total_score: number;
  grade: string;
  breakdown: ATSBreakdownItem[];
}

// Analysis response
export interface AnalysisResult {
  success: boolean;
  weak_blocks: BlockWeakness[];
  total_analyzed: number;
  issues_found: number;
  ats_score?: number;
  ats_score_details?: ATSScoreDetails;
}

// Editor state for a single block
export interface EditableBlockState {
  id: string;
  originalText: string;
  currentText: string;
  isEditing: boolean;
  isDirty: boolean;
  weakness: BlockWeakness | null;
}

// Full editor state
export interface EditorState {
  pdfFile: File | null;
  pdfUrl: string | null;
  extractionResult: PDFExtractionResult | null;
  blocks: Map<string, EditableBlockState>;
  weakBlocks: Map<string, BlockWeakness>;
  selectedBlockId: string | null;
  isAnalyzing: boolean;
  isExporting: boolean;
  scale: number;
  currentPage: number;
}

// Editor actions
export type EditorAction =
  | { type: 'SET_PDF'; payload: { file: File; url: string } }
  | { type: 'SET_EXTRACTION_RESULT'; payload: PDFExtractionResult }
  | { type: 'UPDATE_BLOCK_TEXT'; payload: { id: string; text: string } }
  | { type: 'SET_BLOCK_EDITING'; payload: { id: string; isEditing: boolean } }
  | { type: 'SET_WEAK_BLOCKS'; payload: BlockWeakness[] }
  | { type: 'SELECT_BLOCK'; payload: string | null }
  | { type: 'SET_ANALYZING'; payload: boolean }
  | { type: 'SET_EXPORTING'; payload: boolean }
  | { type: 'SET_SCALE'; payload: number }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'RESET' };

// Popover position
export interface PopoverPosition {
  x: number;
  y: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

// Props for EditableBlock component
export interface EditableBlockProps {
  block: TextBlock;
  state: EditableBlockState;
  weakness: BlockWeakness | null;
  scale: number;
  onTextChange: (id: string, text: string) => void;
  onSelect: (id: string) => void;
  onApplySuggestion: (id: string, newText: string) => void;
}

// Props for SuggestionPopover component
export interface SuggestionPopoverProps {
  weakness: BlockWeakness;
  position: PopoverPosition;
  isVisible: boolean;
  onApply: (improvedText: string) => void;
  onDismiss: () => void;
}

// Props for ResumePaper component
export interface ResumePaperProps {
  pdfUrl: string;
  extractionResult: PDFExtractionResult;
  blocks: Map<string, EditableBlockState>;
  weakBlocks: Map<string, BlockWeakness>;
  selectedBlockId: string | null;
  scale: number;
  currentPage: number;
  onBlockTextChange: (id: string, text: string) => void;
  onBlockSelect: (id: string | null) => void;
  onApplySuggestion: (id: string, newText: string) => void;
}

// Export options
export interface ExportOptions {
  filename?: string;
  preserveOriginalLayout: boolean;
}

// PDF.js render task type for proper ref typing
export interface PDFRenderTask {
  promise: Promise<void>;
  cancel: () => void;
}

// ATS Score update callback
export interface ATSScoreUpdate {
  blockId: string;
  newText: string;
  timestamp: number;
}
