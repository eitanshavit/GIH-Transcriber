import React, { useState, useCallback, useEffect } from 'react';
import { Language } from './types';
import { Header } from './components/Header';
import { AudioHandler } from './components/AudioHandler';
import { TranscriptionBox } from './components/TranscriptionBox';
import { transcribeAudio } from './services/gemini';

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
  progress: {
    [Language.ENGLISH]: 'Processing chunk {processed} of {total}',
    [Language.HEBREW]: 'מעבד חלק {processed} מתוך {total}',
    [Language.ARABIC]: 'جاري معالجة الجزء {processed} من {total}',
    [Language.FRENCH]: 'Traitement du segment {processed} sur {total}',
    [Language.SPANISH]: 'Procesando fragmento {processed} de {total}',
  },
  error: {
    noAudio: {
        [Language.ENGLISH]: 'Please upload or record an audio file first.',
        [Language.HEBREW]: 'אנא העלה או הקלט קובץ שמע תחילה.',
        [Language.ARABIC]: 'يرجى تحميل أو تسجيل ملف صوتي أولاً.',
        [Language.FRENCH]: 'Veuillez d\'abord télécharger ou enregistrer un fichier audio.',
        [Language.SPANISH]: 'Por favor, sube o graba un archivo de audio primero.',
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
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);


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
    if (!audioData) {
      setError(translations.error.noAudio[language]);
      return;
    }
    
    setIsTranscribing(true);
    setError(null);
    setTranscription('');
    setProgress(null);

    try {
      const result = await transcribeAudio(audioData, language, setProgress);
      setTranscription(result);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : translations.error.unknown[language];
      setError(`${translations.error.transcriptionFailed[language]} ${errorMessage}`);
      setTranscription('');
    } finally {
      setIsTranscribing(false);
      setProgress(null);
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
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 min-h-[52px] w-64 flex items-center justify-center"
          >
            {isTranscribing ? (
              <div className="flex flex-col items-center w-full">
                <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 rtl:ml-3 rtl:-mr-1 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {translations.transcribing[language]}
                </div>
                {progress && progress.total > 1 && (
                    <div className="w-full mt-2">
                        <div className="w-full bg-gray-700/50 rounded-full h-1.5">
                            <div 
                            className="bg-indigo-400 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${(progress.processed / progress.total) * 100}%` }}>
                            </div>
                        </div>
                        <p className="text-xs text-indigo-200 mt-1 text-center">
                         {translations.progress[language]
                            .replace('{processed}', String(progress.processed))
                            .replace('{total}', String(progress.total))}
                        </p>
                    </div>
                )}
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