/**
 * PDF Export Utility
 * Uses pdf-lib to modify and export PDF with edited text
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { TextBlock, EditableBlockState } from '@/types/editor';

interface ExportConfig {
  originalPdfBytes: ArrayBuffer;
  blocks: TextBlock[];
  blockStates: Map<string, EditableBlockState>;
  filename?: string;
}

/**
 * Export modified resume as PDF
 * Overlays edited text on the original PDF
 */
export async function exportToPDF(config: ExportConfig): Promise<Blob> {
  const { originalPdfBytes, blocks, blockStates, filename } = config;

  // Load the original PDF
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();

  // Embed a standard font for edited text
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Process each block
  for (const block of blocks) {
    const state = blockStates.get(block.id);

    // Skip if block was not modified
    if (!state || !state.isDirty) continue;

    // Get the page for this block
    const page = pages[block.page];
    if (!page) continue;

    const pageHeight = page.getHeight();

    // Calculate text position (PDF coordinates are bottom-left origin)
    const x = block.x;
    const y = pageHeight - block.y - block.height; // Convert to PDF coordinate system

    // Determine font based on original block formatting
    const useFont = block.font_name.toLowerCase().includes('bold') ? boldFont : font;
    const fontSize = block.font_size;

    // Draw white rectangle to cover original text
    page.drawRectangle({
      x: x - 1,
      y: y - 2,
      width: block.width + 2,
      height: block.height + 4,
      color: rgb(1, 1, 1), // White
    });

    // Draw the new text
    const lines = state.currentText.split('\n');
    let currentY = y + block.height - fontSize;

    for (const line of lines) {
      page.drawText(line, {
        x,
        y: currentY,
        size: fontSize,
        font: useFont,
        color: rgb(0, 0, 0), // Black
      });
      currentY -= fontSize * 1.2; // Line height
    }
  }

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
