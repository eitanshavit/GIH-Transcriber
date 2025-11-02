import React, { useState, useCallback, useEffect } from 'react';
import { Language } from './types';
import { Header } from './components/Header';
import { AudioHandler } from './components/AudioHandler';
import { TranscriptionBox } from './components/TranscriptionBox';
import { transcribeFromDrive } from './services/gemini';
import { fileToBase64 } from './utils/file';

const translations = {
  transcribeFile: {
    [Language.ENGLISH]: 'Transcribe Audio',
    [Language.HEBREW]: 'תמלל אודיו',
    [Language.ARABIC]: 'نسخ الصوت',
    [Language.FRENCH]: 'Transcrire l\'Audio',
    [Language.SPANISH]: 'Transcribir Audio',
  },
  transcribing: {
    [Language.ENGLISH]: 'Transcribing...',
    [Language.HEBREW]: 'מבצע תמלול...',
    [Language.ARABIC]: '...جاري النسخ',
    [Language.FRENCH]: 'Transcription en cours...',
    [Language.SPANISH]: 'Transcribiendo...',
  },
  error: {
    noAudio: {
        [Language.ENGLISH]: 'Please select a file or record audio first.',
        [Language.HEBREW]: 'אנא בחר קובץ או הקלט שמע תחילה.',
        [Language.ARABIC]: 'يرجى تحديد ملف أو تسجيل صوتي أولاً.',
        [Language.FRENCH]: 'Veuillez d\'abord sélectionner un fichier ou enregistrer un audio.',
        [Language.SPANISH]: 'Por favor, selecciona un archivo o graba un audio primero.',
    },
    unknown: {
        [Language.ENGLISH]: 'An unknown error occurred.',
        [Language.HEBREW]: 'אירעה שגיאה לא ידועה.',
        [Language.ARABIC]: 'حدث خطأ غير معروف.',
        [Language.FRENCH]: 'Une erreur inconnue est survenue.',
        [Language.SPANISH]: 'Ocurrió un error desconocido.',
    },
    transcriptionFailed: {
        [Language.ENGLISH]: 'Transcription failed:',
        [Language.HEBREW]: 'התמלול נכשל:',
        [Language.ARABIC]: 'فشل النسخ:',
        [Language.FRENCH]: 'La transcription a échoué:',
        [Language.SPANISH]: 'La transcripción falló:',
    }
  },
  footer: {
    [Language.ENGLISH]: 'Powered by Gemini',
    [Language.HEBREW]: 'מופעל באמצעות Gemini',
    [Language.ARABIC]: 'بدعم من Gemini',
    [Language.FRENCH]: 'Propulsé par Gemini',
    [Language.SPANISH]: 'Desarrollado por Gemini',
  }
};


const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.HEBREW);
  const [audioData, setAudioData] = useState<{ data: File | Blob; url: string } | null>(null);
  const [driveFile, setDriveFile] = useState<{ id: string; name: string; accessToken: string} | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isRtl = language === Language.HEBREW || language === Language.ARABIC;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    const title: Record<Language, string> = {
        [Language.ENGLISH]: "Audio Transcriber",
        [Language.HEBREW]: "מתמלל אודיו",
        [Language.ARABIC]: "منسخ الصوت",
        [Language.FRENCH]: "Transcripteur Audio",
        [Language.SPANISH]: "Transcriptor de Audio",
    };
    document.title = title[language];

  }, [language]);

  const handleTranscribe = useCallback(async () => {
    if (!audioData && !driveFile) {
      setError(translations.error.noAudio[language]);
      return;
    }
    
    setIsTranscribing(true);
    setError(null);
    setTranscription('');

    try {
      let result = '';
      if (driveFile) {
        result = await transcribeFromDrive(driveFile.id, driveFile.accessToken, language);
      } else if (audioData) {
        // Fallback for recorded audio (which is small) - use the old API
        // This requires the old API endpoint to exist.
        // For simplicity, let's just make recorded audio use the Drive path too.
        // The user would have to save it and upload.
        // A better UX would be to upload the blob to drive, but that's more complex.
        // For now, let's assume recorded audio uses a different path if needed or is disabled.
        // The simplest path: only allow transcription from Drive for now.
        // Let's modify transcribeFromDrive to handle base64 for recorded files.
        // No, let's create a new endpoint for simplicity. Let's call it /api/transcribe-blob
        // This is getting complex. For this change, let's focus on the user's request.
        // I'll re-add the original transcribe api endpoint and use that for blobs.
        const base64Audio = await fileToBase64(audioData.data);
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                base64Audio,
                mimeType: audioData.data.type || 'audio/webm',
                language,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `API Error: ${response.status}`);
        }
        const json = await response.json();
        result = json.transcription;

      }
      setTranscription(result);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : translations.error.unknown[language];
      setError(`${translations.error.transcriptionFailed[language]} ${errorMessage}`);
      setTranscription('');
    } finally {
      setIsTranscribing(false);
    }
  }, [audioData, driveFile, language]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4">
      <main className="w-full max-w-4xl mx-auto">
        <Header language={language} setLanguage={setLanguage} />
        
        <AudioHandler 
            onAudioReady={setAudioData} 
            onDriveFileReady={setDriveFile}
            isTranscribing={isTranscribing} 
            language={language} />

        <div className="w-full mt-6 flex justify-center">
          <button
            onClick={handleTranscribe}
            disabled={(!audioData && !driveFile) || isTranscribing}
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 min-h-[52px] w-64 flex items-center justify-center"
          >
            {isTranscribing ? (
              <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 rtl:ml-3 rtl:-mr-1 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {translations.transcribing[language]}
              </div>
            ) : translations.transcribeFile[language]}
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
        <p>{translations.footer[language]}</p>
      </footer>
    </div>
  );
};

export default App;
