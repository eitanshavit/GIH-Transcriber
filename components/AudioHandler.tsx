import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { UploadIcon, MicIcon, StopIcon } from './icons';

type InputMode = 'file' | 'mic';

interface AudioHandlerProps {
  onAudioReady: (audio: { data: File | Blob; url: string } | null) => void;
  isTranscribing: boolean;
}

export const AudioHandler: React.FC<AudioHandlerProps> = ({ onAudioReady, isTranscribing }) => {
  const [mode, setMode] = useState<InputMode>('file');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording } = useRecorder();
  
  const memoizedOnAudioReady = useCallback(onAudioReady, []);

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      memoizedOnAudioReady({ data: audioBlob, url });
      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob, memoizedOnAudioReady]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      resetRecording();
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      memoizedOnAudioReady({ data: file, url });
    }
  };

  const handleModeChange = (newMode: InputMode) => {
    setMode(newMode);
    setAudioUrl(null);
    memoizedOnAudioReady(null);
    // Fix: Use the `isRecording` state from the `useRecorder` hook instead of the inaccessible `mediaRecorderRef`.
    if(isRecording) stopRecording();
    resetRecording();
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setAudioUrl(null);
      memoizedOnAudioReady(null);
      startRecording();
    }
  };
  
  const audioFileName = audioUrl ? (mode === 'file' && fileInputRef.current?.files?.[0]?.name) || 'Recorded Audio' : null;

  return (
    <div className="w-full bg-gray-800 rounded-lg p-4 sm:p-6 mt-6">
      <div className="flex border-b border-gray-700 mb-4">
        <button onClick={() => handleModeChange('file')} className={`px-4 py-2 font-medium ${mode === 'file' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}>
          Upload File
        </button>
        <button onClick={() => handleModeChange('mic')} className={`px-4 py-2 font-medium ${mode === 'mic' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}>
          Record Audio
        </button>
      </div>

      {mode === 'file' && (
        <div 
          className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-8 cursor-pointer hover:border-indigo-500 hover:bg-gray-700/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon className="w-12 h-12 text-gray-500 mb-2" />
          <p className="text-gray-400">
            <span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">MP3, M4A, WAV, etc.</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*"
            className="hidden"
            disabled={isTranscribing}
          />
        </div>
      )}

      {mode === 'mic' && (
        <div className="flex flex-col items-center justify-center p-8">
            <button onClick={handleRecordClick} disabled={isTranscribing} className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {isRecording ? <StopIcon className="w-8 h-8 text-white" /> : <MicIcon className="w-8 h-8 text-white" />}
            </button>
            <p className="text-gray-400 mt-4">{isRecording ? 'Recording...' : 'Click to start recording'}</p>
        </div>
      )}

      {audioUrl && (
        <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
          <p className="text-sm font-medium text-gray-300 mb-2 truncate">
            {audioFileName}
          </p>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}
    </div>
  );
};