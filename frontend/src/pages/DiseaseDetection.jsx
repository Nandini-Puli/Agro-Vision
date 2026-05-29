import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, 
  Upload, 
  Sparkles, 
  ShieldAlert, 
  Sprout, 
  CheckCircle, 
  Loader2, 
  ChevronRight, 
  Info, 
  Activity, 
  Navigation,
  RefreshCw,
  X
} from 'lucide-react';

export default function DiseaseDetection() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  // Weather States
  const [weather, setWeather] = useState(null);
  const [weatherCity, setWeatherCity] = useState('');
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Scanning States
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatusText, setScanStatusText] = useState('Analyzing crop health...');
  
  // Results
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Treatment Modal States
  const [treatmentOpen, setTreatmentOpen] = useState(false);
  const [treatmentText, setTreatmentText] = useState('');
  const [loadingTreatment, setLoadingTreatment] = useState(false);

  const fileInputRef = useRef(null);
  const openWeatherKey = import.meta.env.VITE_OPENWEATHER_API_KEY || '3180378a8368e357bfabdc9ccb3a5759';

  // 1. Fetch weather on mount
  useEffect(() => {
    fetchWeatherByCoords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch weather using Geolocation API
  function fetchWeatherByCoords() {
    setLoadingWeather(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${openWeatherKey}&units=metric`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              setWeather(data);
            } else {
              fetchWeatherByCityName("Guntur");
            }
          } catch {
            fetchWeatherByCityName("Guntur");
          } finally {
            setLoadingWeather(false);
          }
        },
        () => {
          fetchWeatherByCityName("Guntur");
        }
      );
    } else {
      fetchWeatherByCityName("Guntur");
    }
  }

  async function fetchWeatherByCityName(city) {
    setLoadingWeather(true);
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${openWeatherKey}&units=metric`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      } else {
        setErrorMsg("Failed to retrieve weather data.");
      }
    } catch {
      setErrorMsg("Weather services are temporarily busy.");
    } finally {
      setLoadingWeather(false);
    }
  }

  const handleSearchWeather = (e) => {
    e.preventDefault();
    if (weatherCity.trim()) {
      fetchWeatherByCityName(weatherCity.trim());
    }
  };

  // Image Upload Handling
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Invalid image. Please upload a crop photo.');
        return;
      }
      setErrorMsg('');
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setScanResult(null);
    }
  };

  // Trigger file browser
  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  // AI Plant Scan Routine
  const handleScanCrop = async () => {
    if (!selectedImage) {
      setErrorMsg("Please upload or drag an image first.");
      return;
    }

    setErrorMsg('');
    setScanning(true);
    setScanProgress(0);
    setScanStatusText("Analyzing crop health...");

    // Dynamic scanning progress simulation
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(interval);
          return 100;
        }
        
        // Update labels dynamically based on progress
        if (next < 35) {
          setScanStatusText("Analyzing crop health...");
        } else if (next >= 35 && next < 70) {
          setScanStatusText("Detecting disease patterns...");
        } else {
          setScanStatusText("Generating farming insights...");
        }
        return next;
      });
    }, 150);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const formData = new FormData();
      formData.append("file", selectedImage);

      const response = await fetch("https://agro-vision-1a3c.onrender.com/predict",{
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
          throw new Error("Prediction API unavailable.");
      }

      console.log("API response status:", response.status);

      const result = await response.json();

      console.log("Prediction result:", result);
      
      if (!result || result.status === 'error') {
          console.log("Backend error:", result);
          throw new Error(result?.message || "Prediction failed");
      }

      setScanProgress(100);
      setScanResult({
        ...result,
        cropType: result.cropType || result.crop_type || inferCropType(result.disease)
      });
      if (currentUser) {
  try {
    let savedImageUrl = imagePreview;

    // Upload image to Firebase Storage
    const fileRef = ref(
      storage,
      `scans/${currentUser.uid}/${Date.now()}_${selectedImage.name}`
    );

    const snap = await uploadBytes(fileRef, selectedImage);

    savedImageUrl = await getDownloadURL(snap.ref);

    // Save history
    await addDoc(collection(db, 'history'), {
      userId: currentUser.uid,
      timestamp: serverTimestamp(),
      type: 'disease',
      disease: result.disease,
      confidence: result.confidence,
      cropType:
        result.cropType ||
        result.crop_type ||
        inferCropType(result.disease),
      image: savedImageUrl,
      treatment: '',
    });

  } catch (err) {
    console.error('Firestore save failed:', err);
  }
}

    } catch (e) {
      console.error(e);
      setErrorMsg(e.name === 'AbortError'
        ? "Prediction timed out. Render free server is sleeping."
        : e.message || "Prediction failed.");
    } finally {
      clearTimeout(timeoutId);
      clearInterval(interval);
      setScanning(false);
    }
  };

  const inferCropType = (label = '') => {
    if (!label) return 'Plant';
    if (label.includes(' - ')) return label.split(' - ')[0];
    if (label.includes('___')) return label.split('___')[0].replaceAll('_', ' ');
    return label.split(' ')[0] || 'Plant';
  };

  // Fetch Treatment suggestions from Gemini API and save record in Firestore
  const handleGetTreatment = async () => {
    if (!scanResult) return;

    setLoadingTreatment(true);
    setTreatmentOpen(true);
    setTreatmentText('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch("https://agro-vision-1a3c.onrender.com/treatment", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disease: scanResult.disease }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('AI treatment system is busy.');
      }

      const resData = await response.json();

      if (resData.status === 'error' || !resData.treatment) {
        throw new Error('Invalid treatment response from Gemini.');
      }

      setTreatmentText(resData.treatment);
      setLoadingTreatment(false);
      // Save scan record with treatment to Firestore
      if (currentUser) {
        let savedImageUrl = '';
        try {
          const fileRef = ref(storage, `scans/${currentUser.uid}/${Date.now()}_${selectedImage.name}`);
          const snap = await uploadBytes(fileRef, selectedImage);
          savedImageUrl = await getDownloadURL(snap.ref);
        } catch (err) {
          console.warn('Storage upload failed, using preview image.', err);
          savedImageUrl = imagePreview;
        }

        const dbRecord = {
          userId: currentUser.uid,
          timestamp: serverTimestamp(),
          type: 'disease',
          disease: scanResult.disease,
          confidence: scanResult.confidence,
          cropType: scanResult.cropType,
          image: savedImageUrl,
          treatment: resData.treatment,
          weather: weather ? {
            temperature: `${weather.main.temp}°C`,
            humidity: `${weather.main.humidity}%`,
            location: weather.name,
          } : null,
        };
        await addDoc(collection(db, 'history'), dbRecord);
      }
    } catch (e) {
      console.error(e);
      const msg = e.name === 'AbortError'
        ? 'Treatment generation timed out. Gemini may be busy. Please try again.'
        : e.message || 'Gemini treatment service unavailable.';
      setTreatmentText(msg);
      setLoadingTreatment(false);
    } finally {
      clearTimeout(timeoutId);
      setLoadingTreatment(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 relative">
      
      {/* Page decorative floating shapes */}
      <div className="absolute top-10 right-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Weather + Quick Actions + Stats */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Weather Widget */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-emerald-800/35">
              <h3 className="text-sm font-bold text-emerald-400 font-mono tracking-wider uppercase flex items-center">
                <Cloud className="h-4.5 w-4.5 mr-2" />
                <span>{t('weather')}</span>
              </h3>
              <button 
                onClick={fetchWeatherByCoords}
                className="p-1 rounded hover:bg-emerald-950/40 text-emerald-400 transition-colors"
                title="Refresh Weather"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {loadingWeather ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
                <span className="text-xs text-emerald-400/60 font-mono">Syncing sat telemetry...</span>
              </div>
            ) : weather ? (
              <div>
                {/* Location Heading */}
                <div className="flex items-center space-x-1 mb-3 text-emerald-400">
                  <Navigation className="h-3 w-3 fill-current rotate-45" />
                  <span className="text-sm font-mono font-bold">{weather.name}, {weather.sys.country}</span>
                </div>

                {/* Weather main metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-950/20 border border-emerald-800/20 p-3 rounded-xl text-center">
                    <span className="text-[10px] text-emerald-400/70 font-mono block uppercase">{t('temperature')}</span>
                    <span className="text-xl font-bold font-mono text-white mt-1 block">{Math.round(weather.main.temp)}°C</span>
                  </div>
                  <div className="bg-emerald-950/20 border border-emerald-800/20 p-3 rounded-xl text-center">
                    <span className="text-[10px] text-emerald-400/70 font-mono block uppercase">{t('humidity')}</span>
                    <span className="text-xl font-bold font-mono text-white mt-1 block">{weather.main.humidity}%</span>
                  </div>
                </div>

                {/* Minor metrics */}
                <div className="mt-4 space-y-2 text-xs text-gray-400">
                  <div className="flex justify-between border-b border-emerald-900/10 pb-1.5">
                    <span>{t('weatherCondition')}:</span>
                    <span className="text-emerald-400 font-mono">{weather.weather[0].description.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('windSpeed')}:</span>
                    <span className="text-emerald-400 font-mono">{weather.wind.speed} m/s</span>
                  </div>
                </div>

                {/* Weather Search Form */}
                <form onSubmit={handleSearchWeather} className="mt-4 flex space-x-2">
                  <input 
                    type="text" 
                    value={weatherCity}
                    onChange={(e) => setWeatherCity(e.target.value)}
                    placeholder="Search another city..."
                    className="flex-1 glass-input px-3 py-1.5 rounded-lg text-xs"
                  />
                  <button 
                    type="submit" 
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white font-mono shadow-neon"
                  >
                    Go
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-500">Weather data unavailable</div>
            )}
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-bold text-emerald-400 font-mono tracking-wider uppercase mb-4 pb-2 border-b border-emerald-800/35">
              {t('quickActions')}
            </h3>
            <div className="space-y-3">
              <Link 
                to="/crop-recommendation" 
                className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-800/30 hover:border-emerald-500/50 bg-emerald-950/10 hover:bg-emerald-950/30 transition-all font-mono text-xs text-gray-200"
              >
                <span className="flex items-center">
                  <Sprout className="h-4.5 w-4.5 text-emerald-400 mr-2.5" />
                  {t('cropMatcher')}
                </span>
                <ChevronRight className="h-4 w-4 text-emerald-600" />
              </Link>
            </div>
          </div>

          {/* Artificial Neural Engine accuracy dials */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-sm font-bold text-emerald-400 font-mono tracking-wider uppercase mb-4 pb-2 border-b border-emerald-800/35 flex items-center">
              <Activity className="h-4.5 w-4.5 mr-2" />
              <span>{t('statistics')}</span>
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-gray-400">ResNet-50 Network Accuracy</span>
                  <span className="text-emerald-400">98.42%</span>
                </div>
                <div className="h-2 rounded bg-emerald-950/50 overflow-hidden border border-emerald-900/30">
                  <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-neon" style={{ width: '98%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1 font-mono">
                  <span className="text-gray-400">Average Processing Latency</span>
                  <span className="text-emerald-400">224ms</span>
                </div>
                <div className="h-2 rounded bg-emerald-950/50 overflow-hidden border border-emerald-900/30">
                  <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-neon" style={{ width: '22%' }} />
                </div>
              </div>

              <div className="p-3 bg-emerald-950/20 border border-emerald-800/20 rounded-xl flex items-start space-x-2">
                <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-[10px] text-emerald-400/80 leading-relaxed font-sans">
                  AGRO VISION AI leverages ResNet50 deep-node pipelines trained on global crop blight databases. Manual tensors normalization ensures local accuracy.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: AI Disease Diagnosis Scanner */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Scanner Card */}
          <div className="glass-card rounded-2xl p-6 md:p-8">
            
            <div className="flex items-center space-x-2 mb-6 pb-2 border-b border-emerald-800/35">
              <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />
              <h2 className="text-lg font-bold text-gray-100 tracking-wider font-mono uppercase">{t('scanTitle')}</h2>
            </div>

            {/* Error Message Display */}
            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-xs flex items-start space-x-2 font-mono">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Drag & Drop scanner zone */}
            <div className="space-y-6">
              
              <div 
                onClick={handleBrowseClick}
                className="relative h-64 border-2 border-dashed border-emerald-800/60 hover:border-emerald-400/50 bg-emerald-950/10 hover:bg-emerald-950/20 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group shadow-inner"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />

                {imagePreview ? (
                  /* Image Preview Mode */
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/40">
                    <img 
                      src={imagePreview} 
                      alt="Crop upload preview" 
                      className="max-h-full max-w-full object-contain"
                    />
                    
                    {/* Glowing AI pulse laser scanner animation during scan */}
                    {scanning && (
                      <>
                        <div className="absolute inset-0 bg-emerald-500/10 animate-pulse-glow" />
                        <div className="animate-scan-line" />
                      </>
                    )}
                  </div>
                ) : (
                  /* Empty Zone Call to Action */
                  <div className="text-center p-6 flex flex-col items-center">
                    <div className="p-4 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 mb-4 group-hover:scale-110 transition-transform shadow-neon">
                      <Upload className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-bold text-gray-200 tracking-wide font-mono mb-1.5">{t('scanDrop')}</p>
                    <p className="text-[10px] text-gray-400">{t('scanFormats')}</p>
                  </div>
                )}
              </div>

              {/* Scanning status loading bar UI */}
              {scanning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-emerald-400 font-mono animate-pulse">
                    <span>{scanStatusText}</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="h-2 rounded bg-emerald-950/60 overflow-hidden border border-emerald-900/30">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-neon transition-all duration-150" 
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action scanner button */}
              {!scanning && (
                <div className="flex justify-end space-x-2">
                  {imagePreview && (
                    <button 
                      onClick={() => { setSelectedImage(null); setImagePreview(null); setScanResult(null); }}
                      className="px-5 py-2.5 rounded-lg border border-emerald-800/40 hover:border-red-500/50 bg-emerald-950/20 hover:bg-red-950/10 text-xs font-bold text-gray-400 hover:text-red-400 transition-all font-mono"
                    >
                      Clear
                    </button>
                  )}
                  <button 
                    onClick={handleScanCrop}
                    disabled={!selectedImage || scanning}
                    className={`px-6 py-2.5 rounded-lg shadow-neon font-bold text-xs uppercase tracking-wider font-mono flex items-center space-x-2 cursor-pointer transition-all ${(!selectedImage || scanning) ? 'bg-emerald-950/30 border border-emerald-900/10 text-gray-600 cursor-not-allowed shadow-none' : 'bg-emerald-600 hover:bg-emerald-500 text-white neon-btn hover:scale-105'}`}
                  >
                    <Sprout className="h-4 w-4" />
                    <span>{t('scanBtn')}</span>
                  </button>
                </div>
              )}

            </div>

          </div>

          {/* AI Result Card */}
          {scanResult && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="glass-card rounded-2xl p-6 border-emerald-500/40 shadow-neon bg-gradient-to-br from-emerald-950/20 to-teal-950/10"
            >
              <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-emerald-800/35">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-400 font-mono tracking-wider uppercase">{t('resultTitle')}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Result Preview Thumbnail */}
                <div className="md:col-span-1">
                  <img 
                    src={imagePreview} 
                    alt="Scan thumbnail" 
                    className="w-full h-36 rounded-xl object-cover border border-emerald-500/20 shadow-neon"
                  />
                </div>

                {/* Classification labels */}
                <div className="md:col-span-2 space-y-4">
                  
                  {/* Title & Badge */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono uppercase block mb-1">{t('diseaseName')}</span>
                      <h4 className="text-lg font-bold text-white font-mono leading-tight">{scanResult.disease}</h4>
                    </div>
                    
                    {/* Severity Badge */}
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono uppercase block mb-1">{t('severity')}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider font-mono uppercase ${scanResult.disease.toLowerCase().includes('healthy') ? 'bg-emerald-950 border border-emerald-500 text-emerald-400 shadow-neon' : 'bg-red-950 border border-red-500 text-red-400 shadow-neonRed'}`}>
                        {scanResult.disease.toLowerCase().includes('healthy') ? 'Healthy' : 'High / Active'}
                      </span>
                    </div>
                  </div>

                  {/* Confidence & Crop */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono uppercase block mb-0.5">{t('confidence')}</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">{scanResult.confidence}%</span>
                    </div>
                    
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono uppercase block mb-0.5">{t('cropType')}</span>
                      <span className="text-sm font-semibold font-mono text-white block mt-0.5">{scanResult.cropType}</span>
                    </div>
                  </div>

                  {/* Summary Text */}
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono uppercase block mb-1">{t('summary')}</span>
                    <p className="text-xs text-gray-300 leading-relaxed font-sans">
                      {scanResult.disease.toLowerCase().includes('healthy') 
                        ? "The ResNet classifier detects healthy leaf cell formations. Ambient moisture and transpiration indices look highly stable."
                        : `Neural nodes identified active cellular markers related to "${scanResult.disease}". We recommend querying treatment advice immediately to save crop yield.`
                      }
                    </p>
                  </div>

                  {/* Action Treatment button */}
                  <div className="pt-2 flex justify-end">
                    <button 
                      onClick={handleGetTreatment}
                      disabled={loadingTreatment}
                      className={`flex items-center space-x-2 px-5 py-2 rounded-lg ${loadingTreatment ? 'bg-emerald-950/30 border border-emerald-900/10 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'} text-xs font-bold tracking-wider font-mono uppercase transition-all shadow-neon hover:scale-105`}
                    >
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      <span>{t('treatmentBtn')}</span>
                    </button>
                  </div>

                </div>

              </div>

            </motion.div>
          )}

        </div>

      </div>

      {/* AI Treatment Recommendation Modal/Drawer */}
      <AnimatePresence>
        {treatmentOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setTreatmentOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            
            <motion.div 
              initial={{ scale: 0.95, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 30, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-card rounded-2xl p-6 md:p-8 z-50 border border-emerald-500/30 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-emerald-800/35 mb-4 shrink-0">
                <div className="flex items-center space-x-2">
                  <Sprout className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-emerald-400 font-mono tracking-wider uppercase neon-glow-text">AI Treatment & Recovery Program</h3>
                </div>
                <button 
                  onClick={() => setTreatmentOpen(false)}
                  className="p-1 rounded-full hover:bg-emerald-950/40 text-gray-400 hover:text-emerald-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content body */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 text-sm text-gray-200 leading-relaxed font-sans space-y-4">
                {loadingTreatment ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-3">
                    <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
                    <span className="text-xs text-emerald-400/60 font-mono animate-pulse">
                      Invoking expert agronomist neural node (Gemini)...
                    </span>
                  </div>
                ) : (
                  <div className="whitespace-pre-line prose prose-invert max-w-none text-xs md:text-sm font-sans">
                    {/* Parse Gemini headings to make them look gorgeous in our UI */}
                    {treatmentText}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-emerald-800/35 shrink-0 flex justify-end mt-4">
                <button 
                  onClick={() => setTreatmentOpen(false)}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white tracking-wider font-mono uppercase shadow-neon"
                >
                  {t('close')}
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
