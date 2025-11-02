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
    [Language.ENGLISH]: 'Connect & Select File',
    [Language.HEBREW]: 'התחבר ובחר קובץ',
    [Language.ARABIC]: 'اتصل واختر ملفًا',
    [Language.FRENCH]: 'Connecter et sélectionner',
    [Language.SPANISH]: 'Conectar y Seleccionar',
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
  
  // --- Google Drive State ---
  const [clientId, setClientId] = useState(() => localStorage.getItem('googleClientId') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('googleApiKey') || '');
  const [configError, setConfigError] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');

  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [gdriveFile, setGdriveFile] = useState<{ id: string; name: string; accessToken: string} | null>(null);
  const pickerInited = useRef(false);

  // --- Get current origin for instructions ---
   useEffect(() => {
    if (typeof window !== 'undefined') {
        setOrigin(window.location.origin);
    }
  }, []);

  // --- Persist keys to localStorage ---
  useEffect(() => {
    localStorage.setItem('googleClientId', clientId);
  }, [clientId]);
  useEffect(() => {
    localStorage.setItem('googleApiKey', apiKey);
  }, [apiKey]);


  // --- Load Google Scripts ---
  useEffect(() => {
    // gapi is loaded from index.html, we just need to load the modules we need
    if (window.gapi) {
        window.gapi.load('client:picker', () => {
            setGapiLoaded(true);
        });
    }

    const scriptGis = document.createElement('script');
    scriptGis.src = 'https://accounts.google.com/gsi/client';
    scriptGis.async = true;
    scriptGis.defer = true;
    scriptGis.onload = () => {
        setGisLoaded(true);
    };
    document.body.appendChild(scriptGis);

    return () => {
        const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (script) {
            document.body.removeChild(script);
        }
    }
  }, []);

  // --- Initialize Google Auth Client ---
  const showPicker = useCallback((accessToken: string) => {
      if (gapiLoaded && !pickerInited.current && apiKey) {
          const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
          view.setMimeTypes("audio/mpeg,audio/wav,audio/x-wav,audio/mp3,audio/webm,audio/flac,audio/ogg,audio/aac");
          const picker = new window.google.picker.PickerBuilder()
              .setAppId(null)
              .setOAuthToken(accessToken)
              .addView(view)
              .setDeveloperKey(apiKey)
              .setCallback((data: any) => {
                  pickerInited.current = false; // Reset for next time
                  if (data[window.google.picker.Response.ACTION] == window.google.picker.Action.PICKED) {
                      const doc = data[window.google.picker.Response.DOCUMENTS][0];
                      const file = { id: doc.id, name: doc.name, accessToken: accessToken };
                      setGdriveFile(file);
                      onDriveFileReady(file);
                      onAudioReady(null);
                  }
              })
              .build();
          picker.setVisible(true);
          pickerInited.current = true;
      }
  }, [gapiLoaded, apiKey, onDriveFileReady, onAudioReady]);

  useEffect(() => {
      if (gisLoaded && clientId) {
          try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                callback: (tokenResponse: any) => {
                    if (tokenResponse.error) {
                        console.error('Google Auth Error:', tokenResponse);
                        setConfigError(`Authentication failed: ${tokenResponse.error_description || tokenResponse.error}. Please check your Client ID configuration and Authorized JavaScript Origins.`);
                        return;
                    }
                    setConfigError(null);
                    showPicker(tokenResponse.access_token);
                },
            });
            setTokenClient(client);
          } catch(err) {
              console.error("Error initializing Google Auth Client:", err);
              setConfigError('Invalid Client ID. Please ensure it is correct and try again.');
              setTokenClient(null);
          }
      } else {
          setTokenClient(null);
      }
  }, [gisLoaded, clientId, showPicker]);


  const handleAuthClick = () => {
      setConfigError(null);
      if (tokenClient) {
          tokenClient.requestAccessToken({prompt: 'select_account'});
      } else {
          setConfigError("Google Auth Client not ready. Please check your Client ID.");
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
      onAudioReady(newAudio);
      onDriveFileReady(null);
      setGdriveFile(null);
    }
  }, [audioBlob, onAudioReady, onDriveFileReady]);

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
    onAudioReady(null);
    startRecording();
  };
  
  const handleClearRecording = () => {
    resetRecording();
    setRecordedAudio(null);
    onAudioReady(null);
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const areApisReady = gapiLoaded && gisLoaded;

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
        <div className="flex flex-col items-center justify-center p-4 space-y-4">
            <div className="w-full p-4 bg-gray-900/50 rounded-lg text-sm text-gray-300 space-y-3">
                <p>To use Google Drive, you need to provide your own Google Cloud credentials.</p>
                <ol className="list-decimal list-inside space-y-2 text-xs">
                    <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google Cloud Console</a>.</li>
                    <li>Ensure the <strong>Google Drive API</strong> and <strong>Google Picker API</strong> are enabled for your project.</li>
                    <li>Create an <strong>OAuth 2.0 Client ID</strong> of type "Web Application".</li>
                    <li className="font-bold">Under "Authorized JavaScript origins", add your app's exact URL.</li>
                    <li>Create an <strong>API Key</strong>.</li>
                    <li className="font-bold">For the API Key, under "Website restrictions", add your app's URL in the format `your-app-name.vercel.app/*`. Do not include `https://`. An "invalid key" error is almost always caused by this restriction being misconfigured.</li>
                </ol>
                
                {origin && (
                    <div className="!mt-4 p-3 bg-indigo-900/50 border border-indigo-700 rounded-md">
                        <p className="text-xs text-indigo-200 font-semibold">
                            Your "Authorized JavaScript origin" is:
                        </p>
                        <code className="block w-full bg-gray-900 text-yellow-300 p-2 mt-2 rounded-md text-sm break-all">
                            {origin}
                        </code>
                    </div>
                )}

                <p className="!mt-4 text-xs text-gray-400">
                    <strong>Note:</strong> A Client Secret is not needed. Your keys are stored only in your browser's local storage.
                </p>
            </div>

            <div className="w-full space-y-3">
                <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Enter your OAuth 2.0 Client ID"
                    className="w-full bg-gray-900 rounded-md p-3 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Google Picker API Key"
                    className="w-full bg-gray-900 rounded-md p-3 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
            </div>
            {configError && <p className="text-sm text-red-400">{configError}</p>}
            
            {gdriveFile ? (
                 <div className="w-full mt-4 p-4 bg-gray-900/50 rounded-lg text-center">
                    <p className="text-sm font-medium text-gray-300 mb-2 truncate" dir="ltr">
                        Selected: {gdriveFile.name}
                    </p>
                    <button
                        onClick={handleAuthClick}
                        disabled={isTranscribing || !areApisReady || !tokenClient || !clientId || !apiKey}
                        className="text-indigo-400 hover:text-indigo-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Choose another file
                    </button>
                </div>
            ) : (
                <button
                onClick={handleAuthClick}
                disabled={isTranscribing || !areApisReady || !tokenClient || !clientId || !apiKey}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
              >
                  { !areApisReady ? 'Loading APIs...' : translations.connectDrive[language] }
              </button>
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