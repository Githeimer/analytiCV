'use client';

import { useState } from 'react';

export default function AnalyzerPage() {
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

      const response = await fetch('/api/analyzer', {
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
    <div className="min-h-screen bg-gray-50 py-8 font-comfortaa">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 font-mclaren">
            Resume <span className="text-[#007DE3]">Analyzer</span>
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Upload your resume for analysis and feedback</p>
        </div>
      
        <div className="bg-white shadow-lg rounded-lg p-8 mb-6 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="resume" className="block text-lg font-semibold text-gray-800 mb-3">
                Upload Resume
              </label>
              <div className="mt-2 flex justify-center px-6 pt-8 pb-8 border-2 border-gray-300 border-dashed rounded-lg hover:border-[#007DE3] transition-colors">
                <div className="space-y-2 text-center">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="resume"
                      className="relative cursor-pointer rounded-md font-medium text-[#007DE3] hover:text-blue-700 focus-within:outline-none"
                    >
                      <span className="text-lg">Upload a file</span>
                      <input
                        type="file"
                        id="resume"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1 text-lg">or drag and drop</p>
                  </div>
                  <p className="text-sm text-gray-500">PDF only, up to 10MB</p>
                </div>
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Remove
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-[#007DE3] text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </span>
              ) : 'Analyze Resume'}
            </button>
          </form>
        </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-6 py-4 rounded-lg mb-6 shadow-md">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <strong className="font-bold">Error</strong>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* ATS Score Overview */}
          {result.ats_score && (
            <div className="bg-gradient-to-br from-[#007DE3] via-blue-600 to-purple-600 text-white shadow-xl rounded-xl p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-center md:text-left">
                  <h2 className="text-4xl font-bold mb-2 font-mclaren">ATS Score</h2>
                  <p className="text-blue-100 text-lg">Applicant Tracking System Compatibility</p>
                </div>
                <div className="text-center bg-white/10 backdrop-blur rounded-xl p-6 min-w-[160px]">
                  <div className="text-7xl font-bold font-mclaren">{result.ats_score.total_score}</div>
                  <div className="text-2xl mt-2 font-semibold">{result.ats_score.grade}</div>
                </div>
              </div>
              
              {/* Score Breakdown */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.ats_score.breakdown?.map((item: any, index: number) => (
                  <div key={index} className="bg-white/10 backdrop-blur rounded-xl p-5 hover:bg-white/20 transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-lg">{item.label}</span>
                      <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">{item.score}/{item.max_score}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div
                        className="bg-white rounded-full h-3 transition-all shadow-sm"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="text-sm mt-2 text-blue-100 font-medium">{item.percentage}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Section */}
          {result.feedback && (
            <div className="bg-white shadow-lg rounded-xl p-8 border border-gray-200">
              <h2 className="text-3xl font-bold mb-6 text-gray-800 font-mclaren">Resume Feedback</h2>
              
              {/* Issues Identified */}
              {result.feedback.issues_identified && result.feedback.issues_identified.length > 0 && (
                <div className="mb-6 p-5 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
                  <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Issues Identified
                  </h3>
                  <ul className="space-y-2">
                    {result.feedback.issues_identified.map((issue: string, index: number) => (
                      <li key={index} className="text-red-700 capitalize flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {result.feedback.suggestions && result.feedback.suggestions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Improvement Suggestions
                  </h3>
                  <div className="space-y-4">
                    {[...result.feedback.suggestions]
                      .sort((a: any, b: any) => {
                        const priorityOrder = { high: 0, medium: 1, low: 2 };
                        return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) - 
                               (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
                      })
                      .map((suggestion: any, index: number) => (
                        <div
                          key={index}
                          className={`p-5 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-shadow ${
                            suggestion.priority === 'high'
                              ? 'bg-orange-50 border-orange-500'
                              : suggestion.priority === 'medium'
                              ? 'bg-yellow-50 border-yellow-500'
                              : 'bg-blue-50 border-blue-500'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                    suggestion.priority === 'high'
                                      ? 'bg-orange-200 text-orange-900'
                                      : suggestion.priority === 'medium'
                                      ? 'bg-yellow-200 text-yellow-900'
                                      : 'bg-blue-200 text-blue-900'
                                  }`}
                                >
                                  {suggestion.priority} Priority
                                </span>
                                <span className="text-xs text-gray-600 capitalize bg-gray-100 px-3 py-1 rounded-full font-medium">
                                  {suggestion.category.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <p className="text-gray-800 leading-relaxed">{suggestion.suggestion}</p>
                            </div>
                            {suggestion.relevance_percentage !== undefined && (
                              <div className="text-right bg-white rounded-lg p-3 shadow-sm">
                                <div className="text-3xl font-bold text-gray-800">
                                  {suggestion.relevance_percentage}%
                                </div>
                                <div className="text-xs text-gray-500 font-medium mt-1">Relevance</div>
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
                <div className="mt-6 p-5 bg-green-50 border-l-4 border-green-500 rounded-lg shadow-sm">
                  <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {result.feedback.strengths.map((strength: string, index: number) => (
                      <li key={index} className="text-green-700 flex items-start gap-2">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}