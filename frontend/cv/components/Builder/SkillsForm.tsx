interface SkillCategory {
  category_name: string;
  skills: string[];
}

interface SkillsFormProps {
  data: SkillCategory[];
  onChange: (data: SkillCategory[]) => void;
}

export default function SkillsForm({ data, onChange }: SkillsFormProps) {
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
        <button
          type="button"
          onClick={addCategory}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
        >
          + Add Category
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">
          No skill categories added yet. Click "Add Category" to start.
        </p>
      )}

      {data.map((category, catIndex) => (
        <div key={catIndex} className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50">
          <div className="flex justify-between items-start">
            <h4 className="font-medium text-gray-700">Category #{catIndex + 1}</h4>
            <button
              type="button"
              onClick={() => removeCategory(catIndex)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Remove
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <input
              type="text"
              value={category.category_name}
              onChange={(e) => updateCategory(catIndex, 'category_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Languages, Frameworks, Tools, etc."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Skills</label>
              <button
                type="button"
                onClick={() => addSkill(catIndex)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
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
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Python, JavaScript, React, etc."
                  />
                  {category.skills.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSkill(catIndex, skillIndex)}
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
