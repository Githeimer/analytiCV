interface SummaryFormProps {
  data: string;
  onChange: (data: string) => void;
}

export default function SummaryForm({ data, onChange }: SummaryFormProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Professional Summary</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Summary
        </label>
        <textarea
          value={data}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
