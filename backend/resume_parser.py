#!/usr/bin/env python3

import re
import json
import sys
import os
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple
from collections import defaultdict, Counter
from datetime import datetime
import fitz
import spacy
from spacy.matcher import PhraseMatcher

@dataclass
class Resume:
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    
    summary: Optional[str] = None
    skills: Dict[str, List[str]] = field(default_factory=dict)
    experience: List[Dict] = field(default_factory=list)
    education: List[Dict] = field(default_factory=list)
    
    ats_score: Optional[Dict] = None
    feedback: Optional[Dict] = None

class ChromaFeedbackDB:
    FEEDBACK_KNOWLEDGE = {
        'experience_writing': [
            "Use the STAR method (Situation, Task, Action, Result) to structure your experience bullets",
            "Start each bullet point with a strong action verb like 'Led', 'Developed', 'Architected', or 'Optimized'",
            "Include specific metrics and numbers - percentages, dollar amounts, time saved, users impacted",
            "Focus on impact and outcomes rather than just listing responsibilities",
            "Quantify your achievements: '40% faster', 'saved $50K', 'served 1M+ users'",
            "Show progression and increasing responsibility across roles",
            "Highlight cross-functional collaboration and leadership initiatives",
            "Use past tense for previous roles and present tense for current position",
            "Keep bullet points concise: 1-2 lines maximum per bullet",
            "Avoid generic statements like 'responsible for' or 'duties included'"
        ],
        'technical_skills': [
            "Group skills by category (Languages, Frameworks, Tools, Cloud) for better readability",
            "List skills in order of proficiency and relevance to target role",
            "Include version numbers for critical technologies (e.g., 'Python 3.x', 'React 18')",
            "Add context about skill proficiency: years of experience or project scale",
            "Don't just list skills - demonstrate them through your experience section",
            "Include both technical hard skills and soft skills like 'System Design' or 'Technical Mentorship'",
            "Remove outdated technologies unless relevant to the position",
            "Prioritize in-demand skills for your target industry"
        ],
        'summary_profile': [
            "Write a 2-3 sentence summary highlighting your unique value proposition",
            "Include your years of experience, key specializations, and major achievements",
            "Tailor your summary to match the job description keywords",
            "Use industry-specific terminology to show domain expertise",
            "Mention your career goals or the type of role you're seeking",
            "Lead with your strongest selling point - what makes you stand out"
        ],
        'formatting_ats': [
            "Use a clean, single-column layout for optimal ATS parsing",
            "Stick to standard section headers: Experience, Education, Skills, Projects",
            "Use simple bullet points (• or -) rather than complex symbols",
            "Avoid tables, text boxes, headers, and footers that confuse ATS systems",
            "Save as .docx or PDF (but test PDF compatibility with target ATS)",
            "Use standard fonts like Arial, Calibri, or Times New Roman at 10-12pt",
            "Include keywords from the job description naturally throughout"
        ],
        'achievements_impact': [
            "Every bullet should answer: What did you do? How did you do it? What was the impact?",
            "Use before/after comparisons to show improvement (e.g., 'Reduced from X to Y')",
            "Highlight awards, recognitions, or promotions received",
            "Mention scope of work: team size, budget, number of users/customers affected",
            "Show business impact: revenue generated, costs saved, efficiency gained",
            "Include competitive achievements: beat benchmarks, outperformed peers",
            "Demonstrate problem-solving: identify the problem, your solution, the outcome"
        ],
        'missing_sections': [
            "Add a Projects section to showcase side projects, open source contributions, or personal work",
            "Include Certifications if you have relevant professional credentials (AWS, GCP, PMP, etc.)",
            "Consider adding Publications or Speaking Engagements if applicable",
            "Volunteer work or Leadership experience can demonstrate soft skills",
            "Awards and Honors section can highlight academic or professional recognition",
            "Technical blog or portfolio website link adds credibility"
        ],
        'contact_optimization': [
            "Ensure your email address is professional (firstname.lastname@domain.com)",
            "LinkedIn URL should be customized (linkedin.com/in/yourname) not default numeric",
            "Include GitHub only if you have active, quality repositories relevant to your field",
            "Add your portfolio website or personal blog if applicable",
            "Location can be just 'City, State' - full address not needed",
            "Consider adding a professional headline under your name"
        ]
    }
    
    def __init__(self, persist_directory: str = "./chroma_feedback_db"):
        self.persist_directory = persist_directory
        self.collection = None
        
        try:
            import chromadb
            from chromadb.config import Settings
            
            self.client = chromadb.Client(Settings(
                persist_directory=persist_directory,
                anonymized_telemetry=False
            ))
            
            try:
                self.collection = self.client.get_collection("resume_feedback")
            except:
                self.collection = self.client.create_collection(
                    name="resume_feedback",
                    metadata={"description": "Resume feedback suggestions database"}
                )
                self._populate_database()
                
        except ImportError:
            print("ERROR: ChromaDB not installed!")
            print("Install with: pip install chromadb")
            sys.exit(1)
    
    def _populate_database(self):
        documents = []
        metadatas = []
        ids = []
        
        idx = 0
        for category, feedbacks in self.FEEDBACK_KNOWLEDGE.items():
            for feedback in feedbacks:
                documents.append(feedback)
                metadatas.append({
                    "category": category,
                    "priority": "high" if idx < 15 else "medium"
                })
                ids.append(f"feedback_{idx}")
                idx += 1
        
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
    
    def get_relevant_feedback(
        self, 
        context: str, 
        issues: List[str],
        n_results: int = 10
    ) -> List[Dict]:
        if not self.collection:
            return []
        
        query_text = f"Resume needs improvement in: {', '.join(issues)}. Context: {context}"
        
        try:
            results = self.collection.query(
                query_texts=[query_text],
                n_results=n_results
            )
            
            feedback_list = []
            for i in range(len(results['documents'][0])):
                feedback_list.append({
                    'suggestion': results['documents'][0][i],
                    'category': results['metadatas'][0][i]['category'],
                    'priority': results['metadatas'][0][i]['priority'],
                    'relevance_score': round(1 - results['distances'][0][i], 3)
                })

            feedback_list.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            return feedback_list
            
        except Exception:
            return []
    
    def add_feedback(self, feedback: str, category: str, priority: str = "medium"):

        if not self.collection:
            return
        
        count = self.collection.count()
        
        self.collection.add(
            documents=[feedback],
            metadatas=[{"category": category, "priority": priority}],
            ids=[f"feedback_{count}"]
        )

class ResumeParser:
    SKILLS = {
        'languages': ['Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'R'],
        'frameworks': ['React', 'Angular', 'Vue', 'Django', 'Flask', 'FastAPI', 'Spring', 'Node.js', 'Next.js', 'Express'],
        'databases': ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Cassandra', 'Elasticsearch', 'DynamoDB', 'SQLite'],
        'cloud': ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'GitHub Actions', 'CircleCI'],
        'data_ml': ['TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Spark', 'Scikit-learn', 'Keras', 'Airflow', 'Tableau'],
        'other': ['Git', 'REST', 'GraphQL', 'Agile', 'Scrum', 'CI/CD', 'Microservices', 'TDD']
    }
    
    PATTERNS = {
        'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
        'phone': re.compile(r'[\+\(]?[1-9][0-9 .\-\(\)]{8,}[0-9]'),
        'linkedin': re.compile(r'linkedin\.com/in/([\w-]+)', re.I),
        'github': re.compile(r'github\.com/([\w-]+)', re.I),
        'date_range': re.compile(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*[-–to]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|Present|Current)', re.I),
        'section': re.compile(r'^(experience|education|skills|projects|certifications?|summary|profile)\b', re.I)
    }
    
    ATS_KEYWORDS = {
        'action_verbs': ['developed', 'designed', 'implemented', 'led', 'managed', 'created', 'built', 
                        'improved', 'optimized', 'increased', 'reduced', 'achieved', 'delivered'],
        'quantifiers': [r'\d+%', r'\$\d+', r'\d+x', r'\d+\+'],
        'leadership': ['led', 'managed', 'supervised', 'coordinated', 'mentored', 'trained'],
        'impact': ['increased', 'decreased', 'improved', 'reduced', 'optimized', 'enhanced', 'accelerated']
    }
    
    def __init__(self, model: str = "en_core_web_sm"):
        try:
            self.nlp = spacy.load(model)
        except OSError:
            import subprocess
            subprocess.run([sys.executable, "-m", "spacy", "download", model], 
                         capture_output=True)
            self.nlp = spacy.load(model)
        
        self._build_skill_matcher()
        
        self.feedback_db = ChromaFeedbackDB()
    
    def _build_skill_matcher(self):
        self.skill_matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")
        for category, skills in self.SKILLS.items():
            patterns = [self.nlp.make_doc(skill) for skill in skills]
            self.skill_matcher.add(category, patterns)
    
    def _is_valid_resume(self, text: str) -> bool:
        """Validate if the PDF is a resume by checking for key indicators"""
        text_lower = text.lower()
        score = 0
        
        # Contact information
        if self.PATTERNS['email'].search(text):
            score += 2
        if self.PATTERNS['phone'].search(text):
            score += 2
        
        # Resume sections
        resume_sections = ['experience', 'education', 'skills', 'work experience']
        found_sections = sum(1 for section in resume_sections if section in text_lower)
        score += found_sections * 2
        
        # Date ranges (employment dates)
        date_matches = len(self.PATTERNS['date_range'].findall(text))
        if date_matches >= 2:
            score += 3
        
        # Professional links
        if self.PATTERNS['linkedin'].search(text) or self.PATTERNS['github'].search(text):
            score += 1
        
        return score >= 6
    
    def parse(self, pdf_path: str) -> Resume:
        text = self._extract_pdf_text(pdf_path)
        
        # Validate resume
        if not self._is_valid_resume(text):
            print("\nError: This PDF does not appear to be a resume/CV.")
            print("Please provide a valid resume document.")
            sys.exit(1)
        
        doc = self.nlp(text)
        
        resume = Resume()
        
        header = text[:1000]
        resume.name = self._extract_name(doc, header)
        resume.email = self._find_pattern('email', text)
        resume.phone = self._find_pattern('phone', text)
        resume.location = self._extract_location(doc)
        resume.linkedin = self._find_pattern('linkedin', text)
        resume.github = self._find_pattern('github', text)
        
        sections = self._split_sections(text)
        
        resume.summary = sections.get('summary', sections.get('profile', ''))[:300] or None
        resume.skills = self._extract_skills(sections.get('skills', text))
        resume.experience = self._extract_experience(sections.get('experience', ''))
        resume.education = self._extract_education(sections.get('education', ''))
        
        resume.ats_score = self._calculate_ats_score(resume, text)
        
        resume.feedback = self._generate_feedback(resume, text, sections)
        
        return resume
    
    def _extract_pdf_text(self, pdf_path: str) -> str:
        return "\n".join(page.get_text() for page in fitz.open(pdf_path))
    
    def _find_pattern(self, pattern_name: str, text: str) -> Optional[str]:
        match = self.PATTERNS[pattern_name].search(text)
        if not match:
            return None
        
        if pattern_name in ['linkedin', 'github']:
            return f"https://{match.group(0)}"
        return match.group(0)
    
    def _extract_name(self, doc, header: str) -> Optional[str]:
        for ent in doc.ents:
            if ent.label_ == "PERSON" and ent.start_char < 500:
                return ent.text
        
        first_line = header.split('\n')[0].strip()
        if 2 <= len(first_line.split()) <= 4 and '@' not in first_line:
            return first_line
        return None
    
    def _extract_location(self, doc) -> Optional[str]:
        for ent in doc.ents:
            if ent.label_ in ["GPE", "LOC"] and ent.start_char < 1000:
                return ent.text
        return None
    
    def _split_sections(self, text: str) -> Dict[str, str]:
        sections = defaultdict(str)
        lines = text.split('\n')
        current_section = 'header'
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if len(line) < 50 and self.PATTERNS['section'].match(line):
                current_section = self.PATTERNS['section'].match(line).group(1).lower()
            else:
                sections[current_section] += line + '\n'
        
        return dict(sections)
    
    def _extract_skills(self, text: str) -> Dict[str, List[str]]:
        doc = self.nlp(text)
        skills = defaultdict(set)
        
        for match_id, start, end in self.skill_matcher(doc):
            category = self.nlp.vocab.strings[match_id]
            skill = doc[start:end].text
            skills[category].add(skill)
        
        return {cat: sorted(list(sk)) for cat, sk in skills.items() if sk}
    
    def _extract_experience(self, text: str) -> List[Dict]:
        if not text or len(text) < 20:
            return []
        
        experiences = []
        blocks = self._split_by_dates(text)
        
        for block in blocks:
            exp = {}
            lines = [l.strip() for l in block.split('\n') if l.strip()]
            
            if not lines:
                continue
            
            first = lines[0]
            date_match = self.PATTERNS['date_range'].search(first)
            
            if date_match:
                exp['duration'] = date_match.group(0)
                first = first.replace(date_match.group(0), '').strip()
            
            if '|' in first:
                exp['title'], exp['company'] = [p.strip() for p in first.split('|', 1)]
            elif ' at ' in first.lower():
                parts = re.split(r'\s+at\s+', first, flags=re.I)
                exp['title'] = parts[0].strip()
                exp['company'] = parts[1].strip() if len(parts) > 1 else None
            else:
                exp['title'] = first
            
            bullets = [re.sub(r'^[•\-\*]+\s*', '', l) for l in lines[1:] if len(l) > 15]
            if bullets:
                exp['highlights'] = bullets[:8]
            
            if exp.get('title'):
                experiences.append(exp)
        
        return experiences
    
    def _split_by_dates(self, text: str) -> List[str]:
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        blocks = []
        current = []
        
        for line in lines:
            if self.PATTERNS['date_range'].search(line) and current:
                blocks.append('\n'.join(current))
                current = [line]
            else:
                current.append(line)
        
        if current:
            blocks.append('\n'.join(current))
        
        return blocks
    
    def _extract_education(self, text: str) -> List[Dict]:
        if not text:
            return []
        
        education = []
        degree_pattern = re.compile(r'\b(B\.?S\.?|M\.?S\.?|Ph\.?D\.?|Bachelor|Master|MBA|Associate)\b', re.I)
        
        for line in text.split('\n'):
            line = line.strip()
            if degree_pattern.search(line) and len(line) < 200:
                edu = {'degree': line}
                
                doc = self.nlp(line)
                for ent in doc.ents:
                    if ent.label_ == "ORG":
                        edu['institution'] = ent.text
                        break
                
                education.append(edu)
        
        return education
    
    def _calculate_ats_score(self, resume: Resume, text: str) -> Dict:
        score_data = {
            'total_score': 0,
            'breakdown': {},
            'grade': ''
        }
        
        text_lower = text.lower()

        contact_score = 0
        if resume.email: contact_score += 5
        if resume.phone: contact_score += 5
        if resume.linkedin: contact_score += 5
        if resume.location: contact_score += 5
        score_data['breakdown']['contact_info'] = contact_score

        total_skills = sum(len(skills) for skills in resume.skills.values())
        skills_score = min(25, total_skills * 2)
        score_data['breakdown']['skills'] = skills_score

        exp_score = 0
        exp_score += min(15, len(resume.experience) * 5)
        
        quantifiers = sum(1 for pattern in self.ATS_KEYWORDS['quantifiers'] 
                         for _ in re.finditer(pattern, text))
        exp_score += min(10, quantifiers * 2)
        
        action_verb_count = sum(text_lower.count(verb) for verb in self.ATS_KEYWORDS['action_verbs'])
        exp_score += min(5, action_verb_count)
        
        score_data['breakdown']['experience'] = exp_score

        edu_score = min(10, len(resume.education) * 5)
        score_data['breakdown']['education'] = edu_score

        format_score = 0
        
        if resume.summary and len(resume.summary) > 50:
            format_score += 5
        
        all_skills = [skill.lower() for skills in self.SKILLS.values() for skill in skills]
        keyword_count = sum(text_lower.count(skill) for skill in all_skills)
        format_score += min(10, keyword_count // 2)
        
        score_data['breakdown']['formatting_keywords'] = format_score

        score_data['total_score'] = sum(score_data['breakdown'].values())

        total = score_data['total_score']
        if total >= 85:
            score_data['grade'] = 'A (Excellent)'
        elif total >= 70:
            score_data['grade'] = 'B (Good)'
        elif total >= 55:
            score_data['grade'] = 'C (Fair)'
        else:
            score_data['grade'] = 'D (Needs Improvement)'
        
        return score_data
    
    def _generate_feedback(self, resume: Resume, text: str, sections: Dict) -> Dict:
        """Generate intelligent feedback using ChromaDB"""

        issues = []
        
        if not resume.summary or len(resume.summary) < 50:
            issues.append("missing professional summary")
        
        if not resume.experience or len(resume.experience) < 2:
            issues.append("limited work experience detail")
        
        quantifiers = sum(1 for pattern in self.ATS_KEYWORDS['quantifiers'] 
                         for _ in re.finditer(pattern, text))
        if quantifiers < 3:
            issues.append("lack of quantified achievements")
        
        action_verb_count = sum(text.lower().count(verb) for verb in self.ATS_KEYWORDS['action_verbs'])
        if action_verb_count < 5:
            issues.append("weak action verbs in experience")
        
        total_bullets = sum(len(exp.get('highlights', [])) for exp in resume.experience)
        if total_bullets < 8:
            issues.append("insufficient experience detail")

        context = f"Experience section: {sections.get('experience', '')[:600]}"

        feedback_suggestions = self.feedback_db.get_relevant_feedback(
            context=context,
            issues=issues,
            n_results=10
        )

        strengths = []
        if resume.github:
            strengths.append("Has GitHub profile")
        if len(resume.experience) >= 3:
            strengths.append("Substantial work experience")
        if quantifiers >= 5:
            strengths.append("Good use of metrics")
        
        total_skills = sum(len(skills) for skills in resume.skills.values())
        if total_skills >= 15:
            strengths.append(f"Strong technical skills ({total_skills} identified)")
        
        return {
            'suggestions': feedback_suggestions,
            'strengths': strengths,
            'issues_identified': issues,
            'total_suggestions': len(feedback_suggestions)
        }
    
    def format_output(self, resume: Resume, format_type: str = "text") -> str:
        if format_type == "json":
            data = asdict(resume)
            
            if data.get('ats_score') and data['ats_score'].get('breakdown'):
                max_scores = {
                    'contact_info': 20,
                    'skills': 25,
                    'experience': 30,
                    'education': 10,
                    'formatting_keywords': 15
                }
                breakdown = data['ats_score']['breakdown']
                data['ats_score']['breakdown'] = [
                    {
                        'category': cat,
                        'label': cat.replace('_', ' ').title(),
                        'score': score,
                        'max_score': max_scores.get(cat, 100),
                        'percentage': round((score / max_scores.get(cat, 100)) * 100)
                    }
                    for cat, score in breakdown.items()
                ]
            
            if data.get('feedback') and data['feedback'].get('suggestions'):
                for suggestion in data['feedback']['suggestions']:
                    relevance = suggestion.get('relevance_score', 0)
                    suggestion['relevance_score'] = round(abs(relevance), 3)
                    suggestion['relevance_percentage'] = round(abs(relevance) * 100)
            
            data['metadata'] = {
                'parsed_at': datetime.now().isoformat(),
                'parser_version': '1.0.0',
                'status': 'success'
            }
            
            return json.dumps(data, indent=2, default=str)
        
        lines = ["RESUME ANALYSIS & ATS COMPATIBILITY REPORT", ""]

        lines.extend([
            "CONTACT INFORMATION",
            f"Name:     {resume.name or 'Not found'}",
            f"Email:    {resume.email or 'Not found'}",
            f"Phone:    {resume.phone or 'Not found'}",
            f"Location: {resume.location or 'Not found'}",
        ])
        if resume.linkedin:
            lines.append(f"LinkedIn: {resume.linkedin}")
        if resume.github:
            lines.append(f"GitHub:   {resume.github}")

        if resume.ats_score:
            ats = resume.ats_score
            lines.extend([
                "",
                "ATS COMPATIBILITY SCORE",
                f"Overall Score: {ats['total_score']}/100 - {ats['grade']}",
                "",
                "Score Breakdown:"
            ])
            for category, score in ats['breakdown'].items():
                max_score = {'contact_info': 20, 'skills': 25, 'experience': 30, 
                            'education': 10, 'formatting_keywords': 15}.get(category, 100)
                lines.append(f"  {category.replace('_', ' ').title():<30} {score}/{max_score}")

        if resume.feedback:
            feedback = resume.feedback
            
            lines.extend(["", "AI-POWERED FEEDBACK"])

            if feedback.get('strengths'):
                lines.append("\nStrengths:")
                for strength in feedback['strengths']:
                    lines.append(f"   - {strength}")
            
            if feedback.get('suggestions'):
                lines.append("\nImprovement Suggestions:")
                
                high_priority = [s for s in feedback['suggestions'] if s['priority'] == 'high']
                medium_priority = [s for s in feedback['suggestions'] if s['priority'] == 'medium']
                
                if high_priority:
                    lines.append("\n   HIGH PRIORITY:")
                    for item in high_priority[:5]:
                        lines.append(f"      - {item['suggestion']}")
                        lines.append(f"        (Category: {item['category'].replace('_', ' ').title()} | "
                                   f"Relevance: {int(item['relevance_score']*100)}%)")
                
                if medium_priority:
                    lines.append("\n   MEDIUM PRIORITY:")
                    for item in medium_priority[:3]:
                        lines.append(f"      - {item['suggestion']}")
        
        if resume.experience:
            lines.extend(["", "EXPERIENCE SUMMARY"])
            for i, exp in enumerate(resume.experience, 1):
                lines.append(f"\n{i}. {exp.get('title', 'Position')}")
                if exp.get('company'):
                    lines.append(f"   Company: {exp['company']}")
                if exp.get('duration'):
                    lines.append(f"   Duration: {exp['duration']}")
                if exp.get('highlights'):
                    lines.append(f"   Bullet points: {len(exp['highlights'])}")
        
        if resume.education:
            lines.extend(["", "EDUCATION"])
            for edu in resume.education:
                lines.append(f"- {edu.get('degree', 'Degree')}")
                if edu.get('institution'):
                    lines.append(f"  {edu['institution']}")
        
        lines.append("")
        return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print("Usage: python resume_parser.py <resume.pdf> [--json]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_format = "json" if "--json" in sys.argv else "text"
    
    if not Path(pdf_path).exists():
        print(f"Error: File not found: {pdf_path}")
        sys.exit(1)
    
    try:
        parser = ResumeParser()
        resume = parser.parse(pdf_path)
        output = parser.format_output(resume, output_format)
        print(output)
        
        if output_format == "json":
            output_path = Path(pdf_path).stem + "_analysis.json"
            Path(output_path).write_text(output)
    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()