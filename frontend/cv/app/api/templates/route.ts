import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Fetch templates from the backend API
    const response = await fetch('http://localhost:8000/api/templates', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      return NextResponse.json(
        { error: 'Failed to fetch templates', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Backend returns { success: true, templates: [...] }, extract the array
    const templates = data.templates || data;
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
