'use client';

import { useState, useEffect, useRef } from 'react';
import {
  PersonalInfoForm,
  SummaryForm,
  ExperienceForm,
  EducationForm,
  SkillsForm,
  ProjectsForm,
  CertificationsForm,
} from './forms';
import TemplateSelector from './TemplateSelector';
import { buildResume, downloadPDF } from '@/services/builderApi';
import { processPersonalInfoForBackend } from '@/utils/socialLinks';

interface ResumeData {
  template?: string;
  personal_info: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    website: string;
  };
  summary: string;
  experience: any[];
  education: any[];
  skills: any[];
  projects: any[];
  certifications: string[];
}

interface ResumeFormProps {
  setPreviewHtml: (html: string) => void;
  setIsGenerating: (loading: boolean) => void;
}

export default function ResumeForm({ setPreviewHtml, setIsGenerating }: ResumeFormProps) {
  // Load template from localStorage or default to 'modern'
  const [selectedTemplate, setSelectedTemplate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('resumeTemplate') || 'modern';
    }
    return 'modern';
  });

  const [formData, setFormData] = useState<ResumeData>({
    template: selectedTemplate,
    personal_info: {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      website: '',
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
  });

  const [errors, setErrors] = useState<Record<string, any>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync template changes with formData and localStorage
  useEffect(() => {
    setFormData(prev => ({ ...prev, template: selectedTemplate }));
    if (typeof window !== 'undefined') {
      localStorage.setItem('resumeTemplate', selectedTemplate);
    }
  }, [selectedTemplate]);

  // Auto-refresh preview when form changes
  useEffect(() => {
    const timer = setTimeout(() => {
      handlePreview(true);
    }, 2000); // Wait 2 seconds after user stops typing

    return () => clearTimeout(timer);
  }, [formData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, any> = {};

    // Validate personal info
    if (!formData.personal_info.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.personal_info.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.personal_info.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.personal_info.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    // Validate experience
    formData.experience.forEach((exp, index) => {
      if (!exp.title.trim()) {
        newErrors[`experience_${index}_title`] = 'Title is required';
      }
      if (!exp.company.trim()) {
        newErrors[`experience_${index}_company`] = 'Company is required';
      }
      if (!exp.start_date.trim()) {
        newErrors[`experience_${index}_start_date`] = 'Start date is required';
      }
      if (!exp.end_date.trim()) {
        newErrors[`experience_${index}_end_date`] = 'End date is required';
      }
    });

    // Validate education
    formData.education.forEach((edu, index) => {
      if (!edu.degree.trim()) {
        newErrors[`education_${index}_degree`] = 'Degree is required';
      }
      if (!edu.institution.trim()) {
        newErrors[`education_${index}_institution`] = 'Institution is required';
      }
    });

    // Validate projects
    formData.projects.forEach((proj, index) => {
      if (!proj.name.trim()) {
        newErrors[`project_${index}_name`] = 'Project name is required';
      }
      if (!proj.description.trim()) {
        newErrors[`project_${index}_description`] = 'Description is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const cleanFormData = (data: ResumeData) => {
    // Remove empty strings from arrays and filter out empty objects
    return {
      ...data,
      personal_info: processPersonalInfoForBackend(data.personal_info),
      experience: data.experience.map(exp => ({
        ...exp,
        highlights: exp.highlights.filter((h: string) => h.trim() !== ''),
      })),
      education: data.education.map(edu => ({
        ...edu,
        relevant_coursework: edu.relevant_coursework.filter((c: string) => c.trim() !== ''),
      })),
      skills: data.skills.map(skill => ({
        ...skill,
        skills: skill.skills.filter((s: string) => s.trim() !== ''),
      })).filter(skill => skill.category_name.trim() !== '' && skill.skills.length > 0),
      projects: data.projects.map(proj => ({
        ...proj,
        technologies: proj.technologies.filter((t: string) => t.trim() !== ''),
        highlights: proj.highlights.filter((h: string) => h.trim() !== ''),
      })),
      certifications: data.certifications.filter((c: string) => c.trim() !== ''),
    };
  };

  const handlePreview = async (silent = false) => {
    setIsGenerating(true);
    if (!silent) {
      setMessage(null);
    }

    try {
      const cleanedData = cleanFormData(formData);
      const html = await buildResume(cleanedData);
      setPreviewHtml(html);
      if (!silent) {
        setMessage({ type: 'success', text: 'Preview generated successfully!' });
      }
    } catch (error) {
      if (!silent) {
        setMessage({ 
          type: 'error', 
          text: error instanceof Error ? error.message : 'Failed to generate preview' 
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix the validation errors before downloading.' });
      return;
    }

    setMessage(null);

    try {
      const cleanedData = cleanFormData(formData);
      await downloadPDF(cleanedData);
      setMessage({ type: 'success', text: 'PDF downloaded successfully!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to download PDF' 
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 sticky top-0 bg-white z-10 py-4 border-b">
        <button
          type="button"
          onClick={() => handlePreview(false)}
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          Preview Resume
        </button>
        <button
          type="button"
          onClick={handleDownloadPDF}
          className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition shadow-sm"
        >
          Download PDF
        </button>
      </div>

      {/* Template Selector */}
      <TemplateSelector
        selectedTemplate={selectedTemplate}
        onSelect={setSelectedTemplate}
      />

      {/* Form Sections */}
      <PersonalInfoForm
        data={formData.personal_info}
        onChange={(data) => setFormData({ ...formData, personal_info: data })}
        errors={errors}
      />

      <SummaryForm
        data={formData.summary}
        onChange={(data) => setFormData({ ...formData, summary: data })}
      />

      <ExperienceForm
        data={formData.experience}
        onChange={(data) => setFormData({ ...formData, experience: data })}
        errors={errors}
      />

      <EducationForm
        data={formData.education}
        onChange={(data) => setFormData({ ...formData, education: data })}
        errors={errors}
      />

      <SkillsForm
        data={formData.skills}
        onChange={(data) => setFormData({ ...formData, skills: data })}
      />

      <ProjectsForm
        data={formData.projects}
        onChange={(data) => setFormData({ ...formData, projects: data })}
        errors={errors}
      />

      <CertificationsForm
        data={formData.certifications}
        onChange={(data) => setFormData({ ...formData, certifications: data })}
      />

      {/* Bottom Action Buttons */}
      <div className="flex gap-4 pt-4 border-t">
        <button
          type="button"
          onClick={() => handlePreview(false)}
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
        >
          Preview Resume
        </button>
        <button
          type="button"
          onClick={handleDownloadPDF}
          className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition shadow-sm"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}
