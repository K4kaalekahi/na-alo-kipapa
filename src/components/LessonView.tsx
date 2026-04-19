import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation, PanInfo } from 'motion/react';
import { triggerHaptic } from '../utils';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface CultureLesson {
  contentId: string;
  questions: QuizQuestion[];
}

interface CulturalContent {
  id: string;
  title: string;
  hawaiian: string;
  english: string;
  explanation: string;
  type: 'proverb' | 'story';
}

interface LessonViewProps {
  lesson: CultureLesson;
  content: CulturalContent;
  onClose: () => void;
  onFinish: (score: number) => void;
  onPlayAudio: (text: string) => Promise<void>;
  audioLoading: boolean;
}

export function LessonView({ lesson, content, onClose, onFinish, onPlayAudio, audioLoading }: LessonViewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const controls = useAnimation();

  const currentQuestion = lesson.questions[currentStep];
  const progress = ((currentStep + 1) / lesson.questions.length) * 100;

  useEffect(() => {
    if (isDrawerExpanded) {
      controls.start({ y: 0 });
    } else {
      controls.start({ y: '85%' });
    }
  }, [isDrawerExpanded, controls]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.y < -50) {
      setIsDrawerExpanded(true);
      triggerHaptic('medium');
    } else if (info.offset.y > 50) {
      setIsDrawerExpanded(false);
      triggerHaptic('light');
    } else {
      // Snap back to current state
      controls.start({ y: isDrawerExpanded ? 0 : '85%' });
    }
  };

  const handlePlayAudio = async () => {
    triggerHaptic('light');
    setIsPlaying(true);
    await onPlayAudio(content.hawaiian);
    setIsPlaying(false);
  };

  const handleOptionSelect = (idx: number) => {
    if (selectedOption !== null) return;
    triggerHaptic('medium');
    setSelectedOption(idx);
    if (idx === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleConfirm = () => {
    if (selectedOption === null) return;
    triggerHaptic('success');
    if (currentStep < lesson.questions.length - 1) {
      setCurrentStep(prev => prev + 1);
      setSelectedOption(null);
    } else {
      onFinish(score + (selectedOption === currentQuestion.correctAnswer ? 1 : 0));
    }
  };

  return (
    <div className="fixed inset-0 bg-surface z-50 flex flex-col overflow-hidden font-body text-on-surface">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-8 md:px-12">
        <button 
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="flex items-center gap-3 text-on-surface hover:opacity-70 transition-opacity"
        >
          <span className="material-symbols-outlined !text-2xl">arrow_back</span>
          <span className="text-sm font-medium tracking-wide uppercase">Exit Lesson</span>
        </button>
        <div className="flex items-center gap-4 text-primary">
          <div className="w-6 h-6">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" fillRule="evenodd"></path>
            </svg>
          </div>
        </div>
        <button className="text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined !text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>help</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col max-w-[880px] mx-auto w-full px-8 overflow-y-auto pb-32">
        {/* Progress Section */}
        <div className="w-full pt-4 pb-16">
          <div className="flex justify-between items-end mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-on-surface-variant">Lana'i Foundation</p>
            <p className="text-sm font-bold text-primary italic">Step {currentStep + 1} of {lesson.questions.length}</p>
          </div>
          <div className="h-2.5 w-full bg-surface-container-high rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-primary rounded-full transition-all duration-1000"
            />
          </div>
        </div>

        {/* Focus Content */}
        <div className="flex-1 flex flex-col items-center justify-center text-center pb-12">
          <div className="relative mb-6 group">
            <h1 className="font-headline text-6xl md:text-[5.5rem] font-bold text-on-surface relative tracking-tight leading-tight">
              {content.hawaiian}
            </h1>
          </div>
          <p className="text-2xl md:text-[1.75rem] italic text-on-surface-variant mb-16 font-light tracking-wide">
            "{content.english}"
          </p>
          
          {/* Audio Component */}
          <button 
            onClick={handlePlayAudio}
            disabled={audioLoading}
            className={`ambient-shadow bg-surface-container-lowest flex items-center justify-center w-20 h-20 rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 ${isPlaying ? 'text-white bg-primary scale-110 shadow-lg' : 'text-primary'}`}
          >
            {audioLoading ? (
              <span className="material-symbols-outlined !text-4xl animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined !text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {isPlaying ? 'graphic_eq' : 'volume_up'}
              </span>
            )}
          </button>
        </div>

        {/* Interaction Area */}
        <div className="py-8 flex flex-col gap-6">
          <h3 className="text-center text-sm font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-2">
            {currentQuestion.question}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                className={`group flex items-center justify-between p-6 rounded-2xl transition-all text-left border-2 ${
                  selectedOption === idx
                    ? idx === currentQuestion.correctAnswer
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'bg-red-50 border-red-500 text-red-700'
                    : selectedOption !== null && idx === currentQuestion.correctAnswer
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-surface-container hover:bg-surface-container-high border-transparent'
                }`}
              >
                <span className="text-lg font-medium text-on-surface">{option}</span>
                <div className={`size-7 rounded-full border-2 transition-colors flex items-center justify-center ${
                  selectedOption === idx
                    ? idx === currentQuestion.correctAnswer
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-red-500 bg-red-500'
                    : 'border-outline-variant group-hover:border-primary'
                }`}>
                  {selectedOption === idx && (
                    <div className="size-2.5 bg-white rounded-full" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Footer */}
        <div className="pb-16 pt-8 flex flex-col items-center">
          <button 
            onClick={handleConfirm}
            disabled={selectedOption === null}
            className="haptic-button w-full max-w-[400px] py-5 bg-primary text-on-primary rounded-2xl font-bold text-lg tracking-wide hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Confirm Selection</span>
            <span className="material-symbols-outlined !text-2xl">arrow_forward</span>
          </button>
          <button 
            onClick={() => setIsDrawerExpanded(true)}
            className="mt-10 flex items-center gap-2 text-secondary font-semibold hover:underline decoration-2 underline-offset-4"
          >
            <span className="material-symbols-outlined !text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
            <span>Cultural Context: The spirit of {content.hawaiian}</span>
          </button>
        </div>
      </main>

      {/* Cultural Drawer (Interactive) */}
      <AnimatePresence>
        {isDrawerExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsDrawerExpanded(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>
      <motion.div 
        className="fixed bottom-0 left-0 right-0 z-50 h-[85vh] bg-surface-container-highest rounded-t-[3rem] ambient-shadow border-t border-outline-variant/10 flex flex-col"
        initial={{ y: '85%' }}
        animate={controls}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: window.innerHeight * 0.85 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        <div className="w-full pt-6 pb-4 cursor-grab active:cursor-grabbing flex justify-center" onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}>
          <div className="w-16 h-1.5 bg-outline-variant/40 rounded-full hover:bg-primary transition-colors"></div>
        </div>
        <div className="p-10 pt-4 max-w-[900px] mx-auto w-full flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="w-full md:w-1/3 aspect-[4/5] rounded-3xl overflow-hidden shadow-sm shrink-0">
              <img 
                alt="Hawaiian culture" 
                className="w-full h-full object-cover" 
                src={`https://picsum.photos/seed/${content.id}/400/500`}
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1">
              <span className="inline-block px-4 py-1.5 bg-tertiary-container text-on-tertiary-container rounded-full text-xs font-bold uppercase tracking-widest mb-6">Deep Meaning</span>
              <h4 className="font-headline text-3xl font-bold mb-5">{content.title}</h4>
              <p className="text-on-surface-variant text-lg leading-relaxed mb-6">
                {content.explanation}
              </p>
              <p className="text-on-surface-variant text-lg leading-relaxed italic">
                How can you apply the spirit of {content.hawaiian} to your learning journey today?
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
