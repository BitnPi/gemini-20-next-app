import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { text, history } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp'
    });

    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    };

    const chatSession = model.startChat({
      generationConfig,
      history: history || [],
    });

    const result = await chatSession.sendMessage(text);
    const response = await result.response;
    const responseText = response.text();

    return NextResponse.json({ 
      response: responseText,
      status: 'success' 
    });

  } catch (error) {
    console.error('Error in research chat:', error);
    return NextResponse.json(
      { 
        error: 'Error processing request', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}