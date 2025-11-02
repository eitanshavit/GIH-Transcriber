import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MicIcon, StopIcon, TrashIcon, UploadIcon } from './icons';
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
  isInIframe: boolean;
  onError: (message: string | null) => void;
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
  upload: {
    [Language.ENGLISH]: 'Upload File',
    [Language.HEBREW]: 'העלאת קובץ',
    [Language.ARABIC]: 'رفع ملف',
    [Language.FRENCH]: 'Téléverser',
    [Language.SPANISH]: 'Subir Archivo',
  },
  uploadFromComputer: {
      [Language.ENGLISH]: "Upload from Computer",
      [Language.HEBREW]: "העלה מהמחשב",
      [Language.ARABIC]: 'تحميل من الحاسوب',
      [Language.FRENCH]: 'Téléverser depuis l\'ordinateur',
      [Language.SPANISH]: 'Subir desde la Computadora',
  },
  fileTooLarge: {
      [Language.ENGLISH]: "File is too large ({fileSize} MB). Please use a file smaller than {maxSize} MB, or use Google Drive for larger files.",
      [Language.HEBREW]: "הקובץ גדול מדי ({fileSize} MB). אנא השתמש בקובץ קטן מ-{maxSize} MB, או השתמש בגוגל דרייב עבור קבצים גדולים יותר.",
      [Language.ARABIC]: "الملف كبير جدًا ({fileSize} ميغابايت). يرجى استخدام ملف أصغر من {maxSize} ميغابايت، أو استخدام جوجل درايف للملفات الأكبر.",
      [Language.FRENCH]: "Le fichier est trop volumineux ({fileSize} Mo). Veuillez utiliser un fichier de moins de {maxSize} Mo ou utiliser Google Drive pour les fichiers plus volumineux.",
      [Language.SPANISH]: "El archivo es demasiado grande ({fileSize} MB). Utilice un archivo de menos de {maxSize} MB o use Google Drive para archivos más grandes.",
  },
  selectedFile: {
      [Language.ENGLISH]: "Selected:",
      [Language.HEBREW]: "נבחר:",
      [Language.ARABIC]: "المحدد:",
      [Language.FRENCH]: "Sélectionné:",
      [Language.SPANISH]: "Seleccionado:",
  },
  clearSelection: {
      [Language.ENGLISH]: "Clear Selection",
      [Language.HEBREW]: "נקה בחירה",
      [Language.ARABIC]: "مسح التحديد",
      [Language.FRENCH]: "Effacer la sélection",
      [Language.SPANISH]: "Limpiar selección",
  },
  connectDrive: {
    [Language.ENGLISH]: 'Connect & Select File',
    [Language.HEBREW]: 'התחבר ובחר קובץ',
    [Language.ARABIC]: 'اتصل واختر ملفًا',
    [Language.FRENCH]: 'Connecter et sélectionner',
    [Language.SPANISH]: 'Conectar y Seleccionar',
  },
  selectFile: {
    [Language.ENGLISH]: 'Select File from Drive',
    [Language.HEBREW]: 'בחר קובץ מדרייב',
    [Language.ARABIC]: 'حدد ملفًا من Drive',
    [Language.FRENCH]: 'Sélectionner un fichier de Drive',
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
   iframeMessage: {
      [Language.ENGLISH]: "Please authorize Google Drive on the main page to select a file.",
      [Language.HEBREW]: "כדי לבחור קובץ, יש לאשר גישה לגוגל דרייב בעמוד הראשי.",
      [Language.ARABIC]: "يرجى تفويض جوجل درايف على الصفحة الرئيسية لتحديد ملف.",
      [Language.FRENCH]: "Veuillez autoriser Google Drive sur la page principale pour sélectionner un fichier.",
      [Language.SPANISH]: "Por favor, autorice Google Drive en la página principal para seleccionar un archivo.",
    },
};

const notifyServerOfAuthorization = () => {
  // Fire-and-forget a request to the backend to log the authorization event.
  fetch('/api/notify-auth', { method: 'POST' })
    .catch(error => console.error("Could not send authorization notification:", error));
};

export const AudioHandler: React.FC<AudioHandlerProps> = ({ onAudioReady, onDriveFileReady, isTranscribing, language, isInIframe, onError }) => {
  const [activeTab, setActiveTab] = useState<'drive' | 'record' | 'upload'>('drive');
  
  // --- Google Drive State ---
  const [googleConfig, setGoogleConfig] = useState<{clientId: string; apiKey: string} | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [selectedDriveFile, setSelectedDriveFile] = useState<{ id: string; name: string; accessToken: string} | null>(null);
  const pickerInited = useRef(false);

  // --- State for iframe communication ---
  const [parentAccessToken, setParentAccessToken] = useState<string | null>(null);
  const [parentApiKey, setParentApiKey] = useState<string | null>(null);

  // --- State for local file upload ---
  const [localFile, setLocalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // --- Recorder State & Logic ---
  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording } = useRecorder();
  const [recordedAudio, setRecordedAudio] = useState<{ data: Blob, url: string } | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerIntervalRef = useRef<number | null>(null);

  // --- Functions to clear audio sources ---

  const handleClearLocalFile = useCallback(() => {
    setLocalFile(null);
    onAudioReady(null);
    setUploadError(null);
    onError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onAudioReady, onError]);
  
  const handleClearRecording = useCallback(() => {
    resetRecording();
    setRecordedAudio(null);
    onAudioReady(null);
  }, [resetRecording, onAudioReady]);

  // --- Load Google Config from server (for standalone mode) ---
  useEffect(() => {
    if (isInIframe) return; // Don't fetch if embedded, as it gets info from parent

    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config');
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to load application configuration.');
        }
        const config = await response.json();
        setGoogleConfig(config);
        setConfigError(null);
      } catch (error) {
        console.error("Error fetching Google config:", error);
        setConfigError(error.message);
      }
    };

    fetchConfig();
  }, [isInIframe]);


  // --- Load Google Scripts ---
  useEffect(() => {
    if (window.gapi) {
        window.gapi.load('client:picker', () => setGapiLoaded(true));
    }

    const scriptGis = document.createElement('script');
    scriptGis.src = 'https://accounts.google.com/gsi/client';
    scriptGis.async = true;
    scriptGis.defer = true;
    scriptGis.onload = () => setGisLoaded(true);
    document.body.appendChild(scriptGis);

    return () => {
        const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (script) document.body.removeChild(script);
    }
  }, []);

  // --- Listen for token from parent window when in iframe ---
  useEffect(() => {
    if (isInIframe) {
      const handleMessage = (event: MessageEvent) => {
        // NOTE: In a production app, you should add a security check for event.origin here
        // to ensure the message is from a trusted parent domain.
        if (event.data?.type === 'googleAuthToken' && event.data.token) {
          // Only update and notify if the token is new
          setParentAccessToken(currentToken => {
            if (currentToken !== event.data.token) {
              notifyServerOfAuthorization();
              return event.data.token;
            }
            return currentToken;
          });
          setParentApiKey(event.data.apiKey); // Expect apiKey from parent as well
          setConfigError(null);
        }
      };
      
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [isInIframe]);

  const effectiveApiKey = isInIframe ? parentApiKey : googleConfig?.apiKey;

  const showPicker = useCallback((accessToken: string) => {
      if (gapiLoaded && !pickerInited.current && effectiveApiKey) {
          const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
          view.setMimeTypes("audio/mpeg,audio/wav,audio/x-wav,audio/mp3,audio/webm,audio/flac,audio/ogg,audio/aac");
          const picker = new window.google.picker.PickerBuilder()
              .setAppId(null)
              .setOAuthToken(accessToken)
              .addView(view)
              .setDeveloperKey(effectiveApiKey)
              .setCallback((data: any) => {
                  pickerInited.current = false;
                  if (data[window.google.picker.Response.ACTION] == window.google.picker.Action.PICKED) {
                      const doc = data[window.google.picker.Response.DOCUMENTS][0];
                      const file = { id: doc.id, name: doc.name, accessToken: accessToken };
                      setSelectedDriveFile(file);
                      onDriveFileReady(file);
                      // Clear other audio sources
                      handleClearLocalFile();
                      handleClearRecording();
                  }
              })
              .build();
          picker.setVisible(true);
          pickerInited.current = true;
      }
  }, [gapiLoaded, effectiveApiKey, onDriveFileReady, handleClearLocalFile, handleClearRecording]);

  // --- Initialize Google Auth Client (for standalone mode) ---
  useEffect(() => {
      if (!isInIframe && gisLoaded && googleConfig?.clientId) {
          try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: googleConfig.clientId,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                callback: (tokenResponse: any) => {
                    if (tokenResponse.error) {
                        console.error('Google Auth Error:', tokenResponse);
                        setConfigError(`Authentication failed: ${tokenResponse.error_description || tokenResponse.error}. Please ensure the Google Cloud configuration is correct.`);
                        return;
                    }
                    setConfigError(null);
                    notifyServerOfAuthorization(); // Send notification on successful auth
                    showPicker(tokenResponse.access_token);
                },
            });
            setTokenClient(client);
          } catch(err) {
              console.error("Error initializing Google Auth Client:", err);
              setConfigError('Invalid Client ID format. Please check the server configuration.');
              setTokenClient(null);
          }
      } else {
          setTokenClient(null);
      }
  }, [gisLoaded, googleConfig, showPicker, isInIframe]);


  const handleStandaloneAuthClick = () => {
      setConfigError(null);
      if (tokenClient) {
          tokenClient.requestAccessToken({prompt: 'select_account'});
      } else if (!googleConfig && !configError) {
          setConfigError("Loading Google Drive configuration...");
      } else {
          setConfigError("Google Auth Client is not ready. Please refresh the page.");
      }
  };

  const handleEmbeddedSelectClick = () => {
    if (parentAccessToken) {
      showPicker(parentAccessToken);
    } else {
      setConfigError("Authorization token not received from host page.");
    }
  };
  
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const newAudio = { data: audioBlob, url };
      setRecordedAudio(newAudio);
      onAudioReady(newAudio);
      // Clear other sources
      onDriveFileReady(null);
      setSelectedDriveFile(null);
      setLocalFile(null);
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
    // Clear other audio sources
    setSelectedDriveFile(null);
    onDriveFileReady(null);
    handleClearLocalFile();
    handleClearRecording();
    startRecording();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = ''; // Allow re-selecting the same file

    setUploadError(null); // Clear previous errors on new attempt
    onError(null); // Clear global error as well

    if (file) {
      const MAX_SIZE_MB = 4;
      const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
      if (file.size > MAX_SIZE_BYTES) {
        const errorMsg = translations.fileTooLarge[language]
          .replace('{fileSize}', (file.size / 1024 / 1024).toFixed(2))
          .replace('{maxSize}', MAX_SIZE_MB.toString());
        setUploadError(errorMsg);
        setLocalFile(null);
        onAudioReady(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      setUploadError(null);
      onError(null);
      setLocalFile(file);
      onAudioReady({ data: file, url: URL.createObjectURL(file) });
      
      // Clear other audio sources
      setSelectedDriveFile(null);
      onDriveFileReady(null);
      resetRecording();
      setRecordedAudio(null);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const changeTab = (tab: 'drive' | 'record' | 'upload') => {
    setUploadError(null); // Clear file-specific errors when changing context
    setActiveTab(tab);
  };
  
  const areApisReady = gapiLoaded && gisLoaded;

  const renderDriveTab = () => {
    if (isInIframe) {
      return (
        <div className="w-full p-6 bg-gray-900/50 rounded-lg text-center space-y-4">
          {!parentAccessToken ? (
            <p className="text-gray-300 animate-pulse">{translations.iframeMessage[language]}</p>
          ) : (
             selectedDriveFile ? (
                <div className="w-full text-center">
                    <p className="text-sm font-medium text-gray-300 mb-2 truncate" dir="ltr">
                        Selected: {selectedDriveFile.name}
                    </p>
                    <button
                        onClick={handleEmbeddedSelectClick}
                        disabled={isTranscribing || !areApisReady}
                        className="text-indigo-400 hover:text-indigo-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Choose another file
                    </button>
                </div>
            ) : (
              <button
                onClick={handleEmbeddedSelectClick}
                disabled={isTranscribing || !areApisReady || !parentAccessToken}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
              >
                {!areApisReady ? 'Loading APIs...' : translations.selectFile[language]}
              </button>
            )
          )}
          {configError && <p className="mt-4 text-sm text-red-400">{configError}</p>}
        </div>
      );
    }
    
    // Standalone mode
    if (!googleConfig && !configError) {
      return (
        <div className="flex items-center justify-center gap-3 p-4 text-gray-400">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading Google Drive Configuration...</span>
        </div>
      );
    }
    
    return (
        <>
            {configError && <p className="text-sm text-red-400 mb-4">{configError}</p>}
            
            {selectedDriveFile ? (
                <div className="w-full mt-4 p-4 bg-gray-900/50 rounded-lg text-center">
                    <p className="text-sm font-medium text-gray-300 mb-2 truncate" dir="ltr">
                        Selected: {selectedDriveFile.name}
                    </p>
                    <button
                        onClick={handleStandaloneAuthClick}
                        disabled={isTranscribing || !areApisReady || !tokenClient}
                        className="text-indigo-400 hover:text-indigo-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Choose another file
                    </button>
                </div>
            ) : (
                <button
                onClick={handleStandaloneAuthClick}
                disabled={isTranscribing || !areApisReady || !tokenClient}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
                { !areApisReady ? 'Loading APIs...' : translations.connectDrive[language] }
            </button>
            )}
        </>
    );
  };

  return (
    <div className="w-full bg-gray-800 rounded-lg p-4 sm:p-6 mt-6">
      <div className="flex border-b border-gray-700 mb-4">
        <button
          onClick={() => changeTab('drive')}
          disabled={isTranscribing}
          className={`px-4 py-2 font-medium transition-colors disabled:opacity-50 ${activeTab === 'drive' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          {translations.drive[language]}
        </button>
        <button
          onClick={() => changeTab('upload')}
          disabled={isTranscribing}
          className={`px-4 py-2 font-medium transition-colors disabled:opacity-50 ${activeTab === 'upload' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          {translations.upload[language]}
        </button>
        <button
          onClick={() => changeTab('record')}
          disabled={isTranscribing}
          className={`px-4 py-2 font-medium transition-colors disabled:opacity-50 ${activeTab === 'record' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
        >
          {translations.recordAudio[language]}
        </button>
      </div>

      {activeTab === 'drive' && (
        <div className="flex flex-col items-center justify-center p-4 space-y-4">
           {renderDriveTab()}
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="flex flex-col items-center justify-center p-4 space-y-4">
          {!localFile && (
            <label
              className={`flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 ${isTranscribing ? 'cursor-not-allowed bg-gray-600' : 'cursor-pointer'}`}
            >
              <UploadIcon className="w-8 h-8" />
              <span className="text-xl">{translations.uploadFromComputer[language]}</span>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="audio/*"
                disabled={isTranscribing}
              />
            </label>
          )}

          {localFile && (
            <div className="w-full mt-4 p-4 bg-gray-900/50 rounded-lg text-center">
              <p className="text-sm font-medium text-gray-300 mb-2 truncate" dir="ltr">
                {translations.selectedFile[language]} {localFile.name}
              </p>
              <button
                onClick={handleClearLocalFile}
                disabled={isTranscribing}
                className="text-indigo-400 hover:text-indigo-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {translations.clearSelection[language]}
              </button>
            </div>
          )}
          {uploadError && (
            <div className="mt-2 text-sm text-red-400 text-center max-w-md">
                {uploadError}
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