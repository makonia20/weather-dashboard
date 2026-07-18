import { useState, useEffect, useRef } from 'react';
import { 
  CloudRain, Cloud, CloudLightning, Sun, Sunrise, Sunset, 
  Wind, Droplets, Eye, ThermometerSun, MapPin, Search, CloudSnow, Loader2, Moon, Clock
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { fetchWeatherData } from '../services/weatherApi';

const getConditionIcon = (condition) => {
  switch(condition) {
    case 'Clear': return <Sun size={20} />;
    case 'Moderate rain': 
    case 'Heavy rain': return <CloudRain size={20} />;
    case 'Thunderstorm': return <CloudLightning size={20} />;
    case 'Snow': return <CloudSnow size={20} />;
    case 'Cloudy':
    default: return <Cloud size={20} />;
  }
};

const getConditionIconLarge = (condition) => {
  switch(condition) {
    case 'Clear': return <Sun size={80} color="#ffb703" />;
    case 'Moderate rain': 
    case 'Heavy rain': return <CloudRain size={80} color="white" style={{ filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.2))' }} />;
    case 'Thunderstorm': return <CloudLightning size={80} color="#ffd166" style={{ filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.2))' }} />;
    case 'Snow': return <CloudSnow size={80} color="white" style={{ filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.2))' }} />;
    case 'Cloudy':
    default: return <Cloud size={80} color="white" style={{ filter: 'drop-shadow(0px 10px 10px rgba(0,0,0,0.2))' }} />;
  }
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Detecting your location...');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('weatherSearchHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const searchRef = useRef(null);

  // Forecast State
  const [selectedDay, setSelectedDay] = useState(null);

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            const locData = await res.json();
            const city = locData.address.city || locData.address.town || locData.address.village || locData.address.county || 'Current Location';
            setCurrentCity(city);
          } catch (err) {
            console.error("Reverse geocoding failed", err);
            setCurrentCity('New York'); 
          }
        },
        (error) => {
          console.warn("Geolocation blocked or failed", error);
          setCurrentCity('London'); 
        }
      );
    } else {
      setCurrentCity('London'); 
    }
  }, []);

  // Fetch Weather Data
  useEffect(() => {
    if (!currentCity) return;

    const loadData = async () => {
      setLoading(true);
      setLoadingMsg(`Loading weather for ${currentCity}...`);
      const result = await fetchWeatherData(currentCity);
      setData(result);
      // Default selected day to the first day in weekly forecast
      setSelectedDay(result.weekly[0].day);
      setLoading(false);
    };
    loadData();
  }, [currentCity]);

  const addToHistory = (city) => {
    let newHistory = [city, ...searchHistory.filter(item => item !== city)].slice(0, 5);
    setSearchHistory(newHistory);
    localStorage.setItem('weatherSearchHistory', JSON.stringify(newHistory));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const city = searchQuery.trim();
      setCurrentCity(city);
      addToHistory(city);
      setSearchQuery('');
      setShowHistory(false);
    }
  };

  const handleHistoryClick = (city) => {
    setCurrentCity(city);
    addToHistory(city);
    setShowHistory(false);
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen w-full">
        <Loader2 className="animate-spin text-white" size={48} />
        <p className="text-secondary">{loadingMsg}</p>
      </div>
    );
  }

  // Get hourly data for the selected day
  const chartData = data.weekly.find(d => d.day === selectedDay)?.hourly || data.hourly;

  return (
    <div className="dashboard-container">
      {/* Top Search Bar */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', position: 'relative', zIndex: 50 }}>
        <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <form onSubmit={handleSearch}>
            <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', top: '14px', left: '14px' }} />
            <input 
              type="text" 
              className="input" 
              placeholder="Search city or area..." 
              style={{ paddingLeft: '2.5rem', background: 'var(--bg-panel)', backdropFilter: 'var(--glass-blur)' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowHistory(true)}
            />
          </form>

          {/* Search History Dropdown */}
          {showHistory && searchHistory.length > 0 && (
            <div className="glass-panel" style={{ 
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', 
              padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px' 
            }}>
              <p className="text-xs text-secondary mb-2 px-2 flex items-center gap-1">
                <Clock size={12} /> Recent Searches
              </p>
              {searchHistory.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleHistoryClick(item)}
                  style={{ 
                    padding: '0.5rem 0.5rem', borderRadius: '8px', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <MapPin size={16} className="text-secondary" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Left Column - Current Weather & Details */}
      <div className="flex flex-col gap-4">
        
        {/* Main Weather Widget */}
        <div className="glass-panel glass-panel-orange flex flex-col justify-between" style={{ height: '380px' }}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <MapPin size={18} />
              <span className="font-semibold text-lg">{data.city}</span>
            </div>
            <span className="text-xs text-right">
              {data.weekly[0].fullDate}<br/>
              Updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>

          <div className="flex flex-col items-center">
            {getConditionIconLarge(data.current.condition)}
            <h1 className="text-5xl mt-4">{data.current.temp.toFixed(1)} °C</h1>
            <p className="text-lg mt-2 opacity-90">{data.current.condition}</p>
          </div>

          <div className="flex justify-between mt-4 gap-2">
            <div className="flex-1 bg-white/20 rounded-xl p-3 text-center backdrop-blur-md">
              <p className="text-xs opacity-80">UV Index</p>
              <p className="font-semibold mt-1">{data.current.uv}</p>
            </div>
            <div className="flex-1 bg-white/20 rounded-xl p-3 text-center backdrop-blur-md">
              <p className="text-xs opacity-80">Air Quality</p>
              <p className="font-semibold mt-1">{data.aqi.status}</p>
            </div>
          </div>
        </div>

        {/* Weather Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: <ThermometerSun size={16}/>, label: 'Feels Like', value: `${data.current.feelsLike.toFixed(1)} °C` },
            { icon: <Droplets size={16}/>, label: 'Humidity', value: `${data.current.humidity} %` },
            { icon: <Wind size={16}/>, label: 'Wind Speed', value: `${data.current.wind} Kph` },
            { icon: <Eye size={16}/>, label: 'Visibility', value: `${data.current.visibility} KM` },
            { icon: <ThermometerSun size={16}/>, label: 'Dew Point', value: `${data.current.dewPoint.toFixed(1)} °C` },
            { icon: <Moon size={16}/>, label: 'Moon Phase', value: data.current.moonPhase },
            { icon: <ThermometerSun size={16}/>, label: 'Pressure', value: `${data.current.pressure} hPa` },
            { icon: <CloudRain size={16}/>, label: 'Precipitation', value: `${data.current.precip} mm` },
          ].map((item, idx) => (
            <div key={idx} className="glass-panel flex flex-col gap-2" style={{ padding: '1rem' }}>
              <div className="flex items-center gap-2 text-secondary">
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </div>
              <span className="text-lg font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Column - Forecast & Chart */}
      <div className="flex flex-col gap-4">
        
        {/* Weekly Forecast - Now Interactive */}
        <div className="glass-panel grid grid-cols-7 gap-2" style={{ padding: '1rem' }}>
          {data.weekly.map((day, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedDay(day.day)}
              className="flex flex-col items-center justify-between gap-2" 
              style={{ 
                padding: '0.5rem', 
                background: selectedDay === day.day ? 'rgba(255,123,0,0.3)' : 'rgba(0,0,0,0.1)', 
                border: selectedDay === day.day ? '1px solid var(--bg-orange)' : '1px solid transparent',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <span className="text-xs text-secondary">{day.day.substring(0, 3)}</span>
              {getConditionIcon(day.condition)}
              <span className="text-sm font-semibold">{day.temp}°</span>
            </div>
          ))}
        </div>

        {/* Temperature Chart - Updates based on selected day */}
        <div className="glass-panel flex-1 min-h-[250px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-secondary">
              Hourly Forecast <span className="text-white">({selectedDay})</span>
            </h3>
          </div>
          <div className="flex-1 w-full" style={{ minHeight: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ background: '#282828', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#ff7b00' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="temp" 
                  stroke="#ff7b00" 
                  strokeWidth={3}
                  dot={{ fill: '#121212', stroke: '#ff7b00', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#ff7b00' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Air Quality Overview */}
        <div className="glass-panel flex gap-6 items-center">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-secondary mb-4">Air Quality Overview</h3>
            <div className="flex items-center justify-center relative" style={{ height: '120px' }}>
              <div style={{
                width: '120px', height: '120px', borderRadius: '50%',
                border: '8px solid rgba(255, 255, 255, 0.1)',
                borderTopColor: data.aqi.value > 50 ? '#ef476f' : '#a8d08d',
                borderRightColor: data.aqi.value > 50 ? '#ef476f' : '#a8d08d',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <span className="text-xs text-secondary text-center px-2">{data.aqi.status}</span>
                <span className="text-3xl font-semibold">{data.aqi.value}</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 grid grid-cols-2 gap-4">
             {[
               { label: 'PM10', value: data.aqi.pm10, color: '#ffd166' },
               { label: 'O3', value: data.aqi.o3, color: '#ef476f' },
               { label: 'SO2', value: data.aqi.so2, color: '#ffd166' },
               { label: 'PM2.5', value: data.aqi.pm25, color: '#118ab2' },
               { label: 'CO', value: data.aqi.co, color: '#ef476f' },
               { label: 'NO2', value: data.aqi.no2, color: '#118ab2' },
             ].map((aqi, idx) => (
               <div key={idx} className="flex flex-col gap-1">
                 <div className="flex items-center gap-2">
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: aqi.color }}></div>
                   <span className="text-lg font-semibold">{aqi.value}</span>
                 </div>
                 <span className="text-xs text-secondary ml-4">{aqi.label}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Right Column - Sunrise & Rain Chances */}
      <div className="flex flex-col gap-4">
        
        <div className="glass-panel flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-secondary">Sunrise and Sunset</h3>
          
          <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl">
            <Sunrise size={32} color="#ffb703" />
            <div className="flex flex-col">
              <span className="text-xs text-secondary">Sunrise</span>
              <span className="font-semibold">{data.current.sunrise}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl">
            <Sunset size={32} color="#fb8500" />
            <div className="flex flex-col">
              <span className="text-xs text-secondary">Sunset</span>
              <span className="font-semibold">{data.current.sunset}</span>
            </div>
          </div>
        </div>

        <div className="glass-panel flex-1 flex flex-col">
          <h3 className="text-sm font-semibold text-secondary mb-4">Chances of Rain</h3>
          <div className="flex-1 flex flex-col justify-between gap-2">
            {data.rainChances.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 text-sm">
                <span className="w-12 text-secondary">{item.day.substring(0, 3)}</span>
                <div className="flex-1 bg-black/40 h-2 rounded-full overflow-hidden relative">
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full" 
                    style={{ 
                      width: `${item.percent}%`, 
                      background: 'linear-gradient(90deg, #ff8c00, #ff5e00)' 
                    }}
                  ></div>
                </div>
                <span className="w-8 text-right text-xs font-semibold">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Full Width Map Panel */}
      <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '1rem', marginTop: '1rem' }}>
        <h3 className="text-sm font-semibold text-secondary mb-4">Live Weather Radar</h3>
        <div style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden' }}>
          <iframe 
            width="100%" 
            height="100%" 
            src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=5&level=surface&overlay=wind&menu=&message=&marker=&calendar=now&city=&play=&projects=&issues=&lat=${data.lat}&lon=${data.lon}`}
            frameBorder="0"
            title="Weather Radar Map"
          ></iframe>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
