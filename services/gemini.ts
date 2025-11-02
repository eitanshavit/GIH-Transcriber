import { GoogleGenAI } from "@google/genai";
import { Language } from '../types';
import { fileToBase64 } from '../utils/file';

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

export const transcribeAudio = async (
    audioData: { data: File | Blob; url: string }, 
    language: Language
): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const base64Audio = await fileToBase64(audioData.data);
    const mimeType = audioData.data.type || 'audio/webm';

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
};