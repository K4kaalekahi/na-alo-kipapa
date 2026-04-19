import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { generateCulturalImage, generateSpeech, playAudioBase64, handleGeminiError } from '../services/geminiService';
import { Loader2, ChevronRight, ChevronLeft, Volume2, Sparkles, BookOpen, RotateCcw, Play, Pause, Mic, MicOff, X } from 'lucide-react';
import { triggerHaptic } from '../utils';
import { useAuth } from '../components/AuthContext';
import { addPoints } from '../services/progressService';

interface StorySlide {
  id: number;
  title: string;
  imagePrompt: string;
  narrative: string;
  character?: string;
}

const CHARACTER_TRAITS = {
  TUTU: "a wise Hawaiian Tutu (grandmother) with silver-streaked hair styled in a neat bun, wearing a colorful floral mu'umu'u and a warm, kind expression",
  GIRLS: "two Hawaiian girls, one aged 8 and one 9, both with long flowing dark hair, each wearing a bright red hibiscus flower clip behind their ear",
  PELE: "Pele, the goddess of fire, with voluminous hair made of flowing molten lava, ember-glowing eyes, wearing a traditional red kapa wrap",
  NAMAKA: "Namaka, the goddess of the sea, with long hair made of crashing turquoise water and sea foam, deep ocean-blue eyes, wearing a blue kapa wrap",
  BOYS: "two young Hawaiian boys, ages 2 and 4, with short curly dark hair, wearing simple shorts"
} as const;

const COMIC_STYLE = "Professional 2D comic book illustration, bold ink outlines, vibrant cel-shaded colors, cinematic lighting, high contrast color palette.";

const STORY_SCRIPT: StorySlide[] = [
  {
    id: 0,
    title: "A Sunny Day on the Beach",
    imagePrompt: `${COMIC_STYLE} A beautiful Hawaiian beach scene. ${CHARACTER_TRAITS.TUTU} is sitting on a woven mat on the sand. She is braiding a ti leaf lei, using her big toe to hold the tension. Nearby, ${CHARACTER_TRAITS.BOYS} play in the sand, and ${CHARACTER_TRAITS.GIRLS} watch with interest. Warm afternoon sun.`,
    narrative: "It was a beautiful afternoon on the shore of Lana‘i. Tutu sat on her woven mat, the smell of salt and sun in the air. Her four mo‘opuna were all around her—the little boys, just two and four, were busy building volcanoes in the sand. Tutu herself was focused, her hands flying as she braided a ti leaf lei, using her toe to keep the tension just right for the hula halau's upcoming performance."
  },
  {
    id: 1,
    title: "The Argument",
    imagePrompt: `${COMIC_STYLE} Dynamic action panel. ${CHARACTER_TRAITS.GIRLS} are arguing loudly on the beach, their faces red with frustration, one pointing at the other. In the background, ${CHARACTER_TRAITS.TUTU} looks up from her lei-making with a firm, sharp expression. Action lines in the background.`,
    narrative: "Suddenly, the peace was shattered. From down the beach, the unmistakable sound of hitting followed by a sharp scream echoed. The two older girls, usually inseparable, were locked in a heated argument. They were shouting, their voices rising over the sound of the waves, faces red with anger."
  },
  {
    id: 2,
    title: "Tutu's Command",
    imagePrompt: `${COMIC_STYLE} Wide shot. ${CHARACTER_TRAITS.TUTU} is sitting on her mat, pointing a firm finger to the sand in front of her. ${CHARACTER_TRAITS.GIRLS} are walking toward her with their heads bowed in guilt. The ti leaf lei is visible on Tutu's toe. Bold ink outlines.`,
    narrative: "‘Eh! Hele mai!’ Tutu’s voice cut through the air like a crack of thunder. The girls stopped instantly. They rushed over, both trying to tattle at the same time, their words tripping over each other in a frantic scramble to be heard. Tutu held up a hand. ‘Uoki!’ she said firmly. ‘Enough of that.’"
  },
  {
    id: 3,
    title: "Putting Energy to Use",
    imagePrompt: `${COMIC_STYLE} ${CHARACTER_TRAITS.TUTU} and ${CHARACTER_TRAITS.GIRLS} are sitting together on the beach mat. Tutu is patiently showing the girls how to twist ti leaves around their toes to start a braid. The girls look focused and helpful. Close-up on their hands and feet on the mat.`,
    narrative: "‘All that energy?’ Tutu asked with a small smile. ‘Let’s put it to better use. Noho i lalo, e kōkua iʻau e hana i ka lei lau tī.’ The girls groaned. ‘Aww, see what you did!’ they started to whisper. Tutu looked at them. ‘I also have a \"pa‘i\" if you would prefer?’ she teased. ‘No Tutu!’ they cried in unison, quickly grabbing leaves and twisting them around their toes to begin braiding."
  },
  {
    id: 4,
    title: "Reminders of the Past",
    imagePrompt: `${COMIC_STYLE} Close-up on the face of ${CHARACTER_TRAITS.TUTU} as she tells a story. In the background, a mystical, semi-transparent vision of ${CHARACTER_TRAITS.PELE} and ${CHARACTER_TRAITS.NAMAKA} appears in the rising sea mist. Cinematic storytelling glow.`,
    narrative: "Tutu glanced at each of them, her eyes twinkling. ‘You know,’ she began softly, ‘you two remind me of another pair of sisters who really did not get along. But their pilikia—their trouble—started long ago, and far across the sea...’"
  },
  {
    id: 5,
    title: "Pele and Namaka",
    imagePrompt: `${COMIC_STYLE} Epic battle scene between ${CHARACTER_TRAITS.PELE} and ${CHARACTER_TRAITS.NAMAKA}. Pele's lava hair clashing with Namaka's water hair. Massive plumes of steam where fire meets sea. Intense, vibrant colors and powerful poses.`,
    narrative: "Long ago, in the distant lands of Kahiki, there lived two sisters: Pele, the goddess of fire, and Namaka-o-Kahaʻi, the goddess of the sea. They were both powerful and proud. Namaka ruled the vast oceans, while Pele felt the fire of the earth burning within her. Their tempers were as different as fire and water, and they clashed constantly."
  },
  {
    id: 6,
    title: "The Great Pursuit",
    imagePrompt: `${COMIC_STYLE} ${CHARACTER_TRAITS.PELE} (lava hair) standing on a large Hawaiian voyaging canoe, navigating through a violent storm at sea. Massive, anthropomorphic waves sent by ${CHARACTER_TRAITS.NAMAKA} (water hair) are crashing around the boat. Dynamic and dramatic composition.`,
    narrative: "The conflict grew so great that Pele had to flee. She took her brothers and sisters in a great canoe, searching for a place where she could build her fires in peace. But Namaka followed. She sent towering waves to swamp the canoe, her anger flooding the horizon. Across the Pacific they raced, a battle of elements that shook the very foundations of the world."
  },
  {
    id: 7,
    title: "Finding a Home",
    imagePrompt: `${COMIC_STYLE} Triumphant shot of ${CHARACTER_TRAITS.PELE} standing atop a high volcanic peak in Hawaii. The sun is breaking through the clouds. In the distance, the islands of Hawaii are lush and green. Pele looks victorious and at peace.`,
    narrative: "Finally, Pele reached the islands of Hawaiʻi. At each island, she tried to dig a home for her fires, but at first, Namaka would always find her and quench the flames with the sea. It wasn't until Pele reached the high mountains of the Big Island that she found a place high enough and deep enough to stay. There, at Halemaʻumaʻu, she finally found her peace."
  },
  {
    id: 8,
    title: "Ho'oponopono",
    imagePrompt: `${COMIC_STYLE} ${CHARACTER_TRAITS.TUTU} and ${CHARACTER_TRAITS.GIRLS} are sitting together on the beach as the sun sets in a warm orange glow. They are smiling at each other, the finished ti leaf leis in their hands. A moment of harmony and love. Heartfelt ending.`,
    narrative: "The girls had stopped braiding, their eyes wide. ‘So they never got along?’ the younger one asked. ‘They learned that they both have a place,’ Tutu said, patting their hands. ‘Just like you two. Your energy is a gift, but only if you use it to build something beautiful together.’ The girls looked at each other, the anger gone, replaced by the rhythm of the braiding."
  }
];

export function Moolelo() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [images, setImages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [direction, setDirection] = useState(0); // 1 for next, -1 for back
  const [showControls, setShowControls] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const currentAudioRef = React.useRef<{ stop: () => void } | null>(null);
  const audioRequestIdRef = React.useRef(0);

  // Auto-hide controls after 5 seconds of inactivity
  useEffect(() => {
    let timeoutId: any;
    
    const resetTimer = () => {
      setShowControls(true);
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('click', resetTimer);
    
    // Initial timer
    timeoutId = setTimeout(() => {
      setShowControls(false);
    }, 5000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('click', resetTimer);
    };
  }, []);

  useEffect(() => {
    // Only pre-load current image. 
    // We removed pre-loading of next image to respect tight free tier limits.
    loadImages(currentStep);

    // Autoplay narration if enabled
    // Add a small delay for narration to start AFTER image generation starts (to stagger them)
    let audioTimeout: any;
    if (isAutoplay) {
      audioTimeout = setTimeout(() => {
        if (!loading) {
          handlePlayNarrative(false);
        }
      }, 1500);
    }

    return () => {
      if (audioTimeout) clearTimeout(audioTimeout);
      // Invalidate pending requests
      audioRequestIdRef.current++;
    };
  }, [currentStep, isAutoplay]); // Removed 'loading' from dependencies to avoid infinite loops and extra calls

  // Voice Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.lang = 'en-US';
      recog.interimResults = false;

      recog.onresult = (event: any) => {
        const command = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log("Voice Command Recognized:", command);
        
        if (command.includes('next slide') || command.includes('next chapter') || command.includes('continue')) {
          handleNext();
        } else if (command.includes('go back') || command.includes('previous')) {
          handleBack();
        } else if (command.includes('replay story') || command.includes('replay narration') || command.includes('listen again')) {
          handlePlayNarrative(true);
        }
        
        // Ensure UI stays visible when someone speaks
        setShowControls(true);
      };

      recog.onend = () => {
        if (isListening) {
           try {
             recog.start();
           } catch (e) {
             console.error("Speech Recognition restart failed", e);
           }
        }
      };

      setRecognition(recog);
    }
  }, [isListening]);

  const toggleListening = () => {
    if (!recognition) return;
    triggerHaptic('medium');
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error("Speech Recognition start failed", e);
      }
    }
  };

  const loadImages = async (step: number) => {
    if (images[step]) return;
    
    // Only load if it's the current step or we are pre-loading next (but keep it very conservative)
    if (step !== currentStep) return;

    setLoading(true);
    setError(null);
    try {
      const imageUrl = await generateCulturalImage(STORY_SCRIPT[step].imagePrompt);
      
      // CRITICAL: Double check if we are still on the same step after the long AI call
      // to avoid setting stale images or wasting subsequent retries if user moved on
      if (step === currentStep && imageUrl) {
        setImages(prev => ({ ...prev, [step]: imageUrl }));
      }
    } catch (err: any) {
      // If we moved past the step, don't show the error to the user
      if (step === currentStep) {
        console.error(err);
        setError(handleGeminiError(err));
      }
    } finally {
      if (step === currentStep) {
        setLoading(false);
      }
    }
  };

  const handleNext = () => {
    if (currentStep < STORY_SCRIPT.length - 1) {
      triggerHaptic('medium');
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else if (user) {
      triggerHaptic('success');
      addPoints(user.uid, 50); // Big bonus for completing the story
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      triggerHaptic('light');
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handlePlayNarrative = async (withHaptic = true) => {
    // Increment request ID to invalidate any previous pending requests
    const requestId = ++audioRequestIdRef.current;

    // Stop any currently playing audio before starting new one
    if (currentAudioRef.current) {
      currentAudioRef.current.stop();
      currentAudioRef.current = null;
    }

    if (withHaptic) triggerHaptic('medium');
    setAudioLoading(true);
    setError(null);
    try {
      const text = STORY_SCRIPT[currentStep].narrative;
      const audio = await generateSpeech(text);
      
      // If a newer request has started, ignore this one
      if (requestId !== audioRequestIdRef.current) {
        return;
      }

      if (audio) {
        const playback = playAudioBase64(audio);
        currentAudioRef.current = playback as any;
        await playback;
      }
    } catch (err) {
      console.error(err);
      setError(handleGeminiError(err));
    } finally {
      // Only reset loading if this is still the active request
      if (requestId === audioRequestIdRef.current) {
        setAudioLoading(false);
      }
    }
  };

  const currentSlide = STORY_SCRIPT[currentStep];

  const variants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 50 : -50,
      scale: 0.95,
    }),
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.4 },
        scale: { duration: 0.4 }
      }
    } as const,
    exit: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? -50 : 50,
      scale: 0.95,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.4 },
        scale: { duration: 0.4 }
      }
    } as const)
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden relative">
      <style>{`
        img {
          filter: contrast(1.05) saturate(1.1);
          image-rendering: auto;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
      `}</style>

      <AnimatePresence>
        {showControls && (
          <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-10 left-10 right-10 z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="glass p-3 rounded-2xl border-white/40 shadow-xl">
                <BookOpen className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tighter text-stone-900 font-headline">Mo‘olelo Time</h1>
                <p className="text-stone-500 text-[10px] uppercase tracking-[0.3em] font-bold">Pele and the Sisters</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleListening}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl glass border-white/60 transition-all shadow-lg ${
                  isListening 
                    ? 'bg-red-500/20 border-red-500/50 text-red-600 animate-pulse' 
                    : 'text-stone-600 hover:bg-white/60'
                }`}
              >
                {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Voice Command</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsAutoplay(!isAutoplay);
                }}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl glass border-white/60 transition-all shadow-lg ${
                  isAutoplay 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-700' 
                    : 'text-stone-600 hover:bg-white/60'
                }`}
              >
                {isAutoplay ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Autoplay</span>
              </button>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10 px-4">
        {/* Illustration Side */}
        <div className="relative aspect-[4/5] sm:aspect-square bg-white/20 rounded-[3rem] overflow-hidden shadow-2xl border border-white/60 order-2 lg:order-1 glass-glow">
          <AnimatePresence mode="wait" custom={direction}>
            {loading && !images[currentStep] ? (
              <motion.div 
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-6"
              >
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-600 animate-pulse" />
                </div>
                <p className="text-emerald-800 font-bold uppercase tracking-widest text-xs">Summoning Mo‘olelo...</p>
              </motion.div>
            ) : (
              <motion.div
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="absolute inset-0"
              >
                {images[currentStep] ? (
                  <img 
                    src={images[currentStep]} 
                    alt={currentSlide.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-stone-400 glass">
                     <p className="font-bold uppercase tracking-widest text-xs">Vision Obscured</p>
                   </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-12 left-12 right-12 text-white">
                   <motion.span 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.4em] mb-3 block"
                   >
                    Panel {currentStep + 1}
                   </motion.span>
                   <motion.h3 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-5xl font-black font-headline tracking-tighter"
                   >
                    {currentSlide.title}
                   </motion.h3>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Narrative Side */}
        <div className="space-y-10 order-1 lg:order-2">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div 
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="glass p-12 rounded-[3rem] border-white/60 backdrop-blur-3xl relative shadow-2xl h-full flex flex-col"
            >
              <div className="flex items-start justify-between mb-10">
                <div className="p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <Sparkles className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="flex gap-3">
                  <AnimatePresence>
                    {showControls && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => handlePlayNarrative(true)}
                        disabled={audioLoading}
                        className="flex items-center gap-3 px-6 py-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 rounded-2xl transition-all disabled:opacity-50 border border-emerald-500/30 group shadow-md"
                        title="Replay Narration"
                      >
                        <RotateCcw className="w-5 h-5 group-hover:-rotate-45 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Oral History</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="flex-1">
                <p className="text-stone-800 leading-relaxed font-serif text-3xl italic tracking-tight opacity-90">
                  "{currentSlide.narrative}"
                </p>
              </div>

              <div className="mt-12 pt-10 border-t border-black/5 flex items-center justify-between">
                <div className="flex gap-3">
                  {STORY_SCRIPT.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`h-2 rounded-full transition-all duration-700 overflow-hidden bg-stone-200/50 ${idx === currentStep ? 'w-12' : 'w-2'}`}
                    >
                      {idx === currentStep && (
                        <motion.div 
                          initial={{ x: "-100%" }}
                          animate={{ x: "0%" }}
                          transition={{ duration: 0.5 }}
                          className="w-full h-full bg-emerald-600"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] font-sans">{currentStep + 1} &bull; {STORY_SCRIPT.length}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence>
            {showControls && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex items-center gap-6"
              >
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="px-10 py-5 bg-white/40 text-stone-700 rounded-2xl font-bold border border-white/60 hover:bg-white/60 transition-all disabled:opacity-20 flex items-center gap-3 glass shadow-lg backdrop-blur-md"
                >
                  <ChevronLeft className="w-6 h-6" />
                  <span className="uppercase tracking-widest text-xs">Past</span>
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-10 py-5 bg-stone-900 text-white rounded-2xl font-bold shadow-2xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                >
                  <span className="uppercase tracking-[0.2em] text-xs">
                    {currentStep === STORY_SCRIPT.length - 1 ? "Complete Journey" : "Next Chapter"}
                  </span>
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isListening && showControls && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 glass border-red-500/30 px-8 py-4 rounded-[2rem] flex items-center gap-4 shadow-2xl z-50"
          >
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <p className="text-[10px] font-bold text-stone-600 uppercase tracking-[0.2em]">
              Listening for Guidance...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 glass border-red-500/40 text-red-900 px-8 py-6 rounded-[2.5rem] flex flex-col items-center gap-4 shadow-2xl z-50 max-w-lg text-center backdrop-blur-3xl">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
               <XCircle className="w-6 h-6 text-red-600" />
             </div>
             <p className="text-sm font-bold tracking-tight leading-tight">{error}</p>
           </div>
           {error.includes("rate limit") && (
             <button
               onClick={() => {
                 setError(null);
                 loadImages(currentStep);
               }}
               className="px-8 py-3 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
             >
               Retry Sighting
             </button>
           )}
           <button 
             onClick={() => setError(null)}
             className="absolute top-4 right-4 text-stone-400 hover:text-stone-900 transition-colors"
           >
             <X className="w-5 h-5" />
           </button>
        </div>
      )}
    </div>
  );
}

const XCircle = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);
