/**
 * FontMapper Utility
 * Maps PDF.js font metadata to system fonts for consistent display and PDF export
 * 
 * Features:
 * - Detects font family from PDF.js metadata (e.g., 'g_d0_f1')
 * - Maps custom fonts to closest system fonts (Serif to Serif, Sans to Sans)
 * - Provides standardized font names for pdf-lib embedding
 */

import { StandardFonts } from 'pdf-lib';

// Font classification types
export type FontCategory = 'serif' | 'sans-serif' | 'monospace' | 'decorative';
export type FontWeight = 'normal' | 'bold' | 'light';
export type FontStyle = 'normal' | 'italic' | 'oblique';

// Parsed font information
export interface ParsedFontInfo {
  category: FontCategory;
  weight: FontWeight;
  style: FontStyle;
  originalName: string;
  displayFont: string;
  pdfLibFont: typeof StandardFonts[keyof typeof StandardFonts];
}

// Common font patterns for classification
const SERIF_PATTERNS = [
  'times', 'georgia', 'garamond', 'palatino', 'cambria', 'book',
  'roman', 'serif', 'minion', 'century', 'caslon', 'baskerville',
  'didot', 'bodoni', 'rockwell', 'clarendon', 'charter', 'merriweather',
];

const SANS_SERIF_PATTERNS = [
  'arial', 'helvetica', 'verdana', 'tahoma', 'calibri', 'sans',
  'gothic', 'grotesque', 'futura', 'avenir', 'roboto', 'open sans',
  'lato', 'montserrat', 'proxima', 'source sans', 'nunito', 'inter',
  'segoe', 'trebuchet', 'lucida', 'gill', 'optima', 'candara',
];

const MONOSPACE_PATTERNS = [
  'mono', 'courier', 'consolas', 'menlo', 'code', 'typewriter',
  'source code', 'fira code', 'jetbrains', 'inconsolata',
];

const BOLD_PATTERNS = ['bold', 'heavy', 'black', 'semibold', 'demi', 'medium'];
const ITALIC_PATTERNS = ['italic', 'oblique', 'slant', 'inclined'];
const LIGHT_PATTERNS = ['light', 'thin', 'hairline', 'ultralight'];

/**
 * Detect font category from font name
 */
function detectFontCategory(fontName: string): FontCategory {
  const lowerName = fontName.toLowerCase();

  // Check monospace first (most specific)
  if (MONOSPACE_PATTERNS.some(pattern => lowerName.includes(pattern))) {
    return 'monospace';
  }

  // Check sans-serif
  if (SANS_SERIF_PATTERNS.some(pattern => lowerName.includes(pattern))) {
    return 'sans-serif';
  }

  // Check serif
  if (SERIF_PATTERNS.some(pattern => lowerName.includes(pattern))) {
    return 'serif';
  }

  // Default heuristics for PDF.js generic names (e.g., 'g_d0_f1')
  // If the font name is generic, assume serif as it's common for resumes
  if (fontName.startsWith('g_') || /^[a-z]_d\d+_f\d+$/i.test(fontName)) {
    return 'serif';
  }

  // Default to sans-serif for modern documents
  return 'sans-serif';
}

/**
 * Detect font weight from font name
 */
function detectFontWeight(fontName: string): FontWeight {
  const lowerName = fontName.toLowerCase();

  if (BOLD_PATTERNS.some(pattern => lowerName.includes(pattern))) {
    return 'bold';
  }

  if (LIGHT_PATTERNS.some(pattern => lowerName.includes(pattern))) {
    return 'light';
  }

  return 'normal';
}

/**
 * Detect font style from font name
 */
function detectFontStyle(fontName: string): FontStyle {
  const lowerName = fontName.toLowerCase();

  if (ITALIC_PATTERNS.some(pattern => lowerName.includes(pattern))) {
    return 'italic';
  }

  return 'normal';
}

/**
 * Get CSS font-family string for display
 */
function getDisplayFont(category: FontCategory, originalName: string): string {
  // Build fallback stack based on category
  switch (category) {
    case 'serif':
      return '"Times New Roman", Times, Georgia, serif';
    case 'sans-serif':
      return 'Arial, Helvetica, "Segoe UI", sans-serif';
    case 'monospace':
      return '"Courier New", Courier, Consolas, monospace';
    default:
      return 'system-ui, sans-serif';
  }
}

/**
 * Get pdf-lib StandardFont for embedding
 */
function getPdfLibFont(
  category: FontCategory,
  weight: FontWeight,
  style: FontStyle
): typeof StandardFonts[keyof typeof StandardFonts] {
  // Serif fonts
  if (category === 'serif') {
    if (weight === 'bold' && style === 'italic') {
      return StandardFonts.TimesRomanBoldItalic;
    }
    if (weight === 'bold') {
      return StandardFonts.TimesRomanBold;
    }
    if (style === 'italic') {
      return StandardFonts.TimesRomanItalic;
    }
    return StandardFonts.TimesRoman;
  }

  // Monospace fonts
  if (category === 'monospace') {
    if (weight === 'bold' && style === 'italic') {
      return StandardFonts.CourierBoldOblique;
    }
    if (weight === 'bold') {
      return StandardFonts.CourierBold;
    }
    if (style === 'italic') {
      return StandardFonts.CourierOblique;
    }
    return StandardFonts.Courier;
  }

  // Sans-serif fonts (default)
  if (weight === 'bold' && style === 'italic') {
    return StandardFonts.HelveticaBoldOblique;
  }
  if (weight === 'bold') {
    return StandardFonts.HelveticaBold;
  }
  if (style === 'italic') {
    return StandardFonts.HelveticaOblique;
  }
  return StandardFonts.Helvetica;
}

/**
 * Parse PDF.js font metadata and return standardized font information
 */
export function parsePdfFont(pdfJsFontName: string): ParsedFontInfo {
  const category = detectFontCategory(pdfJsFontName);
  const weight = detectFontWeight(pdfJsFontName);
  const style = detectFontStyle(pdfJsFontName);
  const displayFont = getDisplayFont(category, pdfJsFontName);
  const pdfLibFont = getPdfLibFont(category, weight, style);

  return {
    category,
    weight,
    style,
    originalName: pdfJsFontName,
    displayFont,
    pdfLibFont,
  };
}

/**
 * Get CSS font-weight value
 */
export function getFontWeightValue(weight: FontWeight): number {
  switch (weight) {
    case 'bold':
      return 700;
    case 'light':
      return 300;
    default:
      return 400;
  }
}

/**
 * Get CSS font-style value
 */
export function getFontStyleValue(style: FontStyle): string {
  return style === 'normal' ? 'normal' : 'italic';
}

/**
 * Build complete CSS font style object for a parsed font
 */
export function buildFontStyles(fontInfo: ParsedFontInfo, fontSize: number): React.CSSProperties {
  return {
    fontFamily: fontInfo.displayFont,
    fontSize: `${fontSize}px`,
    fontWeight: getFontWeightValue(fontInfo.weight),
    fontStyle: getFontStyleValue(fontInfo.style),
  };
}

/**
 * Font cache for performance
 */
const fontCache = new Map<string, ParsedFontInfo>();

/**
 * Get cached font info or parse and cache
 */
export function getFontInfo(pdfJsFontName: string): ParsedFontInfo {
  if (fontCache.has(pdfJsFontName)) {
    return fontCache.get(pdfJsFontName)!;
  }

  const fontInfo = parsePdfFont(pdfJsFontName);
  fontCache.set(pdfJsFontName, fontInfo);
  return fontInfo;
}

/**
 * Clear the font cache (useful for testing or memory management)
 */
export function clearFontCache(): void {
  fontCache.clear();
}

/**
 * Export default font mappings for reference
 */
export const DEFAULT_FONTS = {
  serif: {
    display: '"Times New Roman", Times, Georgia, serif',
    pdfLib: StandardFonts.TimesRoman,
  },
  sansSerif: {
    display: 'Arial, Helvetica, "Segoe UI", sans-serif',
    pdfLib: StandardFonts.Helvetica,
  },
  monospace: {
    display: '"Courier New", Courier, Consolas, monospace',
    pdfLib: StandardFonts.Courier,
  },
} as const;
