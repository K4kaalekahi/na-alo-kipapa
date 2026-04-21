import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createChatSession, generateSpeech, playAudioBase64 } from '../services/geminiService';
import { Send, Loader2, Volume2, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../utils';

const KUMU_AVATAR_URL = "https://api.dicebear.com/7.x/notionists/svg?seed=Kumu&backgroundColor=e5eef1";

export function Conversation() {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = createChatSession();
    setChatSession(session);
    
    // Initial greeting per requirements: greet in Hawaiian and offer language/culture practice
    setMessages([
      { role: 'model', text: "Aloha mai kākou! I am Kumu, your AI-powered avatar instructor. I'm here to support your journey. Would you like to practice 'ōlelo Hawai'i (Hawaiian language) today, or explore aspects of our culture?" }
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatSession) return;
    triggerHaptic('medium');

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await chatSession.sendMessage(userMessage);
      setMessages(prev => [...prev, { role: 'model', text: response.text }]);
      triggerHaptic('success');
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'E kala mai (excuse me), I encountered an error. Please try again.' }]);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (text: string) => {
    if (isSpeaking) return;
    triggerHaptic('light');
    setIsSpeaking(true);
    try {
      const audioBase64 = await generateSpeech(text);
      if (audioBase64) {
        await playAudioBase64(audioBase64);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSpeaking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full max-w-5xl mx-auto p-4 sm:p-8"
    >
      <header className="mb-8 flex items-center gap-6 bg-white/30 p-6 rounded-[2.5rem] border border-white/40 shadow-sm backdrop-blur-md">
        <div className="relative">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-emerald-100 flex-shrink-0 relative z-10">
            <img src={KUMU_AVATAR_URL} alt="Kumu Avatar" className="w-full h-full object-cover" />
          </div>
          {isSpeaking && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -inset-2 bg-emerald-400/30 rounded-full blur-md z-0"
            />
          )}
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center z-20">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-stone-800 tracking-tight flex items-center gap-2">
            Kumu
            <span className="text-sm font-medium bg-emerald-100 text-emerald-800 py-1 px-3 rounded-full mt-1">AI Instructor</span>
          </h1>
          <p className="text-stone-600 mt-1 text-lg font-serif">Refine your 'ōlelo Hawai'i through dialogue.</p>
        </div>
      </header>

      <div className="flex-1 glass rounded-[3rem] shadow-xl border-white/40 flex flex-col overflow-hidden glass-glow bg-white/20">
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 custom-scrollbar relative">
          
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-[2rem] p-5 sm:p-6 shadow-sm border ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white border-emerald-500 rounded-br-none'
                      : 'bg-white text-stone-800 border-white/60 rounded-bl-none'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {msg.role === 'model' && (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-emerald-100 shadow-sm shrink-0 bg-emerald-50">
                        <img src={KUMU_AVATAR_URL} alt="Kumu" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 pt-1">
                      <p className="whitespace-pre-wrap leading-relaxed font-body text-[1.1rem]">{msg.text}</p>
                    </div>
                    {msg.role === 'model' && (
                      <button
                        onClick={() => playAudio(msg.text)}
                        disabled={isSpeaking}
                        className="text-stone-400 hover:text-emerald-600 transition-all p-2 bg-stone-50 rounded-full hover:scale-105 active:scale-95 shrink-0 disabled:opacity-50 shadow-sm border border-stone-100"
                        title="Listen to Kumu"
                      >
                        <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white text-stone-800 rounded-[2rem] rounded-bl-none p-5 flex items-center gap-4 shadow-sm border border-white/60">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-emerald-100 shadow-sm shrink-0 bg-emerald-50">
                  <img src={KUMU_AVATAR_URL} alt="Kumu generating..." className="w-full h-full object-cover opacity-70" />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 sm:p-6 lg:p-8 border-t border-white/30 bg-white/40 backdrop-blur-xl">
          <form onSubmit={handleSend} className="relative group max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="E 'ōlelo Hawai'i pū kākou (Let's speak Hawaiian)..."
              className="w-full pl-8 pr-16 py-4 sm:py-5 rounded-[2rem] border-2 border-white/60 bg-white/70 shadow-inner focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-lg text-stone-800 placeholder:text-stone-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-emerald-600 text-white rounded-full hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-md flex items-center justify-center"
            >
              <Send className="w-5 h-5 sm:w-6 sm:h-6 ml-1" />
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
