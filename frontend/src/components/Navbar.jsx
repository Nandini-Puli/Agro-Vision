import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Globe, LogOut, Menu, Sprout, X } from 'lucide-react';

export default function Navbar({ onOpenProfile }) {
  const { currentUser, userData, logout } = useAuth();
  const { locale, changeLanguage, t } = useLanguage();
  const location = useLocation();
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const authedLinks = [
    { to: '/dashboard', label: t('dashboard') },
    { to: '/disease-detection', label: t('diseaseScanner') },
    { to: '/crop-recommendation', label: t('cropRec') },
    { to: '/history', label: t('scanHistory') },
  ];

  return (
    <nav className="glass-nav sticky top-0 z-50 px-4 py-3 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-2 text-emerald-400 font-black tracking-widest text-lg md:text-xl font-mono">
          <Sprout className="h-6 w-6 text-emerald-400 animate-pulse" />
          <span>{t('brand')}</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-6">
          <Link 
            to="/" 
            className={`text-sm font-medium tracking-wide transition-colors ${isActive('/') ? 'text-emerald-400' : 'text-gray-300 hover:text-emerald-300'}`}
          >
            {t('home')}
          </Link>
          
          {currentUser && (
            <>
              {authedLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-medium tracking-wide transition-colors ${isActive(link.to) ? 'text-emerald-400' : 'text-gray-300 hover:text-emerald-300'}`}
                >
                  {link.label}
                </Link>
              ))}
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-4">
          
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center space-x-1 p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/30 hover:border-emerald-500/50 transition-all text-gray-300 hover:text-emerald-400"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs uppercase font-bold font-mono">{locale}</span>
            </button>

            {langOpen && (
              <div className="absolute right-0 mt-2 w-32 rounded-lg bg-emerald-950 border border-emerald-800 shadow-2xl py-1 text-sm z-50">
                <button 
                  onClick={() => { changeLanguage('en'); setLangOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-emerald-900/60 hover:text-emerald-300 transition-colors font-medium text-gray-200"
                >
                  English
                </button>
                <button 
                  onClick={() => { changeLanguage('te'); setLangOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-emerald-900/60 hover:text-emerald-300 transition-colors font-medium text-gray-200"
                >
                  తెలుగు
                </button>
                <button 
                  onClick={() => { changeLanguage('hi'); setLangOpen(false); }}
                  className="w-full text-left px-4 py-2 hover:bg-emerald-900/60 hover:text-emerald-300 transition-colors font-medium text-gray-200"
                >
                  हिन्दी
                </button>
              </div>
            )}
          </div>

          {/* User Section */}
          {currentUser ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMobileOpen((open) => !open)}
                className="md:hidden p-2 rounded-lg border border-emerald-800/30 bg-emerald-950/30 text-gray-300 hover:text-emerald-400"
                title="Navigation menu"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <button 
                onClick={onOpenProfile}
                className="flex items-center justify-center p-0.5 rounded-full bg-emerald-500 shadow-neon hover:shadow-neonStrong transition-all cursor-pointer"
              >
                <img 
                  src={userData?.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData?.username || 'user'}`}
                  alt="Profile" 
                  className="h-8 w-8 rounded-full bg-darkBg object-cover"
                />
              </button>
              <button 
                onClick={logout}
                className="hidden md:flex p-2 rounded-lg hover:bg-emerald-950/30 text-gray-400 hover:text-red-400 transition-colors"
                title={t('logout')}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="text-xs md:text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 shadow-neon text-white font-mono hover:scale-105 transition-all"
            >
              {t('login')}
            </Link>
          )}

        </div>
      </div>

      {currentUser && mobileOpen && (
        <div className="md:hidden max-w-7xl mx-auto mt-3 grid gap-2 border-t border-emerald-900/30 pt-3">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className={`px-3 py-2 rounded-lg text-xs font-mono uppercase ${isActive('/') ? 'bg-emerald-600 text-white' : 'bg-emerald-950/20 text-gray-300'}`}
          >
            {t('home')}
          </Link>
          {authedLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`px-3 py-2 rounded-lg text-xs font-mono uppercase ${isActive(link.to) ? 'bg-emerald-600 text-white' : 'bg-emerald-950/20 text-gray-300'}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
