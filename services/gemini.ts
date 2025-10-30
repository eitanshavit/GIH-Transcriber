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
    // The platform is responsible for providing the API key. In a browser environment,
    // direct access to process.env.API_KEY can be unreliable.
    // Initializing with an empty object allows the SDK to potentially
    // pick up credentials from the execution environment automatically.
    // This approach is used in other official examples and resolves the "API Key must be set" error.
    const ai = new GoogleGenAI({});

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
        throw new Error(error.message);
    }
    throw new Error("An unknown error occurred during transcription.");
  }
};