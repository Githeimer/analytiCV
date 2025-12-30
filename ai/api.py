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
import fitz

app = FastAPI(title="ResumeParser API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
