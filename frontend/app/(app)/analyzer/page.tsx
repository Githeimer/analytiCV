'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// TypeScript interfaces
interface ATSBreakdownItem {
  label: string;
  score: number;
  max_score: number;
  percentage: number;
}

interface ATSScore {
  total_score: number;
  grade: string;
  breakdown?: ATSBreakdownItem[];
}

interface Suggestion {
  priority: 'high' | 'medium' | 'low';
  category: string;
  suggestion: string;
  relevance_percentage?: number;
}

interface Feedback {
  overall_score?: number;
  issues_identified?: string[];
  suggestions?: Suggestion[];
  strengths?: string[];
}

interface AnalysisResult {
  personal_info?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
  feedback?: Feedback;
  ats_score?: ATSScore;
}

export default function AnalyzerPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Navigate to editor with the current file
  const handleEditResume = useCallback(async () => {
    if (!file) return;
    
    // Store the file in sessionStorage as base64 for the editor to pick up
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      sessionStorage.setItem('analyzerPdfData', base64);
      sessionStorage.setItem('analyzerPdfName', file.name);
      router.push('/editor');
    };
    reader.readAsDataURL(file);
  }, [file, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async () => {
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

      setResult(data.data || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-comfortaa">
      {/* Header - Consistent with Editor */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-mclaren">
                Resume <span className="text-[#007DE3]">Analyzer</span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Upload your resume for AI-powered analysis
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {result && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleEditResume}
                    className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 bg-[#007DE3] text-white hover:bg-[#0066b8]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Resume
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    New Analysis
                  </motion.button>
                </>
              )}
              
              {file && !result && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`
                    px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2
                    ${loading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#007DE3] text-white hover:bg-[#0066b8]'
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Analyze
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload area - Same as Editor */}
        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-12 max-w-2xl mx-auto"
          >
            <div
              onClick={handleUploadClick}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
                transition-all duration-200
                ${loading ? 'border-[#007DE3] bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-[#007DE3] hover:bg-gray-50'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-3 border-[#007DE3] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-600 font-medium">Analyzing your resume...</p>
                  <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center">
                  <svg className="w-16 h-16 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xl font-medium text-gray-700 mb-2">{file.name}</p>
                  <p className="text-gray-500 text-sm">Click "Analyze" to start analysis</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Choose a different file
                  </button>
                </div>
              ) : (
                <>
                  <svg
                    className="w-16 h-16 mx-auto text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-xl font-medium text-gray-700 mb-2">
                    Upload your resume PDF
                  </p>
                  <p className="text-gray-500 text-sm">
                    Click to browse or drag and drop
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
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
                {result.ats_score.breakdown && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.ats_score.breakdown.map((item, index) => (
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
                )}
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
                      {result.feedback.issues_identified.map((issue, index) => (
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
                        .sort((a, b) => {
                          const priorityOrder = { high: 0, medium: 1, low: 2 };
                          return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
                        })
                        .map((suggestion, index) => (
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
                      {result.feedback.strengths.map((strength, index) => (
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
          </motion.div>
        )}
      </main>
    </div>
  );
}
