#!/usr/bin/env python3

from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional
from pathlib import Path
from jinja2 import Template
import json


@dataclass
class PersonalInfo:
    name: str
    email: str
    phone: str
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None


@dataclass
class Experience:
    title: str
    company: str
    start_date: str
    end_date: str  # Can be "Present"
    location: Optional[str] = None
    highlights: List[str] = field(default_factory=list)


@dataclass
class Education:
    degree: str
    institution: str
    location: Optional[str] = None
    graduation_date: Optional[str] = None
    gpa: Optional[str] = None
    relevant_coursework: List[str] = field(default_factory=list)


@dataclass
class Project:
    name: str
    description: str
    technologies: List[str] = field(default_factory=list)
    link: Optional[str] = None
    highlights: List[str] = field(default_factory=list)


@dataclass
class ResumeData:
    personal_info: PersonalInfo
    summary: Optional[str] = None
    skills: Dict[str, List[str]] = field(default_factory=dict)
    experience: List[Experience] = field(default_factory=list)
    education: List[Education] = field(default_factory=list)
    projects: List[Project] = field(default_factory=list)
    certifications: List[str] = field(default_factory=list)


class ResumeBuilder:
    """Builds resume HTML from structured data"""
    
    def __init__(self, template_path: Optional[str] = None):
        """
        Initialize the resume builder
        
        Args:
            template_path: Path to custom HTML template. Uses default if None.
        """
        if template_path and Path(template_path).exists():
            self.template_str = Path(template_path).read_text()
        else:
            self.template_str = self._get_default_template()
        
        self.template = Template(self.template_str)
    
    def build_html(self, resume_data: ResumeData) -> str:
        """
        Generate HTML from resume data
        
        Args:
            resume_data: Structured resume data
            
        Returns:
            HTML string ready for display or PDF conversion
        """
        self._validate_resume_data(resume_data)
        
        # Convert dataclass to dict for template rendering
        context = asdict(resume_data)
        
        # Render the template
        html = self.template.render(**context)
        
        return html
    
    def build_from_json(self, json_data: str) -> str:
        """
        Build HTML from JSON string
        
        Args:
            json_data: JSON string containing resume data
            
        Returns:
            HTML string
        """
        data = json.loads(json_data)
        resume_data = self._dict_to_resume_data(data)
        return self.build_html(resume_data)
    
    def _validate_resume_data(self, resume_data: ResumeData) -> None:
        """Validate required fields"""
        if not resume_data.personal_info.name:
            raise ValueError("Name is required")
        if not resume_data.personal_info.email:
            raise ValueError("Email is required")
        if not resume_data.personal_info.phone:
            raise ValueError("Phone is required")
    
    def _dict_to_resume_data(self, data: dict) -> ResumeData:
        """Convert dictionary to ResumeData dataclass"""
        personal_info = PersonalInfo(**data['personal_info'])
        
        experience = [Experience(**exp) for exp in data.get('experience', [])]
        education = [Education(**edu) for edu in data.get('education', [])]
        projects = [Project(**proj) for proj in data.get('projects', [])]
        
        return ResumeData(
            personal_info=personal_info,
            summary=data.get('summary'),
            skills=data.get('skills', {}),
            experience=experience,
            education=education,
            projects=projects,
            certifications=data.get('certifications', [])
        )
    
    def _get_default_template(self) -> str:
        """Return default HTML template with embedded CSS"""
        return '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ personal_info.name }} - Resume</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 850px;
            margin: 0 auto;
            padding: 40px 60px;
            background: #fff;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2c3e50;
        }
        
        .header h1 {
            font-size: 2.5em;
            color: #2c3e50;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .contact-info {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
            font-size: 0.95em;
            color: #555;
        }
        
        .contact-info span {
            display: inline-block;
        }
        
        .contact-info a {
            color: #3498db;
            text-decoration: none;
        }
        
        .contact-info a:hover {
            text-decoration: underline;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 1.4em;
            color: #2c3e50;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 2px solid #3498db;
            font-weight: 600;
        }
        
        .summary {
            font-size: 1em;
            line-height: 1.7;
            color: #444;
            text-align: justify;
        }
        
        .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .skill-category {
            margin-bottom: 10px;
        }
        
        .skill-category-title {
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 5px;
            text-transform: capitalize;
        }
        
        .skill-list {
            color: #555;
            font-size: 0.95em;
        }
        
        .experience-item, .education-item, .project-item {
            margin-bottom: 25px;
        }
        
        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 5px;
        }
        
        .item-title {
            font-size: 1.1em;
            font-weight: 600;
            color: #2c3e50;
        }
        
        .item-subtitle {
            color: #555;
            font-style: italic;
            margin-bottom: 5px;
        }
        
        .item-date {
            color: #777;
            font-size: 0.9em;
            white-space: nowrap;
        }
        
        .highlights {
            list-style: none;
            padding-left: 0;
            margin-top: 8px;
        }
        
        .highlights li {
            padding-left: 20px;
            margin-bottom: 5px;
            position: relative;
            color: #444;
            font-size: 0.95em;
        }
        
        .highlights li:before {
            content: "▸";
            position: absolute;
            left: 0;
            color: #3498db;
            font-weight: bold;
        }
        
        .technologies {
            color: #555;
            font-size: 0.9em;
            margin-top: 5px;
        }
        
        .technologies strong {
            color: #2c3e50;
        }
        
        .certifications-list {
            list-style: none;
            padding-left: 0;
        }
        
        .certifications-list li {
            padding-left: 20px;
            margin-bottom: 8px;
            position: relative;
            color: #444;
        }
        
        .certifications-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #27ae60;
            font-weight: bold;
        }
        
        @media print {
            body {
                padding: 20px;
            }
            
            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ personal_info.name }}</h1>
        <div class="contact-info">
            <span>{{ personal_info.email }}</span>
            <span>•</span>
            <span>{{ personal_info.phone }}</span>
            {% if personal_info.location %}
            <span>•</span>
            <span>{{ personal_info.location }}</span>
            {% endif %}
            {% if personal_info.linkedin %}
            <span>•</span>
            <span><a href="{{ personal_info.linkedin }}" target="_blank">LinkedIn</a></span>
            {% endif %}
            {% if personal_info.github %}
            <span>•</span>
            <span><a href="{{ personal_info.github }}" target="_blank">GitHub</a></span>
            {% endif %}
            {% if personal_info.website %}
            <span>•</span>
            <span><a href="{{ personal_info.website }}" target="_blank">Website</a></span>
            {% endif %}
        </div>
    </div>
    
    {% if summary %}
    <div class="section">
        <h2 class="section-title">Professional Summary</h2>
        <p class="summary">{{ summary }}</p>
    </div>
    {% endif %}
    
    {% if skills %}
    <div class="section">
        <h2 class="section-title">Technical Skills</h2>
        <div class="skills-grid">
            {% for category, skill_list in skills.items() %}
            <div class="skill-category">
                <div class="skill-category-title">{{ category.replace('_', ' ').title() }}</div>
                <div class="skill-list">{{ skill_list | join(', ') }}</div>
            </div>
            {% endfor %}
        </div>
    </div>
    {% endif %}
    
    {% if experience %}
    <div class="section">
        <h2 class="section-title">Professional Experience</h2>
        {% for exp in experience %}
        <div class="experience-item">
            <div class="item-header">
                <div>
                    <div class="item-title">{{ exp.title }}</div>
                    <div class="item-subtitle">{{ exp.company }}{% if exp.location %}, {{ exp.location }}{% endif %}</div>
                </div>
                <div class="item-date">{{ exp.start_date }} – {{ exp.end_date }}</div>
            </div>
            {% if exp.highlights %}
            <ul class="highlights">
                {% for highlight in exp.highlights %}
                <li>{{ highlight }}</li>
                {% endfor %}
            </ul>
            {% endif %}
        </div>
        {% endfor %}
    </div>
    {% endif %}
    
    {% if education %}
    <div class="section">
        <h2 class="section-title">Education</h2>
        {% for edu in education %}
        <div class="education-item">
            <div class="item-header">
                <div>
                    <div class="item-title">{{ edu.degree }}</div>
                    <div class="item-subtitle">{{ edu.institution }}{% if edu.location %}, {{ edu.location }}{% endif %}</div>
                </div>
                {% if edu.graduation_date %}
                <div class="item-date">{{ edu.graduation_date }}</div>
                {% endif %}
            </div>
            {% if edu.gpa %}
            <div style="color: #555; font-size: 0.95em; margin-top: 5px;">GPA: {{ edu.gpa }}</div>
            {% endif %}
            {% if edu.relevant_coursework %}
            <div style="color: #555; font-size: 0.9em; margin-top: 5px;">
                <strong>Relevant Coursework:</strong> {{ edu.relevant_coursework | join(', ') }}
            </div>
            {% endif %}
        </div>
        {% endfor %}
    </div>
    {% endif %}
    
    {% if projects %}
    <div class="section">
        <h2 class="section-title">Projects</h2>
        {% for project in projects %}
        <div class="project-item">
            <div class="item-title">
                {{ project.name }}
                {% if project.link %}
                <a href="{{ project.link }}" target="_blank" style="font-size: 0.9em; color: #3498db;">↗</a>
                {% endif %}
            </div>
            <p style="color: #555; margin-top: 5px; font-size: 0.95em;">{{ project.description }}</p>
            {% if project.technologies %}
            <div class="technologies">
                <strong>Technologies:</strong> {{ project.technologies | join(', ') }}
            </div>
            {% endif %}
            {% if project.highlights %}
            <ul class="highlights">
                {% for highlight in project.highlights %}
                <li>{{ highlight }}</li>
                {% endfor %}
            </ul>
            {% endif %}
        </div>
        {% endfor %}
    </div>
    {% endif %}
    
    {% if certifications %}
    <div class="section">
        <h2 class="section-title">Certifications</h2>
        <ul class="certifications-list">
            {% for cert in certifications %}
            <li>{{ cert }}</li>
            {% endfor %}
        </ul>
    </div>
    {% endif %}
</body>
</html>'''


def main():
    """Demo usage"""
    # Sample data
    sample_data = {
        "personal_info": {
            "name": "Jane Doe",
            "email": "jane.doe@email.com",
            "phone": "(555) 123-4567",
            "location": "San Francisco, CA",
            "linkedin": "https://linkedin.com/in/janedoe",
            "github": "https://github.com/janedoe"
        },
        "summary": "Experienced Software Engineer with 5+ years of expertise in full-stack development, cloud architecture, and team leadership. Proven track record of delivering scalable solutions that improve user experience and drive business growth.",
        "skills": {
            "languages": ["Python", "JavaScript", "TypeScript", "Java"],
            "frameworks": ["React", "Node.js", "Django", "FastAPI"],
            "databases": ["PostgreSQL", "MongoDB", "Redis"],
            "cloud": ["AWS", "Docker", "Kubernetes", "Terraform"]
        },
        "experience": [
            {
                "title": "Senior Software Engineer",
                "company": "Tech Corp",
                "location": "San Francisco, CA",
                "start_date": "Jan 2021",
                "end_date": "Present",
                "highlights": [
                    "Led development of microservices architecture serving 2M+ daily active users",
                    "Reduced API response time by 45% through caching and query optimization",
                    "Mentored team of 4 junior engineers, improving code quality and deployment practices"
                ]
            },
            {
                "title": "Software Engineer",
                "company": "StartupXYZ",
                "location": "Remote",
                "start_date": "Jun 2019",
                "end_date": "Dec 2020",
                "highlights": [
                    "Built RESTful APIs using Django and PostgreSQL handling 100K+ requests/day",
                    "Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes",
                    "Collaborated with product team to deliver 3 major features ahead of schedule"
                ]
            }
        ],
        "education": [
            {
                "degree": "Bachelor of Science in Computer Science",
                "institution": "University of California, Berkeley",
                "location": "Berkeley, CA",
                "graduation_date": "May 2019",
                "gpa": "3.8/4.0"
            }
        ],
        "projects": [
            {
                "name": "Open Source Contributor - FastAPI",
                "description": "Contributed bug fixes and documentation improvements to popular Python web framework",
                "technologies": ["Python", "FastAPI", "Pydantic"],
                "link": "https://github.com/tiangolo/fastapi"
            }
        ],
        "certifications": [
            "AWS Certified Solutions Architect - Associate",
            "Certified Kubernetes Administrator (CKA)"
        ]
    }
    
    # Build the resume
    builder = ResumeBuilder()
    html = builder.build_from_json(json.dumps(sample_data))
    
    # Save to file
    output_path = Path("sample_resume.html")
    output_path.write_text(html)
    print(f"Resume HTML generated: {output_path}")


if __name__ == "__main__":
    main()
