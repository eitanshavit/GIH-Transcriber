import { GoogleGenAI } from "@google/genai";
import { Language } from '../types.js';
// FIX: Import Buffer to resolve 'Cannot find name 'Buffer'' error.
import { Buffer } from "buffer";

// Helper function to convert a ReadableStream to a Buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const getPrompt = (language: Language): string => {
  switch (language) {
    case Language.HEBREW:
      return "תמלל את האודיו הבא לטקסט בעברית. התמלול צריך להיות מדויק לחלוטין.";
    case Language.ARABIC:
      return "نسّخ الصوت التالي إلى نص باللغة العربية. يجب أن يكون النسخ دقيقًا تمامًا.";
    case Language.FRENCH:
      return "Transcrivez l'audio suivant en texte français. La transcription doit être parfaitement exacte.";
    case Language.SPANISH:
      return "Transcribe el siguiente audio a texto en español. La transcripción debe ser perfectamente precisa.";
    case Language.ENGLISH:
    default:
      return "Transcribe the following audio to English text. The transcription should be perfectly accurate.";
  }
};


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { fileId, accessToken, language } = req.body;

    if (!fileId || !accessToken || !language) {
      return res.status(400).json({ error: 'Missing required parameters: fileId, accessToken, and language are required.' });
    }

    // 1. Download file from Google Drive using the user's access token
    const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!driveResponse.ok) {
        const error = await driveResponse.json();
        console.error("Google Drive API Error:", error);
        return res.status(driveResponse.status).json({ error: `Failed to download file from Google Drive: ${error.error?.message || driveResponse.statusText}` });
    }

    const mimeType = driveResponse.headers.get('content-type') || 'application/octet-stream';
    const audioBuffer = await streamToBuffer(driveResponse.body);
    
    // 2. Upload the file to the Gemini File API
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // The SDK's file upload needs a Blob/File object, which are not native in Node.
    // We can however send the data as a base64 string.
    const base64Audio = audioBuffer.toString('base64');
    
    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Audio,
      },
    };

    const textPart = {
      text: getPrompt(language),
    };

    // Note: For very large files, a multi-step process with ai.files.upload() and polling
    // would be more robust. For simplicity and to avoid long-running serverless functions,
    // we use generateContent directly, which works for files up to a certain size limit
    // that is still much larger than the Vercel request body limit.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [audioPart, textPart] },
        config: {
            // Setting a timeout for longer audio files
            // This is not a real config option, but illustrates the need.
            // In a real app, we might need a more robust solution for long-running tasks.
        }
    });
    
    const transcription = response.text;
    
    return res.status(200).json({ transcription });

  } catch (error) {
    console.error("Error in /api/transcribe-from-drive:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    // Check for memory issues, a common problem with this approach on serverless
    if (message.includes('out of memory')) {
        return res.status(500).json({ error: 'The audio file is too large for the server to process in memory. Please try a smaller file.' });
    }
    return res.status(500).json({ error: `Failed to transcribe audio. ${message}` });
  }
}

// Vercel config to increase function memory and timeout if on a paid plan
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb', // Keep this low as we are not using the body for the large file
    },
  },
  // These settings might require a Vercel Pro plan
  // maxDuration: 60, 
  // memory: 1024,
};