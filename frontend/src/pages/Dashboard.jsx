import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  Activity,
  Bell,
  Calendar,
  ChevronRight,
  CloudSun,
  History,
  Loader2,
  Mail,
  ScanSearch,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  User,
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { currentUser, userData } = useAuth();
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      if (!currentUser) return;
      setLoadingHistory(true);
      setHistoryError('');

      try {
        const q = query(
          collection(db, 'history'),
          where('userId', '==', currentUser.uid),
          limit(6)
        );
        const snap = await getDocs(q);
        if (active) {
          setHistory(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error('Failed to load dashboard history:', error);
        if (active) setHistoryError('Recent activity is temporarily unavailable.');
      } finally {
        if (active) setLoadingHistory(false);
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [currentUser]);

 const stats = useMemo(() => {
  const scans = history.filter((item) => item.disease).length;

  const cropMatches = history.filter(
    (item) => item.cropType
  ).length;

  const treatments = history.filter(
    (item) => item.treatment
  ).length;

  return [
    {
      label: 'Disease Scans',
      value: scans,
      icon: ScanSearch,
      tone: 'text-emerald-300',
    },
    {
      label: 'Crop Matches',
      value: cropMatches,
      icon: Sprout,
      tone: 'text-teal-300',
    },
    {
      label: 'Treatment Plans',
      value: treatments,
      icon: ShieldCheck,
      tone: 'text-lime-300',
    },
  ];
}, [history]);
  const displayName = userData?.username || currentUser?.displayName || 'Farmer';
  const email = userData?.email || currentUser?.email || 'No email available';
  const avatar = userData?.profileImage || currentUser?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${displayName}`;
  const joinedDate = userData?.joinedDate || 'Recently Joined';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 relative">
      <div className="absolute top-12 left-6 w-72 h-72 bg-emerald-500/5 rounded-full blur-[90px] pointer-events-none" />

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-mono mb-2">Command Dashboard</p>
          <h1 className="text-2xl md:text-4xl font-black text-white font-mono leading-tight">
            Welcome back, <span className="text-emerald-400 neon-glow-text">{displayName}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">
            Monitor your Agro Vision activity, profile status, recommendations, and AI farming workflow from one control center.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/disease-detection"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono uppercase shadow-neon transition-all"
          >
            <ScanSearch className="h-4 w-4" />
            Start Scan
          </Link>
          <Link
            to="/crop-recommendation"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-800/40 bg-emerald-950/20 hover:bg-emerald-950/40 text-gray-200 text-xs font-bold font-mono uppercase transition-all"
          >
            <CloudSun className="h-4 w-4" />
            Crop Match
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-1 glass-card rounded-2xl p-6"
        >
          <div className="flex items-center gap-4">
            <img
              src={avatar}
              alt="Profile"
              className="h-20 w-20 rounded-full border-2 border-emerald-500/60 bg-darkBg object-cover p-1 shadow-neon"
            />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white font-mono truncate">{displayName}</h2>
              <p className="text-xs text-gray-400 truncate">{email}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/30 border border-emerald-800/25 text-[10px] text-emerald-300 font-mono">
                <ShieldCheck className="h-3 w-3" />
                Authenticated
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <InfoRow icon={User} label="User Name" value={displayName} />
            <InfoRow icon={Mail} label="Email ID" value={email} />
            <InfoRow icon={Calendar} label="Joined Date" value={joinedDate} />
          </div>
        </motion.section>

        <section className="xl:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass-card rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="p-2 rounded-lg bg-emerald-950/35 border border-emerald-800/25">
                  <stat.icon className={`h-5 w-5 ${stat.tone}`} />
                </span>
                <Activity className="h-4 w-4 text-emerald-700" />
              </div>
              <p className="text-3xl font-black font-mono text-white">{stat.value}</p>
              <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-mono mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </section>

        <section className="xl:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 mb-5 pb-3 border-b border-emerald-800/35">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-emerald-400" />
              <h2 className="text-sm font-bold text-emerald-400 font-mono uppercase tracking-widest">Recent Activity</h2>
            </div>
            <Link to="/history" className="text-[10px] text-gray-400 hover:text-emerald-300 font-mono uppercase">
              View all
            </Link>
          </div>

          {loadingHistory ? (
            <div className="py-14 flex flex-col items-center gap-3 text-emerald-400/70">
              <Loader2 className="h-7 w-7 animate-spin" />
              <span className="text-xs font-mono">Loading field records...</span>
            </div>
          ) : historyError ? (
            <div className="py-10 text-center text-xs text-red-300 font-mono">{historyError}</div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-500">
              No activity yet. Start with a disease scan or crop recommendation.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-emerald-900/30 bg-emerald-950/10"
                >
                  <span className="shrink-0 p-2 rounded-lg bg-emerald-950/35 border border-emerald-800/20 text-emerald-300">
                    {item.disease ? <ScanSearch className="h-4 w-4" /> : <Sprout className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-100 font-semibold truncate">
                      {item.disease || item.weather?.location || 'Crop Recommendation'}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono truncate">
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recently'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-emerald-700" />
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="xl:col-span-1 space-y-6">
          <Panel
            icon={Bell}
            title="Notifications"
            items={[
              'Disease scans are routed through Hugging Face only.',
              'Treatment plans use Gemini after detection.',
              'Weather crop matching is available from live telemetry.',
            ]}
          />
          <Panel
            icon={Settings}
            title="Settings"
            items={[
              'Profile avatar and name can be updated from the profile drawer.',
              'History records are saved after successful AI actions.',
              'API errors are handled with safe user messages.',
            ]}
          />
        </aside>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/15 border border-emerald-900/20">
      <Icon className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-mono">{label}</p>
        <p className="text-xs text-gray-200 truncate">{value}</p>
      </div>
    </div>
  );
}

function Panel({ icon: Icon, title, items }) {
  return (
    <section className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-800/35">
        <Icon className="h-4.5 w-4.5 text-emerald-400" />
        <h2 className="text-sm font-bold text-emerald-400 font-mono uppercase tracking-widest">{title}</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-xs text-gray-300 leading-relaxed">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
