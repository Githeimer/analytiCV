interface Education {
  degree: string;
  institution: string;
  location: string;
  graduation_date: string;
  gpa: string;
  relevant_coursework: string[];
}

interface EducationFormProps {
  data: Education[];
  onChange: (data: Education[]) => void;
  errors: Record<string, any>;
}

export default function EducationForm({ data, onChange, errors }: EducationFormProps) {
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
        <button
          type="button"
          onClick={addEducation}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
        >
          + Add Education
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">No education added yet. Click "Add Education" to start.</p>
      )}

      {data.map((edu, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-gray-700">Education #{index + 1}</h4>
            <button
              type="button"
              onClick={() => removeEducation(index)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Degree <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={edu.degree}
                onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors[`education_${index}_degree`] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Bachelor of Science in Computer Science"
              />
              {errors[`education_${index}_degree`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`education_${index}_degree`]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Institution <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={edu.institution}
                onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors[`education_${index}_institution`] ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Stanford University"
              />
              {errors[`education_${index}_institution`] && (
                <p className="text-red-500 text-xs mt-1">{errors[`education_${index}_institution`]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={edu.location}
                onChange={(e) => updateEducation(index, 'location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Stanford, CA"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Graduation Date
              </label>
              <input
                type="text"
                value={edu.graduation_date}
                onChange={(e) => updateEducation(index, 'graduation_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="May 2020"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GPA
              </label>
              <input
                type="text"
                value={edu.gpa}
                onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="3.8/4.0"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Relevant Coursework</label>
              <button
                type="button"
                onClick={() => addCoursework(index)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Data Structures and Algorithms"
                  />
                  <button
                    type="button"
                    onClick={() => removeCoursework(index, cIndex)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
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
