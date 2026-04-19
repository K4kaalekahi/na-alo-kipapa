import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { generateCulturalImage, searchCulturalEvents, generateSpeech, playAudioBase64, handleGeminiError } from '../services/geminiService';
import { Image as ImageIcon, Search, Loader2, Calendar, BookOpen, Volume2, Quote, GraduationCap, CheckCircle2, XCircle, ArrowRight, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../components/AuthContext';
import { addPoints } from '../services/progressService';
import { db } from '../firebase';
import { collection, getDocs, query, setDoc, doc, where } from 'firebase/firestore';
import { LessonView } from '../components/LessonView';
import { triggerHaptic } from '../utils';

interface CulturalContent {
  id: string;
  title: string;
  hawaiian: string;
  english: string;
  explanation: string;
  type: 'proverb' | 'story';
  isPublic: boolean;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface CultureLesson {
  contentId: string;
  questions: QuizQuestion[];
  isPublic: boolean;
}

const culturalContents: CulturalContent[] = [
  {
    id: 'proverb-1',
    title: 'Knowledge',
    hawaiian: 'ʻAʻohe pau ka ʻike i ka hālau hoʻokahi.',
    english: 'All knowledge is not taught in the same school.',
    explanation: 'This proverb reminds us that one can learn from many sources and that no single person or place has all the answers.',
    type: 'proverb',
    isPublic: true
  },
  {
    id: 'proverb-2',
    title: 'The Land',
    hawaiian: 'He aliʻi ka ʻāina; he kauwā ke kanaka.',
    english: 'The land is a chief; man is its servant.',
    explanation: 'A fundamental Hawaiian value (aloha ʻāina) expressing that humans must care for the land that sustains them, just as a servant cares for a chief.',
    type: 'proverb',
    isPublic: true
  },
  {
    id: 'story-1',
    title: 'The Legend of Naupaka',
    hawaiian: 'ʻO ka pua naupaka, he hōʻailona ia no ke aloha kaumaha.',
    english: 'The naupaka flower is a symbol of a sad love.',
    explanation: 'Legend tells of two lovers, Princess Naupaka and a commoner named Kaui, who were forbidden to marry. They tore a naupaka flower in half; one half stays by the sea, and the other in the mountains, forever separated but always longing for each other.',
    type: 'story',
    isPublic: true
  },
  {
    id: 'story-2',
    title: 'Maui and the Sun',
    hawaiian: 'Ua hihia ʻo Maui i ka lā i mea e lohi ai kona hele ʻana.',
    english: 'Maui snared the sun to make its passage slower.',
    explanation: 'The demigod Maui noticed the sun moved too quickly across the sky, leaving little time for crops to grow or kapa to dry. He climbed Haleakalā and snared the sun with a rope made from his mother\'s hair, forcing it to move slower for half the year.',
    type: 'story',
    isPublic: true
  }
];

const initialLessons: CultureLesson[] = [
  {
    contentId: 'proverb-1',
    questions: [
      {
        question: "What is the core message of this proverb?",
        options: [
          "Schools are the only place to learn",
          "Knowledge comes from many different sources",
          "One teacher knows everything",
          "Learning should be finished quickly"
        ],
        correctAnswer: 1
      }
    ],
    isPublic: true
  },
  {
    contentId: 'proverb-2',
    questions: [
      {
        question: "What does 'Aloha ʻĀina' mean in the context of this proverb?",
        options: [
          "Owning as much land as possible",
          "The land serves the people",
          "Love and care for the land that sustains us",
          "Only chiefs can own land"
        ],
        correctAnswer: 2
      }
    ],
    isPublic: true
  },
  {
    contentId: 'story-1',
    questions: [
      {
        question: "Why is the Naupaka flower separated into two halves?",
        options: [
          "It was a natural mutation",
          "To represent two lovers who were forbidden to marry",
          "Because of a great storm",
          "To show the difference between sea and mountains"
        ],
        correctAnswer: 1
      }
    ],
    isPublic: true
  },
  {
    contentId: 'story-2',
    questions: [
      {
        question: "Why did Maui snare the sun?",
        options: [
          "To make it shine brighter",
          "To stop it from shining",
          "To make the days longer for crops and work",
          "To prove he was stronger than the sun"
        ],
        correctAnswer: 2
      }
    ],
    isPublic: true
  }
];

export function Culture() {
  const { user } = useAuth();
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);

  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [lessons, setLessons] = useState<CultureLesson[]>([]);

  useEffect(() => {
    const seedAndFetchLessons = async () => {
      try {
        const q = query(
          collection(db, 'cultureLessons'),
          where('isPublic', '==', true)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          // Only admin should seed, but if it's empty we'll show initial anyway
          setLessons(initialLessons);
        } else {
          const items = snapshot.docs.map(d => d.data() as CultureLesson);
          setLessons(items.length > 0 ? items : initialLessons);
        }
      } catch (error) {
        console.error("Error with lessons:", error);
        setLessons(initialLessons);
      }
    };
    seedAndFetchLessons();
  }, []);

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim()) return;
    triggerHaptic('medium');
    setImageLoading(true);
    setImageError(null);
    try {
      const result = await generateCulturalImage(imagePrompt, '1K');
      if (result) {
        setGeneratedImage(result);
        triggerHaptic('success');
      } else {
        setImageError("Failed to generate image. Please try again.");
        triggerHaptic('error');
      }
    } catch (error: any) {
      console.error(error);
      setImageError(handleGeminiError(error));
      triggerHaptic('error');
    } finally {
      setImageLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    triggerHaptic('medium');
    setSearchLoading(true);
    setSearchError(null);
    try {
      const result = await searchCulturalEvents(searchQuery);
      setSearchResults(result);
      triggerHaptic('success');
    } catch (error) {
      console.error(error);
      setSearchError(handleGeminiError(error));
      triggerHaptic('error');
    } finally {
      setSearchLoading(false);
    }
  };

  const playAudio = async (id: string, text: string) => {
    triggerHaptic('light');
    setAudioLoadingId(id);
    try {
      const audioBase64 = await generateSpeech(text);
      if (audioBase64) {
        await playAudioBase64(audioBase64);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAudioLoadingId(null);
    }
  };

  const startQuiz = (contentId: string) => {
    triggerHaptic('medium');
    console.log("Starting quiz for:", contentId);
    setActiveQuizId(contentId);
    setQuizFinished(false);
    setQuizScore(0);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
  };

  const handleOptionSelect = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    const lesson = lessons.find(l => l.contentId === activeQuizId);
    if (lesson && idx === lesson.questions[currentQuestionIdx].correctAnswer) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleFinishQuiz = async (finalScore: number) => {
    setQuizScore(finalScore);
    setQuizFinished(true);
    if (user) {
      const points = finalScore * 50;
      await addPoints(user.uid, points);
    }
  };

  const activeLesson = lessons.find(l => l.contentId === activeQuizId);
  const activeContent = culturalContents.find(c => c.id === activeQuizId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-6xl mx-auto space-y-12"
    >
      <header className="mb-14">
        <div className="flex items-center gap-3 mb-3">
          <GraduationCap className="text-primary w-8 h-8" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/70">Cultural Academy</span>
        </div>
        <h1 className="text-6xl font-black text-on-surface tracking-tighter font-headline leading-none mb-4">Cultural Context</h1>
        <p className="text-on-surface-variant text-xl font-serif max-w-2xl leading-relaxed opacity-80">Explore the heartbeat of the islands through moʻolelo (stories), ʻōlelo noʻeau (proverbs), and historical insights.</p>
      </header>

      {/* Stories & Proverbs Section */}
      <section>
        <h2 className="text-3xl font-bold text-on-surface mb-10 flex items-center gap-4 font-headline tracking-tight">
          <span className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
            <BookOpen className="text-primary w-5 h-5" />
          </span>
          Oral Traditions & Wisdom
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {culturalContents.map((content) => (
            <motion.div
              key={content.id}
              whileHover={{ y: -8, scale: 1.01 }}
              className="glass p-10 rounded-[2.5rem] ambient-shadow flex flex-col h-full border-white/40 group transition-all duration-500"
            >
              <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/40 rounded-full flex items-center justify-center text-primary shadow-sm border border-white/60">
                    {content.type === 'proverb' ? <Quote className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80 bg-white/40 px-3 py-1 rounded-full border border-white/60">{content.type}</span>
                </div>
                <button
                  onClick={() => playAudio(content.id, content.hawaiian)}
                  disabled={audioLoadingId === content.id}
                  className="w-14 h-14 bg-primary text-on-primary rounded-full hover:scale-110 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-primary/30 flex items-center justify-center"
                >
                  {audioLoadingId === content.id ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Volume2 className="w-6 h-6" />
                  )}
                </button>
              </div>
              
              <h3 className="text-4xl font-extrabold text-on-surface mb-6 font-headline leading-[1.1] tracking-tighter">
                {content.hawaiian}
              </h3>
              
              <p className="text-2xl text-on-surface-variant italic mb-10 font-serif leading-relaxed opacity-90">
                "{content.english}"
              </p>
              
              <div className="mt-auto pt-10 border-t border-white/20 space-y-8">
                <p className="text-on-surface-variant leading-relaxed font-body tracking-tight opacity-80">
                  {content.explanation}
                </p>
                
                <button
                  onClick={() => startQuiz(content.id)}
                  className="w-full py-5 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all shadow-2xl active:scale-[0.98]"
                >
                  <GraduationCap className="w-5 h-5 text-emerald-400" />
                  <span className="uppercase tracking-widest text-[10px]">Verify Knowledge</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quiz Modal / Lesson View */}
      <AnimatePresence>
        {activeQuizId && activeLesson && activeContent && (
          !quizFinished ? (
            <LessonView 
              lesson={activeLesson}
              content={activeContent}
              onClose={() => setActiveQuizId(null)}
              onFinish={handleFinishQuiz}
              onPlayAudio={(text) => playAudio(activeContent.id, text)}
              audioLoading={audioLoadingId === activeContent.id}
            />
          ) : (
            <div className="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-surface w-full max-w-xl rounded-[2.5rem] ambient-shadow overflow-hidden p-12 text-center"
              >
                <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
                  <span className="material-symbols-outlined !text-5xl">check_circle</span>
                </div>
                <h3 className="text-4xl font-bold text-on-surface mb-4 font-headline">Lesson Complete!</h3>
                <p className="text-on-surface-variant mb-10 text-lg">
                  You scored {quizScore} out of {activeLesson.questions.length}
                </p>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-10">
                  <p className="text-emerald-700 font-bold text-xl">+{quizScore * 50} Mele Points</p>
                </div>
                <button
                  onClick={() => {
                    setActiveQuizId(null);
                    setQuizFinished(false);
                  }}
                  className="haptic-button w-full py-5 bg-primary text-on-primary rounded-xl font-bold text-lg hover:opacity-90 transition-all"
                >
                  Back to Culture
                </button>
              </motion.div>
            </div>
          )
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image Generation Section */}
        <div className="glass p-10 rounded-[2.5rem] ambient-shadow flex flex-col border-white/40">
          <h2 className="text-2xl font-bold text-on-surface mb-8 flex items-center gap-3 font-headline">
            <ImageIcon className="text-primary w-6 h-6" />
            AI Visualizer
          </h2>
          <form onSubmit={handleGenerateImage} className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Ex: Traditional hula at sunset..."
                className="w-full pl-6 pr-14 py-4 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md shadow-inner focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all placeholder:text-stone-400"
                disabled={imageLoading}
              />
              <button
                type="submit"
                disabled={imageLoading || !imagePrompt.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-on-primary rounded-xl hover:opacity-90 transition-all flex items-center justify-center shadow-lg disabled:opacity-50 active:scale-95"
              >
                {imageLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              </button>
            </div>
          </form>

          <div className="flex-1 bg-white/20 rounded-3xl border border-white/40 flex items-center justify-center overflow-hidden min-h-[350px] relative shadow-inner">
            {imageLoading ? (
              <div className="flex flex-col items-center text-on-surface-variant z-10">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                <p className="font-bold uppercase tracking-widest text-[10px]">Conjuring Vision...</p>
              </div>
            ) : imageError ? (
              <div className="flex flex-col items-center text-error p-8 text-center max-w-sm z-10">
                <XCircle className="w-10 h-10 mb-4 opacity-50" />
                <p className="mb-6 font-medium leading-tight">{imageError}</p>
                {imageError.includes("rate limit") && (
                  <button
                    onClick={() => {
                      setImageError(null);
                      handleGenerateImage(new Event('submit') as any);
                    }}
                    className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all shadow-xl"
                  >
                    Retry Generation
                  </button>
                )}
              </div>
            ) : generatedImage ? (
              <img src={generatedImage} alt="Generated cultural scene" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="text-center text-on-surface-variant p-10 opacity-60">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm font-medium">Behold your imagination through the lens of AI.</p>
              </div>
            )}
          </div>
        </div>

        {/* Search Section */}
        <div className="glass p-10 rounded-[2.5rem] ambient-shadow flex flex-col border-white/40">
          <h2 className="text-2xl font-bold text-on-surface mb-8 flex items-center gap-3 font-headline">
            <Search className="text-secondary w-6 h-6" />
            Cultural Pulse
          </h2>
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for festivals, news, or history..."
                className="w-full pl-6 pr-14 py-4 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md shadow-inner focus:ring-2 focus:ring-secondary/40 focus:border-secondary outline-none transition-all placeholder:text-stone-400"
                disabled={searchLoading}
              />
              <button
                type="submit"
                disabled={searchLoading || !searchQuery.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-secondary text-on-secondary rounded-xl hover:opacity-90 transition-all flex items-center justify-center shadow-lg disabled:opacity-50 active:scale-95"
              >
                {searchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>
            {searchError && (
              <p className="mt-3 text-error text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 px-2">
                <XCircle className="w-3 h-3" />
                {searchError}
              </p>
            )}
          </form>

          <div className="flex-1 bg-white/30 rounded-3xl border border-white/40 p-10 overflow-y-auto min-h-[350px] shadow-inner custom-scrollbar">
            {searchLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-on-surface-variant">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-secondary" />
                <p className="font-bold uppercase tracking-widest text-[10px]">Sourcing Truth...</p>
              </div>
            ) : searchResults ? (
              <div className="prose prose-stone prose-sm max-w-none">
                <div className="markdown-body font-body leading-relaxed text-stone-700">
                  <ReactMarkdown>{searchResults.text}</ReactMarkdown>
                </div>
                {searchResults.groundingChunks && searchResults.groundingChunks.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-white/20">
                    <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-4">Bibliographic Sources</h3>
                    <ul className="space-y-4">
                      {searchResults.groundingChunks.map((chunk: any, idx: number) => {
                        if (chunk.web) {
                          return (
                            <li key={idx} className="group">
                              <a href={chunk.web.uri} target="_blank" rel="noreferrer" className="text-secondary/70 group-hover:text-secondary transition-colors flex items-center gap-3 no-underline">
                                <span className="w-6 h-6 bg-white/40 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-sm border border-white/60">{idx + 1}</span>
                                <span className="text-xs font-semibold border-b border-transparent group-hover:border-secondary/30 truncate">{chunk.web.title || chunk.web.uri}</span>
                              </a>
                            </li>
                          );
                        }
                        return null;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-on-surface-variant p-10">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-medium opacity-60">Connect with the living history and modern events of Hawai'i.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
