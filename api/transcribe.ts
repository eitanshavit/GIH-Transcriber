import { GoogleGenAI } from "@google/genai";

// This is a Vercel Serverless Function, which acts as a secure backend.
// It can safely use environment variables.

const getPrompt = (language: string): string => {
  switch (language) {
    case 'he': // Hebrew
      return "תמלל את האודיו הבא לטקסט בעברית. התמלול צריך להיות מדויק לחלוטין.";
    case 'en': // English
    default:
      return "Transcribe the following audio to English text. The transcription should be perfectly accurate.";
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { base64Audio, mimeType, language } = req.body;

  if (!base64Audio || !mimeType || !language) {
    return res.status(400).json({ error: 'Missing required body parameters: base64Audio, mimeType, language' });
  }

  if (!process.env.API_KEY) {
    console.error("API_KEY not found on server.");
    return res.status(500).json({ error: 'Server configuration error: API key not set.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Audio,
      },
    };

    const textPart = {
      text: getPrompt(language),
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [audioPart, textPart] },
    });
    
    const transcription = response.text;
    return res.status(200).json({ transcription });

  } catch (error) {
    console.error("Error transcribing audio with Gemini API:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return res.status(500).json({ error: `Error during transcription: ${errorMessage}` });
  }
}
