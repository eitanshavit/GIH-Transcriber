import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadIcon, MicIcon, StopIcon, TrashIcon } from './icons';
import { Language } from '../types';
import { useRecorder } from '../hooks/useRecorder';

interface AudioHandlerProps {
  onAudioReady: (audio: { data: File | Blob; url: string } | null) => void;
  isTranscribing: boolean;
  language: Language;
}

const translations: Record<string, Record<Language, string>> = {
  uploadFile: {
    [Language.ENGLISH]: 'Upload File',
    [Language.HEBREW]: 'העלאת קובץ',
    [Language.ARABIC]: 'تحميل ملف',
    [Language.FRENCH]: 'Télécharger un fichier',
    [Language.SPANISH]: 'Subir archivo',
  },
  recordAudio: {
    [Language.ENGLISH]: 'Record Audio',
    [Language.HEBREW]: 'הקלט אודיו',
    [Language.ARABIC]: 'تسجيل صوتي',
    [Language.FRENCH]: 'Enregistrer l\'audio',
    [Language.SPANISH]: 'Grabar audio',
  },
  clickToUpload: {
    [Language.ENGLISH]: 'Click to upload',
    [Language.HEBREW]: 'לחץ להעלאה',
    [Language.ARABIC]: 'انقر للتحميل',
    [Language.FRENCH]: 'Cliquez pour télécharger',
    [Language.SPANISH]: 'Haz clic para subir',
  },
  dragAndDrop: {
    [Language.ENGLISH]: 'or drag and drop',
    [Language.HEBREW]: 'או גרור קובץ לכאן',
    [Language.ARABIC]: 'أو قم بالسحب والإفلات',
    [Language.FRENCH]: 'ou glissez-déposez',
    [Language.SPANISH]: 'o arrastra y suelta',
  },
  supportedFiles: {
    [Language.ENGLISH]: 'Supported audio files (MP3, WAV, etc.)',
    [Language.HEBREW]: "קבצי שמע נתמכים (MP3, WAV, וכו')",
    [Language.ARABIC]: 'ملفات صوتية مدعومة (MP3, WAV, etc.)',
    [Language.FRENCH]: 'Fichiers audio pris en charge (MP3, WAV, etc.)',
    [Language.SPANISH]: 'Archivos de audio compatibles (MP3, WAV, etc.)',
  },
  startRecording: {
    [Language.ENGLISH]: 'Start Recording',
    [Language.HEBREW]: 'התחל הקלטה',
    [Language.ARABIC]: 'بدء التسجيل',
    [Language.FRENCH]: 'Démarrer l\'enregistrement',
    [Language.SPANISH]: 'Iniciar grabación',
  },
  stopRecording: {
    [Language.ENGLISH]: 'Stop Recording',
    [Language.HEBREW]: 'עצור הקלטה',
    [Language.ARABIC]: 'إيقاف التسجيل',
    [Language.FRENCH]: 'Arrêter l\'enregistrement',
    [Language.SPANISH]: 'Detener grabación',
  },
  recording: {
    [Language.ENGLISH]: 'Recording...',
    [Language.HEBREW]: 'מקליט...',
    [Language.ARABIC]: '...جاري التسجيل',
    [Language.FRENCH]: 'Enregistrement...',
    [Language.SPANISH]: 'Grabando...',
  },
  recordedAudio: {
    [Language.ENGLISH]: 'Recorded Audio',
    [Language.HEBREW]: 'שמע מוקלט',
    [Language.ARABIC]: 'الصوت المسجل',
    [Language.FRENCH]: 'Audio enregistré',
    [Language.SPANISH]: 'Audio grabado',
  },
   clearRecording: {
      [Language.ENGLISH]: "Clear Recording",
      [Language.HEBREW]: "נקה הקלטה",
      [Language.ARABIC]: 'مسح التسجيل',
      [Language.FRENCH]: 'Effacer l\'enregistrement',
      [Language.SPANISH]: 'Borrar grabación',
    },
};

export const AudioHandler: React.FC<AudioHandlerProps> = ({ onAudioReady, isTranscribing, language }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  const memoizedOnAudioReady = useCallback(onAudioReady, []);
  
  // --- File Upload State & Logic ---
  const [uploadedFile, setUploadedFile] = useState<{ data: File, url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleClearRecording(); // Clear any existing recording
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedFile({ data: file, url });
      memoizedOnAudioReady({ data: file, url });
    } else {
      setUploadedFile(null);
      memoizedOnAudioReady(null);
    }
  };

  useEffect(() => {
    const currentUrl = uploadedFile?.url;
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [uploadedFile]);

  // --- Recorder State & Logic ---
  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording } = useRecorder();
  const [recordedAudio, setRecordedAudio] = useState<{ data: Blob, url: string } | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const newAudio = { data: audioBlob, url };
      setRecordedAudio(newAudio);
      memoizedOnAudioReady(newAudio);
    }
  }, [audioBlob, memoizedOnAudioReady]);

  useEffect(() => {
    const currentUrl = recordedAudio?.url;
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [recordedAudio]);

  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      setRecordingSeconds(0);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  const handleStartRecording = () => {
    // Clear file input state
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadedFile(null);
    handleClearRecording(); // Clear previous recording if any
    memoizedOnAudioReady(null);
    startRecording();
  };

  const handleClearRecording = () => {
    resetRecording();
    setRecordedAudio(null);
    memoizedOnAudioReady(null);
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const uploadedFileName = uploadedFile ? fileInputRef.current?.files?.[0]?.name : null;

  return (
    <div className="w-full bg-gray-800 rounded-lg p-4 sm:p-6 mt-6">
      <div className="flex border-b border-gray-700 mb-4">
        <button
          onClick={() => setActiveTab('upload')}
          disabled={isTranscribing}
          className={`px-4 py-2 font-medium transition-colors disabled:opacity-50 ${activeTab === 'upload' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          {translations.uploadFile[language]}
        </button>
        <button
          onClick={() => setActiveTab('record')}
          disabled={isTranscribing}
          className={`px-4 py-2 font-medium transition-colors disabled:opacity-50 ${activeTab === 'record' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          {translations.recordAudio[language]}
        </button>
      </div>

      {activeTab === 'upload' && (
        <div>
          <div 
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-8 cursor-pointer hover:border-indigo-500 hover:bg-gray-700/50 transition-colors"
            onClick={() => !isTranscribing && fileInputRef.current?.click()}
          >
            <UploadIcon className="w-12 h-12 text-gray-500 mb-2" />
            <p className="text-gray-400">
              <span className="font-semibold text-indigo-400">{translations.clickToUpload[language]}</span> {translations.dragAndDrop[language]}
            </p>
            <p className="text-xs text-gray-500">{translations.supportedFiles[language]}</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="hidden"
              disabled={isTranscribing}
            />
          </div>

          {uploadedFile && (
            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
              <p className="text-sm font-medium text-gray-300 mb-2 truncate" dir="ltr">
                {uploadedFileName}
              </p>
              <audio controls src={uploadedFile.url} className="w-full" />
            </div>
          )}
        </div>
      )}

      {activeTab === 'record' && (
        <div className="flex flex-col items-center justify-center p-4">
          {!isRecording && !recordedAudio && (
            <button
              onClick={handleStartRecording}
              disabled={isTranscribing}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              <MicIcon className="w-8 h-8" />
              <span className="text-xl">{translations.startRecording[language]}</span>
            </button>
          )}

          {isRecording && (
            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 text-xl text-red-400 font-mono">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    {translations.recording[language]} {formatTime(recordingSeconds)}
                </div>
                <button
                    onClick={stopRecording}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-red-600 text-white font-bold rounded-lg shadow-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105"
                >
                    <StopIcon className="w-8 h-8" />
                    <span className="text-xl">{translations.stopRecording[language]}</span>
                </button>
            </div>
          )}

          {recordedAudio && (
            <div className="w-full mt-4 p-4 bg-gray-900/50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                 <p className="text-sm font-medium text-gray-300">{translations.recordedAudio[language]}</p>
                 <button 
                    onClick={handleClearRecording} 
                    disabled={isTranscribing}
                    className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-50"
                    title={translations.clearRecording[language]}
                  >
                   <TrashIcon className="w-5 h-5" />
                 </button>
              </div>
              <audio controls src={recordedAudio.url} className="w-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};