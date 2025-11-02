import React from 'react';
import { Language } from '../types';

interface AudioPlayerProps {
  src: string;
  fileName: string;
  language: Language;
}

const translations = {
  preview: {
    [Language.ENGLISH]: 'Audio Preview',
    [Language.HEBREW]: 'תצוגה מקדימה',
    [Language.ARABIC]: 'معاينة الصوت',
    [Language.FRENCH]: 'Aperçu Audio',
    [Language.SPANISH]: 'Vista Previa de Audio',
  },
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, fileName, language }) => {
  return (
    <div className="w-full bg-gray-800 rounded-lg p-4 sm:p-5 mt-6">
      <div className="flex flex-col">
        <p className="text-sm font-medium text-gray-300 mb-2">
            {translations.preview[language]}: <span className="font-normal text-gray-400 truncate" dir="ltr">{fileName}</span>
        </p>
        <audio controls src={src} className="w-full rounded-md" key={src}>
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
};
