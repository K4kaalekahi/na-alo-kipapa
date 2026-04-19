import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, Trophy, Star, BookOpen, MessageCircle, Loader2, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { getUserProgress, UserProgress, initializeProgress } from '../services/progressService';
import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { triggerHaptic } from '../utils';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [wordsCount, setWordsCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlayingWotd, setIsPlayingWotd] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Initialize progress if it doesn't exist
        await initializeProgress(user.uid, user.displayName || undefined, user.photoURL || undefined);
        
        // Fetch progress
        const userProgress = await getUserProgress(user.uid);
        setProgress(userProgress);

        // Fetch saved words count and due count
        const q = query(collection(db, 'savedWords'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        setWordsCount(snapshot.size);
        
        const now = new Date();
        const due = snapshot.docs.filter(doc => {
          const data = doc.data();
          if (!data.nextReview) return true;
          const nextReview = data.nextReview instanceof Timestamp ? data.nextReview.toDate() : new Date(data.nextReview);
          return nextReview <= now;
        }).length;
        setDueCount(due);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const playWotd = () => {
    if (isPlayingWotd) return;
    triggerHaptic('light');
    setIsPlayingWotd(true);
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audio.play();
    setTimeout(() => setIsPlayingWotd(false), 1500);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-7xl mx-auto space-y-12"
    >
      <header className="mb-14">
        <h1 className="text-6xl font-black text-on-surface tracking-tighter font-headline leading-none mb-3">
          Aloha e {user?.displayName?.split(' ')[0] || 'Learner'}!
        </h1>
        <p className="text-on-surface-variant text-xl font-serif opacity-80 italic">The tides of wisdom are rising. Continue your journey.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-14">
        <div className="glass p-8 rounded-3xl shadow-xl flex items-center gap-5 glass-glow border-white/60">
          <div className="bg-orange-500/10 p-4 rounded-2xl text-orange-600 border border-orange-500/20">
            <Flame className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">Cycle Streak</p>
            <p className="text-3xl font-black text-on-surface tracking-tight leading-none">{progress?.streak || 0} Lā</p>
          </div>
        </div>
        <div className="glass p-8 rounded-3xl shadow-xl flex items-center gap-5 glass-glow border-white/60 text-emerald-700">
          <div className="bg-emerald-500/10 p-4 rounded-2xl text-emerald-600 border border-emerald-500/20">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">Words Sown</p>
            <p className="text-3xl font-black text-on-surface tracking-tight leading-none">{wordsCount}</p>
          </div>
        </div>
        <div className="glass p-8 rounded-3xl shadow-xl flex items-center gap-5 glass-glow border-white/60 text-blue-700">
          <div className="bg-blue-500/10 p-4 rounded-2xl text-blue-600 border border-blue-500/20">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">Fluency Tide</p>
            <p className="text-3xl font-black text-on-surface tracking-tight leading-none">{Math.min(100, Math.floor(wordsCount / 2))}%</p>
          </div>
        </div>
        <div className="glass p-8 rounded-3xl shadow-xl flex items-center gap-5 glass-glow border-white/60 text-purple-700">
          <div className="bg-primary/10 p-4 rounded-2xl text-primary border border-primary/20">
            <Star className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">Mana Points</p>
            <p className="text-3xl font-black text-on-surface tracking-tight leading-none">{progress?.points || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
               <Calendar className="w-5 h-5" />
             </div>
             <h2 className="text-3xl font-black text-on-surface font-headline tracking-tight">Today's Communion</h2>
          </div>
          
          {/* Word of the Day */}
          <div className="glass-card p-12 flex flex-col md:flex-row justify-between items-center group relative overflow-hidden glass-glow border-white/80">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-all duration-1000 group-hover:scale-150 group-hover:rotate-12">
              <Sparkles className="w-48 h-48" />
            </div>
            <div className="relative z-10 text-center md:text-left mb-8 md:mb-0">
              <p className="text-[11px] font-black uppercase tracking-[0.5em] text-primary mb-6">Celestial Word</p>
              <h3 className="font-headline text-7xl font-black text-on-surface mb-4 tracking-tighter leading-none">Ho'omau</h3>
              <p className="text-on-surface-variant italic text-3xl font-serif opacity-70">"to persevere, persist, or continue"</p>
            </div>
            <button 
              onClick={playWotd}
              className={`h-28 w-28 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 group-hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)] shadow-2xl ${
                isPlayingWotd 
                  ? 'bg-primary text-on-primary scale-110' 
                  : 'glass text-primary hover:bg-white/80'
              }`}
            >
              <span className="material-symbols-outlined !text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isPlayingWotd ? 'graphic_eq' : 'volume_up'}
              </span>
            </button>
          </div>

          {dueCount > 0 && (
            <div className="bg-primary p-12 rounded-[3.5rem] shadow-[0_20px_60px_rgba(var(--primary-rgb),0.3)] text-on-primary flex flex-col sm:flex-row justify-between items-center gap-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-6 text-center sm:text-left relative z-10">
                <div className="bg-white/20 p-5 rounded-2xl backdrop-blur-md border border-white/20">
                  <Calendar className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-black text-3xl font-headline tracking-tighter">Memory Rekindling</h3>
                  <p className="opacity-90 font-serif italic text-lg">{dueCount} word vessels await your attention.</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/vocabulary')}
                className="bg-white text-primary px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl active:scale-95 relative z-10"
              >
                Restore Focus
              </button>
            </div>
          )}

          {/* Moolelo Story Time */}
          <div 
            onClick={() => {
              triggerHaptic('medium');
              navigate('/moolelo');
            }}
            className="group cursor-pointer"
          >
            <div className="bg-stone-900/90 backdrop-blur-3xl p-12 rounded-[3.5rem] flex flex-col sm:flex-row justify-between items-center gap-10 hover:bg-black transition-all duration-700 shadow-2xl border border-white/5">
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-6">
                  <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
                  <p className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-400">Oral Traditions</p>
                </div>
                <h3 className="font-headline text-5xl font-black text-white mb-4 tracking-tighter">Mo‘olelo Story Time</h3>
                <p className="text-stone-400 max-w-sm text-lg font-serif italic opacity-70">Step into the legendary world of spirits and ancestors with Tūtū.</p>
              </div>
              <div className="w-32 h-32 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-[0_0_60px_rgba(5,150,105,0.4)] group-hover:scale-110 group-hover:bg-emerald-500 transition-all duration-700">
                 <BookOpen className="w-14 h-14" />
              </div>
            </div>
          </div>

          <div className="glass rounded-[3.5rem] overflow-hidden border-white/60 shadow-2xl glass-glow">
            <div className="p-12 border-b border-black/5 flex flex-col sm:flex-row justify-between items-center gap-10">
              <div className="text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 mb-4">ACTIVE LESSON</p>
                <h3 className="font-black text-4xl text-on-surface font-headline tracking-tighter leading-tight">Unit 3: Ohana & Guardians</h3>
                <p className="text-on-surface-variant text-lg font-serif italic opacity-70 mt-2">Speak of bloodlines and those who protect your spirit.</p>
              </div>
              <button 
                onClick={() => navigate('/culture')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl active:scale-95"
              >
                Step Into the Flow
              </button>
            </div>
            <div className="p-12 bg-white/10 space-y-8">
              <div className="flex items-center gap-6 group hover:translate-x-2 transition-transform">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-black text-sm border border-emerald-500/20 shadow-inner">1</div>
                <p className="text-on-surface font-black font-serif text-xl tracking-tight">Ancestral Lexicon (5 min)</p>
              </div>
              <div className="flex items-center gap-6 group hover:translate-x-2 transition-transform">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-black text-sm border border-emerald-500/20 shadow-inner">2</div>
                <p className="text-on-surface font-black font-serif text-xl tracking-tight">Wisdom of the Ohana (10 min)</p>
              </div>
              <div className="flex items-center gap-6 opacity-40 group hover:translate-x-2 transition-transform">
                <div className="w-12 h-12 rounded-2xl bg-white/40 text-stone-400 flex items-center justify-center font-black text-sm border border-white/60">3</div>
                <p className="text-on-surface font-black font-serif text-xl tracking-tight">Communal Exchange (15 min)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-600">
               <Trophy className="w-5 h-5" />
             </div>
             <h2 className="text-3xl font-black text-on-surface font-headline tracking-tight">Ancient Seals</h2>
          </div>
          
          <div className="glass p-10 rounded-[3.5rem] shadow-2xl border-white/60 glass-glow min-h-[500px]">
            {progress?.badges && progress.badges.length > 0 ? (
              <div className="grid grid-cols-2 gap-6">
                {progress.badges.map((badge, idx) => (
                  <motion.div 
                    key={idx} 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="flex flex-col items-center p-6 bg-white/40 rounded-[2rem] border border-white/80 shadow-inner text-center group"
                  >
                    <div className="bg-yellow-400/20 p-4 rounded-full text-yellow-700 mb-4 border border-yellow-200 group-hover:bg-yellow-400 group-hover:text-white transition-all duration-500">
                      <Star className="w-8 h-8 fill-yellow-400" />
                    </div>
                    <p className="font-black text-on-surface text-[10px] uppercase tracking-[0.2em] leading-tight">{badge}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-stone-400 py-12 px-4">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8 border border-white/40 shadow-inner">
                  <Trophy className="w-10 h-10 opacity-20" />
                </div>
                <p className="text-lg font-serif italic italic opacity-60">Complete sessions to forge your first cultural seal.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
