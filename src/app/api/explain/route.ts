import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json();

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return NextResponse.json({ error: 'Please enter a valid topic.' }, { status: 400 });
    }

    let explanation: string | null = null;
    let usedAPI = '';

    // Try Gemini first
    try {
      const geminiModel = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
      const model = genAI.getGenerativeModel({ model: geminiModel });
      const prompt = `Explain the topic "${topic}" in simple terms suitable for a student. Keep the explanation concise and easy to understand. Use markdown formatting for better readability.`;
      const result = await model.generateContent(prompt);
      explanation = result.response.text();
      usedAPI = 'Gemini';
      console.log(`Used Gemini API with model: ${geminiModel}`);
      console.log('Gemini Usage Stats:', result.response.usageMetadata);
    } catch (geminiError) {
      console.log('Gemini API failed, trying Groq...');
      console.log('Gemini API failed, trying Groq...');
      // Try Groq as fallback
      try {
        const model = process.env.GROQ_MODEL ?? 'llama3-8b-8192';
        console.log(`Trying Groq API with model: ${model}`);
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: `Explain the topic "${topic}" in simple terms suitable for a student. Keep the explanation concise and easy to understand. Use markdown formatting for better readability.`,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.status}`);
        }

        const data = await response.json();
        explanation = data.choices[0]?.message?.content;
        usedAPI = 'Groq';

        // Log usage stats to terminal
        console.log('Groq Usage Stats:', data.usage);
        console.log('Groq Model:', data.model);
        console.log('Created:', new Date(data.created * 1000).toISOString());

        // Log rate limit info
        const remainingTokens = response.headers.get('x-ratelimit-remaining-tokens');
        const remainingRequests = response.headers.get('x-ratelimit-remaining-requests');
        const limitTokens = response.headers.get('x-ratelimit-limit-tokens');
        const limitRequests = response.headers.get('x-ratelimit-limit-requests');

        console.log('Rate Limits:');
        console.log(`  Tokens left: ${remainingTokens} / ${limitTokens}`);
        console.log(`  Requests left: ${remainingRequests} / ${limitRequests}`);

      } catch (groqError) {
        console.error('Both Gemini and Groq APIs failed');
        return NextResponse.json({ error: 'Unable to generate explanation. Both AI services are currently unavailable. Please try again later.' }, { status: 500 });
      }
    }

    if (!explanation) {
      return NextResponse.json({ error: 'Failed to generate explanation.' }, { status: 500 });
    }

    console.log(`Successfully generated explanation using ${usedAPI}`);

    return NextResponse.json({ explanation });
  } catch (error: any) {
    console.error('Unexpected error:', error?.message ?? error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}