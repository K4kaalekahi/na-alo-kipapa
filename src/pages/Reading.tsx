import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { explainGrammar, generateSpeech, playAudioBase64, handleGeminiError } from '../services/geminiService';
import { BookOpen, Loader2, Info, Volume2, ChevronLeft, Download } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import { addPoints, updateStreak } from '../services/progressService';
import { db } from '../firebase';
import { collection, getDocs, query, setDoc, doc, onSnapshot, where } from 'firebase/firestore';
import { triggerHaptic } from '../utils';

interface ReadingMaterial {
  id: string;
  title: string;
  difficulty: string;
  paragraphs: string[];
  isPublic: boolean;
}

const initialReadingMaterials: ReadingMaterial[] = [
  {
    id: 'pele',
    title: 'He Moʻolelo no Pele',
    difficulty: 'Intermediate',
    paragraphs: [
      'Ua hānau ʻia ʻo Pele ma Kahiki. He kaikamahine ʻo ia na Haumea a me Kānehoalani. Ua holo mai ʻo ia i Hawaiʻi nei e ʻimi i wahi e noho ai. Ua pae mua ʻo ia ma Niʻihau, a laila ma Kauaʻi, Oʻahu, Molokaʻi, Lānaʻi, a me Maui.',
      'I kēlā me kēia mokupuni, ua ʻeli ʻo ia i lua ahi, akā, ua loaʻa ka wai, a pio ke ahi. I ka hopena, ua hiki ʻo ia ma ka mokupuni ʻo Hawaiʻi. Ma laila, ua ʻeli ʻo ia i ka lua ʻo Halemaʻumaʻu ma Kīlauea. Aia nō ʻo ia e noho ana ma laila a hiki i kēia lā.',
      'He akua wahine mana ʻo Pele. Hiki iā ia ke lilo i wahine uʻi, a i ʻole i luahine. Pono kākou e hōʻihi iā ia a me kona ʻāina.'
    ],
    isPublic: true
  },
  {
    id: 'kalo',
    title: 'Ka Moʻolelo o Hāloa',
    difficulty: 'Beginner',
    paragraphs: [
      'ʻO Wākea ka makua kāne, ʻo Hoʻohōkūkalani ka makuahine. Ua hānau ʻia kā lāua keiki mua, akā, ua make. Ua kanu lāua i ke keiki ma ka ʻāina.',
      'Mai loko mai o kēlā wahi i kanu ʻia ai ke keiki, ua ulu mai ka mea kanu hou. ʻO ke kalo kēlā. Ua kapa ʻia ka inoa ʻo Hāloanakalaukapalili.',
      'Ma hope, ua hānau hou ʻo Hoʻohōkūkalani. He keiki kāne ola kēlā. Ua kapa ʻia kona inoa ʻo Hāloa. ʻO ia ke kanaka mua loa.',
      'No laila, he kaikuaʻana ke kalo na ke kanaka. Pono ke kanaka e mālama i ke kalo, a na ke kalo e hānai i ke kanaka.'
    ],
    isPublic: true
  },
  {
    id: 'hokulea',
    title: 'Ka Waʻa Hōkūleʻa',
    difficulty: 'Advanced',
    paragraphs: [
      'He waʻa kaulua ʻo Hōkūleʻa. Ua kūkulu ʻia kēia waʻa i ka makahiki 1975 e ka hui ʻo Polynesian Voyaging Society. ʻO ka pahuhopu o ka hui, ʻo ia ka hoʻāla hou ʻana i ka hoʻokele waʻa kuʻuna o ka poʻe Polenesia.',
      'I ka makahiki 1976, ua holo ʻo Hōkūleʻa mai Hawaiʻi a i Tahiti. ʻAʻole i hoʻohana ʻia nā mea hoʻokele o kēia wā, e like me ka panana a i ʻole ka GPS. Ua hoʻokele wale nō lākou ma ka nānā ʻana i nā hōkū, ka lā, ka mahina, nā nalu, a me nā manu.',
      'ʻO Mau Piailug ka hoʻokele mua o Hōkūleʻa. He kanaka aʻo ia mai ka mokupuni ʻo Satawal ma Maikonesia. Na Mau i aʻo i nā kānaka Hawaiʻi i ke akamai o ka hoʻokele waʻa.',
      'Ua holo ʻo Hōkūleʻa a puni ka honua. He hōʻailona kēia waʻa no ka haʻaheo a me ke akamai o nā kūpuna o ka Pākīpika.'
    ],
    isPublic: true
  }
];

export function Reading() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<ReadingMaterial[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) updateStreak(user.uid);
    
    // Seed and Fetch materials
    const seedAndFetch = async () => {
      setFetching(true);
      try {
        const q = query(
          collection(db, 'readingMaterials'),
          where('isPublic', '==', true)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          // Fallback to local data if no public content found
          setMaterials(initialReadingMaterials);
          setFetching(false);
          return;
        }

        // Real-time listener
        const unsubscribe = onSnapshot(q, (snap) => {
          const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReadingMaterial));
          setMaterials(items.length > 0 ? items : initialReadingMaterials);
          setFetching(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error fetching materials:", error);
        setMaterials(initialReadingMaterials);
        setFetching(false);
      }
    };

    const unsubPromise = seedAndFetch();
    return () => {
      unsubPromise.then(unsub => unsub && unsub());
    };
  }, [user]);

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  const handlePlayAudio = async () => {
    if (!selectedMaterial) return;
    triggerHaptic('light');
    setAudioLoading(true);
    setError(null);
    try {
      for (const chunk of selectedMaterial.paragraphs) {
        const audioBase64 = await generateSpeech(chunk);
        if (audioBase64) {
          await playAudioBase64(audioBase64);
        }
      }
      if (user) await addPoints(user.uid, 20); // 20 points for completing a reading
    } catch (error) {
      console.error(error);
      setError(handleGeminiError(error));
    } finally {
      setAudioLoading(false);
    }
  };

  const handleTextSelection = async () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      setSelectedText(text);
      triggerHaptic('medium');
      setLoading(true);
      setError(null);
      try {
        const result = await explainGrammar(text);
        setExplanation(result);
        if (user) await addPoints(user.uid, 5); // 5 points for analyzing text
        triggerHaptic('success');
      } catch (error) {
        console.error(error);
        setError(handleGeminiError(error));
        triggerHaptic('error');
      } finally {
        setLoading(false);
      }
    }
  };

  if (fetching) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!selectedMaterial) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 max-w-6xl mx-auto space-y-12"
      >
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-black/5 pb-8">
          <div>
            <h1 className="text-6xl font-black text-on-surface tracking-tighter font-headline leading-none mb-3">Reading Hall</h1>
            <p className="text-on-surface-variant text-xl font-serif opacity-80">Immerse yourself in authentic Hawaiian texts.</p>
          </div>
          <div className="flex items-center gap-3 text-primary bg-primary/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-primary/20 shadow-sm">
            <Download className="w-5 h-5" />
            Vessels Synced
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {materials.map((material) => (
            <motion.div 
              key={material.id}
              whileHover={{ y: -8, scale: 1.02 }}
              onClick={() => {
                triggerHaptic('medium');
                setSelectedMaterialId(material.id);
              }}
              className="glass p-8 rounded-[2.5rem] shadow-xl border-white/40 hover:border-primary/40 transition-all cursor-pointer flex flex-col h-full group glass-glow"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <BookOpen className="w-8 h-8" />
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  material.difficulty === 'Beginner' ? 'bg-blue-500/10 text-blue-700 border border-blue-500/20' :
                  material.difficulty === 'Intermediate' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' :
                  'bg-orange-500/10 text-orange-700 border border-orange-500/20'
                }`}>
                  {material.difficulty}
                </span>
              </div>
              <h3 className="text-3xl font-black text-on-surface font-headline tracking-tighter mb-4 leading-tight">{material.title}</h3>
              <p className="text-on-surface-variant text-base font-serif italic line-clamp-3 opacity-70">
                {material.paragraphs[0]}
              </p>
              <div className="mt-8 pt-6 border-t border-black/5 flex justify-end">
                <div className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronLeft className="w-6 h-6 rotate-180" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12"
    >
      <div className="lg:col-span-2 space-y-10">
        <header>
          <button 
            onClick={() => {
              triggerHaptic('medium');
              setSelectedMaterialId(null);
              setSelectedText('');
              setExplanation(null);
            }}
            className="flex items-center text-primary hover:text-primary/70 font-black uppercase tracking-widest text-[10px] mb-6 transition-all group"
          >
            <ChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Library of Wisdom
          </button>
          <h1 className="text-6xl font-black text-on-surface tracking-tighter font-headline leading-none mb-3">Deep Reading</h1>
          <p className="text-on-surface-variant text-xl font-serif opacity-80 italic">Select any phrase to reveal its hidden mana (meaning).</p>
        </header>

        <div 
          className="glass-card p-12 rounded-[3.5rem] shadow-2xl border-white/60 prose prose-stone max-w-none prose-lg relative glass-glow"
          onMouseUp={handleTextSelection}
        >
          <div className="flex justify-between items-start mb-10 pb-8 border-b border-black/5">
            <h2 className="text-5xl font-black text-on-surface font-headline tracking-tighter m-0 leading-tight">{selectedMaterial.title}</h2>
            <button
              onClick={handlePlayAudio}
              disabled={audioLoading}
              className="w-14 h-14 bg-primary text-on-primary rounded-full hover:scale-110 active:scale-90 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0 ml-6"
              title="Activate Oral Tradition"
            >
              {audioLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Volume2 className="w-6 h-6" />}
            </button>
          </div>
          <div className="space-y-8 font-serif text-2xl leading-relaxed text-on-surface opacity-90">
            {selectedMaterial.paragraphs.map((paragraph, idx) => (
              <p key={idx} className="relative decoration-primary/20 hover:decoration-primary/50 cursor-text selection:bg-primary/20 selection:text-primary">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="sticky top-12 space-y-8">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
               <Info className="w-5 h-5" />
             </div>
             <h2 className="text-2xl font-black text-on-surface font-headline tracking-tight">Insight Portal</h2>
          </div>
          
          <div className="glass p-8 rounded-[2.5rem] shadow-xl border-white/40 min-h-[450px] flex flex-col glass-glow">
            {!selectedText ? (
              <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant text-center py-12 px-4 opacity-50">
                <BookOpen className="w-16 h-16 mb-6 stroke-[1.5]" />
                <p className="text-sm font-serif italic leading-relaxed">Illuminate the path by highlighting text for instant cultural and grammatical resonance.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="mb-8 pb-6 border-b border-black/5">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-3">Focus Fragment</p>
                  <p className="text-2xl font-black text-on-surface tracking-tight italic font-headline leading-tight">"{selectedText}"</p>
                </div>
                
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-8 text-on-surface-variant">
                    <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Consulting Archives...</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 flex items-start gap-4">
                    <Info className="w-6 h-6 text-red-600 mt-1 shrink-0" />
                    <p className="text-sm font-bold text-red-900 leading-tight">{error}</p>
                  </div>
                ) : (
                  <div className="flex-1 custom-scrollbar overflow-y-auto pr-2">
                    <div className="text-on-surface text-lg leading-relaxed font-serif opacity-90 whitespace-pre-wrap">
                      {explanation}
                    </div>
                  </div>
                )}
                
                <div className="mt-8 pt-6 border-t border-black/5">
                  <div className="flex items-center gap-3 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Knowledge Harmonized
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
