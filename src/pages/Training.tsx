import React, { useState } from 'react';
import { motion } from 'motion/react';
import { processExercises } from '../services/geminiService';
import { FileText, Loader2, UploadCloud } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export function Training() {
  const [pdfText, setPdfText] = useState('');
  const [processedSlides, setProcessedSlides] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfText.trim()) return;
    setLoading(true);
    try {
      const result = await processExercises(pdfText);
      setProcessedSlides(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-7xl mx-auto space-y-12"
    >
      <header className="mb-14">
        <h1 className="text-6xl font-black text-on-surface tracking-tighter font-headline leading-none mb-3">Training Module</h1>
        <p className="text-on-surface-variant text-xl font-serif opacity-80 italic">Transform raw exercises into structured, atmospheric learning slides.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="glass p-10 rounded-[3rem] shadow-xl border-white/40 flex flex-col glass-glow">
          <h2 className="text-3xl font-black text-on-surface mb-8 flex items-center gap-4 font-headline tracking-tight">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <UploadCloud className="w-6 h-6" />
            </div>
            Input Exercises
          </h2>
          <form onSubmit={handleProcess} className="flex-1 flex flex-col">
            <textarea
              value={pdfText}
              onChange={(e) => setPdfText(e.target.value)}
              placeholder="Paste the source text of the instructional material here..."
              className="flex-1 w-full p-8 rounded-[2rem] border border-white/60 bg-white/40 shadow-inner focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none min-h-[450px] mb-8 text-lg font-serif placeholder:text-stone-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !pdfText.trim()}
              className="w-full bg-primary text-on-primary py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-primary/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Synthesizing...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Crystalize into Slides
                </>
              )}
            </button>
          </form>
        </div>

        <div className="glass p-10 rounded-[3rem] shadow-xl border-white/40 flex flex-col glass-glow">
          <h2 className="text-3xl font-black text-on-surface mb-8 flex items-center gap-4 font-headline tracking-tight">
             <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
              <FileText className="w-6 h-6" />
            </div>
            Generated Slides
          </h2>
          <div className="flex-1 bg-white/30 backdrop-blur-xl rounded-[2rem] border border-white/40 p-10 overflow-y-auto min-h-[450px] shadow-inner custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
                <Loader2 className="w-10 h-10 animate-spin mb-6 text-primary" />
                <p className="font-bold uppercase tracking-widest text-[10px]">Analyzing Archetypes and Structure...</p>
              </div>
            ) : processedSlides ? (
              <div className="prose prose-stone max-w-none">
                <div className="markdown-body font-serif">
                  <ReactMarkdown>{processedSlides}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-on-surface-variant opacity-50">
                <FileText className="w-16 h-16 mx-auto mb-6 stroke-[1.5]" />
                <p className="text-sm font-serif italic">Input content to the left to illuminate this vessel with structured knowledge.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
