import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { transcribeAudio, generateSpeech } from '../services/geminiService';
import { Mic, Square, Play, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils';

export function Pronunciation() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    triggerHaptic('medium');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Convert blob to base64 for Gemini
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const base64Audio = base64data.split(',')[1];
          
          setLoading(true);
          try {
            const result = await transcribeAudio(base64Audio, mimeType);
            setTranscription(result);
          } catch (error) {
            console.error(error);
          } finally {
            setLoading(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    triggerHaptic('medium');
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const reset = () => {
    triggerHaptic('light');
    setAudioUrl(null);
    setTranscription(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-5xl mx-auto space-y-12"
    >
      <header className="text-center mb-14">
        <h1 className="text-6xl font-black text-on-surface tracking-tighter font-headline leading-none mb-4">Pronunciation</h1>
        <p className="text-on-surface-variant text-xl font-serif max-w-2xl mx-auto leading-relaxed opacity-80">Refine your accent with real-time AI feedback.</p>
      </header>

      <div className="glass-card p-12 flex flex-col items-center justify-center relative overflow-hidden glass-glow">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Mic className="w-32 h-32" />
        </div>
        
        <div className="mb-12 text-center relative z-10">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.3em] mb-4">Target Phrase</p>
          <h2 className="text-6xl font-black text-on-surface font-headline tracking-tighter mb-2">Aloha kakahiaka</h2>
          <p className="text-on-surface-variant font-serif text-2xl italic opacity-70">"Good morning"</p>
        </div>

        <div className="flex items-center justify-center gap-8 mb-12 relative z-10">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-32 h-32 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xl shadow-emerald-600/40 hover:scale-110 active:scale-90 transition-all duration-500 group"
            >
              <Mic className="w-12 h-12 group-hover:rotate-12 transition-transform" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-32 h-32 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-500/40 hover:scale-110 active:scale-90 transition-all duration-500 animate-pulse"
            >
              <Square className="w-12 h-12" />
            </button>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center text-on-surface-variant relative z-10">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-600" />
            <p className="font-bold uppercase tracking-widest text-[10px]">Analyzing Vocal Resonance...</p>
          </div>
        )}

        {transcription && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white/40 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/60 shadow-xl relative z-10"
          >
            <div className="flex justify-between items-center mb-8">
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Acoustic Result:</p>
              <button 
                onClick={reset} 
                className="w-10 h-10 bg-white/60 rounded-full flex items-center justify-center text-stone-400 hover:text-emerald-600 transition-all shadow-sm"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            <p className="text-4xl font-extrabold text-stone-900 mb-10 text-center font-headline tracking-tight italic">"{transcription}"</p>
            
            {audioUrl && (
              <div className="flex justify-center mb-10">
                <audio controls src={audioUrl} className="w-full h-10 rounded-full" />
              </div>
            )}
            
            <div className={`p-6 rounded-2xl border flex items-center gap-4 ${
              transcription.toLowerCase().includes('aloha kakahiaka') 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800' 
                : 'bg-orange-500/10 border-orange-500/20 text-orange-800'
            }`}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/40 shadow-sm border border-white/60 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold uppercase tracking-wide leading-tight">
                {transcription.toLowerCase().includes('aloha kakahiaka') 
                  ? 'Maikaʻi! Your pronunciation resonates with the islands.' 
                  : 'A resilient effort. Focus on the breath between vowels.'}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
