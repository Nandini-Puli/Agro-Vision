import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { X, Search, Calendar, Check, Edit2, Trash2, ShieldAlert, Cloud, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfileDrawer({ isOpen, onClose }) {
  const { currentUser, userData, updateProfileData, logout } = useAuth();
  const { t } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userData?.username || '');
  const [editImage, setEditImage] = useState(userData?.profileImage || '');

  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, scans, crops
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Sync edits
  useEffect(() => {
    if (userData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditName(userData.username);
      setEditImage(userData.profileImage);
    }
  }, [userData]);

  // Load history from Firestore
  const fetchHistory = useCallback(async () => {
    if (!currentUser) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'history'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(items);
    } catch (err) {
      console.error("Error loading history from Firestore:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen && currentUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchHistory();
    }
  }, [isOpen, currentUser, fetchHistory]);

  const handleSaveProfile = async () => {
    try {
      await updateProfileData({
        username: editName,
        profileImage: editImage
      });
      setIsEditing(false);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await deleteDoc(doc(db, 'history', itemId));
      setHistory(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  // Filter history
  const filteredHistory = history.filter(item => {
    const matchesSearch = 
      (item.disease && item.disease.toLowerCase().includes(search.toLowerCase())) ||
      (item.cropType && item.cropType.toLowerCase().includes(search.toLowerCase())) ||
      (item.resolved_location && item.resolved_location.toLowerCase().includes(search.toLowerCase())) ||
      (item.recommendation && item.recommendation.toLowerCase().includes(search.toLowerCase())) ||
      (item.treatment && item.treatment.toLowerCase().includes(search.toLowerCase()));

    if (filterType === 'all') return matchesSearch;
    if (filterType === 'scans') return matchesSearch && !!item.disease;
    if (filterType === 'crops') return matchesSearch && !item.disease && !!item.recommendation;
    return matchesSearch;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Sliding Drawer Container */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg glass-card z-50 overflow-y-auto p-6 md:p-8 flex flex-col border-l border-emerald-500/25"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-emerald-800/35">
              <h2 className="text-xl font-bold text-emerald-400 tracking-wider font-mono uppercase neon-glow-text">{t('profile')}</h2>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-emerald-950/40 text-gray-400 hover:text-emerald-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Info Summary */}
            <div className="py-6 flex flex-col items-center border-b border-emerald-800/35">
              <div className="relative group mb-4">
                <img 
                  src={editImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${userData?.username || 'user'}`}
                  alt="Avatar" 
                  className="h-24 w-24 rounded-full bg-darkBg border-2 border-emerald-500/60 p-1 object-cover"
                />
                {isEditing && (
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-white">Avatar URL</span>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="w-full space-y-3">
                  <div>
                    <label className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono uppercase block mb-1">{t('username')}</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full glass-input px-3 py-1.5 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono uppercase block mb-1">Avatar Image URL</label>
                    <input 
                      type="text" 
                      value={editImage}
                      onChange={(e) => setEditImage(e.target.value)}
                      placeholder="Or leave empty for random robot"
                      className="w-full glass-input px-3 py-1.5 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex space-x-2 pt-1 justify-center">
                    <button 
                      onClick={handleSaveProfile}
                      className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-lg shadow-neon"
                    >
                      <Check className="h-3 w-3" />
                      <span>{t('saveChanges')}</span>
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs font-bold text-gray-200 rounded-lg"
                    >
                      {t('close')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center w-full">
                  <div className="flex items-center justify-center space-x-1.5">
                    <h3 className="text-lg font-bold text-gray-100 tracking-wide font-mono">{userData?.username}</h3>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="p-1 rounded text-gray-400 hover:text-emerald-400 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{userData?.email}</p>
                  
                  <div className="flex items-center justify-center space-x-1.5 mt-3 text-xs text-emerald-400/80 bg-emerald-950/20 border border-emerald-800/10 px-3 py-1.5 rounded-full inline-flex font-mono">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{t('joinedDate')}: {userData?.joinedDate}</span>
                  </div>
                </div>
              )}
            </div>

            {/* History Explorer */}
            <div className="flex-1 flex flex-col pt-6 min-h-0">
              <h4 className="text-sm font-bold text-emerald-400 font-mono tracking-wider mb-3 uppercase flex items-center">
                <History className="h-4.5 w-4.5 mr-1.5" />
                <span>{t('scanHistory')} & {t('cropHistory')}</span>
              </h4>

              {/* Search & Filter Options */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600" />
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('searchHistory') + '...'}
                    className="w-full glass-input pl-9 pr-4 py-2 rounded-lg text-xs"
                  />
                </div>
                
                {/* Filters */}
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setFilterType('all')}
                    className={`flex-1 text-center py-1 rounded-lg text-xs font-bold transition-all border ${filterType === 'all' ? 'bg-emerald-600 text-white border-emerald-500 shadow-neon' : 'bg-emerald-950/20 text-gray-400 border-emerald-800/30 hover:border-emerald-700'}`}
                  >
                    {t('all')}
                  </button>
                  <button 
                    onClick={() => setFilterType('scans')}
                    className={`flex-1 text-center py-1 rounded-lg text-xs font-bold transition-all border ${filterType === 'scans' ? 'bg-emerald-600 text-white border-emerald-500 shadow-neon' : 'bg-emerald-950/20 text-gray-400 border-emerald-800/30 hover:border-emerald-700'}`}
                  >
                    {t('scans')}
                  </button>
                  <button 
                    onClick={() => setFilterType('crops')}
                    className={`flex-1 text-center py-1 rounded-lg text-xs font-bold transition-all border ${filterType === 'crops' ? 'bg-emerald-600 text-white border-emerald-500 shadow-neon' : 'bg-emerald-950/20 text-gray-400 border-emerald-800/30 hover:border-emerald-700'}`}
                  >
                    {t('crops')}
                  </button>
                </div>
              </div>

              {/* History List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {loadingHistory ? (
                  <div className="text-center py-8 text-emerald-400/60 text-xs font-mono animate-pulse">
                    Loading records from database...
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-xs">
                    {t('noHistory')}
                  </div>
                ) : (
                  filteredHistory.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-3.5 rounded-lg border border-emerald-800/40 bg-emerald-950/10 hover:border-emerald-600/30 transition-all flex flex-col space-y-2 relative group"
                    >
                      {/* Delete Button */}
                      <button 
                        onClick={() => handleDeleteItem(item.id)}
                        className="absolute top-3 right-3 p-1 rounded hover:bg-red-950/50 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t('delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      {item.disease ? (
                        /* Disease Scan Record */
                        <>
                          <div className="flex items-center space-x-2">
                            <span className="p-1 rounded bg-red-950/30 text-red-400 border border-red-900/40">
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-[10px] text-emerald-400/70 font-mono">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex space-x-3 mt-1">
                            {item.image && (
                              <img 
                                src={item.image} 
                                alt="scan" 
                                className="h-12 w-12 rounded object-cover border border-emerald-800/40"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-gray-100 truncate">{item.disease}</h5>
                              <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                                {t('confidence')}: {item.confidence}% | {item.cropType}
                              </p>
                            </div>
                          </div>

                          {item.treatment && (
                            <div className="mt-2 text-[10px] text-gray-300 bg-emerald-950/20 p-2 rounded border border-emerald-900/10 max-h-24 overflow-y-auto whitespace-pre-line font-sans">
                              {item.treatment.slice(0, 160)}...
                            </div>
                          )}
                        </>
                      ) : (
                        /* Crop Match Record */
                        <>
                          <div className="flex items-center space-x-2">
                            <span className="p-1 rounded bg-sky-950/30 text-sky-400 border border-sky-900/40">
                              <Cloud className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-[10px] text-emerald-400/70 font-mono">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <div className="mt-1">
                            <h5 className="text-xs font-bold text-gray-100">
                              {item.weather?.location || 'Unknown Location'} Match
                            </h5>
                            <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                              Temp: {item.weather?.temperature} | Hum: {item.weather?.humidity}
                            </p>
                          </div>

                          {item.recommendation && (
                            <div className="mt-1 text-[10px] text-gray-300 bg-emerald-950/20 p-2 rounded border border-emerald-900/10 max-h-24 overflow-y-auto whitespace-pre-line font-sans">
                              {item.recommendation.slice(0, 180)}...
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Logout Button */}
              <div className="pt-4 border-t border-emerald-800/35 mt-4">
                <button 
                  onClick={() => { logout(); onClose(); }}
                  className="w-full py-2.5 rounded-lg border border-red-500/20 bg-red-950/10 hover:bg-red-950/30 hover:border-red-500/50 text-xs font-bold text-red-400 tracking-wider uppercase font-mono transition-all flex items-center justify-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('logout')}</span>
                </button>
              </div>

            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
