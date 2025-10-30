import React from 'react';
import { Language } from '../types';

interface HeaderProps {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({ language, setLanguage }) => {
  return (
    <header className="w-full max-w-4xl mx-auto p-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
      <div className="flex items-center space-x-3 space-x-reverse">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
        </svg>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
          תמי ליל
        </h1>
      </div>
      <div className="flex items-center space-x-2 space-x-reverse bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setLanguage(Language.ENGLISH)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${language === Language.ENGLISH ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
          English
        </button>
        <button
          onClick={() => setLanguage(Language.HEBREW)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${language === Language.HEBREW ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
          עברית
        </button>
      </div>
    </header>
  );
};