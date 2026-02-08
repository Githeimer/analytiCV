/**
 * Consolidated Resume Builder Forms
 * All form sections for the resume builder in a single file
 */

// ============================================================================
// Types
// ============================================================================

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
}

export interface Education {
  degree: string;
  institution: string;
  location: string;
  graduation_date: string;
  gpa: string;
  relevant_coursework: string[];
}

export interface Experience {
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  location: string;
  highlights: string[];
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  link: string;
  highlights: string[];
}

export interface SkillCategory {
  category_name: string;
  skills: string[];
}

// ============================================================================
// Shared Components & Styles
// ============================================================================

const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
const inputErrorClass = "w-full px-3 py-2 border border-red-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const sectionHeaderClass = "text-lg font-semibold text-gray-800 border-b pb-2";
const addButtonClass = "px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition";
const removeButtonClass = "text-red-600 hover:text-red-800 text-sm";
const cardClass = "border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50";

// ============================================================================
// PersonalInfoForm
// ============================================================================

interface PersonalInfoFormProps {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
  errors: Record<string, string>;
}

export function PersonalInfoForm({ data, onChange, errors }: PersonalInfoFormProps) {
  const handleChange = (field: keyof PersonalInfo, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className={sectionHeaderClass}>Personal Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={errors.name ? inputErrorClass : inputClass}
            placeholder="John Doe"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className={labelClass}>
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={errors.email ? inputErrorClass : inputClass}
            placeholder="john@example.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className={labelClass}>
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={errors.phone ? inputErrorClass : inputClass}
            placeholder="+1 234 567 8900"
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className={labelClass}>Location</label>
          <input
            type="text"
            value={data.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className={inputClass}
            placeholder="San Francisco, CA"
          />
        </div>

        <div>
          <label className={labelClass}>LinkedIn Username</label>
          <input
            type="text"
            value={data.linkedin}
            onChange={(e) => handleChange('linkedin', e.target.value)}
            className={inputClass}
            placeholder="johndoe"
          />
          <p className="text-xs text-gray-500 mt-1">linkedin.com/in/{data.linkedin || 'username'}</p>
        </div>

        <div>
          <label className={labelClass}>GitHub Username</label>
          <input
            type="text"
            value={data.github}
            onChange={(e) => handleChange('github', e.target.value)}
            className={inputClass}
            placeholder="johndoe"
          />
          <p className="text-xs text-gray-500 mt-1">github.com/{data.github || 'username'}</p>
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Website</label>
          <input
            type="url"
            value={data.website}
            onChange={(e) => handleChange('website', e.target.value)}
            className={inputClass}
            placeholder="https://johndoe.com"
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SummaryForm
// ============================================================================

interface SummaryFormProps {
  data: string;
  onChange: (data: string) => void;
}

export function SummaryForm({ data, onChange }: SummaryFormProps) {
  return (
    <div className="space-y-4">
      <h3 className={sectionHeaderClass}>Professional Summary</h3>
      
      <div>
        <label className={labelClass}>Summary</label>
        <textarea
          value={data}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="Experienced software engineer with 5+ years of expertise in building scalable web applications..."
          rows={5}
        />
        <p className="text-xs text-gray-500 mt-1">
          Write a brief professional summary highlighting your key qualifications and experience.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// EducationForm
// ============================================================================

interface EducationFormProps {
  data: Education[];
  onChange: (data: Education[]) => void;
  errors: Record<string, any>;
}

export function EducationForm({ data, onChange, errors }: EducationFormProps) {
  const addEducation = () => {
    onChange([
      ...data,
      {
        degree: '',
        institution: '',
        location: '',
        graduation_date: '',
        gpa: '',
        relevant_coursework: [],
      },
    ]);
  };

  const removeEducation = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const updateEducation = (index: number, field: keyof Education, value: any) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addCoursework = (eduIndex: number) => {
    const updated = [...data];
    updated[eduIndex].relevant_coursework.push('');
    onChange(updated);
  };

  const removeCoursework = (eduIndex: number, courseIndex: number) => {
    const updated = [...data];
    updated[eduIndex].relevant_coursework = updated[eduIndex].relevant_coursework.filter(
      (_, i) => i !== courseIndex
    );
    onChange(updated);
  };

  const updateCoursework = (eduIndex: number, courseIndex: number, value: string) => {
    const updated = [...data];
    updated[eduIndex].relevant_coursework[courseIndex] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-800">Education</h3>
        <button type="button" onClick={addEducation} className={addButtonClass}>
          + Add Education
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">No education added yet. Click "Add Education" to start.</p>
      )}

      {data.map((edu, index) => (
        <div key={index} className={cardClass}>
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-gray-700">Education #{index + 1}</h4>
            <button type="button" onClick={() => removeEducation(index)} className={removeButtonClass}>
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Degree <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={edu.degree}
                onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                className={errors[`education_${index}_degree`] ? inputErrorClass : inputClass}
                placeholder="Bachelor of Science in Computer Science"
              />
              {errors[`education_${index}_degree`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`education_${index}_degree`]}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Institution <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={edu.institution}
                onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                className={errors[`education_${index}_institution`] ? inputErrorClass : inputClass}
                placeholder="Stanford University"
              />
              {errors[`education_${index}_institution`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`education_${index}_institution`]}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Location</label>
              <input
                type="text"
                value={edu.location}
                onChange={(e) => updateEducation(index, 'location', e.target.value)}
                className={inputClass}
                placeholder="Stanford, CA"
              />
            </div>

            <div>
              <label className={labelClass}>Graduation Date</label>
              <input
                type="text"
                value={edu.graduation_date}
                onChange={(e) => updateEducation(index, 'graduation_date', e.target.value)}
                className={inputClass}
                placeholder="May 2020"
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>GPA</label>
              <input
                type="text"
                value={edu.gpa}
                onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
                className={inputClass}
                placeholder="3.8/4.0"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Relevant Coursework</label>
              <button type="button" onClick={() => addCoursework(index)} className="text-sm text-blue-600 hover:text-blue-800">
                + Add Course
              </button>
            </div>
            <div className="space-y-2">
              {edu.relevant_coursework.length === 0 && (
                <p className="text-gray-500 text-xs italic">No coursework added</p>
              )}
              {edu.relevant_coursework.map((course, cIndex) => (
                <div key={cIndex} className="flex gap-2">
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => updateCoursework(index, cIndex, e.target.value)}
                    className={`flex-1 ${inputClass}`}
                    placeholder="Data Structures and Algorithms"
                  />
                  <button type="button" onClick={() => removeCoursework(index, cIndex)} className={removeButtonClass}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ExperienceForm
// ============================================================================

interface ExperienceFormProps {
  data: Experience[];
  onChange: (data: Experience[]) => void;
  errors: Record<string, any>;
}

export function ExperienceForm({ data, onChange, errors }: ExperienceFormProps) {
  const addExperience = () => {
    onChange([
      ...data,
      {
        title: '',
        company: '',
        start_date: '',
        end_date: '',
        location: '',
        highlights: [''],
      },
    ]);
  };

  const removeExperience = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const updateExperience = (index: number, field: keyof Experience, value: any) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addHighlight = (expIndex: number) => {
    const updated = [...data];
    updated[expIndex].highlights.push('');
    onChange(updated);
  };

  const removeHighlight = (expIndex: number, highlightIndex: number) => {
    const updated = [...data];
    updated[expIndex].highlights = updated[expIndex].highlights.filter((_, i) => i !== highlightIndex);
    onChange(updated);
  };

  const updateHighlight = (expIndex: number, highlightIndex: number, value: string) => {
    const updated = [...data];
    updated[expIndex].highlights[highlightIndex] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-800">Work Experience</h3>
        <button type="button" onClick={addExperience} className={addButtonClass}>
          + Add Experience
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">No experience added yet. Click "Add Experience" to start.</p>
      )}

      {data.map((exp, index) => (
        <div key={index} className={cardClass}>
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-gray-700">Experience #{index + 1}</h4>
            <button type="button" onClick={() => removeExperience(index)} className={removeButtonClass}>
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Job Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={exp.title}
                onChange={(e) => updateExperience(index, 'title', e.target.value)}
                className={errors[`experience_${index}_title`] ? inputErrorClass : inputClass}
                placeholder="Software Engineer"
              />
              {errors[`experience_${index}_title`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`experience_${index}_title`]}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Company <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={exp.company}
                onChange={(e) => updateExperience(index, 'company', e.target.value)}
                className={errors[`experience_${index}_company`] ? inputErrorClass : inputClass}
                placeholder="Tech Corp"
              />
              {errors[`experience_${index}_company`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`experience_${index}_company`]}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Start Date <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={exp.start_date}
                onChange={(e) => updateExperience(index, 'start_date', e.target.value)}
                className={errors[`experience_${index}_start_date`] ? inputErrorClass : inputClass}
                placeholder="Jan 2020"
              />
              {errors[`experience_${index}_start_date`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`experience_${index}_start_date`]}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>End Date <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={exp.end_date}
                onChange={(e) => updateExperience(index, 'end_date', e.target.value)}
                className={errors[`experience_${index}_end_date`] ? inputErrorClass : inputClass}
                placeholder="Present or Dec 2022"
              />
              {errors[`experience_${index}_end_date`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`experience_${index}_end_date`]}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Location</label>
              <input
                type="text"
                value={exp.location}
                onChange={(e) => updateExperience(index, 'location', e.target.value)}
                className={inputClass}
                placeholder="San Francisco, CA"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Highlights</label>
              <button type="button" onClick={() => addHighlight(index)} className="text-sm text-blue-600 hover:text-blue-800">
                + Add Highlight
              </button>
            </div>
            <div className="space-y-2">
              {exp.highlights.map((highlight, hIndex) => (
                <div key={hIndex} className="flex gap-2">
                  <input
                    type="text"
                    value={highlight}
                    onChange={(e) => updateHighlight(index, hIndex, e.target.value)}
                    className={`flex-1 ${inputClass}`}
                    placeholder="Led development of..."
                  />
                  {exp.highlights.length > 1 && (
                    <button type="button" onClick={() => removeHighlight(index, hIndex)} className={removeButtonClass}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ProjectsForm
// ============================================================================

interface ProjectsFormProps {
  data: Project[];
  onChange: (data: Project[]) => void;
  errors: Record<string, any>;
}

export function ProjectsForm({ data, onChange, errors }: ProjectsFormProps) {
  const addProject = () => {
    onChange([
      ...data,
      {
        name: '',
        description: '',
        technologies: [''],
        link: '',
        highlights: [''],
      },
    ]);
  };

  const removeProject = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const updateProject = (index: number, field: keyof Project, value: any) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addTechnology = (projIndex: number) => {
    const updated = [...data];
    updated[projIndex].technologies.push('');
    onChange(updated);
  };

  const removeTechnology = (projIndex: number, techIndex: number) => {
    const updated = [...data];
    updated[projIndex].technologies = updated[projIndex].technologies.filter((_, i) => i !== techIndex);
    onChange(updated);
  };

  const updateTechnology = (projIndex: number, techIndex: number, value: string) => {
    const updated = [...data];
    updated[projIndex].technologies[techIndex] = value;
    onChange(updated);
  };

  const addHighlight = (projIndex: number) => {
    const updated = [...data];
    updated[projIndex].highlights.push('');
    onChange(updated);
  };

  const removeHighlight = (projIndex: number, highlightIndex: number) => {
    const updated = [...data];
    updated[projIndex].highlights = updated[projIndex].highlights.filter((_, i) => i !== highlightIndex);
    onChange(updated);
  };

  const updateHighlight = (projIndex: number, highlightIndex: number, value: string) => {
    const updated = [...data];
    updated[projIndex].highlights[highlightIndex] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-800">Projects</h3>
        <button type="button" onClick={addProject} className={addButtonClass}>
          + Add Project
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">No projects added yet. Click "Add Project" to start.</p>
      )}

      {data.map((project, index) => (
        <div key={index} className={cardClass}>
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-gray-700">Project #{index + 1}</h4>
            <button type="button" onClick={() => removeProject(index)} className={removeButtonClass}>
              Remove
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Project Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={project.name}
                onChange={(e) => updateProject(index, 'name', e.target.value)}
                className={errors[`project_${index}_name`] ? inputErrorClass : inputClass}
                placeholder="E-commerce Platform"
              />
              {errors[`project_${index}_name`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`project_${index}_name`]}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Description <span className="text-red-500">*</span></label>
              <textarea
                value={project.description}
                onChange={(e) => updateProject(index, 'description', e.target.value)}
                className={errors[`project_${index}_description`] ? inputErrorClass : inputClass}
                placeholder="A full-stack e-commerce platform built with..."
                rows={3}
              />
              {errors[`project_${index}_description`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`project_${index}_description`]}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Project Link</label>
              <input
                type="url"
                value={project.link}
                onChange={(e) => updateProject(index, 'link', e.target.value)}
                className={inputClass}
                placeholder="https://github.com/user/project"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>Technologies</label>
                <button type="button" onClick={() => addTechnology(index)} className="text-sm text-blue-600 hover:text-blue-800">
                  + Add Technology
                </button>
              </div>
              <div className="space-y-2">
                {project.technologies.map((tech, tIndex) => (
                  <div key={tIndex} className="flex gap-2">
                    <input
                      type="text"
                      value={tech}
                      onChange={(e) => updateTechnology(index, tIndex, e.target.value)}
                      className={`flex-1 ${inputClass}`}
                      placeholder="React, Node.js, MongoDB"
                    />
                    {project.technologies.length > 1 && (
                      <button type="button" onClick={() => removeTechnology(index, tIndex)} className={removeButtonClass}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass}>Highlights</label>
                <button type="button" onClick={() => addHighlight(index)} className="text-sm text-blue-600 hover:text-blue-800">
                  + Add Highlight
                </button>
              </div>
              <div className="space-y-2">
                {project.highlights.map((highlight, hIndex) => (
                  <div key={hIndex} className="flex gap-2">
                    <input
                      type="text"
                      value={highlight}
                      onChange={(e) => updateHighlight(index, hIndex, e.target.value)}
                      className={`flex-1 ${inputClass}`}
                      placeholder="Implemented authentication system..."
                    />
                    {project.highlights.length > 1 && (
                      <button type="button" onClick={() => removeHighlight(index, hIndex)} className={removeButtonClass}>
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// SkillsForm
// ============================================================================

interface SkillsFormProps {
  data: SkillCategory[];
  onChange: (data: SkillCategory[]) => void;
}

export function SkillsForm({ data, onChange }: SkillsFormProps) {
  const addCategory = () => {
    onChange([...data, { category_name: '', skills: [''] }]);
  };

  const removeCategory = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, field: keyof SkillCategory, value: any) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addSkill = (categoryIndex: number) => {
    const updated = [...data];
    updated[categoryIndex].skills.push('');
    onChange(updated);
  };

  const removeSkill = (categoryIndex: number, skillIndex: number) => {
    const updated = [...data];
    updated[categoryIndex].skills = updated[categoryIndex].skills.filter((_, i) => i !== skillIndex);
    onChange(updated);
  };

  const updateSkill = (categoryIndex: number, skillIndex: number, value: string) => {
    const updated = [...data];
    updated[categoryIndex].skills[skillIndex] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-800">Skills</h3>
        <button type="button" onClick={addCategory} className={addButtonClass}>
          + Add Category
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">No skill categories added yet. Click "Add Category" to start.</p>
      )}

      {data.map((category, catIndex) => (
        <div key={catIndex} className={cardClass}>
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-gray-700">Category #{catIndex + 1}</h4>
            <button type="button" onClick={() => removeCategory(catIndex)} className={removeButtonClass}>
              Remove
            </button>
          </div>

          <div>
            <label className={labelClass}>Category Name</label>
            <input
              type="text"
              value={category.category_name}
              onChange={(e) => updateCategory(catIndex, 'category_name', e.target.value)}
              className={inputClass}
              placeholder="Languages, Frameworks, Tools, etc."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Skills</label>
              <button type="button" onClick={() => addSkill(catIndex)} className="text-sm text-blue-600 hover:text-blue-800">
                + Add Skill
              </button>
            </div>
            <div className="space-y-2">
              {category.skills.map((skill, skillIndex) => (
                <div key={skillIndex} className="flex gap-2">
                  <input
                    type="text"
                    value={skill}
                    onChange={(e) => updateSkill(catIndex, skillIndex, e.target.value)}
                    className={`flex-1 ${inputClass}`}
                    placeholder="Python, JavaScript, React, etc."
                  />
                  {category.skills.length > 1 && (
                    <button type="button" onClick={() => removeSkill(catIndex, skillIndex)} className={removeButtonClass}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// CertificationsForm
// ============================================================================

interface CertificationsFormProps {
  data: string[];
  onChange: (data: string[]) => void;
}

export function CertificationsForm({ data, onChange }: CertificationsFormProps) {
  const addCertification = () => {
    onChange([...data, '']);
  };

  const removeCertification = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const updateCertification = (index: number, value: string) => {
    const updated = [...data];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-800">Certifications</h3>
        <button type="button" onClick={addCertification} className={addButtonClass}>
          + Add Certification
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">No certifications added yet. Click "Add Certification" to start.</p>
      )}

      <div className="space-y-2">
        {data.map((cert, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={cert}
              onChange={(e) => updateCertification(index, e.target.value)}
              className={`flex-1 ${inputClass}`}
              placeholder="AWS Certified Solutions Architect"
            />
            <button type="button" onClick={() => removeCertification(index)} className="px-3 py-2 text-red-600 hover:text-red-800 text-sm">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Default Exports for backwards compatibility
// ============================================================================

export default {
  PersonalInfoForm,
  SummaryForm,
  EducationForm,
  ExperienceForm,
  ProjectsForm,
  SkillsForm,
  CertificationsForm,
};
