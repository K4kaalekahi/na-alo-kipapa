import React, { useState, useEffect } from 'react';

export function ApiKeyGuard({ children }: { children: React.ReactNode }) {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const result = await window.aistudio.hasSelectedApiKey();
        setHasKey(result);
      } else {
        // If not in AI Studio environment, assume true or handle differently
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success to mitigate race condition
      setHasKey(true);
    }
  };

  if (hasKey === null) {
    return <div className="flex h-screen items-center justify-center bg-stone-50 text-stone-600">Loading...</div>;
  }

  if (!hasKey) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-stone-50 p-4 text-center">
        <h1 className="mb-4 text-3xl font-bold text-stone-800">API Key Required</h1>
        <p className="mb-6 text-stone-600 max-w-md text-lg">
          To use the advanced image generation and live conversation features in this Hawaiian Language Learning App, you need to select a paid Google Cloud API key with the <strong>Generative AI API</strong> enabled.
        </p>
        <button
          onClick={handleSelectKey}
          className="rounded-xl bg-emerald-600 px-8 py-4 font-semibold text-white shadow-md hover:bg-emerald-700 transition-colors"
        >
          Select API Key
        </button>
        <p className="mt-6 text-sm text-stone-500">
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-stone-700">
            Billing Documentation
          </a>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
