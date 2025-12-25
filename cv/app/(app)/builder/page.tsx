'use client';

import { useState } from 'react';
import ResumeForm from '@/components/Builder/ResumeForm';
import ResumePreview from '@/components/Builder/ResumePreview';

export default function BuilderPage() {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-8 font-comfortaa">
      <div className="max-w-[95%] mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 font-mclaren">
            Resume <span className="text-[#007DE3]">Builder</span>
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Create your professional resume</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Form Section - Takes up left side */}
          <div className="lg:w-1/2 bg-white rounded-lg shadow-md p-6">
            <ResumeForm 
              setPreviewHtml={setPreviewHtml}
              setIsGenerating={setIsGenerating}
            />
          </div>

          {/* Preview Section - Takes up right side, sticky */}
          <div className="lg:w-1/2 lg:sticky lg:top-8 lg:self-start">
            <div className="bg-white rounded-lg shadow-md p-6">
              <ResumePreview 
                html={previewHtml}
                isGenerating={isGenerating}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
