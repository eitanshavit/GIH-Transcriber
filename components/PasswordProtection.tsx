import React, { useState } from 'react';
import { LockClosedIcon } from './icons';

interface PasswordProtectionProps {
  onLogin: (password: string) => Promise<string | null>;
}

export const PasswordProtection: React.FC<PasswordProtectionProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const loginError = await onLogin(password);
    if (loginError) {
      setError(loginError);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 shadow-2xl rounded-2xl px-8 pt-10 pb-8 mb-4 border border-gray-700/50"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600/20 p-4 rounded-full mb-4 border border-indigo-500/30">
                <LockClosedIcon className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-100 tracking-tight">
              Access Required
            </h1>
            <p className="text-center text-sm text-gray-400 mt-2">
              Please enter the password to continue.
            </p>
          </div>
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-gray-400 text-sm font-bold mb-2 sr-only"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-gray-900 rounded-md p-3 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs italic text-center mb-4">{error}</p>
          )}

          <div className="flex items-center justify-center">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
            >
              {isLoading ? 'Verifying...' : 'Unlock'}
            </button>
          </div>
        </form>
         <p className="text-center text-gray-600 text-xs">
          This application is password protected.
        </p>
      </div>
    </div>
  );
};
