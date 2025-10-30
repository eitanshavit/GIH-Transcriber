import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadIcon } from './icons';

interface AudioHandlerProps {
  onAudioReady: (audio: { data: File | Blob; url: string } | null) => void;
  isTranscribing: boolean;
}

export const AudioHandler: React.FC<AudioHandlerProps> = ({ onAudioReady, isTranscribing }) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const memoizedOnAudioReady = useCallback(onAudioReady, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      memoizedOnAudioReady({ data: file, url });
    } else {
        setAudioUrl(null);
        memoizedOnAudioReady(null);
    }
  };

  useEffect(() => {
    // Cleanup URL object when component unmounts or audioUrl changes
    let currentAudioUrl = audioUrl;
    return () => {
        if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl);
        }
    }
  }, [audioUrl]);
  
  const audioFileName = audioUrl ? fileInputRef.current?.files?.[0]?.name : null;

  return (
    <div className="w-full bg-gray-800 rounded-lg p-4 sm:p-6 mt-6">
      <div className="flex border-b border-gray-700 mb-4">
        <h2 className="px-4 py-2 font-medium text-indigo-400 border-b-2 border-indigo-400">
          העלאת קובץ
        </h2>
      </div>

      <div 
        className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-8 cursor-pointer hover:border-indigo-500 hover:bg-gray-700/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadIcon className="w-12 h-12 text-gray-500 mb-2" />
        <p className="text-gray-400">
          <span className="font-semibold text-indigo-400">לחץ להעלאה</span> או גרור קובץ לכאן
        </p>
        <p className="text-xs text-gray-500">קבצי שמע נתמכים (MP3, WAV, וכו')</p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*"
          className="hidden"
          disabled={isTranscribing}
        />
      </div>

      {audioUrl && (
        <div className="mt-4 p-4 bg-gray-900/50 rounded-lg">
          <p className="text-sm font-medium text-gray-300 mb-2 truncate" dir="ltr">
            {audioFileName}
          </p>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}
    </div>
  );
};