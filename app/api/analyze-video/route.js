import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

const emitProgress = (event, data) => {
  if (global.socketIo) {
    global.socketIo.emit(event, data);
  }
};

export async function POST(request) {
  try {
    emitProgress('analysisStatus', { 
      status: 'started',
      message: 'Starting video analysis' 
    });

    const formData = await request.formData();
    const file = formData.get('video');
    
    if (!file) {
      emitProgress('analysisStatus', { 
        status: 'error',
        message: 'No video file provided' 
      });
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    emitProgress('analysisStatus', { 
      status: 'uploading',
      message: 'Uploading video to server' 
    });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadDir = join(process.cwd(), 'uploads');
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = join(uploadDir, fileName);
    
    await writeFile(filePath, buffer);

    emitProgress('analysisStatus', { 
      status: 'processing',
      message: 'Uploading to Gemini' 
    });

    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);

    const uploadResult = await fileManager.uploadFile(filePath, {
      mimeType: file.type,
      displayName: file.name,
    });

    emitProgress('analysisStatus', { 
      status: 'processing',
      message: 'Waiting for Gemini processing' 
    });

    let geminiFile = await fileManager.getFile(uploadResult.file.name);
    let attempts = 0;
    const maxAttempts = 30;

    while (geminiFile.state === "PROCESSING" && attempts < maxAttempts) {
      emitProgress('analysisStatus', { 
        status: 'processing',
        message: `Processing video (attempt ${attempts + 1}/${maxAttempts})` 
      });
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      geminiFile = await fileManager.getFile(uploadResult.file.name);
      attempts++;
    }

    if (geminiFile.state !== "ACTIVE") {
      throw new Error('File processing failed or timeout reached');
    }

    emitProgress('analysisStatus', { 
      status: 'analyzing',
      message: 'Analyzing video content' 
    });

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

    const chatSession = model.startChat({
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const result = await chatSession.sendMessage([
      {
        fileData: {
          mimeType: geminiFile.mimeType,
          fileUri: geminiFile.uri,
        },
      },
      {
        text: "Please analyze this video and provide:\n1. Main subject/topic\n2. Key events and timestamps\n3. Overall summary",
      },
    ]);

    try {
      await unlink(filePath);
    } catch (error) {
      console.error('Error cleaning up file:', error);
    }

    emitProgress('analysisStatus', { 
      status: 'completed',
      message: 'Analysis completed' 
    });

    return NextResponse.json({ 
      analysis: result.response.text(),
      status: 'success' 
    });

  } catch (error) {
    emitProgress('analysisStatus', { 
      status: 'error',
      message: `Error: ${error.message}` 
    });
    
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: 'Error processing video', details: error.message },
      { status: 500 }
    );
  }
}
