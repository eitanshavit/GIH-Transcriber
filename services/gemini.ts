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

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch transcription from the API.');
    }

    return result.transcription;
};