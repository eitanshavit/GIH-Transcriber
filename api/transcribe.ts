import { transcribeAudio } from '../services/gemini';
import { Language } from '../types';

// This is a Vercel serverless function
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Vercel automatically parses JSON bodies for POST requests
    const { base64Audio, mimeType, language } = req.body;

    if (!base64Audio || !mimeType || !language) {
      return res.status(400).json({ error: 'Missing required parameters: base64Audio, mimeType, and language are required.' });
    }

    if (!Object.values(Language).includes(language)) {
        return res.status(400).json({ error: 'Invalid language specified.' });
    }

    const transcription = await transcribeAudio(base64Audio, mimeType, language as Language);

    return res.status(200).json({ transcription });

  } catch (error) {
    console.error('Error in /api/transcribe:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return res.status(500).json({ error: `Server error: ${errorMessage}` });
  }
}
