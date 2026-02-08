export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  features: string[];
  category: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  features: string[];
  category: string;
}

export interface ResumeData {
  template?: string;
  personal_info: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    website: string;
    // Full URLs (optional, for backend processing)
    linkedin_url?: string;
    github_url?: string;
    website_url?: string;
  };
  summary: string;
  experience: any[];
  education: any[];
  skills: any[];
  projects: any[];
  certifications: string[];
}
