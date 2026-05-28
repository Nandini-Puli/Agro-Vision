import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Cloud, Globe, ArrowRight, Cpu, Sparkles } from 'lucide-react';

export default function Home() {
  const { t } = useLanguage();
  const { currentUser } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      
      {/* Sci-fi tech grid background scrolling */}
      <div className="absolute inset-0 z-0 animate-grid opacity-20 pointer-events-none" />

      {/* Floating neon light blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

      {/* Hero Section Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-16 md:py-24 text-center flex flex-col items-center">
        
        {/* Animated Badge */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-xs font-bold text-emerald-400 font-mono tracking-widest uppercase mb-6 shadow-neon"
        >
          <Sparkles className="h-3.5 w-3.5 animate-spin" />
          <span>Farming Systems Reimagined</span>
        </motion.div>

        {/* Brand Headline */}
        <motion.h1 
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 font-sans leading-none"
        >
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent neon-glow-text font-mono">
            {t('brand')}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-2xl text-sm md:text-base text-gray-400 font-medium mb-10 leading-relaxed"
        >
          {t('heroSubtitle')}
        </motion.p>

        {/* Call to Actions */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16"
        >
          <Link 
            to={currentUser ? "/dashboard" : "/login"}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 shadow-neonStrong text-sm font-bold text-white tracking-wider font-mono hover:scale-105 transition-all neon-btn cursor-pointer"
          >
            <span>{t('getStarted')}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a 
            href="#features"
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg border border-emerald-800/40 hover:border-emerald-500/50 bg-emerald-950/20 hover:bg-emerald-950/40 text-sm font-bold text-gray-300 transition-all font-mono"
          >
            {t('learnMore')}
          </a>
        </motion.div>

        {/* Feature Highlights Grid */}
        <motion.div 
          id="features"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8"
        >
          {/* Card 1: Disease Scan */}
          <motion.div 
            variants={itemVariants}
            className="glass-card p-6 md:p-8 rounded-2xl flex flex-col items-center text-center relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
            <div className="p-4 rounded-xl bg-emerald-950/30 text-emerald-400 border border-emerald-800/35 mb-4 shadow-neon">
              <Cpu className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide font-mono mb-2">{t('diseaseScanner')}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Identify fungal and bacterial infections in milliseconds. Manually normalized ResNet50 neural nodes predict precise cellular states.
            </p>
          </motion.div>

          {/* Card 2: Crop Recommendations */}
          <motion.div 
            variants={itemVariants}
            className="glass-card p-6 md:p-8 rounded-2xl flex flex-col items-center text-center relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
            <div className="p-4 rounded-xl bg-emerald-950/30 text-emerald-400 border border-emerald-800/35 mb-4 shadow-neon">
              <Cloud className="h-6 w-6 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide font-mono mb-2">{t('cropMatcher')}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Query real-time coordinates against active atmospheric telemetry. Match local microclimates dynamically with optimal soil yields.
            </p>
          </motion.div>

          {/* Card 3: Multi-Language */}
          <motion.div 
            variants={itemVariants}
            className="glass-card p-6 md:p-8 rounded-2xl flex flex-col items-center text-center relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
            <div className="p-4 rounded-xl bg-emerald-950/30 text-emerald-400 border border-emerald-800/35 mb-4 shadow-neon">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide font-mono mb-2">Multilingual Bridge</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Access the power of smart farming in Hindi (हिन्दी), Telugu (తెలుగు), or English. Break down barrier diagnostics locally.
            </p>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
