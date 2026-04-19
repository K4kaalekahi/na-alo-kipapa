import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, Loader2 } from 'lucide-react';

export function Login() {
  const { user, signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, ignore
      } else {
        setErrorMsg(error.message || 'Failed to sign in.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-8 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full -z-0 opacity-40">
         <div className="absolute top-[10%] left-[20%] w-[40rem] h-[40rem] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
         <div className="absolute bottom-[10%] right-[20%] w-[30rem] h-[30rem] bg-emerald-400/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-md w-full glass-card p-12 text-center relative z-10 glass-glow"
      >
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-primary/20 shadow-inner">
          <LogIn className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-5xl font-black text-on-surface mb-4 font-headline tracking-tighter">Aloha!</h1>
        <p className="text-on-surface-variant mb-12 text-xl font-serif italic opacity-80 leading-relaxed">
          Embark on a linguistic journey to the heart of Hawai'i.
        </p>
        
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="w-full bg-white/60 backdrop-blur-xl text-stone-900 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:scale-[1.05] active:scale-[0.95] transition-all duration-500 flex items-center justify-center gap-4 disabled:opacity-50 border border-white/80 shadow-2xl shadow-black/5 group"
        >
          {isSigningIn ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google" 
              className="w-6 h-6 group-hover:rotate-12 transition-transform" 
            />
          )}
          {isSigningIn ? 'Aligning Spirits...' : 'Sign in with Google'}
        </button>
        
        {errorMsg && (
            <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-900 text-xs font-bold leading-tight"
            >
                {errorMsg}
            </motion.div>
        )}
        
        <div className="mt-12 pt-10 border-t border-black/5">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em]">Ancient Wisdom &bull; Modern Vessel</p>
        </div>
      </motion.div>
    </div>
  );
}
