import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    console.log('=== Sending to backend ===');
    console.log(JSON.stringify(data, null, 2));

    // Forward the data to the backend API
    const response = await fetch('http://localhost:8000/api/build-resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== Backend error response ===');
      console.error('Status:', response.status);
      console.error('Response:', errorText);
      
      return NextResponse.json(
        { error: 'Failed to build resume', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error building resume:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
