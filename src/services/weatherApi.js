// Open-Meteo Weather API Service

const mapWMOCode = (code) => {
  if (code === 0) return 'Clear';
  if ([1, 2, 3, 45, 48].includes(code)) return 'Cloudy';
  if ([51, 53, 55, 56, 57, 61, 63, 80].includes(code)) return 'Moderate rain';
  if ([65, 81, 82].includes(code)) return 'Heavy rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorm';
  return 'Cloudy';
};

const getAQIStatus = (aqi) => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy';
  return 'Hazardous';
};

const getMoonPhase = (dateStr) => {
  // Rough calculation for moon phase just for UI flair
  const date = new Date(dateStr);
  const diff = date.getTime() - new Date('2000-01-06').getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  const cycle = days / 29.53;
  const phase = cycle - Math.floor(cycle);
  
  if (phase < 0.1) return 'New Moon';
  if (phase < 0.25) return 'Waxing Crescent';
  if (phase < 0.4) return 'First Quarter';
  if (phase < 0.6) return 'Full Moon';
  if (phase < 0.75) return 'Waning Gibbous';
  if (phase < 0.9) return 'Last Quarter';
  return 'Waning Crescent';
};

export const fetchWeatherData = async (city) => {
  const cityName = city || 'Moscow';
  let lat = 55.75;
  let lon = 37.61;
  let detectedCity = cityName;
  
  // 1. Forward Geocoding
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`);
    const data = await res.json();
    if (data && data.length > 0) {
      lat = parseFloat(data[0].lat);
      lon = parseFloat(data[0].lon);
      detectedCity = data[0].name || cityName;
    }
  } catch (err) {
    console.error("Geocoding failed", err);
  }

  // 2. Fetch from Open-Meteo
  try {
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,visibility,dew_point_2m,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto`);
    const weatherData = await weatherRes.json();

    const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,uv_index&timezone=auto`);
    const aqiData = await aqiRes.json();

    // Map the API data to our dashboard's expected format
    
    // Get current hour index for hourly arrays
    const currentHourString = weatherData.current.time.slice(0, 14) + "00";
    const currentHourIndex = weatherData.hourly.time.findIndex(t => t === currentHourString) || 0;

    // Build Weekly & Hourly Data
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dynamicWeekly = weatherData.daily.time.slice(0, 7).map((dateStr, i) => {
      const date = new Date(dateStr);
      const isToday = i === 0;
      const dayName = isToday ? 'Today' : daysOfWeek[date.getDay()];
      
      // Get the 24 hourly data points for this specific day
      const startIdx = i * 24;
      const endIdx = startIdx + 24;
      
      // For today, we only want to show hours from the current time onwards (for realism in chart)
      // But to keep chart smooth, we can just supply every 3rd hour of the day
      const dailyHourly = [];
      for(let h = 0; h < 24; h += 3) {
        const hIdx = startIdx + h;
        const timeStr = weatherData.hourly.time[hIdx];
        dailyHourly.push({
          time: new Date(timeStr).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
          temp: Number(weatherData.hourly.temperature_2m[hIdx].toFixed(1))
        });
      }

      return {
        day: dayName,
        fullDate: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        temp: weatherData.daily.temperature_2m_max[i].toFixed(1),
        condition: mapWMOCode(weatherData.daily.weather_code[i]),
        hourly: dailyHourly
      };
    });

    const currentAQIValue = aqiData.current?.european_aqi || 20;

    return {
      city: detectedCity,
      lat,
      lon,
      current: {
        temp: weatherData.current.temperature_2m,
        condition: mapWMOCode(weatherData.current.weather_code),
        humidity: weatherData.current.relative_humidity_2m,
        wind: weatherData.current.wind_speed_10m,
        visibility: ((weatherData.hourly.visibility[currentHourIndex] || 10000) / 1000).toFixed(1), // km
        pressure: weatherData.current.surface_pressure,
        uv: Math.round(aqiData.current?.uv_index || 0),
        precip: weatherData.current.precipitation,
        feelsLike: weatherData.current.apparent_temperature,
        dewPoint: weatherData.hourly.dew_point_2m[currentHourIndex] || weatherData.current.temperature_2m,
        moonPhase: getMoonPhase(new Date().toISOString()),
        sunrise: new Date(weatherData.daily.sunrise[0]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        sunset: new Date(weatherData.daily.sunset[0]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      },
      aqi: {
        status: getAQIStatus(currentAQIValue),
        value: currentAQIValue,
        pm10: Math.round(aqiData.current?.pm10 || 0),
        o3: Math.round(aqiData.current?.ozone || 0),
        so2: Math.round(aqiData.current?.sulphur_dioxide || 0),
        pm25: Math.round(aqiData.current?.pm2_5 || 0),
        co: Math.round(aqiData.current?.carbon_monoxide || 0),
        no2: Math.round(aqiData.current?.nitrogen_dioxide || 0)
      },
      hourly: dynamicWeekly[0].hourly,
      weekly: dynamicWeekly,
      rainChances: weatherData.daily.time.slice(0, 7).map((_, i) => ({
        day: i === 0 ? 'Today' : daysOfWeek[new Date(weatherData.daily.time[i]).getDay()],
        percent: weatherData.daily.precipitation_probability_max[i] || 0
      }))
    };

  } catch (err) {
    console.error("API fetch failed", err);
    throw err;
  }
};
