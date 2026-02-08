'use client';

interface ResumePreviewProps {
  html: string;
  isGenerating: boolean;
}

export default function ResumePreview({ html, isGenerating }: ResumePreviewProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Preview</h3>

      <div className="border-2 border-gray-300 rounded-lg bg-white min-h-[700px] max-h-[calc(100vh-150px)] overflow-hidden relative">
        {isGenerating ? (
          <div className="flex items-center justify-center h-[700px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Generating preview...</p>
            </div>
          </div>
        ) : html ? (
          <div className="w-full h-full overflow-auto">
            <iframe
              srcDoc={html}
              className="w-full min-h-[700px] border-0"
              title="Resume Preview"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[700px]">
            <div className="text-center text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg font-medium">No Preview Available</p>
              <p className="text-sm mt-2">Fill the form and click "Preview Resume" to see your resume</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
