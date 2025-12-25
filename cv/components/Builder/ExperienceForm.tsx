interface Experience {
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  location: string;
  highlights: string[];
}

interface ExperienceFormProps {
  data: Experience[];
  onChange: (data: Experience[]) => void;
  errors: Record<string, any>;
}

export default function ExperienceForm({ data, onChange, errors }: ExperienceFormProps) {
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
    updated[expIndex].highlights = updated[expIndex].highlights.filter(
      (_, i) => i !== highlightIndex
    );
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
        <button
          type="button"
          onClick={addExperience}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
        >
          + Add Experience
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">No experience added yet. Click "Add Experience" to start.</p>
      )}

      {data.map((exp, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-gray-700">Experience #{index + 1}</h4>
            <button
              type="button"
              onClick={() => removeExperience(index)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={exp.title}
                onChange={(e) => updateExperience(index, 'title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors[`experience_${index}_title`] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Software Engineer"
              />
              {errors[`experience_${index}_title`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`experience_${index}_title`]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={exp.company}
                onChange={(e) => updateExperience(index, 'company', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors[`experience_${index}_company`] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Tech Corp"
              />
              {errors[`experience_${index}_company`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`experience_${index}_company`]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={exp.start_date}
                onChange={(e) => updateExperience(index, 'start_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors[`experience_${index}_start_date`] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Jan 2020"
              />
              {errors[`experience_${index}_start_date`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`experience_${index}_start_date`]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={exp.end_date}
                onChange={(e) => updateExperience(index, 'end_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors[`experience_${index}_end_date`] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Present or Dec 2022"
              />
              {errors[`experience_${index}_end_date`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`experience_${index}_end_date`]}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={exp.location}
                onChange={(e) => updateExperience(index, 'location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="San Francisco, CA"
              />
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
              {exp.highlights.map((highlight, hIndex) => (
                <div key={hIndex} className="flex gap-2">
                  <input
                    type="text"
                    value={highlight}
                    onChange={(e) => updateHighlight(index, hIndex, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Led development of..."
                  />
                  {exp.highlights.length > 1 && (
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
      ))}
    </div>
  );
}
