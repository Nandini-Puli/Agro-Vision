import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function History() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      setError('User not authenticated');
      return;
    }
    const q = query(
      collection(db, 'history'),
      where('userId', '==', currentUser.uid)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setRecords(data);
        setLoading(false);
      },
      (err) => {
        console.error('History fetch error:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-emerald-400">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <span className="text-sm">{t('loadingHistory')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-400 text-center">{error}</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:px-8">
      <h2 className="text-2xl font-bold text-emerald-400 mb-6">{t('scanHistory')}</h2>
      {records.length === 0 ? (
        <p className="text-gray-400">{t('noHistory')}</p>
      ) : (
        <div className="space-y-6">
          {records.map((rec) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-card rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center"
            >
              <div className="w-full md:w-32 h-32 flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                {rec.image ? (
                  <img src={rec.image} alt="scan" className="w-full h-full object-cover rounded" />
                ) : (
                  <div className="w-full h-full bg-emerald-900/30 flex items-center justify-center text-emerald-400">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-white">{rec.disease || t('unknownDisease')}</h3>
                  <span className="text-xs text-emerald-400">{rec.timestamp
      ? rec.timestamp.toDate
        ? rec.timestamp.toDate().toLocaleString()
        : new Date(rec.timestamp).toLocaleString()
      : 'No Date'}</span>
                </div>
                <p className="text-sm text-gray-300 mb-1">
                  {t('confidence')}: <span className="text-emerald-400">{rec.confidence ? `${rec.confidence}%` : t('n/a')}</span>
                </p>
                {rec.treatment && (
                  <p className="text-xs text-gray-400 mt-2">
                    {t('treatmentProvided')}: {rec.treatment.slice(0, 80)}{rec.treatment.length > 80 && '...'}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
