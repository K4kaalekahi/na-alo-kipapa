/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApiKeyGuard } from './components/ApiKeyGuard';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Vocabulary } from './pages/Vocabulary';
import { Pronunciation } from './pages/Pronunciation';
import { Conversation } from './pages/Conversation';
import { LiveConversation } from './pages/LiveConversation';
import { Reading } from './pages/Reading';
import { Culture } from './pages/Culture';
import { Moolelo } from './pages/Moolelo';
import { Training } from './pages/Training';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './components/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <ApiKeyGuard>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="vocabulary" element={<Vocabulary />} />
              <Route path="pronunciation" element={<Pronunciation />} />
              <Route path="conversation" element={<Conversation />} />
              <Route path="live" element={<LiveConversation />} />
              <Route path="reading" element={<Reading />} />
              <Route path="culture" element={<Culture />} />
              <Route path="moolelo" element={<Moolelo />} />
              <Route path="training" element={<Training />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ApiKeyGuard>
  );
}
