import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { message, email } = await req.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // ---------- CONTEXT ----------
    let context = "No resume context available.";

   if (email) {
      // Fetch resume from Supabase
  const { data, error } = await supabase
  .from("resumes")
  .select("*")
  .eq("email", email)
  .order("parsed_at", { ascending: false })
  .limit(1)
  .single();

      if (error) {
        console.error("Supabase fetch error:", error);
      } else if (data) {
        // Build a readable context string from the resume
        context = `
User Email: ${data.email || email}
Name: ${data.name || "Not provided"}
ATS Score: ${data.ats_score || "Not provided"}
Grade: ${data.grade || "Not provided"}
Summary: ${data.summary || "Not provided"}
Skills: ${data.skills || "Not provided"}
Experience: ${data.experience || "Not provided"}
Education: ${data.education || "Not provided"}
Strengths: ${data.strengths || "Not provided"}
Weaknesses / Issues: ${data.issues || "Not provided"}
Suggestions: ${data.suggestions || "Not provided"}
Parsed At: ${data.parsed_at || "Not provided"}
        `;
      }
    }

    // ---------- PROMPT ----------
const prompt = `
You are an AI assistant.

Resume Context (optional):
${context}

User Question:
${message}

Rules:
- Use resume data only when relevant
- Do not guess name, score, or background
- Use md file format for response
- Highlight links clearly if provided
`;


    // ---------- GEMINI ----------
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return NextResponse.json({
      success: true,
      reply: response.text,
    });

  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
