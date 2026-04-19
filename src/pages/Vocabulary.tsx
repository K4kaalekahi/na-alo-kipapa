import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getFastTranslation, generateSpeech, playAudioBase64, handleGeminiError } from '../services/geminiService';
import { Volume2, Search, Loader2, Bookmark, BookmarkCheck, Trash2, Calendar, CheckCircle2, XCircle, AlertCircle, Star, Trophy, Flame, TrendingUp } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '../components/AuthContext';
import { addPoints, updateStreak, getUserProgress, getAllUserProgress, UserProgress, initializeProgress } from '../services/progressService';
import { updateWordSRS } from '../services/srsService';
import { triggerHaptic } from '../utils';

export function Vocabulary() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [translation, setTranslation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [savedWords, setSavedWords] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userStats, setUserStats] = useState<UserProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserProgress[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Initialize/Update progress
    initializeProgress(user.uid, user.displayName || undefined, user.photoURL || undefined);
    updateStreak(user.uid);
    
    // Fetch stats
    const fetchStats = async () => {
      const stats = await getUserProgress(user.uid);
      setUserStats(stats);
      const topUsers = await getAllUserProgress(5);
      setLeaderboard(topUsers);
    };
    fetchStats();

    const q = query(
      collection(db, 'savedWords'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const words = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedWords(words);
    }, (error) => {
      console.error("Error fetching saved words:", error);
    });
    
    return () => unsubscribe();
  }, [user]);

  const dueWords = savedWords.filter(word => {
    if (!word.nextReview) return true;
    const nextReview = word.nextReview instanceof Timestamp ? word.nextReview.toDate() : new Date(word.nextReview);
    return nextReview <= new Date();
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    triggerHaptic('medium');
    
    setLoading(true);
    setError(null);
    try {
      const result = await getFastTranslation(searchQuery);
      setTranslation(result);
      if (user) await addPoints(user.uid, 2); // 2 points for exploring
      triggerHaptic('success');
    } catch (error) {
      console.error(error);
      setError(handleGeminiError(error));
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (text: string) => {
    if (!text) return;
    triggerHaptic('light');
    setAudioLoading(true);
    setError(null);
    try {
      const audioBase64 = await generateSpeech(text);
      if (audioBase64) {
        await playAudioBase64(audioBase64);
        if (user) await addPoints(user.uid, 5); // 5 points for practicing pronunciation
      }
    } catch (error) {
      console.error(error);
      setError(handleGeminiError(error));
    } finally {
      setAudioLoading(false);
    }
  };

  const handleSaveWord = async () => {
    if (!user || !translation) return;
    triggerHaptic('medium');
    setSaving(true);
    try {
      await addDoc(collection(db, 'savedWords'), {
        userId: user.uid,
        hawaiian: translation.hawaiian,
        english: translation.english,
        pronunciation: translation.pronunciation || '',
        createdAt: Timestamp.now(),
        nextReview: Timestamp.now(), // Due immediately
        interval: 0,
        easeFactor: 2.5,
        repetition: 0
      });
      await addPoints(user.uid, 10); // 10 points for saving a word
      triggerHaptic('success');
    } catch (error) {
      console.error("Error saving word:", error);
      triggerHaptic('error');
    } finally {
      setSaving(false);
    }
  };

  const handleRateWord = async (quality: number) => {
    if (!user || dueWords.length === 0) return;
    triggerHaptic('medium');
    const word = dueWords[currentReviewIndex];
    
    try {
      await updateWordSRS(
        word.id,
        quality,
        word.repetition || 0,
        word.interval || 0,
        word.easeFactor || 2.5
      );
      
      await addPoints(user.uid, quality * 2); // Bonus points for high quality ratings
      
      if (currentReviewIndex < dueWords.length - 1) {
        setCurrentReviewIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        triggerHaptic('success');
        setReviewMode(false);
        setCurrentReviewIndex(0);
        setShowAnswer(false);
      }
    } catch (error) {
      console.error("Error updating SRS:", error);
    }
  };

  const handleDeleteWord = async (id: string) => {
    triggerHaptic('medium');
    try {
      await deleteDoc(doc(db, 'savedWords', id));
      triggerHaptic('success');
    } catch (error) {
      console.error("Error deleting word:", error);
      triggerHaptic('error');
    }
  };

  const isWordSaved = translation && savedWords.some(w => w.hawaiian.toLowerCase() === translation.hawaiian.toLowerCase());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12"
    >
      <div className="lg:col-span-2 space-y-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-12">
          <div>
            <h1 className="text-6xl font-black text-on-surface tracking-tighter font-headline leading-none mb-3">Vocabulary</h1>
            <p className="text-on-surface-variant text-xl font-serif opacity-80 italic">Illuminate new words and practice their vocal resonance.</p>
          </div>
          {dueWords.length > 0 && (
            <button
              onClick={() => {
                triggerHaptic('medium');
                setReviewMode(!reviewMode);
              }}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl ${
                reviewMode 
                  ? 'bg-stone-900 text-white scale-105' 
                  : 'glass text-primary hover:bg-white/60'
              }`}
            >
              <Calendar className="w-5 h-5" />
              {reviewMode ? 'Exit Review' : `Review Due (${dueWords.length})`}
            </button>
          )}
        </header>

        <AnimatePresence mode="wait">
          {reviewMode ? (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass p-16 rounded-[4rem] shadow-2xl border-white/60 text-center min-h-[500px] flex flex-col justify-center glass-glow"
            >
              <p className="text-stone-400 font-black uppercase tracking-[0.4em] text-[10px] mb-10">Session Transit {currentReviewIndex + 1} of {dueWords.length}</p>
              
              <h2 className="text-7xl font-black text-on-surface mb-6 font-headline tracking-tighter leading-none">{dueWords[currentReviewIndex].hawaiian}</h2>
              {dueWords[currentReviewIndex].pronunciation && (
                <p className="text-primary/60 font-mono text-2xl mb-12">[{dueWords[currentReviewIndex].pronunciation}]</p>
              )}

              <div className="flex justify-center gap-6 mb-14">
                <button
                  onClick={() => playAudio(dueWords[currentReviewIndex].hawaiian)}
                  className="w-20 h-20 bg-primary/10 text-primary rounded-full hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-lg border border-primary/20"
                >
                  <Volume2 className="w-10 h-10" />
                </button>
              </div>

              {!showAnswer ? (
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    setShowAnswer(true);
                  }}
                  className="bg-stone-900 text-white px-14 py-6 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-black/20 mx-auto"
                >
                  unveil mana
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-12"
                >
                  <p className="text-5xl text-stone-700 font-serif italic tracking-tight">"{dueWords[currentReviewIndex].english}"</p>
                  
                  <div className="space-y-6">
                    <p className="text-stone-400 font-black uppercase tracking-widest text-[10px]">Assess Resonance</p>
                    <div className="flex justify-center gap-4">
                      {[
                        { val: 1, label: 'Lost', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
                        { val: 3, label: 'Faint', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                        { val: 4, label: 'Clear', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { val: 5, label: 'Radiant', icon: Star, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                      ].map((rating) => (
                        <button
                          key={rating.val}
                          onClick={() => handleRateWord(rating.val)}
                          className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border border-transparent hover:border-white/60 transition-all ${rating.bg} group w-24`}
                        >
                          <rating.icon className={`w-8 h-8 ${rating.color} group-hover:scale-125 transition-transform duration-500`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${rating.color}`}>{rating.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <form onSubmit={handleSearch} className="">
                <div className="relative group">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Illuminate an English word..."
                    className="w-full pl-16 pr-10 py-6 rounded-[2.5rem] border border-white/60 bg-white/40 glass backdrop-blur-xl shadow-inner focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xl font-serif italic placeholder:text-stone-400 transition-all"
                  />
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400 w-6 h-6 group-focus-within:text-primary transition-colors" />
                  <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-stone-900 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Invoke'}
                  </button>
                </div>
                {error && (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="mt-4 text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ml-6"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.p>
                )}
              </form>

              {translation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass p-12 rounded-[3.5rem] shadow-2xl border-white/60 glass-glow relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-12">
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">HAWAIIAN CRYSTALIZATION</p>
                      <h2 className="text-7xl font-black text-on-surface font-headline tracking-tighter leading-none">{translation.hawaiian}</h2>
                      {translation.pronunciation && (
                        <p className="text-primary/60 mt-4 font-mono text-2xl tracking-tight">[{translation.pronunciation}]</p>
                      )}
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={handleSaveWord}
                        disabled={saving || isWordSaved}
                        className={`w-16 h-16 rounded-3xl transition-all shadow-lg flex items-center justify-center ${
                          isWordSaved 
                            ? 'bg-primary text-on-primary' 
                            : 'bg-white/40 text-primary hover:bg-white/60 border border-white/80'
                        } disabled:opacity-50`}
                        title={isWordSaved ? "Saved" : "Save Word"}
                      >
                        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : isWordSaved ? <BookmarkCheck className="w-8 h-8" /> : <Bookmark className="w-8 h-8" />}
                      </button>
                      <button
                        onClick={() => playAudio(translation.hawaiian)}
                        disabled={audioLoading}
                        className="w-16 h-16 bg-primary/10 text-primary rounded-3xl hover:bg-primary/20 transition-all border border-primary/20 flex items-center justify-center shadow-md shadow-primary/10"
                      >
                        {audioLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Volume2 className="w-8 h-8" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-12">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-4">ENGLISH RESONANCE</p>
                    <p className="text-3xl font-serif text-stone-700 italic">"{translation.english}"</p>
                  </div>

                  <div className="bg-white/20 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/60 shadow-inner">
                    <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-6 border-b border-black/5 pb-3">CONTEXTUAL USAGE</p>
                    <div className="space-y-6">
                      <div className="flex items-start gap-5">
                        <button
                          onClick={() => playAudio(translation.exampleHawaiian)}
                          className="w-12 h-12 bg-white/60 text-stone-500 rounded-2xl flex items-center justify-center shadow-sm hover:text-primary transition-all shrink-0"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                        <div>
                          <p className="text-2xl font-bold text-stone-900 leading-tight mb-2">{translation.exampleHawaiian}</p>
                          <p className="text-stone-500 font-serif italic text-lg leading-snug">{translation.exampleEnglish}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-10">
        <div className="sticky top-10 space-y-10">
          {/* Progress Card */}
          <div className="glass p-8 rounded-[2.5rem] shadow-xl border-white/40 space-y-6 glass-glow">
            <h2 className="text-2xl font-black text-on-surface flex items-center gap-3 font-headline tracking-tight">
              <TrendingUp className="w-6 h-6 text-primary" />
              Progress Spark
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-500/10 p-5 rounded-[2rem] border border-orange-500/20 flex flex-col items-center justify-center">
                <Flame className="w-8 h-8 text-orange-600 mb-2" />
                <p className="text-3xl font-black text-stone-900 leading-none">{userStats?.streak || 0}</p>
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-2">Streak</p>
              </div>
              <div className="bg-primary/10 p-5 rounded-[2rem] border border-primary/20 flex flex-col items-center justify-center">
                <Star className="w-8 h-8 text-primary mb-2" />
                <p className="text-3xl font-black text-stone-900 leading-none">{userStats?.points || 0}</p>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-2">Mana</p>
              </div>
            </div>
          </div>

          {/* Leaderboard Card */}
          <div className="glass p-8 rounded-[2.5rem] shadow-xl border-white/40 space-y-6 glass-glow">
            <h2 className="text-2xl font-black text-on-surface flex items-center gap-3 font-headline tracking-tight">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Circle of Elders
            </h2>
            <div className="space-y-4">
              {leaderboard.map((leader, idx) => (
                <div key={leader.userId} className="flex items-center justify-between p-3 rounded-2xl bg-white/30 border border-white/40">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black shadow-sm ${
                      idx === 0 ? 'bg-yellow-400 text-white' : 
                      idx === 1 ? 'bg-stone-300 text-white' : 
                      idx === 2 ? 'bg-amber-600 text-white' : 
                      'bg-white/40 text-stone-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-black text-stone-900 leading-tight">{leader.displayName || 'Learner'}</p>
                      <p className="text-[10px] text-stone-500 font-black uppercase tracking-widest opacity-60">{leader.streak || 0} Day Cycle</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-primary">
                    {leader.points}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Words Card */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
               <Bookmark className="w-6 h-6 text-primary" />
               <h2 className="text-2xl font-black text-on-surface font-headline tracking-tight">Saved Memory</h2>
            </div>
            <div className="glass p-6 rounded-[2.5rem] shadow-xl border-white/40 max-h-[40vh] overflow-y-auto custom-scrollbar glass-glow">
              {savedWords.length === 0 ? (
                <div className="text-center text-stone-400 py-12 px-6">
                  <Bookmark className="w-16 h-16 mx-auto mb-6 opacity-20" />
                  <p className="text-sm font-serif italic">Your vessel is empty. Fill it with the wisdom of words.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {savedWords.map((word) => {
                    const isDue = word.nextReview && (word.nextReview instanceof Timestamp ? word.nextReview.toDate() : new Date(word.nextReview)) <= new Date();
                    return (
                      <li key={word.id} className={`p-6 rounded-[2rem] border transition-all flex justify-between items-center group relative overflow-hidden ${
                        isDue ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/40 border-white/60'
                      }`}>
                        {isDue && <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/10 blur-[20px]" />}
                        <div className="relative z-10">
                          <div className="flex items-center gap-3">
                            <p className="font-black text-stone-900 text-xl font-headline tracking-tight leading-none">{word.hawaiian}</p>
                            {isDue && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />}
                          </div>
                          <p className="text-stone-500 text-sm font-serif italic mt-1 leading-none">{word.english}</p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity relative z-10">
                          <button
                            onClick={() => playAudio(word.hawaiian)}
                            className="w-10 h-10 bg-white/60 rounded-full flex items-center justify-center text-stone-400 hover:text-primary transition-all shadow-sm"
                          >
                            <Volume2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWord(word.id)}
                            className="w-10 h-10 bg-white/60 rounded-full flex items-center justify-center text-stone-400 hover:text-red-600 transition-all shadow-sm"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
