import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Language } from './types';
import { Header } from './components/Header';
import { AudioHandler } from './components/AudioHandler';
import { TranscriptionBox } from './components/TranscriptionBox';
import { PasswordProtection } from './components/PasswordProtection';
import { AudioPlayer } from './components/AudioPlayer';
import { transcribeFromDrive } from './services/gemini';
import { fileToBase64 } from './utils/file';
import { StopIcon } from './components/icons';

const translations = {
  transcribeFile: {
    [Language.ENGLISH]: 'Transcribe Audio',
    [Language.HEBREW]: 'תמלל אודיו',
    [Language.ARABIC]: 'نسخ الصوت',
    [Language.FRENCH]: 'Transcrire l\'Audio',
    [Language.SPANISH]: 'Transcribir Audio',
  },
  stopTranscribing: {
    [Language.ENGLISH]: 'Stop Transcribing',
    [Language.HEBREW]: 'עצור תמלול',
    [Language.ARABIC]: 'إيقاف النسخ',
    [Language.FRENCH]: 'Arrêter la Transcription',
    [Language.SPANISH]: 'Detener Transcripción',
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [language, setLanguage] = useState<Language>(Language.HEBREW);
  const [audioData, setAudioData] = useState<{ data: File | Blob; url: string } | null>(null);
  const [driveFile, setDriveFile] = useState<{ id: string; name: string; accessToken: string} | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  // State for the new audio player
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);


  useEffect(() => {
    // Detect if the app is running in an iframe
    setIsInIframe(window.self !== window.top);
    // Check session storage for authentication
    if (sessionStorage.getItem('isAuthenticated') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);


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

  // Effect to load audio preview when source changes
  useEffect(() => {
    const loadPreview = async () => {
      // Clean up previous blob URL if it exists to prevent memory leaks
      if (audioPreviewUrl && audioPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioPreviewUrl);
      }

      if (audioData) {
        const fileName = (audioData.data instanceof File) ? audioData.data.name : 'recorded_audio.webm';
        setAudioFileName(fileName);
        setAudioPreviewUrl(audioData.url);
        setIsPreviewLoading(false);
      } else if (driveFile) {
        setIsPreviewLoading(true);
        setError(null);
        setAudioFileName(driveFile.name);
        setAudioPreviewUrl(null); // Clear previous preview
        try {
          const response = await fetch('/api/drive-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileId: driveFile.id,
              accessToken: driveFile.accessToken,
            }),
          });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to load audio preview.');
          }
          const blob = await response.blob();
          setAudioPreviewUrl(URL.createObjectURL(blob));
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(`Could not load audio preview: ${errorMessage}`);
          setAudioPreviewUrl(null);
        } finally {
          setIsPreviewLoading(false);
        }
      } else {
        setAudioPreviewUrl(null);
        setAudioFileName(null);
        setIsPreviewLoading(false);
      }
    };

    loadPreview();

    // This cleanup function is essential. It runs when the component unmounts
    // or when the dependencies (audioData, driveFile) change before the effect runs again.
    return () => {
      if (audioPreviewUrl && audioPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioData, driveFile]);

  const handleLogin = async (password: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('isAuthenticated', 'true');
        return null;
      } else {
        const errorData = await response.json();
        return errorData.error || 'Login failed.';
      }
    } catch (err) {
      console.error(err);
      return 'An unexpected error occurred during login.';
    }
  };


  const handleTranscribe = useCallback(async () => {
    if (!audioData && !driveFile) {
      setError(translations.error.noAudio[language]);
      return;
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsTranscribing(true);
    setError(null);
    setTranscription('');

    try {
      let result = '';
      if (driveFile) {
        result = await transcribeFromDrive(driveFile.id, driveFile.accessToken, language, signal);
      } else if (audioData) {
        const base64Audio = await fileToBase64(audioData.data);
        const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                base64Audio,
                mimeType: audioData.data.type || 'audio/webm',
                language,
            }),
            signal, // Pass the signal to fetch
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `API Error: ${response.status}`);
        }
        const json = await response.json();
        result = json.transcription;

      }
      if (!signal.aborted) {
         setTranscription(result);
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Transcription aborted by user.');
        setError(null);
        setTranscription('');
      } else {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : translations.error.unknown[language];
        setError(`${translations.error.transcriptionFailed[language]} ${errorMessage}`);
        setTranscription('');
      }
    } finally {
      setIsTranscribing(false);
      abortControllerRef.current = null;
    }
  }, [audioData, driveFile, language]);

  const handleStopTranscribe = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
  };
  
  if (!isAuthenticated) {
    return <PasswordProtection onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4">
      <main className="w-full max-w-4xl mx-auto">
        <Header language={language} setLanguage={setLanguage} />
        
        <AudioHandler 
            onAudioReady={setAudioData} 
            onDriveFileReady={setDriveFile}
            isTranscribing={isTranscribing} 
            language={language}
            isInIframe={isInIframe}
            onError={setError}
             />
        
        {isPreviewLoading && (
          <div className="w-full flex items-center justify-center gap-3 p-4 mt-6 text-gray-400 bg-gray-800 rounded-lg">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading Audio Preview...</span>
          </div>
        )}
        
        {audioPreviewUrl && audioFileName && !isPreviewLoading && (
          <AudioPlayer 
            src={audioPreviewUrl} 
            fileName={audioFileName}
            language={language}
          />
        )}


        <div className="w-full mt-6 flex justify-center">
          <button
            onClick={isTranscribing ? handleStopTranscribe : handleTranscribe}
            disabled={!isTranscribing && (!audioData && !driveFile)}
            className={`px-8 py-3 text-white font-bold rounded-lg shadow-lg disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 min-h-[52px] w-64 flex items-center justify-center ${
              isTranscribing
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 disabled:bg-gray-600'
            }`}
          >
            {isTranscribing ? (
              <div className="flex items-center">
                  <StopIcon className="mr-3 rtl:ml-3 h-5 w-5 text-white" />
                  {translations.stopTranscribing[language]}
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