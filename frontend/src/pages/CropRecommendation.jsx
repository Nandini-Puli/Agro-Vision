import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { 
  Sprout, 
  CloudSun, 
  Loader2, 
  MapPin, 
  Droplet, 
  Thermometer, 
  Wind, 
  ShieldAlert, 
  Compass,
  Lightbulb
} from 'lucide-react';

export default function CropRecommendation() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);

  // Trigger geo-location weather search
  const handleGeoLocationSearch = () => {
  setErrorMsg('');
  setLoading(true);
  setResult(null);

  if (!navigator.geolocation) {
    setLoading(false);
    setErrorMsg("Geolocation is not supported.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        console.log("FULL POSITION:", position);

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        console.log("LAT:", latitude);
        console.log("LON:", longitude);

        alert(`LAT: ${latitude}\nLON: ${longitude}`);

        await fetchRecommendation({
          lat: Number(latitude),
          lon: Number(longitude)
        });

      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to fetch current location.");
        setLoading(false);
      }
    },
    (error) => {
      console.log(error);
      alert("Location Error: " + error.message);

      setLoading(false);

      if (error.code === 1) {
        setErrorMsg("Location permission denied.");
      } else {
        setErrorMsg("Could not detect location.");
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
};
  // Trigger city text search
  const handleCitySearch = async (e) => {
    e.preventDefault();
    if (!location.trim()) {
      setErrorMsg("Please enter a valid city name.");
      return;
    }
    setErrorMsg('');
    setLoading(true);
    setResult(null);
    await fetchRecommendation({
  location: location.trim()
  });

  const fetchRecommendation = async (params) => {
    try {
      console.log("SENDING DATA:", params);
      const response = await fetch(
          "https://agro-vision-1a3c.onrender.com/crop-recommendation",
       {
           method: "POST",
           headers: {
                "Content-Type": "application/json"
           },
           body: JSON.stringify(params)
       }
      );

      if (!response.ok) {
        throw new Error("Crop recommendation backend is unavailable.");
      }

      const resData = await response.json();
      console.log("BACKEND RESPONSE:", resData);
      if (resData.status === 'error') {
        throw new Error("Recommendation failed.");
      }

      setResult(resData);

      // Save recommendation log to Firestore
      const dbRecord = {
          userId: currentUser.uid,
          timestamp: new Date().toISOString(),
          weather: {
              temperature: resData.weather.temperature,
              humidity: resData.weather.humidity,
              rainfall: resData.weather.rainfall || 0,
              condition: resData.weather.condition,
              wind_speed: resData.weather.wind_speed,
              location: resData.weather.location
          },
          recommendation: resData.recommendation
      };

      if (currentUser) {
        await addDoc(collection(db, 'history'), dbRecord);
      }

    } catch (e) {
      console.error(e);
      setErrorMsg("Matching service busy. The Flask server might be offline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 relative">
      
      {/* Ambient background decoration */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Intro Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="text-2xl md:text-3xl font-extrabold font-mono tracking-tight text-white mb-2 leading-none">
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent neon-glow-text font-mono">
            {t('cropRecTitle')}
          </span>
        </h1>
        <p className="text-xs text-gray-400">{t('cropRecSubtitle')}</p>
      </div>

      {/* Input panel & Weather view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Search controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xs font-bold text-emerald-400 font-mono tracking-widest uppercase mb-4 pb-2 border-b border-emerald-800/35">
              Region Coordinates
            </h3>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 text-xs flex items-start space-x-2 font-mono">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCitySearch} className="space-y-4">
              <div>
                <label className="text-[10px] text-emerald-400 font-bold tracking-widest font-mono uppercase block mb-1.5">Search City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4.5 w-4.5 text-emerald-600" />
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t('locationPlaceholder')}
                    className="w-full glass-input pl-10 pr-4 py-2 rounded-lg text-xs"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 shadow-neon text-xs font-bold text-white tracking-widest font-mono uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Find Match By City</span>}
              </button>
            </form>

            <div className="relative flex items-center justify-center py-4">
              <span className="absolute inset-x-0 h-px bg-emerald-800/30" />
              <span className="relative px-3 bg-darkBg text-[10px] text-gray-500 font-mono uppercase">Or</span>
            </div>

            <button 
              onClick={handleGeoLocationSearch}
              disabled={loading}
              className="w-full py-2.5 rounded-lg border border-emerald-800/40 hover:border-emerald-500/50 bg-emerald-950/20 hover:bg-emerald-950/40 text-xs font-bold text-gray-300 transition-all font-mono tracking-widest uppercase flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Compass className="h-4 w-4 animate-spin-slow" />
              <span>Use Current Geolocation</span>
            </button>
          </div>
        </div>

        {/* AI recommended crops & weather report */}
        <div className="lg:col-span-2 space-y-8">
          
          {loading && (
            <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
              <span className="text-sm text-emerald-400 font-mono animate-pulse">{t('analyzing')}</span>
            </div>
          )}

          {!loading && !result && (
            <div className="glass-card rounded-2xl p-12 text-center text-gray-500 text-xs font-mono">
              Please enter a location or trigger your active GPS coordinates to matching crops.
            </div>
          )}

          {!loading && result && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Weather info card */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-xs font-bold text-emerald-400 font-mono tracking-widest uppercase mb-4 pb-2 border-b border-emerald-800/35 flex items-center">
                  <CloudSun className="h-4.5 w-4.5 mr-2" />
                  <span>Telemetry Report: {result.weather.location}</span>
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-emerald-950/25 border border-emerald-800/20 p-3.5 rounded-xl text-center">
                    <Thermometer className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                    <span className="text-[10px] text-emerald-400/60 font-mono block uppercase">{t('temperature')}</span>
                    <span className="text-sm font-bold font-mono text-white mt-0.5 block">{result.weather.temperature}</span>
                  </div>

                  <div className="bg-emerald-950/25 border border-emerald-800/20 p-3.5 rounded-xl text-center">
                    <Droplet className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                    <span className="text-[10px] text-emerald-400/60 font-mono block uppercase">{t('humidity')}</span>
                    <span className="text-sm font-bold font-mono text-white mt-0.5 block">{result.weather.humidity}</span>
                  </div>

                  <div className="bg-emerald-950/25 border border-emerald-800/20 p-3.5 rounded-xl text-center">
                    <Sprout className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                    <span className="text-[10px] text-emerald-400/60 font-mono block uppercase">{t('rainfall')}</span>
                    <span className="text-sm font-bold font-mono text-white mt-0.5 block truncate" title={result.weather.rainfall}>
                      {result.weather.rainfall}
                    </span>
                  </div>

                  <div className="bg-emerald-950/25 border border-emerald-800/20 p-3.5 rounded-xl text-center">
                    <Wind className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                    <span className="text-[10px] text-emerald-400/60 font-mono block uppercase">{t('windSpeed')}</span>
                    <span className="text-sm font-bold font-mono text-white mt-0.5 block">{result.weather.wind_speed}</span>
                  </div>
                </div>
              </div>

              {/* Crop Recommendations block */}
              <div className="glass-card rounded-2xl p-6 md:p-8 border-emerald-500/30 shadow-neon">
                <h3 className="text-sm font-bold text-emerald-400 font-mono tracking-widest uppercase mb-4 pb-2 border-b border-emerald-800/35 flex items-center">
                  <Lightbulb className="h-4.5 w-4.5 mr-2 text-emerald-400 animate-pulse" />
                  <span>{t('recommendationTitle')}</span>
                </h3>

                <div className="prose prose-invert max-w-none text-xs md:text-sm font-sans leading-relaxed text-gray-200 whitespace-pre-line">
                  {result.recommendation}
                </div>
              </div>

            </motion.div>
          )}

        </div>

      </div>

    </div>
  );
}
}