
import React, { useState, useEffect } from 'react';
import { CopyIcon, DownloadIcon, CheckIcon } from './icons';
import { Language } from '../types';

interface TranscriptionBoxProps {
  transcription: string;
  setTranscription: (text: string) => void;
  language: Language;
}

export const TranscriptionBox: React.FC<TranscriptionBoxProps> = ({ transcription, setTranscription, language }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = () => {
    navigator.clipboard.writeText(transcription);
    setCopied(true);
  };

  const handleDownload = () => {
    const blob = new Blob([transcription], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full bg-gray-800 rounded-lg p-4 sm:p-6 mt-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-200">Transcription</h3>
        <div className="flex space-x-2">
          <button
            onClick={handleCopy}
            disabled={!transcription}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Copy to clipboard"
          >
            {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5 text-gray-300" />}
          </button>
          <button
            onClick={handleDownload}
            disabled={!transcription}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Download as .txt"
          >
            <DownloadIcon className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>
      <textarea
        value={transcription}
        onChange={(e) => setTranscription(e.target.value)}
        placeholder={language === Language.HEBREW ? "התמלול יופיע כאן..." : "Transcription will appear here..."}
        dir={language === Language.HEBREW ? 'rtl' : 'ltr'}
        className="w-full h-64 bg-gray-900 rounded-md p-3 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
      />
    </div>
  );
};
