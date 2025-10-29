
import { GoogleGenAI } from "/api/transcribe";
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
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set. Please ensure it is configured.");
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
    
    return response.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    if (error instanceof Error) {
        return `Error during transcription: ${error.message}`;
    }
    return "An unknown error occurred during transcription.";
  }
};
