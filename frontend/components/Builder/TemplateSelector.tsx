'use client';

import { useState, useEffect } from 'react';
import { Template } from '@/types/resume';

interface TemplateSelectorProps {
  selectedTemplate: string;
  onSelect: (templateId: string) => void;
}

export default function TemplateSelector({ selectedTemplate, onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates');
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      // Fallback templates if API fails
      setTemplates([
        {
          id: 'modern',
          name: 'Modern',
          description: 'Clean and contemporary design with bold typography',
          colors: {
            primary: '#2563eb',
            secondary: '#1e40af',
            accent: '#3b82f6',
            text: '#1f2937',
            background: '#ffffff',
          },
          features: ['Clean Layout', 'Bold Headers', 'Two-Column Design'],
          category: 'Professional',
        },
        {
          id: 'classic',
          name: 'Classic',
          description: 'Traditional professional layout for conservative industries',
          colors: {
            primary: '#1f2937',
            secondary: '#374151',
            accent: '#6b7280',
            text: '#111827',
            background: '#ffffff',
          },
          features: ['Traditional Format', 'Formal Style', 'Single Column'],
          category: 'Traditional',
        },
        {
          id: 'minimal',
          name: 'Minimal',
          description: 'Simple and elegant design focusing on content',
          colors: {
            primary: '#059669',
            secondary: '#047857',
            accent: '#10b981',
            text: '#111827',
            background: '#ffffff',
          },
          features: ['Minimalist Design', 'Content-Focused', 'Spacious Layout'],
          category: 'Modern',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
          Choose Template
        </h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-600 text-sm">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-800">Choose Template</h3>
        {selectedTemplate && (
          <span className="text-sm text-gray-600">
            Currently using: <span className="font-medium text-blue-600">{templates.find(t => t.id === selectedTemplate)?.name || selectedTemplate}</span>
          </span>
        )}
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-md text-sm">
          Could not connect to server. Showing default templates.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={`cursor-pointer border-2 rounded-lg p-4 transition-all hover:shadow-lg ${
              selectedTemplate === template.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {/* Color Preview Bar */}
            <div className="flex gap-1 mb-3 h-2 rounded overflow-hidden">
              <div 
                className="flex-1" 
                style={{ backgroundColor: template.colors.primary }}
              />
              <div 
                className="flex-1" 
                style={{ backgroundColor: template.colors.secondary }}
              />
              <div 
                className="flex-1" 
                style={{ backgroundColor: template.colors.accent }}
              />
            </div>

            {/* Template Name & Category */}
            <div className="mb-2">
              <h4 className="font-semibold text-gray-900 text-lg">{template.name}</h4>
              <span className="text-xs text-gray-500 uppercase tracking-wide">{template.category}</span>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-3 min-h-[40px]">{template.description}</p>

            {/* Features */}
            <div className="space-y-1 mb-4">
              {template.features.slice(0, 3).map((feature, idx) => (
                <div key={idx} className="flex items-center text-xs text-gray-700">
                  <svg className="w-3 h-3 mr-1.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </div>
              ))}
            </div>

            {/* Select Button */}
            <button
              className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                selectedTemplate === template.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {selectedTemplate === template.id ? (
                <span className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Selected
                </span>
              ) : (
                'Select Template'
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
