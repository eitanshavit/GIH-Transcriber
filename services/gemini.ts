import { Language } from '../types';

export const transcribeFromDrive = async (
    fileId: string,
    accessToken: string,
    language: Language,
    signal?: AbortSignal
): Promise<string> => {
    const response = await fetch('/api/transcribe-from-drive', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fileId,
            accessToken,
            language,
        }),
        signal,
    });

    if (!response.ok) {
        const errorText = await response.text();
        try {
            // Try to parse as JSON, but fall back to text
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || `API Error: ${response.status}`);
        } catch (e) {
            throw new Error(errorText || `API Error: ${response.status}`);
        }
    }

    const result = await response.json();
    return result.transcription;
};