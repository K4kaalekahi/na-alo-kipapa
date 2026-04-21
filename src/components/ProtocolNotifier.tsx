import React, { useEffect, useState } from 'react';
import { aiProtocol, ApiState } from '../services/aiProtocolManager';
import { ShieldAlert, ZapOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function ProtocolNotifier() {
  const [protocolState, setProtocolState] = useState<ApiState>('OPERATIONAL');

  useEffect(() => {
    // Subscribe to AI Protocol Health Updates
    const unsubscribe = aiProtocol.subscribe((newState) => {
      setProtocolState(newState);
    });
    return unsubscribe;
  }, []);

  return (
    <AnimatePresence>
      {protocolState !== 'OPERATIONAL' && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className="bg-stone-900/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-4 flex items-start gap-4 max-w-lg">
            <div className="bg-amber-500/20 text-amber-400 p-2 rounded-xl shrink-0">
              {protocolState === 'DEGRADED_QUOTA' ? (
                <ZapOff className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            
            <div className="space-y-1 pr-4">
              <h3 className="text-white font-bold tracking-tight">System Reconfigured</h3>
              <p className="text-stone-300 text-sm leading-relaxed">
                {protocolState === 'DEGRADED_QUOTA' 
                  ? "AI Engine is operating on auxiliary reserves due to usage limits. Core application functions remain active with gracefully injected fallbacks."
                  : "AI features require valid authentication or billing configurations. Operating in restricted mode."}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
