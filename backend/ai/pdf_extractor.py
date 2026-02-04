"""
PDF Text Block Extractor with Coordinate Mapping
Extracts text blocks with their precise (x, y) coordinates for overlay editing.
"""

import fitz
import uuid
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import re


@dataclass
class TextBlock:
    """Represents a text block with position and content information."""
    id: str
    text: str
    x: float
    y: float
    width: float
    height: float
    page: int
    font_size: float
    font_name: str
    block_type: str  # header, paragraph, bullet, contact, etc.
    section: Optional[str] = None  # experience, education, skills, etc.


class PDFExtractor:
    """Extracts text blocks with coordinates from PDF documents."""
    
    # Common resume section headers
    SECTION_PATTERNS = {
        'experience': r'\b(experience|work\s*history|employment|professional\s*experience)\b',
        'education': r'\b(education|academic|qualifications|degrees?)\b',
        'skills': r'\b(skills|technical\s*skills|competencies|technologies)\b',
        'projects': r'\b(projects|portfolio|personal\s*projects)\b',
        'certifications': r'\b(certifications?|certificates?|licenses?)\b',
        'summary': r'\b(summary|objective|profile|about\s*me)\b',
        'contact': r'\b(contact|email|phone|address)\b',
    }
    
    def __init__(self):
        self.current_section = None
    
    def extract_blocks(self, pdf_path: str) -> Dict[str, Any]:
        """
        Extract all text blocks with coordinates from a PDF.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Dictionary containing page dimensions and text blocks
        """
        doc = fitz.open(pdf_path)
        result = {
            'pages': [],
            'blocks': [],
            'metadata': {
                'total_pages': len(doc),
                'filename': pdf_path.split('/')[-1] if '/' in pdf_path else pdf_path
            }
        }
        
        for page_num, page in enumerate(doc):
            page_rect = page.rect
            page_info = {
                'page_number': page_num,
                'width': page_rect.width,
                'height': page_rect.height,
                'width_mm': page_rect.width * 25.4 / 72,  # Convert points to mm
                'height_mm': page_rect.height * 25.4 / 72
            }
            result['pages'].append(page_info)
            
            # Extract text blocks with detailed information
            blocks = self._extract_page_blocks(page, page_num)
            result['blocks'].extend(blocks)
        
        doc.close()
        
        # Post-process to identify sections
        result['blocks'] = self._identify_sections(result['blocks'])
        
        return result
    
    def _extract_page_blocks(self, page: fitz.Page, page_num: int) -> List[Dict[str, Any]]:
        """Extract text blocks from a single page."""
        blocks = []
        
        # Get text blocks with position info
        text_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)
        
        for block in text_dict.get("blocks", []):
            if block.get("type") != 0:  # Skip non-text blocks (images, etc.)
                continue
            
            block_text = ""
            block_fonts = []
            block_sizes = []
            
            for line in block.get("lines", []):
                line_text = ""
                for span in line.get("spans", []):
                    span_text = span.get("text", "")
                    line_text += span_text
                    if span_text.strip():
                        block_fonts.append(span.get("font", ""))
                        block_sizes.append(span.get("size", 12))
                
                block_text += line_text + "\n"
            
            block_text = block_text.strip()
            if not block_text:
                continue
            
            # Calculate average font size and most common font
            avg_font_size = sum(block_sizes) / len(block_sizes) if block_sizes else 12
            most_common_font = max(set(block_fonts), key=block_fonts.count) if block_fonts else "Unknown"
            
            bbox = block.get("bbox", [0, 0, 0, 0])
            
            text_block = TextBlock(
                id=str(uuid.uuid4()),
                text=block_text,
                x=bbox[0],
                y=bbox[1],
                width=bbox[2] - bbox[0],
                height=bbox[3] - bbox[1],
                page=page_num,
                font_size=round(avg_font_size, 1),
                font_name=most_common_font,
                block_type=self._determine_block_type(block_text, avg_font_size),
                section=None
            )
            
            blocks.append(asdict(text_block))
        
        return blocks
    
    def _determine_block_type(self, text: str, font_size: float) -> str:
        """Determine the type of text block based on content and formatting."""
        text_lower = text.lower().strip()
        
        # Check for section headers (usually larger font or specific keywords)
        for section, pattern in self.SECTION_PATTERNS.items():
            if re.search(pattern, text_lower, re.IGNORECASE):
                if font_size >= 12 or len(text.split()) <= 4:
                    return 'header'
        
        # Check for bullet points
        if text.strip().startswith(('-', '*', '\u2022', '\u25cf', '\u25e6')):
            return 'bullet'
        
        # Check for contact info patterns
        email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'
        phone_pattern = r'[\+]?[\d\s\-\(\)]{10,}'
        url_pattern = r'https?://|www\.|linkedin\.com|github\.com'
        
        if re.search(email_pattern, text) or re.search(phone_pattern, text) or re.search(url_pattern, text):
            return 'contact'
        
        # Check for dates (common in experience/education)
        date_pattern = r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|\d{4})\b'
        if re.search(date_pattern, text_lower):
            return 'date_entry'
        
        # Default to paragraph
        return 'paragraph'
    
    def _identify_sections(self, blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Assign section labels to blocks based on headers."""
        current_section = 'header'  # Start with header section (name, contact)
        
        for block in blocks:
            text_lower = block['text'].lower()
            
            # Check if this block is a section header
            for section, pattern in self.SECTION_PATTERNS.items():
                if re.search(pattern, text_lower, re.IGNORECASE):
                    if block['block_type'] == 'header' or len(block['text'].split()) <= 4:
                        current_section = section
                        break
            
            block['section'] = current_section
        
        return blocks
    
    def extract_for_editing(self, pdf_path: str) -> Dict[str, Any]:
        """
        Extract blocks optimized for inline editing.
        Groups related blocks and provides edit-friendly coordinates.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Dictionary with editing-optimized block data
        """
        raw_data = self.extract_blocks(pdf_path)
        
        # Group blocks by section for easier frontend handling
        sections = {}
        for block in raw_data['blocks']:
            section = block['section'] or 'other'
            if section not in sections:
                sections[section] = []
            sections[section].append(block)
        
        return {
            'pages': raw_data['pages'],
            'blocks': raw_data['blocks'],
            'sections': sections,
            'metadata': raw_data['metadata']
        }


# Singleton instance for API use
pdf_extractor = PDFExtractor()
