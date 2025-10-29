import React, { useState, useCallback } from 'react';
import { Language } from './types';
import { fileToBase64 } from './utils/file';
import { Header } from './components/Header';
import { AudioHandler } from './components/AudioHandler';
import { TranscriptionBox } from './components/TranscriptionBox';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [audioData, setAudioData] = useState<{ data: File | Blob; url: string } | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranscribe = useCallback(async () => {
    if (!audioData) {
      setError("Please upload or record audio first.");
      return;
    }
    
    setIsTranscribing(true);
    setError(null);
    setTranscription('');

    try {
      const base64Audio = await fileToBase64(audioData.data);
      const mimeType = audioData.data.type || 'audio/webm';

      // Call our new backend proxy endpoint instead of Gemini directly
      const apiResponse = await fetch('/api/transcribe', {
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

      const result = await apiResponse.json();

      if (!apiResponse.ok) {
        // The serverless function returns a JSON object with an 'error' key
        throw new Error(result.error || `Request failed with status ${apiResponse.status}`);
      }
      
      setTranscription(result.transcription);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Transcription failed: ${errorMessage}`);
      setTranscription('');
    } finally {
      setIsTranscribing(false);
    }
  }, [audioData, language]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4">
      <main className="w-full max-w-4xl mx-auto">
        <Header language={language} setLanguage={setLanguage} />
        
        <AudioHandler onAudioReady={setAudioData} isTranscribing={isTranscribing} />

        <div className="w-full mt-6 flex justify-center">
          <button
            onClick={handleTranscribe}
            disabled={!audioData || isTranscribing}
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
          >
            {isTranscribing ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Transcribing...
              </div>
            ) : 'Transcribe Audio'}
          </button>
        </div>

        {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded-lg text-center">
                {error}
            </div>
        )}

        <TranscriptionBox 
          transcription={transcription} 
          setTranscription={setTranscription}
          language={language} 
        />
        
      </main>
      <footer className="w-full max-w-4xl mx-auto text-center p-4 mt-8 text-gray-500 text-sm">
        <p>Powered by Gemini</p>
      </footer>
    </div>
  );
};

export default App;
