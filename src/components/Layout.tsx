import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, Mic, MessageCircle, Book, Video, Dumbbell, LayoutDashboard, Radio, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContext';
import { ProtocolNotifier } from './ProtocolNotifier';

export function Layout() {
  const { user, logout } = useAuth();
  
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/vocabulary', icon: BookOpen, label: 'Vocabulary' },
    { to: '/pronunciation', icon: Mic, label: 'Pronunciation' },
    { to: '/conversation', icon: MessageCircle, label: 'Conversation' },
    { to: '/live', icon: Radio, label: 'Live Practice' },
    { to: '/reading', icon: Book, label: 'Reading' },
    { to: '/culture', icon: Video, label: 'Culture' },
    { to: '/training', icon: Dumbbell, label: 'Training' },
  ];

  return (
    <div className="flex h-screen bg-transparent text-stone-900 font-sans">
      <ProtocolNotifier />
      {/* Sidebar - Glassmorphic */}
      <aside className="w-64 glass-dark border-r border-stone-200/20 flex flex-col z-20">
        <div className="p-6 border-b border-stone-200/10">
          <h1 className="text-2xl font-bold text-emerald-800 tracking-tight font-headline">Mauna Learner</h1>
          <p className="text-xs text-stone-500 mt-1 uppercase tracking-wider font-medium opacity-70">Hawaiian Culture & Language</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 font-medium scale-[1.02]'
                    : 'text-stone-600 hover:bg-white/40 hover:text-stone-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-on-primary' : 'text-primary/70'}`} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-stone-200/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-white/40" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                  {user?.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-stone-900 truncate">{user?.displayName || 'Learner'}</p>
                <p className="text-[10px] text-stone-500 truncate uppercase tracking-tight">{user?.email}</p>
              </div>
            </div>
            <button onClick={logout} className="p-2 text-stone-400 hover:text-red-600 transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative glass-glow">
        <div className="relative z-10 px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
