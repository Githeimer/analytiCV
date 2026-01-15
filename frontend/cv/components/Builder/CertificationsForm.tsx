interface CertificationsFormProps {
  data: string[];
  onChange: (data: string[]) => void;
}

export default function CertificationsForm({ data, onChange }: CertificationsFormProps) {
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
        <button
          type="button"
          onClick={addCertification}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
        >
          + Add Certification
        </button>
      </div>

      {data.length === 0 && (
        <p className="text-gray-500 text-sm italic">
          No certifications added yet. Click "Add Certification" to start.
        </p>
      )}

      <div className="space-y-2">
        {data.map((cert, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={cert}
              onChange={(e) => updateCertification(index, e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="AWS Certified Solutions Architect"
            />
            <button
              type="button"
              onClick={() => removeCertification(index)}
              className="px-3 py-2 text-red-600 hover:text-red-800 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
