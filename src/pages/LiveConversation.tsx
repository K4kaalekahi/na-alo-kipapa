import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Loader2, StopCircle } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { useAuth } from '../components/AuthContext';
import { addPoints, updateStreak } from '../services/progressService';

export function LiveConversation() {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  
  useEffect(() => {
    if (user) updateStreak(user.uid);
  }, [user]);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const connectLiveAPI = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: async () => {
            setIsConnecting(false);
            setIsRecording(true);
            
            // Setup Audio Recording
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
            processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
              }
              
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
            
            source.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
               playAudioBase64(base64Audio);
            }
            
            // Handle Transcripts if enabled
          },
          onclose: () => {
            stopRecording();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError(err.message || "A connection error occurred.");
            stopRecording();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "Aloha mai! You are Kumu, a friendly and interactive Hawaiian AI avatar instructor. Your very first response must greet the user in Hawaiian, introduce yourself as Kumu, and offer to help them practice 'ōlelo Hawai'i (the language) or explore Hawaiian culture. Keep your responses brief and highly conversational.",
        },
      });
      
      sessionRef.current = sessionPromise;
      
    } catch (error) {
      console.error(error);
      setIsConnecting(false);
    }
  };

  const playAudioBase64 = (base64Data: string) => {
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    } catch (error) {
      console.error("Failed to play audio:", error);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsConnecting(false);
    
    if (user) addPoints(user.uid, 50); // 50 points for a conversation session
    
    if (processorRef.current && audioContextRef.current) {
      processorRef.current.disconnect();
      audioContextRef.current.close();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close());
      sessionRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[85vh] space-y-12"
    >
      <header className="text-center mb-6">
        <h1 className="text-5xl sm:text-6xl font-black text-on-surface tracking-tighter font-headline leading-none mb-4">Live Session</h1>
        <p className="text-on-surface-variant text-lg sm:text-xl font-serif max-w-2xl mx-auto leading-relaxed opacity-80 italic">Have a real-time vocal conversation with Kumu.</p>
      </header>

      <div className="glass-card p-10 sm:p-16 rounded-[4rem] flex flex-col items-center justify-center w-full max-w-2xl relative overflow-hidden glass-glow">
        {/* Animated ambient pulses when recording */}
        {isRecording && (
          <div className="absolute inset-0 pointer-events-none">
            <motion.div 
              animate={{ scale: [1, 2, 1], opacity: [0.1, 0.4, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-emerald-500/20 rounded-full blur-[100px]"
            />
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute inset-20 bg-emerald-400/30 rounded-full blur-[80px]"
            />
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center gap-10">
          
          <div className="relative">
            <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white shadow-xl transition-all duration-500 bg-emerald-100 ${isRecording ? 'scale-110 shadow-emerald-500/40 ring-8 ring-emerald-500/20' : ''}`}>
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Kumu&backgroundColor=e5eef1" alt="Kumu Avatar" className="w-full h-full object-cover" />
            </div>
            
            {/* The microphone button sits overlapping the bottom of the avatar */}
            <button
              onClick={isRecording ? stopRecording : connectLiveAPI}
              disabled={isConnecting}
              className={`absolute -bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg group ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/40 animate-pulse' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/40'
              } ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95'}`}
            >
              {isConnecting ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : isRecording ? (
                <StopCircle className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8 group-hover:rotate-12 transition-transform" />
              )}
            </button>
          </div>
          
          <div className="text-center space-y-2 mt-4">
            <p className="text-2xl sm:text-3xl font-black text-stone-800 font-headline tracking-tight">
              {isConnecting ? 'Connecting to Kumu...' : isRecording ? 'Kumu is listening' : 'Start Conversation'}
            </p>
            <p className="text-stone-600 text-base font-serif opacity-80">
              {isConnecting ? 'Please wait...' : isRecording ? 'Speak clearly into your microphone.' : 'Tap the microphone to speak with your AI instructor.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-10 p-5 bg-red-50 border border-red-200 rounded-[2rem] text-red-800 text-sm max-w-lg text-center backdrop-blur-3xl relative z-10 font-medium">
            {error}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3 text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.2em]">
        <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
        AI Avatar Instructor Online
      </div>
    </motion.div>
  );
}
