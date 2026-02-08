from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field, model_validator
from typing import Dict, List, Optional, Union, Any
import tempfile
import os
import json
import re
import sys
from pathlib import Path

# Add the ai directory to Python path
sys.path.insert(0, str(Path(__file__).parent))
from resume_parser import ResumeParser
from resume_builder import ResumeBuilder
from pdf_generator import PDFGenerator
from pdf_extractor import pdf_extractor
import fitz

app = FastAPI(title="ResumeParser API", version="1.0.0")

# CORS configuration - explicitly allow Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "*",  # Fallback for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

parser = ResumeParser()
resume_builder = ResumeBuilder()
pdf_generator = PDFGenerator()

def is_resume_pdf(file_path: str) -> bool:
    """Validate if PDF contains resume-like content"""
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text().lower()
        doc.close()
        
        if len(text.strip()) < 100:
            return False
        
        resume_indicators = [
            r'\b(experience|education|skills|work history|employment)\b',
            r'\b(resume|curriculum vitae|cv)\b',
            r'\b(email|phone|linkedin|github)\b',
            r'\b(bachelor|master|degree|university|college)\b',
            r'\b(developed|managed|led|designed|implemented)\b'
        ]
        
        matches = sum(1 for pattern in resume_indicators if re.search(pattern, text))
        
        return matches >= 2
    except:
        return False

@app.post("/api/analyzer")
async def analyze_resume(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        if not is_resume_pdf(temp_path):
            os.unlink(temp_path)
            raise HTTPException(
                status_code=400, 
                detail="Uploaded PDF does not appear to be a resume. Please upload a valid resume containing experience, education, or skills sections."
            )
        
        resume = parser.parse(temp_path)
        output = parser.format_output(resume, format_type="json")
        
        os.unlink(temp_path)
        
        return JSONResponse(content={
            "success": True,
            "data": json.loads(output)
        })
    
    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
        raise HTTPException(status_code=500, detail=f"Error parsing resume: {str(e)}")

@app.get("/")
async def root():
    return {"message": "ResumeParser API is running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}


# PDF Extraction endpoint for inline editor
@app.post("/api/extract-pdf-blocks")
async def extract_pdf_blocks(file: UploadFile = File(...)):
    """
    Extract text blocks with coordinates from a PDF for inline editing.
    Returns block positions, dimensions, and content for overlay placement.
    """
    # Validate file extension
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    temp_path = None
    try:
        # Read and validate file content
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
        # Check PDF magic bytes (PDF files start with %PDF)
        if not content[:4] == b'%PDF':
            raise HTTPException(
                status_code=400, 
                detail="Invalid PDF file format. File does not appear to be a valid PDF."
            )
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        
        # Validate PDF structure by trying to open it
        try:
            test_doc = fitz.open(temp_path)
            if test_doc.page_count == 0:
                test_doc.close()
                os.unlink(temp_path)
                raise HTTPException(status_code=400, detail="PDF file contains no pages")
            test_doc.close()
        except fitz.FileDataError as pdf_err:
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)
            raise HTTPException(
                status_code=400, 
                detail=f"Malformed PDF file: {str(pdf_err)}"
            )
        
        # Check if it looks like a resume
        if not is_resume_pdf(temp_path):
            os.unlink(temp_path)
            raise HTTPException(
                status_code=400,
                detail="Uploaded PDF does not appear to be a resume. Please upload a document containing experience, education, or skills sections."
            )
        
        # Extract blocks with coordinates
        extraction_result = pdf_extractor.extract_for_editing(temp_path)
        
        # Validate extraction result
        if not extraction_result or not extraction_result.get('blocks'):
            os.unlink(temp_path)
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from PDF. The document may be scanned or image-based."
            )
        
        os.unlink(temp_path)
        
        return JSONResponse(content={
            "success": True,
            "data": extraction_result,
            "message": f"Successfully extracted {len(extraction_result.get('blocks', []))} text blocks"
        })
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except:
                pass
        # Log the error for debugging
        print(f"PDF extraction error: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error extracting PDF blocks: {str(e)}"
        )


# AI Analysis endpoint for inline highlighting
class AnalyzeBlocksRequest(BaseModel):
    blocks: List[Dict[str, Any]]
    job_description: Optional[str] = None


@app.post("/api/analyze-blocks")
async def analyze_blocks(request: AnalyzeBlocksRequest):
    """
    Analyze resume blocks and return UUIDs of weak blocks with suggestions.
    Uses AI to identify areas for improvement.
    
    CRITICAL: Uses the persisted state from update-resume endpoint.
    This ensures analysis reflects the SAVED text (e.g., '2025') not original PDF text ('2024').
    """
    try:
        weak_blocks = []
        
        # CRITICAL: Merge incoming blocks with saved state
        # Priority: _resume_state (saved) > request.blocks (frontend)
        # This ensures we analyze the LATEST saved version
        blocks_to_analyze = []
        for block in request.blocks:
            block_id = block.get('id')
            
            # Check if we have a saved version of this block
            if block_id in _resume_state:
                saved = _resume_state[block_id]
                blocks_to_analyze.append({
                    'id': block_id,
                    'text': saved.get('text', block.get('text', '')),
                    'block_type': block.get('block_type', ''),
                    'section': saved.get('section', block.get('section', ''))
                })
            else:
                blocks_to_analyze.append(block)
        
        for block in blocks_to_analyze:
            block_id = block.get('id')
            text = block.get('text', '')
            block_type = block.get('block_type', '')
            section = block.get('section', '')
            
            # Skip headers and very short blocks
            if block_type == 'header' or len(text.strip()) < 10:
                continue
            
            weakness = analyze_block_content(text, section, block_type, request.job_description)
            
            if weakness:
                weak_blocks.append({
                    'id': block_id,
                    'section': section,  # Include section for UI display
                    'issue': weakness['issue'],
                    'suggestion': weakness['suggestion'],
                    'severity': weakness['severity'],
                    'improved_text': weakness.get('improved_text', '')
                })
        
        # Calculate unified ATS score using the merged blocks (reflects saved state)
        blocks_for_scoring = [
            {'text': block.get('text', ''), 'section': block.get('section', '')}
            for block in blocks_to_analyze
        ]
        ats_details = calculate_unified_ats_score(blocks_for_scoring)
        
        return JSONResponse(content={
            "success": True,
            "weak_blocks": weak_blocks,
            "total_analyzed": len(blocks_to_analyze),
            "issues_found": len(weak_blocks),
            "ats_score": ats_details.total_score,
            "ats_score_details": {
                "total_score": ats_details.total_score,
                "grade": ats_details.grade,
                "breakdown": [
                    {
                        "label": item.label,
                        "score": item.score,
                        "max_score": item.max_score,
                        "percentage": item.percentage
                    }
                    for item in ats_details.breakdown
                ]
            }
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing blocks: {str(e)}")


def analyze_block_content(text: str, section: str, block_type: str, job_description: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Analyze a single block for potential improvements.
    Returns weakness info if issues found, None otherwise.
    """
    text_lower = text.lower()
    issues = []
    
    # Check for weak action verbs in experience section
    weak_verbs = ['helped', 'assisted', 'worked on', 'was responsible for', 'did', 'made']
    strong_verbs = ['led', 'developed', 'implemented', 'achieved', 'increased', 'reduced', 'managed', 'created', 'designed', 'optimized']
    
    if section == 'experience' and block_type in ['bullet', 'paragraph']:
        # Check for weak verbs
        for weak_verb in weak_verbs:
            if weak_verb in text_lower:
                issues.append({
                    'issue': f'Weak action verb detected: "{weak_verb}"',
                    'suggestion': f'Replace "{weak_verb}" with stronger action verbs like: {", ".join(strong_verbs[:3])}',
                    'severity': 'medium'
                })
                break
        
        # Check for lack of quantifiable results
        has_numbers = bool(re.search(r'\d+%?|\$[\d,]+', text))
        if not has_numbers and len(text) > 50:
            issues.append({
                'issue': 'Missing quantifiable results',
                'suggestion': 'Add metrics to demonstrate impact (e.g., "increased sales by 25%", "reduced costs by $10K")',
                'severity': 'high'
            })
        
        # Check for passive voice
        passive_indicators = ['was ', 'were ', 'been ', 'being ', 'is ']
        for indicator in passive_indicators:
            if indicator in text_lower and not any(v in text_lower for v in strong_verbs):
                issues.append({
                    'issue': 'Passive voice detected',
                    'suggestion': 'Use active voice starting with strong action verbs',
                    'severity': 'low'
                })
                break
    
    # Check summary section
    if section == 'summary':
        if len(text.split()) < 20:
            issues.append({
                'issue': 'Summary too brief',
                'suggestion': 'Expand your summary to 3-4 sentences highlighting key skills and experience',
                'severity': 'medium'
            })
        
        # Check for generic phrases
        generic_phrases = ['hard worker', 'team player', 'self-motivated', 'passionate', 'detail-oriented']
        for phrase in generic_phrases:
            if phrase in text_lower:
                issues.append({
                    'issue': f'Generic phrase detected: "{phrase}"',
                    'suggestion': 'Replace with specific achievements or skills that demonstrate this quality',
                    'severity': 'low'
                })
                break
    
    # Check skills section
    if section == 'skills':
        # Check for outdated technologies
        outdated = ['jquery', 'flash', 'actionscript', 'coldfusion', 'dreamweaver']
        for tech in outdated:
            if tech in text_lower:
                issues.append({
                    'issue': f'Potentially outdated skill: "{tech}"',
                    'suggestion': 'Consider replacing with modern alternatives or removing if not relevant',
                    'severity': 'low'
                })
    
    if issues:
        # Return the highest severity issue
        severity_order = {'high': 0, 'medium': 1, 'low': 2}
        issues.sort(key=lambda x: severity_order.get(x['severity'], 2))
        return issues[0]
    
    return None

@app.get("/api/templates")
async def get_templates():
    """Get list of available resume templates"""
    try:
        templates_dir = Path(__file__).parent / "templates"
        templates = []
        
        for template_path in templates_dir.iterdir():
            if template_path.is_dir() and template_path.name != "assets":
                config_file = template_path / "config.json"
                if config_file.exists():
                    with open(config_file, 'r') as f:
                        config = json.load(f)
                        config['id'] = template_path.name
                        templates.append(config)
        
        return {"success": True, "templates": templates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading templates: {str(e)}")

# Pydantic models for resume builder
class PersonalInfoModel(BaseModel):
    name: str
    email: str
    phone: str
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None

class ExperienceModel(BaseModel):
    title: str
    company: str
    start_date: str
    end_date: str
    location: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)

class EducationModel(BaseModel):
    degree: str
    institution: str
    location: Optional[str] = None
    graduation_date: Optional[str] = None
    gpa: Optional[str] = None
    relevant_coursework: List[str] = Field(default_factory=list)

class ProjectModel(BaseModel):
    name: str
    description: str
    technologies: List[str] = Field(default_factory=list)
    link: Optional[str] = None
    highlights: List[str] = Field(default_factory=list)

class ResumeDataModel(BaseModel):
    personal_info: PersonalInfoModel
    summary: Optional[str] = None
    skills: Any = Field(default_factory=dict)
    experience: List[ExperienceModel] = Field(default_factory=list)
    education: List[EducationModel] = Field(default_factory=list)
    projects: List[ProjectModel] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    template: Optional[str] = "modern"
    
    @model_validator(mode='before')
    @classmethod
    def convert_skills(cls, data: Any) -> Any:
        if isinstance(data, dict) and 'skills' in data:
            skills = data['skills']
            
            # If skills is a list of objects with category_name and skills
            if isinstance(skills, list) and len(skills) > 0:
                if isinstance(skills[0], dict) and 'category_name' in skills[0]:
                    # Convert [{category_name: "lang", skills: ["Python"]}] to {"lang": ["Python"]}
                    skills_dict = {}
                    for item in skills:
                        category = item.get('category_name', 'Skills')
                        skill_list = item.get('skills', [])
                        if category and skill_list:
                            skills_dict[category] = skill_list
                    data['skills'] = skills_dict if skills_dict else {}
                else:
                    # Simple list of strings
                    data['skills'] = {"Skills": skills} if skills else {}
            elif isinstance(skills, list):
                # Empty list
                data['skills'] = {}
            elif not isinstance(skills, dict):
                data['skills'] = {}
        return data

@app.post("/api/build-resume")
async def build_resume(resume_data: ResumeDataModel):
    """Build HTML resume from structured data"""
    try:
        data_dict = resume_data.model_dump()
        template_name = data_dict.pop('template', 'modern')
        
        # Map 'summary' to 'professional_summary' for templates
        if 'summary' in data_dict:
            data_dict['professional_summary'] = data_dict.pop('summary')
        
        # Load template
        templates_dir = Path(__file__).parent / "templates" / template_name
        template_file = templates_dir / "template.html"
        
        if not template_file.exists():
            raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
        
        # Use the template-based builder
        from jinja2 import Template
        with open(template_file, 'r') as f:
            template = Template(f.read())
        
        html = template.render(**data_dict)
        
        # Inject CSS into HTML
        css_file = templates_dir / "style.css"
        if css_file.exists():
            with open(css_file, 'r') as f:
                css_content = f.read()
            html = html.replace('</head>', f'<style>{css_content}</style></head>')
        
        return {"success": True, "html": html}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# In-memory storage for resume state (in production, use a database)
_resume_state: Dict[str, Dict[str, Any]] = {}

# File-based persistence path
RESUME_DATA_FILE = Path(__file__).parent / "resume_data.json"


def load_resume_state() -> Dict[str, Dict[str, Any]]:
    """Load resume state from disk if it exists."""
    global _resume_state
    if RESUME_DATA_FILE.exists():
        try:
            with open(RESUME_DATA_FILE, 'r', encoding='utf-8') as f:
                _resume_state = json.load(f)
                print(f"[api.py] Loaded {len(_resume_state)} blocks from disk")
        except Exception as e:
            print(f"[api.py] Failed to load resume state: {e}")
            _resume_state = {}
    return _resume_state


def save_resume_state() -> bool:
    """Persist resume state to disk."""
    try:
        with open(RESUME_DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(_resume_state, f, indent=2, ensure_ascii=False)
        print(f"[api.py] Saved {len(_resume_state)} blocks to disk")
        return True
    except Exception as e:
        print(f"[api.py] Failed to save resume state: {e}")
        return False


# Load existing state on startup
load_resume_state()


class BlockUpdateItem(BaseModel):
    """Single block update item"""
    blockId: str
    oldText: str
    newText: str
    section: Optional[str] = None


class UpdateResumeRequest(BaseModel):
    """Request body for updating resume blocks"""
    blocks: List[BlockUpdateItem]


class ATSBreakdownItem(BaseModel):
    """Single item in ATS score breakdown"""
    label: str
    score: int
    max_score: int
    percentage: int


class ATSScoreDetails(BaseModel):
    """Detailed ATS score with breakdown"""
    total_score: int
    grade: str
    breakdown: List[ATSBreakdownItem]


class UpdateResumeResponse(BaseModel):
    """Response from update resume endpoint"""
    success: bool
    message: str
    atsScore: Optional[int] = None
    atsScoreDetails: Optional[ATSScoreDetails] = None
    updatedBlocks: Optional[List[str]] = None


# ATS Keywords for unified scoring (same as resume_parser.py)
ATS_KEYWORDS = {
    'action_verbs': ['developed', 'designed', 'implemented', 'led', 'managed', 'created', 'built', 
                    'improved', 'optimized', 'increased', 'reduced', 'achieved', 'delivered'],
    'quantifiers': [r'\d+%', r'\$\d+', r'\d+x', r'\d+\+'],
    'leadership': ['led', 'managed', 'supervised', 'coordinated', 'mentored', 'trained'],
    'impact': ['increased', 'decreased', 'improved', 'reduced', 'optimized', 'enhanced', 'accelerated']
}


def calculate_unified_ats_score(blocks: List[Dict[str, Any]], all_resume_state: Dict[str, Any] = None) -> ATSScoreDetails:
    """
    Calculate ATS score using the SAME logic as resume_parser.py.
    This ensures Analyzer and Editor show consistent scores.
    
    Args:
        blocks: List of text blocks with 'text' and 'section' fields
        all_resume_state: Optional full resume state for comprehensive scoring
        
    Returns:
        ATSScoreDetails with breakdown by category
    """
    # Combine all text for analysis
    full_text = ' '.join(block.get('text', block.get('newText', '')) for block in blocks)
    text_lower = full_text.lower()
    
    # Initialize breakdown structure (matching resume_parser.py categories)
    breakdown = {}
    
    # 1. Contact Info Score (max 20 points)
    contact_score = 0
    contact_indicators = {
        'email': bool(re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', full_text)),
        'phone': bool(re.search(r'[\+\(]?[1-9][0-9 .\-\(\)]{8,}[0-9]', full_text)),
        'linkedin': bool(re.search(r'linkedin', text_lower)),
        'location': bool(re.search(r'\b(city|state|street|avenue|road|[A-Z][a-z]+,\s*[A-Z]{2})\b', full_text, re.I)),
    }
    for indicator, present in contact_indicators.items():
        if present:
            contact_score += 5
    breakdown['contact_info'] = min(20, contact_score)
    
    # 2. Skills Score (max 25 points)
    skills_text = ' '.join(
        block.get('text', block.get('newText', '')) 
        for block in blocks 
        if block.get('section', '').lower() == 'skills'
    )
    # Count skill-related keywords
    skill_keywords = ['python', 'javascript', 'java', 'react', 'node', 'sql', 'aws', 'docker', 
                     'kubernetes', 'git', 'agile', 'scrum', 'api', 'database', 'cloud']
    skill_matches = sum(1 for skill in skill_keywords if skill in text_lower)
    skills_score = min(25, skill_matches * 2)
    breakdown['skills'] = skills_score
    
    # 3. Experience Score (max 30 points)
    exp_score = 0
    experience_blocks = [
        b for b in blocks 
        if b.get('section', '').lower() in ['experience', 'work', 'employment']
    ]
    
    # Points for having experience entries
    exp_score += min(15, len(experience_blocks) * 3)
    
    # Points for quantifiers (metrics, percentages, dollar amounts)
    quantifiers = sum(1 for pattern in ATS_KEYWORDS['quantifiers'] 
                     for _ in re.finditer(pattern, full_text))
    exp_score += min(10, quantifiers * 2)
    
    # Points for action verbs
    action_verb_count = sum(text_lower.count(verb) for verb in ATS_KEYWORDS['action_verbs'])
    exp_score += min(5, action_verb_count)
    
    breakdown['experience'] = min(30, exp_score)
    
    # 4. Education Score (max 10 points)
    education_blocks = [
        b for b in blocks 
        if b.get('section', '').lower() in ['education', 'academic']
    ]
    edu_score = min(10, len(education_blocks) * 5)
    # Also check for degree keywords
    degree_keywords = ['bachelor', 'master', 'phd', 'degree', 'university', 'college', 'bs', 'ms', 'ba', 'ma']
    if any(kw in text_lower for kw in degree_keywords):
        edu_score = max(edu_score, 5)
    breakdown['education'] = min(10, edu_score)
    
    # 5. Formatting & Keywords Score (max 15 points)
    format_score = 0
    
    # Check for summary/profile section
    has_summary = any(
        b.get('section', '').lower() in ['summary', 'profile', 'objective']
        for b in blocks
    )
    if has_summary:
        format_score += 5
    
    # Check for industry keywords
    industry_keywords = ['project', 'team', 'client', 'stakeholder', 'deadline', 'budget', 
                        'requirement', 'solution', 'strategy', 'analysis']
    keyword_count = sum(1 for kw in industry_keywords if kw in text_lower)
    format_score += min(10, keyword_count)
    
    breakdown['formatting_keywords'] = min(15, format_score)
    
    # Calculate total score
    total_score = sum(breakdown.values())
    
    # Determine grade
    if total_score >= 85:
        grade = 'A (Excellent)'
    elif total_score >= 70:
        grade = 'B (Good)'
    elif total_score >= 55:
        grade = 'C (Fair)'
    else:
        grade = 'D (Needs Improvement)'
    
    # Build breakdown list with labels and percentages
    breakdown_items = [
        ATSBreakdownItem(
            label='Contact Information',
            score=breakdown['contact_info'],
            max_score=20,
            percentage=int((breakdown['contact_info'] / 20) * 100)
        ),
        ATSBreakdownItem(
            label='Skills',
            score=breakdown['skills'],
            max_score=25,
            percentage=int((breakdown['skills'] / 25) * 100)
        ),
        ATSBreakdownItem(
            label='Experience',
            score=breakdown['experience'],
            max_score=30,
            percentage=int((breakdown['experience'] / 30) * 100)
        ),
        ATSBreakdownItem(
            label='Education',
            score=breakdown['education'],
            max_score=10,
            percentage=int((breakdown['education'] / 10) * 100)
        ),
        ATSBreakdownItem(
            label='Formatting & Keywords',
            score=breakdown['formatting_keywords'],
            max_score=15,
            percentage=int((breakdown['formatting_keywords'] / 15) * 100)
        ),
    ]
    
    return ATSScoreDetails(
        total_score=total_score,
        grade=grade,
        breakdown=breakdown_items
    )


def calculate_ats_score(blocks: List[Dict[str, Any]]) -> int:
    """
    Calculate ATS score based on resume content quality.
    Returns a score from 0-100.
    """
    if not blocks:
        return 50
    
    score = 100
    deductions = 0
    
    for block in blocks:
        text = block.get('newText', block.get('text', ''))
        text_lower = text.lower()
        
        # Check for weak action verbs
        weak_verbs = ['helped', 'assisted', 'worked on', 'was responsible for', 'did', 'made']
        for verb in weak_verbs:
            if verb in text_lower:
                deductions += 2
        
        # Check for missing metrics in longer text
        has_numbers = bool(re.search(r'\d+%?|\$[\d,]+', text))
        if not has_numbers and len(text) > 50:
            deductions += 3
        
        # Check for passive voice
        passive_indicators = ['was ', 'were ', 'been ', 'being ']
        for indicator in passive_indicators:
            if indicator in text_lower:
                deductions += 1
                break
        
        # Check for generic phrases
        generic_phrases = ['hard worker', 'team player', 'self-motivated', 'passionate']
        for phrase in generic_phrases:
            if phrase in text_lower:
                deductions += 2
    
    score = max(0, min(100, score - deductions))
    return score


@app.post("/api/update-resume", response_model=UpdateResumeResponse)
async def update_resume(request: UpdateResumeRequest):
    """
    Update resume block text and persist changes to disk.
    Returns success status and recalculated ATS score with detailed breakdown.
    
    CRITICAL: Uses the SAME scoring logic as the Analyzer for consistency.
    """
    try:
        updated_block_ids = []
        
        for block_update in request.blocks:
            block_id = block_update.blockId
            new_text = block_update.newText
            old_text = block_update.oldText
            section = block_update.section
            
            print(f"[api.py] Updating block {block_id}: '{old_text[:30]}...' -> '{new_text[:30]}...'")
            
            # Store the update in memory
            _resume_state[block_id] = {
                'text': new_text,
                'oldText': old_text,
                'section': section,
                'updated_at': str(os.popen('date').read().strip())
            }
            
            updated_block_ids.append(block_id)
        
        # CRITICAL: Persist to disk so changes survive refresh/restart
        if not save_resume_state():
            raise Exception("Failed to persist changes to disk")
        
        # Build complete block list from all stored state for accurate scoring
        all_blocks = [
            {'text': state['text'], 'section': state.get('section', '')}
            for state in _resume_state.values()
        ]
        
        # If we have no stored state, use the incoming blocks
        if not all_blocks:
            all_blocks = [
                {'text': b.newText, 'section': b.section or ''}
                for b in request.blocks
            ]
        
        # Calculate new ATS score using UNIFIED scoring logic (same as Analyzer)
        ats_details = calculate_unified_ats_score(all_blocks)
        
        print(f"[api.py] Successfully saved {len(updated_block_ids)} block(s), ATS score: {ats_details.total_score}")
        
        return UpdateResumeResponse(
            success=True,
            message=f"Successfully updated {len(updated_block_ids)} block(s)",
            atsScore=ats_details.total_score,
            atsScoreDetails=ats_details,
            updatedBlocks=updated_block_ids
        )
    
    except Exception as e:
        print(f"[api.py] Error updating resume: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update resume: {str(e)}"
        )


@app.post("/api/generate-pdf")
async def generate_pdf(resume_data: ResumeDataModel):
    """Generate PDF resume from structured data"""
    if not pdf_generator.available:
        raise HTTPException(status_code=503, detail="WeasyPrint not installed")
    
    try:
        data_dict = resume_data.model_dump()
        template_name = data_dict.pop('template', 'modern')
        
        # Map 'summary' to 'professional_summary' for templates
        if 'summary' in data_dict:
            data_dict['professional_summary'] = data_dict.pop('summary')
        
        # Load template
        templates_dir = Path(__file__).parent / "templates" / template_name
        template_file = templates_dir / "template.html"
        
        if not template_file.exists():
            raise HTTPException(status_code=404, detail=f"Template '{template_name}' not found")
        
        # Render template
        from jinja2 import Template
        with open(template_file, 'r') as f:
            template = Template(f.read())
        
        html = template.render(**data_dict)
        
        # Inject CSS into HTML
        css_file = templates_dir / "style.css"
        if css_file.exists():
            with open(css_file, 'r') as f:
                css_content = f.read()
            html = html.replace('</head>', f'<style>{css_content}</style></head>')
        
        pdf_bytes = pdf_generator.get_pdf_bytes(html)
        filename = f"{resume_data.personal_info.name.replace(' ', '_')}_Resume.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Bind to 127.0.0.1 to ensure local accessibility
    # Use 0.0.0.0 in production for external access
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000,
        log_level="info"
    )
