'use client';

import { useState } from 'react';
import ResumeForm from '@/components/Builder/ResumeForm';
import ResumePreview from '@/components/Builder/ResumePreview';

export default function BuilderPage() {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 font-comfortaa">
      {/* Header - Consistent with Editor & Analyzer */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-mclaren">
                Resume <span className="text-[#007DE3]">Builder</span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Create your professional resume
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Form Section - Takes up left side */}
          <div className="lg:w-1/2 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <ResumeForm 
              setPreviewHtml={setPreviewHtml}
              setIsGenerating={setIsGenerating}
            />
          </div>

          {/* Preview Section - Takes up right side, sticky */}
          <div className="lg:w-1/2 lg:sticky lg:top-20 lg:self-start">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <ResumePreview 
                html={previewHtml}
                isGenerating={isGenerating}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
