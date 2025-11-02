import { GoogleGenAI } from "@google/genai";
import { Language } from '../types.js';

// Vercel config to increase body size limit for this function
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

const getPrompt = (language: Language): string => {
  switch (language) {
    case Language.HEBREW:
      return "תמלל את האודיו הבא לטקסט בעברית. התמלול צריך להיות מדויק לחלוטין. במידת האפשר, חלק את הטקסט לפסקאות.";
    case Language.ARABIC:
      return "قم بنسخ الصوت التالي إلى نص باللغة العربية. يجب أن يكون النسخ دقيقًا تمامًا. وحيثما كان ذلك مناسبًا، قم بتقسيم النص إلى فقرات.";
    case Language.FRENCH:
      return "Transcrivez l'audio suivant en texte français. La transcription doit être parfaitement exacte. Le cas échéant, divisez le texte en paragraphes.";
    case Language.SPANISH:
      return "Transcriba el siguiente audio a texto en español. La transcripción debe ser perfectamente precisa. Cuando sea apropiado, divida el texto en párrafos.";
    case Language.ENGLISH:
    default:
      return "Transcribe the following audio to English text. The transcription should be perfectly accurate. Where appropriate, break the text into paragraphs.";
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { base64Audio, mimeType, language } = req.body;

    if (!base64Audio || !mimeType || !language) {
      return res.status(400).json({ error: 'Missing required parameters: base64Audio, mimeType, and language are required.' });
    }

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
    console.error("Error in /api/transcribe:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return res.status(500).json({ error: `Failed to transcribe audio. ${message}` });
  }
}
