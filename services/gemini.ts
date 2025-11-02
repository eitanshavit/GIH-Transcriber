import { Language } from '../types';
import { fileToBase64 } from '../utils/file';

export const transcribeAudio = async (
    audioData: { data: File | Blob; url: string }, 
    language: Language
): Promise<string> => {
    const base64Audio = await fileToBase64(audioData.data);
    const mimeType = audioData.data.type || 'audio/webm';

    const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            base64Audio,
            mimeType,
            language,
        }),
    });

    if (!response.ok) {
        // If the response is not OK, the body might not be JSON.
        // We try to get the error message from the body as text.
        // Vercel's "Request Entity Too Large" error is plain text/html.
        const errorText = await response.text();
        
        // Try to parse as JSON in case the server did send a JSON error
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || `API Error: ${response.status}`);
        } catch (e) {
            // If parsing fails, it's not JSON, so use the raw text.
            // This will now correctly show "Request Entity Too Large".
            throw new Error(errorText || `API Error: ${response.status}`);
        }
    }

    // If response.ok is true, we can safely assume the body is JSON.
    const result = await response.json();
    return result.transcription;
};