import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, ShieldAlert, Sprout } from 'lucide-react';

export default function Signup() {
  const { signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !email || !password) {
      return setError('Please fill in all input fields.');
    }

    if (password.length < 6) {
      return setError('Password must contain at least 6 characters.');
    }

    setLoading(true);
    try {
      await signup(email, password, username);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email address already exists.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please provide a valid email format.');
      } else if (err.code === 'auth/weak-password') {
        setError('The password is too weak. Try another.');
      } else {
        setError('Registration failed. Please check details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-65px)] flex items-center justify-center px-4 overflow-hidden py-10">
      
      {/* Background decorations */}
      <div className="absolute inset-0 z-0 animate-grid opacity-10 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />

      <motion.div 
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md glass-card rounded-2xl p-6 md:p-8 border border-emerald-500/20"
      >
        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-full bg-emerald-950/45 border border-emerald-500/30 text-emerald-400 mb-3 shadow-neon">
            <Sprout className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-100 tracking-wider font-mono uppercase">{t('signup')}</h2>
          <p className="text-xs text-gray-400 mt-1">Create your AGRO VISION account</p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 text-xs flex items-start space-x-2"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono uppercase block mb-1.5">{t('username')}</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4.5 w-4.5 text-emerald-600" />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Rao Farmer"
                className="w-full glass-input pl-10 pr-4 py-2.5 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono uppercase block mb-1.5">{t('email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-emerald-600" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@agrovision.com"
                className="w-full glass-input pl-10 pr-4 py-2.5 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono uppercase block mb-1.5">{t('password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-emerald-600" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full glass-input pl-10 pr-4 py-2.5 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 shadow-neon text-sm font-bold text-white tracking-wider font-mono uppercase transition-all flex items-center justify-center space-x-2 mt-6 cursor-pointer"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>{t('signup')}</span>
              </>
            )}
          </button>
        </form>

        {/* Redirect */}
        <div className="text-center mt-6 text-xs text-gray-400 font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline">
            {t('login')} here
          </Link>
        </div>

      </motion.div>
    </div>
  );
}
