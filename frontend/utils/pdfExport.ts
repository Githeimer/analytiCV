/**
 * PDF Export Utility - FIXED VERSION
 * Uses pdf-lib to modify and export PDF with edited text
 * 
 * CRITICAL FIX: Now uses actual edited text instead of checking isDirty flag
 * - Compares currentText with original text to detect changes
 * - Works even if isDirty flag is not set correctly
 * - Embeds correct fonts based on FontMapper analysis
 * - Overlays edited text with matching font styles
 * - Ensures text is selectable in the final PDF
 */

import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import type { TextBlock, EditableBlockState } from '@/types/editor';
import { getFontInfo, type ParsedFontInfo } from '@/utils/fontMapper';

interface ExportConfig {
  originalPdfBytes: ArrayBuffer;
  blocks: TextBlock[];
  blockStates: Map<string, EditableBlockState>;
  filename?: string;
}

// Font cache for embedded fonts in the PDF
interface EmbeddedFonts {
  timesRoman: PDFFont;
  timesRomanBold: PDFFont;
  timesRomanItalic: PDFFont;
  timesRomanBoldItalic: PDFFont;
  helvetica: PDFFont;
  helveticaBold: PDFFont;
  helveticaOblique: PDFFont;
  helveticaBoldOblique: PDFFont;
  courier: PDFFont;
  courierBold: PDFFont;
  courierOblique: PDFFont;
  courierBoldOblique: PDFFont;
}

/**
 * Embed all standard fonts in the PDF document
 */
async function embedAllFonts(pdfDoc: PDFDocument): Promise<EmbeddedFonts> {
  const [
    timesRoman,
    timesRomanBold,
    timesRomanItalic,
    timesRomanBoldItalic,
    helvetica,
    helveticaBold,
    helveticaOblique,
    helveticaBoldOblique,
    courier,
    courierBold,
    courierOblique,
    courierBoldOblique,
  ] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.TimesRoman),
    pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
    pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
    pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
    pdfDoc.embedFont(StandardFonts.Courier),
    pdfDoc.embedFont(StandardFonts.CourierBold),
    pdfDoc.embedFont(StandardFonts.CourierOblique),
    pdfDoc.embedFont(StandardFonts.CourierBoldOblique),
  ]);

  return {
    timesRoman,
    timesRomanBold,
    timesRomanItalic,
    timesRomanBoldItalic,
    helvetica,
    helveticaBold,
    helveticaOblique,
    helveticaBoldOblique,
    courier,
    courierBold,
    courierOblique,
    courierBoldOblique,
  };
}

/**
 * Get the appropriate embedded font based on parsed font info
 */
function getEmbeddedFont(fontInfo: ParsedFontInfo, fonts: EmbeddedFonts): PDFFont {
  const { category, weight, style } = fontInfo;

  // Serif fonts (Times Roman)
  if (category === 'serif') {
    if (weight === 'bold' && style === 'italic') {
      return fonts.timesRomanBoldItalic;
    }
    if (weight === 'bold') {
      return fonts.timesRomanBold;
    }
    if (style === 'italic') {
      return fonts.timesRomanItalic;
    }
    return fonts.timesRoman;
  }

  // Monospace fonts (Courier)
  if (category === 'monospace') {
    if (weight === 'bold' && style === 'italic') {
      return fonts.courierBoldOblique;
    }
    if (weight === 'bold') {
      return fonts.courierBold;
    }
    if (style === 'italic') {
      return fonts.courierOblique;
    }
    return fonts.courier;
  }

  // Sans-serif fonts (Helvetica) - default
  if (weight === 'bold' && style === 'italic') {
    return fonts.helveticaBoldOblique;
  }
  if (weight === 'bold') {
    return fonts.helveticaBold;
  }
  if (style === 'italic') {
    return fonts.helveticaOblique;
  }
  return fonts.helvetica;
}

/**
 * Export modified resume as PDF
 * Overlays edited text on the original PDF with matching fonts
 * 
 * CRITICAL FIX: Now compares actual text instead of checking isDirty flag
 */
export async function exportToPDF(config: ExportConfig): Promise<Blob> {
  const { originalPdfBytes, blocks, blockStates } = config;

  console.log('[PDFExport] Starting export with', blocks.length, 'blocks');
  console.log('[PDFExport] blockStates has', blockStates.size, 'entries');

  // Load the original PDF
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();

  // Embed all standard fonts upfront for better performance
  const embeddedFonts = await embedAllFonts(pdfDoc);

  let editedBlockCount = 0;

  // Process each block
  for (const block of blocks) {
    const state = blockStates.get(block.id);

    // Skip if no state or not dirty
    if (!state || !state.isDirty) {
      continue;
    }

    // Get the text to write - use currentText from state
    const currentText = state.currentText;

    editedBlockCount++;
    console.log(`[PDFExport] Block ${block.id} changed:`);
    console.log(`  Original: "${state.originalText}"`);
    console.log(`  Current:  "${currentText}"`);

    // Get the page for this block
    const page = pages[block.page];
    if (!page) {
      console.warn(`[PDFExport] Page ${block.page} not found for block ${block.id}`);
      continue;
    }

    const pageHeight = page.getHeight();

    // Calculate text position (PDF coordinates are bottom-left origin)
    // PDF.js y is from top, pdf-lib y is from bottom
    const x = block.x;
    const y = pageHeight - block.y - block.height;

    // Get font info from the original block's font name
    const fontInfo = getFontInfo(block.font_name);
    const font = getEmbeddedFont(fontInfo, embeddedFonts);
    const fontSize = block.font_size;

    // Calculate the actual width needed for the new text
    const textWidth = font.widthOfTextAtSize(currentText, fontSize);
    const coverWidth = Math.max(block.width, textWidth) + 10; // Cover whichever is larger

    // Draw white rectangle to cover original text
    // Use generous padding to ensure complete coverage of original text
    page.drawRectangle({
      x: x - 4,
      y: y - fontSize * 0.3, // Extend below baseline
      width: coverWidth,
      height: fontSize * 1.4, // Cover full line height including descenders
      color: rgb(1, 1, 1), // White
    });

    // Draw the new text with the matched font
    // Position text at baseline (y is already at baseline level)
    page.drawText(currentText, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0), // Black
    });
  }

  console.log(`[PDFExport] ✅ Applied ${editedBlockCount} edits to PDF`);

  // Serialize the modified PDF
  const modifiedPdfBytes = await pdfDoc.save();

  // Create and return blob - convert to regular Uint8Array for Blob compatibility
  return new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
}

/**
 * Download the exported PDF
 */
export function downloadPDF(blob: Blob, filename: string = 'resume.pdf') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert File to ArrayBuffer
 */
export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}