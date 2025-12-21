'use client';

import { useState } from 'react';

export default function ParseResumePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse resume');
      }

      // Handle nested data structure
      setResult(data.data || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Resume Parser</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="resume" className="block text-sm font-medium text-gray-700 mb-2">
              Upload Resume (PDF, DOCX, or TXT)
            </label>
            <input
              type="file"
              id="resume"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {file && (
            <p className="text-sm text-gray-600">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Parsing...' : 'Parse Resume'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <strong className="font-bold">Error: </strong>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* ATS Score Overview */}
          {result.ats_score && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">ATS Score</h2>
                  <p className="text-blue-100">Applicant Tracking System Compatibility</p>
                </div>
                <div className="text-center">
                  <div className="text-6xl font-bold">{result.ats_score.total_score}</div>
                  <div className="text-xl mt-2">{result.ats_score.grade}</div>
                </div>
              </div>
              
              {/* Score Breakdown */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.ats_score.breakdown?.map((item: any, index: number) => (
                  <div key={index} className="bg-white/10 backdrop-blur rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-sm">{item.score}/{item.max_score}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div
                        className="bg-white rounded-full h-2 transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="text-sm mt-1 text-blue-100">{item.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Section */}
          {result.feedback && (
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Resume Feedback</h2>
              
              {/* Issues Identified */}
              {result.feedback.issues_identified && result.feedback.issues_identified.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                  <h3 className="text-lg font-semibold text-red-800 mb-3">Issues Identified</h3>
                  <ul className="list-disc list-inside space-y-2">
                    {result.feedback.issues_identified.map((issue: string, index: number) => (
                      <li key={index} className="text-red-700 capitalize">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {result.feedback.suggestions && result.feedback.suggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Improvement Suggestions</h3>
                  <div className="space-y-3">
                    {[...result.feedback.suggestions]
                      .sort((a: any, b: any) => {
                        const priorityOrder = { high: 0, medium: 1, low: 2 };
                        return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - 
                               (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
                      })
                      .map((suggestion: any, index: number) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border-l-4 ${
                            suggestion.priority === 'high'
                              ? 'bg-orange-50 border-orange-500'
                              : suggestion.priority === 'medium'
                              ? 'bg-yellow-50 border-yellow-500'
                              : 'bg-blue-50 border-blue-500'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
                                    suggestion.priority === 'high'
                                      ? 'bg-orange-200 text-orange-800'
                                      : suggestion.priority === 'medium'
                                      ? 'bg-yellow-200 text-yellow-800'
                                      : 'bg-blue-200 text-blue-800'
                                  }`}
                                >
                                  {suggestion.priority}
                                </span>
                                <span className="text-xs text-gray-500 capitalize">
                                  {suggestion.category.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <p className="text-gray-700">{suggestion.suggestion}</p>
                            </div>
                            {suggestion.relevance_percentage !== undefined && (
                              <div className="ml-4 text-right">
                                <div className="text-2xl font-bold text-gray-700">
                                  {suggestion.relevance_percentage}%
                                </div>
                                <div className="text-xs text-gray-500">Relevance</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {result.feedback.strengths && result.feedback.strengths.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
                  <h3 className="text-lg font-semibold text-green-800 mb-3">Strengths</h3>
                  <ul className="list-disc list-inside space-y-2">
                    {result.feedback.strengths.map((strength: string, index: number) => (
                      <li key={index} className="text-green-700">{strength}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Formatted View */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Parsed Resume</h2>
            
            <div className="space-y-6">
              {/* Personal Information */}
              {(result.name || result.email || result.phone) && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.name && (
                      <div>
                        <span className="text-sm text-gray-500">Name:</span>
                        <p className="font-medium">{result.name}</p>
                      </div>
                    )}
                    {result.email && (
                      <div>
                        <span className="text-sm text-gray-500">Email:</span>
                        <p className="font-medium">{result.email}</p>
                      </div>
                    )}
                    {result.phone && (
                      <div>
                        <span className="text-sm text-gray-500">Phone:</span>
                        <p className="font-medium">{result.phone}</p>
                      </div>
                    )}
                    {result.location && (
                      <div>
                        <span className="text-sm text-gray-500">Location:</span>
                        <p className="font-medium">{result.location}</p>
                      </div>
                    )}
                    {result.linkedin && (
                      <div>
                        <span className="text-sm text-gray-500">LinkedIn:</span>
                        <p className="font-medium">{result.linkedin}</p>
                      </div>
                    )}
                    {result.github && (
                      <div>
                        <span className="text-sm text-gray-500">GitHub:</span>
                        <p className="font-medium">{result.github}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary */}
              {result.summary && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Professional Summary</h3>
                  <p className="text-gray-700 leading-relaxed">{result.summary}</p>
                </div>
              )}

              {/* Skills */}
              {result.skills && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Skills</h3>
                  
                  {result.skills.languages && result.skills.languages.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Languages</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.skills.languages.map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.skills.frameworks && result.skills.frameworks.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Frameworks</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.skills.frameworks.map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.skills.cloud && result.skills.cloud.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Cloud & Infrastructure</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.skills.cloud.map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.skills.databases && result.skills.databases.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Databases</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.skills.databases.map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.skills.tools && result.skills.tools.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">Tools</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.skills.tools.map((skill: string, index: number) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fallback for simple array */}
                  {Array.isArray(result.skills) && (
                    <div className="flex flex-wrap gap-2">
                      {result.skills.map((skill: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Experience */}
              {result.experience && result.experience.length > 0 && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Experience</h3>
                  <div className="space-y-4">
                    {result.experience.map((exp: any, index: number) => (
                      <div key={index} className="pl-4 border-l-2 border-blue-500">
                        <h4 className="font-semibold text-gray-800">{exp.title || exp.position}</h4>
                        {exp.company && <p className="text-gray-600">{exp.company}</p>}
                        {exp.duration && <p className="text-sm text-gray-500">{exp.duration}</p>}
                        {exp.description && <p className="mt-2 text-gray-700">{exp.description}</p>}
                        {exp.responsibilities && Array.isArray(exp.responsibilities) && (
                          <ul className="mt-2 list-disc list-inside space-y-1">
                            {exp.responsibilities.map((resp: string, i: number) => (
                              <li key={i} className="text-gray-700 text-sm">{resp}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {result.education && result.education.length > 0 && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Education</h3>
                  <div className="space-y-4">
                    {result.education.map((edu: any, index: number) => (
                      <div key={index} className="pl-4 border-l-2 border-green-500">
                        <h4 className="font-semibold text-gray-800">{edu.degree || edu.title}</h4>
                        {edu.institution && <p className="text-gray-600">{edu.institution}</p>}
                        {edu.year && <p className="text-sm text-gray-500">{edu.year}</p>}
                        {edu.gpa && <p className="text-sm text-gray-500">GPA: {edu.gpa}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {result.projects && result.projects.length > 0 && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Projects</h3>
                  <div className="space-y-4">
                    {result.projects.map((project: any, index: number) => (
                      <div key={index} className="pl-4 border-l-2 border-indigo-500">
                        <h4 className="font-semibold text-gray-800">{project.name || project.title}</h4>
                        {project.description && <p className="mt-2 text-gray-700">{project.description}</p>}
                        {project.technologies && Array.isArray(project.technologies) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {project.technologies.map((tech: string, i: number) => (
                              <span key={i} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded">
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {result.certifications && result.certifications.length > 0 && (
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Certifications</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {result.certifications.map((cert: string | any, index: number) => (
                      <li key={index} className="text-gray-700">
                        {typeof cert === 'string' ? cert : cert.name || cert.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Languages */}
              {result.languages && result.languages.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.languages.map((lang: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-medium"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Raw JSON Data */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <details open>
              <summary className="cursor-pointer text-lg font-semibold text-gray-700 hover:text-gray-900">
                View Raw JSON Data
              </summary>
              <pre className="mt-4 bg-gray-50 p-4 rounded border overflow-x-auto text-xs text-gray-800">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
