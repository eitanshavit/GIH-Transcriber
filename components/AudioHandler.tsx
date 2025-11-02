import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MicIcon, StopIcon, TrashIcon } from './icons';
import { Language } from '../types';
import { useRecorder } from '../hooks/useRecorder';

// FIX: Add type declarations for Google API scripts loaded externally.
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// A placeholder for your Google Cloud project's client ID
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY';

interface AudioHandlerProps {
  onAudioReady: (audio: { data: File | Blob; url: string } | null) => void;
  onDriveFileReady: (file: { id: string; name: string; accessToken: string} | null) => void;
  isTranscribing: boolean;
  language: Language;
}

const translations: Record<string, Record<Language, string>> = {
  drive: {
    [Language.ENGLISH]: 'Google Drive',
    [Language.HEBREW]: 'גוגל דרייב',
    [Language.ARABIC]: 'جوجل درايف',
    [Language.FRENCH]: 'Google Drive',
    [Language.SPANISH]: 'Google Drive',
  },
  recordAudio: {
    [Language.ENGLISH]: 'Record Audio',
    [Language.HEBREW]: 'הקלט אודיו',
    [Language.ARABIC]: 'تسجيل صوتي',
    [Language.FRENCH]: 'Enregistrer l\'audio',
    [Language.SPANISH]: 'Grabar audio',
  },
  connectDrive: {
    [Language.ENGLISH]: 'Connect Google Drive',
    [Language.HEBREW]: 'התחבר לגוגל דרייב',
    [Language.ARABIC]: 'ربط جوجل درايف',
    [Language.FRENCH]: 'Connecter Google Drive',
    [Language.SPANISH]: 'Conectar Google Drive',
  },
  selectFile: {
    [Language.ENGLISH]: 'Select File from Drive',
    [Language.HEBREW]: 'בחר קובץ מדרייב',
    [Language.ARABIC]: 'حدد ملفًا من Drive',
    [Language.FRENCH]: 'Sélectionner un fichier depuis Drive',
    [Language.SPANISH]: 'Seleccionar archivo de Drive',
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

export const AudioHandler: React.FC<AudioHandlerProps> = ({ onAudioReady, onDriveFileReady, isTranscribing, language }) => {
  const [activeTab, setActiveTab] = useState<'drive' | 'record'>('drive');
  const memoizedOnAudioReady = useCallback(onAudioReady, []);
  
  // --- Google Drive State ---
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gdriveFile, setGdriveFile] = useState<{ id: string; name: string; accessToken: string} | null>(null);
  const pickerInited = useRef(false);

  // --- Load Google Scripts ---
  useEffect(() => {
    const scriptGapi = document.createElement('script');
    scriptGapi.src = 'https://apis.google.com/js/api.js';
    scriptGapi.async = true;
    scriptGapi.defer = true;
    scriptGapi.onload = () => window.gapi.load('client:picker', () => setGapiLoaded(true));
    document.body.appendChild(scriptGapi);

    const scriptGis = document.createElement('script');
    scriptGis.src = 'https://accounts.google.com/gsi/client';
    scriptGis.async = true;
    scriptGis.defer = true;
    scriptGis.onload = () => setGisLoaded(true);
    document.body.appendChild(scriptGis);

    return () => {
        document.body.removeChild(scriptGapi);
        document.body.removeChild(scriptGis);
    }
  }, []);

  // --- Initialize Google Auth Client ---
  useEffect(() => {
      if (gisLoaded) {
          const client = window.google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/drive.readonly',
              callback: (tokenResponse: any) => {
                  if (tokenResponse.error) {
                      console.error('Google Auth Error:', tokenResponse.error);
                      return;
                  }
                  showPicker(tokenResponse.access_token);
              },
          });
          setTokenClient(client);
      }
  }, [gisLoaded]);

  const handleAuthClick = () => {
      if (tokenClient) {
          tokenClient.requestAccessToken();
      } else {
          console.error("Google Auth Client not initialized.");
      }
  };
  
  const showPicker = (accessToken: string) => {
      if (gapiLoaded && !pickerInited.current) {
          const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
          view.setMimeTypes("audio/mpeg,audio/wav,audio/x-wav,audio/mp3,audio/webm,audio/flac,audio/ogg,audio/aac");
          const picker = new window.google.picker.PickerBuilder()
              .setAppId(null) // Not needed for OAuth 2.0
              .setOAuthToken(accessToken)
              .addView(view)
              .setDeveloperKey(GOOGLE_API_KEY)
              .setCallback((data: any) => {
                  if (data[window.google.picker.Response.ACTION] == window.google.picker.Action.PICKED) {
                      const doc = data[window.google.picker.Response.DOCUMENTS][0];
                      const file = { id: doc.id, name: doc.name, accessToken: accessToken };
                      setGdriveFile(file);
                      onDriveFileReady(file);
                      memoizedOnAudioReady(null);
                  }
              })
              .build();
          picker.setVisible(true);
          pickerInited.current = true;
          // Reset after a short delay to allow picker to be created again
          setTimeout(() => { pickerInited.current = false; }, 1000);
      }
  };


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
      onDriveFileReady(null);
      setGdriveFile(null);
    }
  }, [audioBlob, memoizedOnAudioReady, onDriveFileReady]);

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
    setGdriveFile(null);
    onDriveFileReady(null);
    handleClearRecording();
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

  return (
    <div className="w-full bg-gray-800 rounded-lg p-4 sm:p-6 mt-6">
      <div className="flex border-b border-gray-700 mb-4">
        <button
          onClick={() => setActiveTab('drive')}
          disabled={isTranscribing}
          className={`px-4 py-2 font-medium transition-colors disabled:opacity-50 ${activeTab === 'drive' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          {translations.drive[language]}
        </button>
        <button
          onClick={() => setActiveTab('record')}
          disabled={isTranscribing}
          className={`px-4 py-2 font-medium transition-colors disabled:opacity-50 ${activeTab === 'record' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          {translations.recordAudio[language]}
        </button>
      </div>

      {activeTab === 'drive' && (
        <div className="flex flex-col items-center justify-center p-4">
            {!gdriveFile && (
                <button
                onClick={handleAuthClick}
                disabled={isTranscribing || !gapiLoaded || !gisLoaded || !tokenClient}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
              >
                  { gapiLoaded && gisLoaded ? translations.connectDrive[language] : 'Loading...' }
              </button>
            )}
            {gdriveFile && (
                 <div className="w-full mt-4 p-4 bg-gray-900/50 rounded-lg text-center">
                    <p className="text-sm font-medium text-gray-300 mb-2 truncate" dir="ltr">
                        Selected: {gdriveFile.name}
                    </p>
                    <button
                        onClick={handleAuthClick}
                        disabled={isTranscribing || !gapiLoaded || !gisLoaded || !tokenClient}
                        className="text-indigo-400 hover:text-indigo-300 text-sm"
                    >
                        Choose another file
                    </button>
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