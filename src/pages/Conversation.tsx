import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { createChatSession, generateSpeech, playAudioBase64 } from '../services/geminiService';
import { Send, Loader2, Volume2 } from 'lucide-react';
import { triggerHaptic } from '../utils';

export function Conversation() {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = createChatSession();
    setChatSession(session);
    
    // Initial greeting
    setMessages([
      { role: 'model', text: 'Aloha! I am Kumu, your Hawaiian language instructor. How can I help you practice today?' }
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
    triggerHaptic('light');
    try {
      const audioBase64 = await generateSpeech(text);
      if (audioBase64) {
        await playAudioBase64(audioBase64);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full max-w-5xl mx-auto p-8"
    >
      <header className="mb-10">
        <h1 className="text-5xl font-black text-on-surface tracking-tighter font-headline">Practice Conversation</h1>
        <p className="text-on-surface-variant mt-2 text-xl font-serif opacity-80">Refine your 'ōlelo Hawai'i through dialogue with Kumu.</p>
      </header>

      <div className="flex-1 glass rounded-[3rem] shadow-2xl border-white/40 flex flex-col overflow-hidden glass-glow">
        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-[2rem] p-6 shadow-sm border border-white/20 ${
                  msg.role === 'user'
                    ? 'bg-primary text-on-primary rounded-br-none'
                    : 'bg-white/40 backdrop-blur-md text-stone-900 rounded-bl-none'
                }`}
              >
                <div className="flex items-start gap-4">
                  {msg.role === 'model' && (
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary font-black text-sm">K</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap leading-relaxed font-body text-lg">{msg.text}</p>
                  </div>
                  {msg.role === 'model' && (
                    <button
                      onClick={() => playAudio(msg.text)}
                      className="text-primary/60 hover:text-primary transition-all p-2 bg-white/40 rounded-full hover:scale-110 shrink-0"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/40 backdrop-blur-md text-stone-900 rounded-[2rem] rounded-bl-none p-6 flex items-center gap-4 shadow-sm border border-white/20">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-black text-sm">K</span>
                </div>
                <div className="flex items-center gap-1.5 px-2">
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-8 border-t border-white/20 bg-white/20 backdrop-blur-xl">
          <form onSubmit={handleSend} className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="E 'ōlelo Hawai'i (Speak Hawaiian)..."
              className="w-full pl-8 pr-16 py-5 rounded-[2rem] border border-white/60 bg-white/40 shadow-inner focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all text-lg placeholder:text-stone-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-on-primary rounded-full hover:scale-110 active:scale-90 transition-all disabled:opacity-50 shadow-lg flex items-center justify-center shadow-primary/30"
            >
              <Send className="w-6 h-6" />
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
