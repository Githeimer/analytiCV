// app/api/save-analyzer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';



export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
   const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get('email');
    const  analyzerData = body;



    if (!analyzerData || !analyzerData.data) {
      return NextResponse.json({ success: false, error: 'No analyzer data provided' }, { status: 400 });
    }

    const data = analyzerData.data;

    // Build object to insert
const insertData = {
  email: userEmail,
  name: data.name || null,
  phone: data.phone || null,
  location: data.location || null,
  linkedin: data.linkedin || null,
  github: data.github || null,
  summary: data.summary || null,
  skills: data.skills || {},               // JSONB
  experience: data.experience || [],       // JSONB
  education: data.education || [],         // JSONB
  ats_score: data.ats_score?.total_score || null,
  grade: data.ats_score?.grade || null,
  suggestions: data.feedback?.suggestions || [],      // JSONB
  strengths: data.feedback?.strengths || [],          // JSONB
  issues: data.feedback?.issues_identified || [],    // JSONB
  parsed_at: data.metadata?.parsed_at || new Date().toISOString(),
};

const { error } = await supabase
  .from('resumes')
  .upsert([insertData]);

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error saving analyzer data:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
