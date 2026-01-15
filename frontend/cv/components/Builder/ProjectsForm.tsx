interface Project {
  name: string;
  description: string;
  technologies: string[];
  link: string;
  highlights: string[];
}

interface ProjectsFormProps {
  data: Project[];
  onChange: (data: Project[]) => void;
  errors: Record<string, any>;
}

export default function ProjectsForm({ data, onChange, errors }: ProjectsFormProps) {
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
        <button
          type="button"
          onClick={addProject}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
        >
          + Add Project
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">No projects added yet. Click "Add Project" to start.</p>
      )}

      {data.map((project, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-gray-700">Project #{index + 1}</h4>
            <button
              type="button"
              onClick={() => removeProject(index)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Remove
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={project.name}
                onChange={(e) => updateProject(index, 'name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors[`project_${index}_name`] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="E-commerce Platform"
              />
              {errors[`project_${index}_name`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`project_${index}_name`]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={project.description}
                onChange={(e) => updateProject(index, 'description', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors[`project_${index}_description`] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="A full-stack e-commerce platform built with..."
                rows={3}
              />
              {errors[`project_${index}_description`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`project_${index}_description`]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Link</label>
              <input
                type="url"
                value={project.link}
                onChange={(e) => updateProject(index, 'link', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://github.com/user/project"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Technologies</label>
                <button
                  type="button"
                  onClick={() => addTechnology(index)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="React, Node.js, MongoDB"
                    />
                    {project.technologies.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTechnology(index, tIndex)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Highlights</label>
                <button
                  type="button"
                  onClick={() => addHighlight(index)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Implemented authentication system..."
                    />
                    {project.highlights.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeHighlight(index, hIndex)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
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
