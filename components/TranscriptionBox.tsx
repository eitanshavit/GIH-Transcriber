import React, { useState, useEffect } from 'react';
import { CopyIcon, DownloadIcon, CheckIcon, TrashIcon } from './icons';
import { Language } from '../types';

interface TranscriptionBoxProps {
  transcription: string;
  setTranscription: (text: string) => void;
  language: Language;
}

const placeholders: Record<Language, string> = {
    [Language.ENGLISH]: "Transcription will appear here...",
    [Language.HEBREW]: "התמלול יופיע כאן...",
    [Language.ARABIC]: "سيظهر النسخ هنا...",
    [Language.FRENCH]: "La transcription apparaîtra ici...",
    [Language.SPANISH]: "La transcripción aparecerá aquí...",
};

const titles: Record<Language, string> = {
    [Language.ENGLISH]: "Transcription",
    [Language.HEBREW]: "תמלול",
    [Language.ARABIC]: "التفريغ النصي",
    [Language.FRENCH]: "Transcription",
    [Language.SPANISH]: "Transcripción",
};

const tooltips: Record<string, Record<Language, string>> = {
    copy: {
      [Language.ENGLISH]: "Copy to clipboard",
      [Language.HEBREW]: "העתק ללוח",
      [Language.ARABIC]: "نسخ إلى الحافظة",
      [Language.FRENCH]: "Copier dans le presse-papiers",
      [Language.SPANISH]: "Copiar al portapapeles",
    },
    download: {
      [Language.ENGLISH]: "Download as text file",
      [Language.HEBREW]: "הורד כקובץ טקסט",
      [Language.ARABIC]: "تنزيل كملف نصي",
      [Language.FRENCH]: "Télécharger en tant que fichier texte",
      [Language.SPANISH]: "Descargar como archivo de texto",
    },
    clear: {
      [Language.ENGLISH]: "Clear text",
      [Language.HEBREW]: "נקה טקסט",
      [Language.ARABIC]: "مسح النص",
      [Language.FRENCH]: "Effacer le texte",
      [Language.SPANISH]: "Limpiar texto",
    },
};

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
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const blob = new Blob([bom, transcription], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcription.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setTranscription('');
  };

  const isRtl = language === Language.HEBREW || language === Language.ARABIC;

  return (
    <div className="w-full bg-gray-800 rounded-lg p-4 sm:p-6 mt-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-200">{titles[language]}</h3>
        <div className="flex space-x-2 rtl:space-x-reverse">
          <button
            onClick={handleCopy}
            disabled={!transcription}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title={tooltips.copy[language]}
          >
            {copied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5 text-gray-300" />}
          </button>
          <button
            onClick={handleDownload}
            disabled={!transcription}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title={tooltips.download[language]}
          >
            <DownloadIcon className="w-5 h-5 text-gray-300" />
          </button>
          <button
            onClick={handleClear}
            disabled={!transcription}
            className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title={tooltips.clear[language]}
          >
            <TrashIcon className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>
      <textarea
        value={transcription}
        onChange={(e) => setTranscription(e.target.value)}
        placeholder={placeholders[language]}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="w-full h-64 bg-gray-900 rounded-md p-3 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
      />
    </div>
  );
};
