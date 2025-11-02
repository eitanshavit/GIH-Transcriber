import { Language } from '../types';
import { fileToBase64 } from '../utils/file';

const transcribeChunk = async (
    chunk: Blob,
    language: Language,
    mimeType: string
): Promise<string> => {
    const base64Audio = await fileToBase64(chunk);

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
        const errorText = await response.text();
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || `API Error: ${response.status}`);
        } catch (e) {
            throw new Error(errorText || `API Error: ${response.status}`);
        }
    }

    const result = await response.json();
    return result.transcription;
};


export const transcribeAudio = async (
    audioData: { data: File | Blob; url: string }, 
    language: Language,
    onProgress: (progress: { processed: number; total: number }) => void
): Promise<string> => {
    const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
    const audioBlob = audioData.data;
    const totalChunks = Math.ceil(audioBlob.size / CHUNK_SIZE);

    onProgress({ processed: 0, total: totalChunks });

    if (totalChunks === 0) {
        return "";
    }

    const transcriptions: string[] = [];
    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, audioBlob.size);
        const chunk = audioBlob.slice(start, end);
        
        const mimeType = audioData.data.type || 'audio/webm';

        const transcriptionPart = await transcribeChunk(chunk, language, mimeType);
        transcriptions.push(transcriptionPart);
        
        onProgress({ processed: i + 1, total: totalChunks });
    }

    return transcriptions.join(' ');
};