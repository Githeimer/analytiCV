#!/usr/bin/env python3

from pathlib import Path
from typing import Union, Optional
import sys


class PDFGenerator:
    """Converts HTML to PDF using WeasyPrint"""
    
    def __init__(self):
        """Initialize PDF generator and check dependencies"""
        try:
            from weasyprint import HTML, CSS
            self.HTML = HTML
            self.CSS = CSS
            self.available = True
        except ImportError:
            print("WARNING: WeasyPrint not installed!")
            print("Install with: pip install weasyprint")
            print("Note: WeasyPrint requires system dependencies:")
            print("  macOS: brew install pango cairo gdk-pixbuf libffi")
            print("  Ubuntu: apt-get install python3-dev python3-pip python3-cffi libcairo2 libpango-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info")
            self.available = False
    
    def html_to_pdf(
        self, 
        html_content: str, 
        output_path: Union[str, Path],
        custom_css: Optional[str] = None
    ) -> Path:
        """
        Convert HTML string to PDF file
        
        Args:
            html_content: HTML string to convert
            output_path: Path where PDF will be saved
            custom_css: Optional custom CSS to apply
            
        Returns:
            Path to the generated PDF file
            
        Raises:
            RuntimeError: If WeasyPrint is not available
            Exception: If PDF generation fails
        """
        if not self.available:
            raise RuntimeError("WeasyPrint is not installed. Cannot generate PDF.")
        
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            # Create HTML object from string
            html_doc = self.HTML(string=html_content)
            
            # Apply custom CSS if provided
            if custom_css:
                css_obj = self.CSS(string=custom_css)
                html_doc.write_pdf(output_path, stylesheets=[css_obj])
            else:
                html_doc.write_pdf(output_path)
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Failed to generate PDF: {str(e)}")
    
    def html_file_to_pdf(
        self, 
        html_file: Union[str, Path], 
        output_path: Union[str, Path],
        custom_css: Optional[str] = None
    ) -> Path:
        """
        Convert HTML file to PDF
        
        Args:
            html_file: Path to HTML file
            output_path: Path where PDF will be saved
            custom_css: Optional custom CSS to apply
            
        Returns:
            Path to the generated PDF file
        """
        if not self.available:
            raise RuntimeError("WeasyPrint is not installed. Cannot generate PDF.")
        
        html_file = Path(html_file)
        if not html_file.exists():
            raise FileNotFoundError(f"HTML file not found: {html_file}")
        
        html_content = html_file.read_text()
        return self.html_to_pdf(html_content, output_path, custom_css)
    
    def get_pdf_bytes(
        self, 
        html_content: str,
        custom_css: Optional[str] = None
    ) -> bytes:
        """
        Convert HTML to PDF and return as bytes (useful for API responses)
        
        Args:
            html_content: HTML string to convert
            custom_css: Optional custom CSS to apply
            
        Returns:
            PDF file as bytes
        """
        if not self.available:
            raise RuntimeError("WeasyPrint is not installed. Cannot generate PDF.")
        
        try:
            html_doc = self.HTML(string=html_content)
            
            if custom_css:
                css_obj = self.CSS(string=custom_css)
                pdf_bytes = html_doc.write_pdf(stylesheets=[css_obj])
            else:
                pdf_bytes = html_doc.write_pdf()
            
            return pdf_bytes
            
        except Exception as e:
            raise Exception(f"Failed to generate PDF bytes: {str(e)}")


def main():
    """Demo usage"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python pdf_generator.py <input.html> [output.pdf]")
        print("\nExample:")
        print("  python pdf_generator.py sample_resume.html resume.pdf")
        sys.exit(1)
    
    input_html = sys.argv[1]
    output_pdf = sys.argv[2] if len(sys.argv) > 2 else Path(input_html).stem + ".pdf"
    
    try:
        generator = PDFGenerator()
        
        if not generator.available:
            print("\nCannot proceed without WeasyPrint. Please install it first.")
            sys.exit(1)
        
        print(f"Converting {input_html} to PDF...")
        pdf_path = generator.html_file_to_pdf(input_html, output_pdf)
        print(f"✓ PDF generated successfully: {pdf_path}")
        print(f"  File size: {pdf_path.stat().st_size / 1024:.1f} KB")
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error generating PDF: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
