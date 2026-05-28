import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

// Components
import Navbar from './components/Navbar';
import ProfileDrawer from './components/ProfileDrawer';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import DiseaseDetection from './pages/DiseaseDetection';
import CropRecommendation from './pages/CropRecommendation';
import ProfileRoutePage from './pages/ProfileRoutePage';
import History from './pages/History';

// Protected Route Helper
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkBg text-emerald-400 font-mono text-xs animate-pulse">
        Initializing secure link...
      </div>
    );
  }

  return currentUser ? children : <Navigate to="/login" replace />;
}

// Redirect Route if already Authenticated
function AuthenticatedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkBg text-emerald-400 font-mono text-xs animate-pulse">
        Verifying security nodes...
      </div>
    );
  }

  return !currentUser ? children : <Navigate to="/dashboard" replace />;
}

function MainLayout() {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-darkBg relative flex flex-col font-sans">
      
      {/* Top Navigation */}
      <Navbar onOpenProfile={() => setProfileOpen(true)} />

      {/* Pages Container */}
      <main className="flex-1 w-full relative z-10">
        <Routes>
          <Route path="/" element={<Home />} />
          
          <Route 
            path="/login" 
            element={
              <AuthenticatedRoute>
                <Login />
              </AuthenticatedRoute>
            } 
          />
          <Route 
            path="/signup" 
            element={
              <AuthenticatedRoute>
                <Signup />
              </AuthenticatedRoute>
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/disease-detection" 
            element={
              <ProtectedRoute>
                <DiseaseDetection />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/crop-recommendation" 
            element={
              <ProtectedRoute>
                <CropRecommendation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfileRoutePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/history" 
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Profile History Drawer */}
      <ProfileDrawer isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Footer credits */}
      <footer className="py-4 text-center shrink-0 border-t border-emerald-950/20 text-[10px] text-gray-600 font-mono z-10 select-none">
        © {new Date().getFullYear()} AGRO VISION INTEL ENGINE. ALL RIGHTS SECURED.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <MainLayout />
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}
