import React, { useState, useCallback, useEffect } from 'react';
import { Language } from './types';
import { fileToBase64 } from './utils/file';
import { Header } from './components/Header';
import { AudioHandler } from './components/AudioHandler';
import { TranscriptionBox } from './components/TranscriptionBox';

const translations = {
  transcribeFile: {
    [Language.ENGLISH]: 'Transcribe File',
    [Language.HEBREW]: 'תמלל קובץ',
    [Language.ARABIC]: 'نسخ الملف',
    [Language.FRENCH]: 'Transcrire le fichier',
    [Language.SPANISH]: 'Transcribir archivo',
  },
  transcribing: {
    [Language.ENGLISH]: 'Transcribing...',
    [Language.HEBREW]: 'מבצע תמלול...',
    [Language.ARABIC]: 'جاري النسخ...',
    [Language.FRENCH]: 'Transcription...',
    [Language.SPANISH]: 'Transcribiendo...',
  },
  error: {
    noAudio: {
        [Language.ENGLISH]: 'Please upload an audio file first.',
        [Language.HEBREW]: 'אנא העלה קובץ שמע תחילה.',
        [Language.ARABIC]: 'يرجى تحميل ملف صوتي أولاً.',
        [Language.FRENCH]: 'Veuillez d\'abord télécharger un fichier audio.',
        [Language.SPANISH]: 'Por favor, sube un archivo de audio primero.',
    },
    tooLarge: {
        [Language.ENGLISH]: 'Audio file is too large. Please try a smaller file (limit ~4MB).',
        [Language.HEBREW]: 'קובץ השמע גדול מדי. אנא נסה קובץ קטן יותר (מגבלה של כ-4MB).',
        [Language.ARABIC]: 'ملف الصوت كبير جدًا. يرجى تجربة ملف أصغر (الحد حوالي 4 ميغابايت).',
        [Language.FRENCH]: 'Le fichier audio est trop volumineux. Veuillez essayer un fichier plus petit (limite ~4 Mo).',
        [Language.SPANISH]: 'El archivo de audio es demasiado grande. Por favor, intenta con un archivo más pequeño (límite ~4MB).',
    },
    timeout: {
        [Language.ENGLISH]: 'The request timed out. This can happen with long audio files. Please try a shorter one.',
        [Language.HEBREW]: 'הבקשה נתקעה (timeout). זה יכול לקרות עם קבצי שמע ארוכים. אנא נסה קובץ קצר יותר.',
        [Language.ARABIC]: 'انتهت مهلة الطلب. يمكن أن يحدث هذا مع الملفات الصوتية الطويلة. يرجى تجربة ملف أقصر.',
        [Language.FRENCH]: 'La requête a expiré. Cela peut arriver avec des fichiers audio longs. Veuillez en essayer un plus court.',
        [Language.SPANISH]: 'La solicitud ha caducado. Esto puede ocurrir con archivos de audio largos. Por favor, intenta con uno más corto.',
    },
    unexpected: {
        [Language.ENGLISH]: 'The server returned an unexpected error.',
        [Language.HEBREW]: 'השרת החזיר שגיאה לא צפויה.',
        [Language.ARABIC]: 'أعاد الخادم خطأ غير متوقع.',
        [Language.FRENCH]: 'Le serveur a retourné une erreur inattendue.',
        [Language.SPANISH]: 'El servidor devolvió un error inesperado.',
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
    [Language.ARABIC]: 'مدعوم بواسطة Gemini',
    [Language.FRENCH]: 'Propulsé par Gemini',
    [Language.SPANISH]: 'Desarrollado por Gemini',
  }
};


const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.HEBREW);
  const [audioData, setAudioData] = useState<{ data: File | Blob; url: string } | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isRtl = language === Language.HEBREW || language === Language.ARABIC;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    const title: Record<Language, string> = {
        [Language.ENGLISH]: "Audio Transcriber",
        [Language.HEBREW]: "תמי ליל - מתמלל אודיו",
        [Language.ARABIC]: "مُفرّغ صوتي",
        [Language.FRENCH]: "Transcripteur Audio",
        [Language.SPANISH]: "Transcriptor de Audio",
    };
    document.title = title[language];

  }, [language]);

  const handleTranscribe = useCallback(async () => {
    if (!audioData) {
      setError(translations.error.noAudio[language]);
      return;
    }
    
    setIsTranscribing(true);
    setError(null);
    setTranscription('');

    try {
      const base64Audio = await fileToBase64(audioData.data);
      const mimeType = audioData.data.type || 'audio/webm';

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

      if (!apiResponse.ok) {
        if (apiResponse.status === 413) {
            throw new Error(translations.error.tooLarge[language]);
        }
        if (apiResponse.status === 504) {
            throw new Error(translations.error.timeout[language]);
        }
        
        const errorData = await apiResponse.json().catch(() => null);
        throw new Error(errorData?.error || translations.error.unexpected[language]);
      }

      const result = await apiResponse.json();
      setTranscription(result.transcription);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : translations.error.unknown[language];
      setError(`${translations.error.transcriptionFailed[language]} ${errorMessage}`);
      setTranscription('');
    } finally {
      setIsTranscribing(false);
    }
  }, [audioData, language]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col items-center p-4">
      <main className="w-full max-w-4xl mx-auto">
        <Header language={language} setLanguage={setLanguage} />
        
        <AudioHandler onAudioReady={setAudioData} isTranscribing={isTranscribing} language={language} />

        <div className="w-full mt-6 flex justify-center">
          <button
            onClick={handleTranscribe}
            disabled={!audioData || isTranscribing}
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
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
