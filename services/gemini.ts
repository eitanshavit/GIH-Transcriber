import { GoogleGenAI } from "@google/genai";
import { Language } from '../types';

const getPrompt = (language: Language): string => {
  switch (language) {
    case Language.HEBREW:
      return "תמלל את האודיו הבא לטקסט בעברית. התמלול צריך להיות מדויק לחלוטין.";
    case Language.ENGLISH:
    default:
      return "Transcribe the following audio to English text. The transcription should be perfectly accurate.";
  }
};

export const transcribeAudio = async (
  base64Audio: string,
  mimeType: string,
  language: Language
): Promise<string> => {
  try {
    // The Gemini API client must be initialized using the API key from the environment variables.
    // The platform is responsible for securely providing `process.env.API_KEY`.
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
    
    return response.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    if (error instanceof Error) {
        // Re-throw the original error to be handled by the UI component.
        // This provides more specific feedback if the API key is missing.
        throw new Error(error.message);
    }
    throw new Error("An unknown error occurred during transcription.");
  }
};