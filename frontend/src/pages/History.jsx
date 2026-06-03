import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function History() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null, // 'single' or 'all'
    recordId: null,
    recordName: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleOpenDeleteConfirm = (recordId, recordName) => {
    setConfirmDialog({
      isOpen: true,
      type: 'single',
      recordId,
      recordName,
    });
  };

  const handleOpenDeleteAllConfirm = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'all',
      recordId: null,
      recordName: '',
    });
  };

  const handleDeleteScan = async () => {
    setIsDeleting(true);
    try {
      const recordDocRef = doc(db, 'history', confirmDialog.recordId);
      await deleteDoc(recordDocRef);
      setConfirmDialog({ isOpen: false, type: null, recordId: null, recordName: '' });
    } catch (err) {
      console.error('Delete scan error:', err);
      alert('Failed to delete scan: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllHistory = async () => {
    setIsDeleting(true);
    try {
      const deletePromises = records.map((record) =>
        deleteDoc(doc(db, 'history', record.id))
      );
      await Promise.all(deletePromises);
      setConfirmDialog({ isOpen: false, type: null, recordId: null, recordName: '' });
    } catch (err) {
      console.error('Delete all history error:', err);
      alert('Failed to delete all history: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (confirmDialog.type === 'single') {
      await handleDeleteScan();
    } else if (confirmDialog.type === 'all') {
      await handleDeleteAllHistory();
    }
  };

  const handleCloseDialog = () => {
    if (!isDeleting) {
      setConfirmDialog({ isOpen: false, type: null, recordId: null, recordName: '' });
    }
  };

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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-emerald-400">{t('scanHistory')}</h2>
        {records.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenDeleteAllConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            <span className="text-sm font-medium">{t('deleteAll', 'Delete All History')}</span>
          </motion.button>
        )}
      </div>
      {records.length === 0 ? (
        <p className="text-gray-400">{t('noHistory')}</p>
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {records.map((rec) => (
              <motion.div
                key={rec.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="glass-card rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center group"
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
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleOpenDeleteConfirm(rec.id, rec.disease || t('unknownDisease'))}
                  disabled={isDeleting}
                  className="mt-4 md:mt-0 md:ml-4 flex-shrink-0 p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete this scan"
                >
                  <Trash2 size={18} />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDialog}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-gray-900 border border-emerald-500/30 rounded-xl p-6 max-w-sm w-full shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {confirmDialog.type === 'single' ? 'Delete Scan' : 'Delete All History'}
                </h3>
                <p className="text-gray-300 mb-6">
                  {confirmDialog.type === 'single'
                    ? `Are you sure you want to delete this scan (${confirmDialog.recordName})? This action cannot be undone.`
                    : 'Are you sure you want to delete all scan history? This action cannot be undone.'}
                </p>
                <div className="flex gap-3 justify-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCloseDialog}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isDeleting && <Loader2 size={16} className="animate-spin" />}
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
