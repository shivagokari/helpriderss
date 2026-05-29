import React, { useState, useEffect } from 'react';
import { 
  CloudSun, Droplet, Gauge, MapPin, Calendar, Fuel, 
  Sparkles, Navigation, AlertTriangle, 
  Wrench, Share2, Bell, AlertCircle, CheckSquare, Square,
  Plus, Trash2, Clock, X, Bike
} from 'lucide-react';
import { 
  searchLocationInIndia, 
  calculateRoadDistance, 
  getOSRMDistance,
  computeBikeSpecs, 
  BIKES_DATABASE, 
  TELANGANA_FUEL,
  INDIAN_CITIES,
  getFuelPriceForLocation,
  generateLocationWeather
} from '../utils/geo';
import { supabase } from '../utils/supabase';

const ESSENTIALS = [
  { id: 'helmet', label: '🪖 Helmet', desc: 'Full-face or modular' },
  { id: 'gloves', label: '🧤 Gloves', desc: 'Riding gloves' },
  { id: 'jacket', label: '🧥 Riding Jacket', desc: 'With CE armor' },
  { id: 'fuel', label: '⛽ Fuel Check', desc: 'Tank full before leaving' },
  { id: 'chain', label: '🔗 Chain Lube', desc: 'Lubricate before long rides' },
  { id: 'firstaid', label: '🩹 First Aid Kit', desc: 'Always carry' },
  { id: 'tools', label: '🔧 Tool Kit', desc: 'Puncture kit + multi-tool' },
  { id: 'water', label: '💧 Water Bottle', desc: 'Stay hydrated' },
  { id: 'docs', label: '📄 Documents', desc: 'License, RC, Insurance' },
  { id: 'phone', label: '📱 Phone + Charger', desc: 'Power bank charged' },
];

export default function HomeDashboard({ user, onTabChange, onOpenDetails, openWizard, rides }) {
  // Fuel Estimator States
  const [fuelStartLocation, setFuelStartLocation] = useState('');
  const [fuelDestination, setFuelDestination] = useState('');
  const [selectedBike, setSelectedBike] = useState('Royal Enfield Classic 350');
  const [userGarage, setUserGarage] = useState([]);

  // Calculate statistics from real user rides
  const totalKMs = (rides || []).reduce((sum, r) => sum + (r.distance || 0), 0);
  const totalTrips = (rides || []).filter(r => r.status === 'Completed').length;

  let levelName = 'Rookie Rider';
  if (totalKMs >= 2500) { levelName = 'Iron Butt Legend'; }
  else if (totalKMs >= 1000) { levelName = 'Asphalt Veteran'; }
  else if (totalKMs >= 300) { levelName = 'Highway Explorer'; }
  const [fuelDistance, setFuelDistance] = useState(350);
  const [bikeMileage, setBikeMileage] = useState(35);
  const [fuelPrice, setFuelPrice] = useState(115.73);
  const [fuelType, setFuelType] = useState('Normal Petrol');

  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [startCoords, setStartCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [startSelected, setStartSelected] = useState(false);
  const [destSelected, setDestSelected] = useState(false);

  // ─── Reminders state ───────────────────────────────────────────────────────
  const [reminders, setReminders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('helpriders_reminders') || '[]'); } catch { return []; }
  });
  const [checkedEssentials, setCheckedEssentials] = useState(() => {
    try { return JSON.parse(localStorage.getItem('helpriders_essentials') || '[]'); } catch { return []; }
  });
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [showAddReminder, setShowAddReminder] = useState(false);

  // Crew notifications states
  const [pendingFriendRequests, setPendingFriendRequests] = useState([]);
  const [pendingRideRequests, setPendingRideRequests] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Google Weather telemetry states
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherCity, setWeatherCity] = useState('Hyderabad, Telangana');

  useEffect(() => {
    const fetchWeather = async (lat, lon, cityName) => {
      // Check cache first
      const cached = localStorage.getItem('helpriders_weather_cache');
      if (cached) {
        try {
          const { data, timestamp, city } = JSON.parse(cached);
          const ageInMs = Date.now() - timestamp;
          const ageInHours = ageInMs / (1000 * 60 * 60);
          if (city === cityName && ageInHours < 1) {
            console.log(`[Weather] Using cached weather for ${cityName} (age: ${ageInHours.toFixed(2)}h)`);
            setWeatherData(data);
            setWeatherLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Failed to parse cached weather", e);
        }
      }

      setWeatherLoading(true);
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,windspeed_10m&timezone=auto`
        );
        if (!response.ok) throw new Error('Failed to fetch weather');
        const data = await response.json();
        
        // Map WMO Weather Codes to text & symbols (similar to Google Weather)
        const codeMap = {
          0: { text: 'Clear Sky', icon: '☀️', bg: 'linear-gradient(to bottom, #1d976c, #93f9b9)' },
          1: { text: 'Mainly Clear', icon: '🌤️', bg: 'linear-gradient(to bottom, #2980b9, #6dd5fa)' },
          2: { text: 'Partly Cloudy', icon: '⛅', bg: 'linear-gradient(to bottom, #3a6073, #527080)' },
          3: { text: 'Overcast', icon: '☁️', bg: 'linear-gradient(to bottom, #bdc3c7, #2c3e50)' },
          45: { text: 'Foggy', icon: '🌫️', bg: 'linear-gradient(to bottom, #757f9a, #d7dde8)' },
          48: { text: 'Depositing Rime Fog', icon: '🌫️', bg: 'linear-gradient(to bottom, #757f9a, #d7dde8)' },
          51: { text: 'Light Drizzle', icon: '🌦️', bg: 'linear-gradient(to bottom, #1f1c2c, #928dab)' },
          53: { text: 'Moderate Drizzle', icon: '🌦️', bg: 'linear-gradient(to bottom, #1f1c2c, #928dab)' },
          55: { text: 'Heavy Drizzle', icon: '🌦️', bg: 'linear-gradient(to bottom, #1f1c2c, #928dab)' },
          61: { text: 'Slight Rain', icon: '🌧️', bg: 'linear-gradient(to bottom, #3a6073, #16222f)' },
          63: { text: 'Moderate Rain', icon: '🌧️', bg: 'linear-gradient(to bottom, #3a6073, #16222f)' },
          65: { text: 'Heavy Rain', icon: '🌧️', bg: 'linear-gradient(to bottom, #0f2027, #2c5364)' },
          71: { text: 'Slight Snowfall', icon: '❄️', bg: 'linear-gradient(to bottom, #e6dada, #274046) ' },
          73: { text: 'Moderate Snowfall', icon: '❄️', bg: 'linear-gradient(to bottom, #e6dada, #274046)' },
          75: { text: 'Heavy Snowfall', icon: '❄️', bg: 'linear-gradient(to bottom, #e6dada, #274046)' },
          80: { text: 'Slight Rain Showers', icon: '🌦️', bg: 'linear-gradient(to bottom, #3a6073, #16222f)' },
          81: { text: 'Moderate Rain Showers', icon: '🌦️', bg: 'linear-gradient(to bottom, #3a6073, #16222f)' },
          82: { text: 'Violent Rain Showers', icon: '🌧️', bg: 'linear-gradient(to bottom, #0f2027, #203a43)' },
          95: { text: 'Thunderstorm', icon: '⛈️', bg: 'linear-gradient(to bottom, #4b6cb7, #182848)' }
        };
        
        const weatherInfo = codeMap[data.current_weather.weathercode] || { text: 'Clear Sky', icon: '☀️', bg: 'linear-gradient(to bottom, #1d976c, #93f9b9)' };
        
        const tempVal = Math.round(data.current_weather.temperature);
        const code = data.current_weather.weathercode;
        
        let conditionText = weatherInfo.text;
        let conditionIcon = weatherInfo.icon;
        let conditionBg = weatherInfo.bg;
        
        const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(code);
        const isSnowyCode = [71, 73, 75].includes(code);
        
        if (isRainy) {
          conditionText = 'Rainy';
          conditionIcon = '🌧️';
          conditionBg = 'linear-gradient(to bottom, #2b3a42, #0f171e)';
        } else if (tempVal > 30) {
          conditionText = 'Summer';
          conditionIcon = '☀️';
          conditionBg = 'linear-gradient(to bottom, #d35400, #f39c12)';
        } else if (tempVal < 15 || isSnowyCode) {
          conditionText = 'Snow';
          conditionIcon = '❄️';
          conditionBg = 'linear-gradient(to bottom, #757f9a, #d7dde8)';
        }

        const parsedWeather = {
          temp: `${tempVal}°C`,
          conditions: conditionText,
          icon: conditionIcon,
          bg: conditionBg,
          windSpeed: `${data.current_weather.windspeed} km/h`,
          humidity: `${data.hourly.relativehumidity_2m[0]}%`,
          warning: data.current_weather.temperature > 38 ? '🥵 Thermal Alert: Ambient heat exceeds 38°C.' : null
        };

        setWeatherData(parsedWeather);
        // Save to cache
        localStorage.setItem('helpriders_weather_cache', JSON.stringify({
          data: parsedWeather,
          timestamp: Date.now(),
          city: cityName
        }));
      } catch (err) {
        console.warn('Live weather api error, falling back to simulator:', err);
        const sim = generateLocationWeather(lat, lon, new Date().toISOString().split('T')[0]);
        const tempVal = parseInt(sim.temp.replace(/\D/g, '')) || 25;
        let conditionText = sim.conditions;
        let conditionIcon = '⛅';
        let conditionBg = 'linear-gradient(135deg, rgba(28,28,36,0.95) 0%, rgba(18,18,22,0.85) 100%)';
        
        const isRainy = sim.conditions.toLowerCase().includes('rain') || sim.conditions.toLowerCase().includes('drizzle') || sim.conditions.toLowerCase().includes('storm');
        const isSnowy = sim.conditions.toLowerCase().includes('snow');
        
        if (isRainy) {
          conditionText = 'Rainy';
          conditionIcon = '🌧️';
          conditionBg = 'linear-gradient(to bottom, #2b3a42, #0f171e)';
        } else if (tempVal > 30) {
          conditionText = 'Summer';
          conditionIcon = '☀️';
          conditionBg = 'linear-gradient(to bottom, #d35400, #f39c12)';
        } else if (tempVal < 15 || isSnowy) {
          conditionText = 'Snow';
          conditionIcon = '❄️';
          conditionBg = 'linear-gradient(to bottom, #757f9a, #d7dde8)';
        }

        const parsedWeather = {
          temp: sim.temp,
          conditions: conditionText,
          icon: conditionIcon,
          bg: conditionBg,
          windSpeed: sim.wind.split('|')[0].replace('Wind:', '').trim(),
          humidity: sim.wind.split('|')[1].replace('Humidity:', '').trim(),
          warning: tempVal > 38 ? '🥵 Thermal Alert: Ambient heat exceeds 38°C.' : null
        };

        setWeatherData(parsedWeather);
        // Save to cache
        localStorage.setItem('helpriders_weather_cache', JSON.stringify({
          data: parsedWeather,
          timestamp: Date.now(),
          city: cityName
        }));
      } finally {
        setWeatherLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            if (res.ok) {
              const data = await res.json();
              const addr = data.address;
              const city = addr.city || addr.town || addr.village || addr.suburb || "Your Location";
              const state = addr.state || "";
              setWeatherCity(state ? `${city}, ${state}` : city);
              fetchWeather(latitude, longitude, city);
            } else {
              fetchWeather(latitude, longitude, 'Current Location');
            }
          } catch {
            fetchWeather(latitude, longitude, 'Current Location');
          }
        },
        () => {
          setWeatherCity('Hyderabad, Telangana');
          fetchWeather(17.3850, 78.4867, 'Hyderabad');
        }
      );
    } else {
      setWeatherCity('Hyderabad, Telangana');
      fetchWeather(17.3850, 78.4867, 'Hyderabad');
    }
  }, []);

  useEffect(() => {
    if (!user || !user.uid) return;
    const fetchUserGarage = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('garage')
          .eq('id', user.uid)
          .maybeSingle();

        if (!error && data && data.garage) {
          setUserGarage(data.garage);
          if (data.garage.length > 0) {
            setSelectedBike(data.garage[0].name);
          }
        }
      } catch (err) {
        console.warn('Failed to load user garage details:', err.message);
      }
    };
    fetchUserGarage();
  }, [user]);

  const fetchAllNotifications = async () => {
    if (!user || !user.uid) return;

    // 1. Fetch Ride Join Requests from Supabase
    try {
      const { data: userRides, error: ridesErr } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', user.uid);

      if (!ridesErr && userRides) {
        const rideReqs = [];
        userRides.forEach(ride => {
          const requests = Array.isArray(ride.join_requests) ? ride.join_requests : JSON.parse(ride.join_requests || '[]');
          requests.forEach(req => {
            if (req.status === 'Pending') {
              rideReqs.push({
                ...req,
                rideId: ride.id,
                rideTitle: ride.title
              });
            }
          });
        });
        setPendingRideRequests(rideReqs);
      }
    } catch (err) {
      console.warn('Error fetching ride join requests from Supabase:', err);
    }

    // 2. Fetch Friend Requests from Supabase
    try {
      const { data: records, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('to_id', user.uid)
        .eq('status', 'pending');

      if (!error && records) {
        const fromIds = records.map(r => r.from_id);
        if (fromIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, name, email, unique_id, level, garage')
            .in('id', fromIds);

          const profileMap = {};
          if (profs) {
            profs.forEach(p => { profileMap[p.id] = p; });
          }

          const mapped = records.map(r => {
            const sender = profileMap[r.from_id];
            return {
              id: r.id,
              uid: r.from_id, // sender ID
              displayName: sender ? (sender.name || sender.email.split('@')[0]) : 'Rider',
              level: sender ? (sender.level || 'Rookie Rider') : 'Rookie Rider',
              bike: sender && sender.garage && sender.garage.length > 0 ? sender.garage[0].name : 'Unknown Bike',
              note: r.note
            };
          });
          setPendingFriendRequests(mapped);
        } else {
          setPendingFriendRequests([]);
        }
      }
    } catch (err) {
      console.warn('Error fetching friend requests:', err);
    }
  };

  useEffect(() => {
    fetchAllNotifications();
  }, [user]);

  const handleAcceptFriendRequest = async (req) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('from_id', req.uid)
        .eq('to_id', user.uid);

      if (error) throw error;

      showToast(`✅ Connected with ${req.displayName}!`);
      fetchAllNotifications();
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to accept request.');
    }
  };

  const handleDeclineFriendRequest = async (req) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('from_id', req.uid)
        .eq('to_id', user.uid);

      if (error) throw error;
      showToast('❌ Declined friend request.');
      fetchAllNotifications();
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to decline request.');
    }
  };

  const handleAcceptRideRequest = async (rideId, reqId, requesterName) => {
    try {
      const { data: ride, error: fetchErr } = await supabase
        .from('rides')
        .select('join_requests, joined_count')
        .eq('id', rideId)
        .maybeSingle();

      if (fetchErr || !ride) throw new Error('Ride not found');

      const requests = Array.isArray(ride.join_requests) ? ride.join_requests : JSON.parse(ride.join_requests || '[]');
      const updatedRequests = requests.map(req => {
        if (req.id === reqId) {
          return { ...req, status: 'Accepted' };
        }
        return req;
      });

      const newJoinedCount = (ride.joined_count || 1) + 1;

      const { error: updateErr } = await supabase
        .from('rides')
        .update({
          join_requests: updatedRequests,
          joined_count: newJoinedCount
        })
        .eq('id', rideId);

      if (updateErr) throw updateErr;

      showToast(`✅ Accepted ${requesterName} into crew!`);
      fetchAllNotifications();
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to accept request.');
    }
  };

  const handleDeclineRideRequest = async (rideId, reqId, requesterName) => {
    try {
      const { data: ride, error: fetchErr } = await supabase
        .from('rides')
        .select('join_requests')
        .eq('id', rideId)
        .maybeSingle();

      if (fetchErr || !ride) throw new Error('Ride not found');

      const requests = Array.isArray(ride.join_requests) ? ride.join_requests : JSON.parse(ride.join_requests || '[]');
      const updatedRequests = requests.map(req => {
        if (req.id === reqId) {
          return { ...req, status: 'Declined' };
        }
        return req;
      });

      const { error: updateErr } = await supabase
        .from('rides')
        .update({
          join_requests: updatedRequests
        })
        .eq('id', rideId);

      if (updateErr) throw updateErr;

      showToast(`Declined request from ${requesterName}`);
      fetchAllNotifications();
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to decline request.');
    }
  };

  useEffect(() => {
    localStorage.setItem('helpriders_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('helpriders_essentials', JSON.stringify(checkedEssentials));
  }, [checkedEssentials]);

  const addReminder = (e) => {
    e.preventDefault();
    if (!newReminderTitle.trim() || !newReminderDate) return;
    const r = { id: Date.now(), title: newReminderTitle.trim(), date: newReminderDate, done: false };
    setReminders(prev => [r, ...prev]);
    setNewReminderTitle('');
    setNewReminderDate('');
    setShowAddReminder(false);
  };

  const deleteReminder = (id) => setReminders(prev => prev.filter(r => r.id !== id));
  const toggleReminderDone = (id) => setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r));

  const toggleEssential = (id) => {
    setCheckedEssentials(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(dateStr); target.setHours(0,0,0,0);
    const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: 'var(--accent)' };
    if (diff === 0) return { label: 'Today!', color: 'var(--primary)' };
    if (diff === 1) return { label: 'Tomorrow', color: 'var(--secondary)' };
    return { label: `in ${diff} days`, color: 'var(--success)' };
  };

  // ─── Cities helpers ─────────────────────────────────────────────────────────
  const getLocalCities = (query) => {
    if (!query) return [];
    const lower = query.toLowerCase();
    return INDIAN_CITIES.filter(c =>
      c.name.toLowerCase().includes(lower) || c.state.toLowerCase().includes(lower)
    );
  };

  useEffect(() => {
    const query = fuelStartLocation.trim();
    if (startSelected || query.length < 1) { setStartSuggestions([]); return; }
    const locals = getLocalCities(query);
    setStartSuggestions(locals);
    if (query.length >= 3 && navigator.onLine) {
      const timer = setTimeout(async () => {
        const res = await searchLocationInIndia(query);
        if (res && res.length > 0) {
          setStartSuggestions(prev => {
            const combined = [...prev];
            res.forEach(item => { if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) combined.push(item); });
            return combined.slice(0, 8);
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [fuelStartLocation, startSelected]);

  useEffect(() => {
    const query = fuelDestination.trim();
    if (destSelected || query.length < 1) { setDestSuggestions([]); return; }
    const locals = getLocalCities(query);
    setDestSuggestions(locals);
    if (query.length >= 3 && navigator.onLine) {
      const timer = setTimeout(async () => {
        const res = await searchLocationInIndia(query);
        if (res && res.length > 0) {
          setDestSuggestions(prev => {
            const combined = [...prev];
            res.forEach(item => { if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) combined.push(item); });
            return combined.slice(0, 8);
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [fuelDestination, destSelected]);

  const handleBikeSelect = (bikeName) => {
    setSelectedBike(bikeName);
    updateCalculations(bikeName, startCoords, destCoords, fuelDistance);
  };

  const updateCalculations = async (bike, sCoords, dCoords, currentDist, startLoc = fuelStartLocation, destLoc = fuelDestination, currentFuelType = fuelType) => {
    setValidationError('');
    const isHighway = currentDist > 100;
    const specs = computeBikeSpecs(bike, 'Cruising (Scenic/Relaxed)', isHighway);
    setBikeMileage(specs.mileage);
    const startPrice = getFuelPriceForLocation(startLoc, currentFuelType);
    const destPrice = getFuelPriceForLocation(destLoc, currentFuelType);
    setFuelPrice((startPrice + destPrice) / 2);
    if (sCoords && dCoords) {
      let roadDist = calculateRoadDistance(sCoords.lat, sCoords.lon, dCoords.lat, dCoords.lon);
      setFuelDistance(roadDist);
      try {
        const osrmDist = await getOSRMDistance(sCoords.lat, sCoords.lon, dCoords.lat, dCoords.lon);
        if (osrmDist && osrmDist > 0) { roadDist = osrmDist; setFuelDistance(roadDist); }
      } catch (err) { console.warn('OSRM distance lookup failed', err); }
      const updatedSpecs = computeBikeSpecs(bike, 'Cruising (Scenic/Relaxed)', roadDist > 100);
      setBikeMileage(updatedSpecs.mileage);
    }
  };

  const handleSelectStartSuggestion = (city) => {
    setStartCoords({ lat: city.lat, lon: city.lon });
    setFuelStartLocation(city.name);
    setStartSelected(true);
    setStartSuggestions([]);
    updateCalculations(selectedBike, { lat: city.lat, lon: city.lon }, destCoords, fuelDistance, city.name, fuelDestination, fuelType);
  };

  const handleSelectDestSuggestion = (city) => {
    setDestCoords({ lat: city.lat, lon: city.lon });
    setFuelDestination(city.name);
    setDestSelected(true);
    setDestSuggestions([]);
    updateCalculations(selectedBike, startCoords, { lat: city.lat, lon: city.lon }, fuelDistance, fuelStartLocation, city.name, fuelType);
  };

  const handleStartTyping = (val) => {
    setFuelStartLocation(val); setStartSelected(false); setStartCoords(null);
    if (val.trim() && !destCoords) setValidationError('Please select start and destination from suggestions to lock coordinates.');
  };

  const handleDestTyping = (val) => {
    setFuelDestination(val); setDestSelected(false); setDestCoords(null);
    if (val.trim() && !startCoords) setValidationError('Please select start and destination from suggestions to lock coordinates.');
  };

  const fuelNeeded = (fuelDistance / bikeMileage).toFixed(1);
  const fuelCost = Math.round(fuelNeeded * fuelPrice);
  const essentialsCheckedCount = checkedEssentials.length;

  return (
    <div className="home-dashboard scroll-y" style={{ padding: '20px 16px' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }} className="animate-fade-in">
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Welcome back,</span>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {user?.displayName || 'Rider'} <Sparkles size={18} color="var(--secondary)" />
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
            onClick={() => {
              fetchAllNotifications();
              setShowNotifications(true);
            }}
          >
            <Bell size={18} />
            {(pendingFriendRequests.length + pendingRideRequests.length) > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '-4px', 
                right: '-4px', 
                background: 'var(--accent)', 
                color: 'white', 
                fontSize: '8px', 
                fontWeight: 'bold', 
                borderRadius: '50%', 
                width: '16px', 
                height: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                border: '1.5px solid #0d0d12'
              }}>
                {pendingFriendRequests.length + pendingRideRequests.length}
              </span>
            )}
          </button>
          <button 
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', border: 'none', color: 'white', cursor: 'pointer' }}
            onClick={() => onTabChange('profile')}
          >
            {(user?.displayName || 'R')[0].toUpperCase()}
          </button>
        </div>
      </div>

      {/* Ride Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '12px 16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Distance</span>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', margin: '4px 0', color: 'var(--primary)' }}>{totalKMs.toLocaleString('en-IN')} KM</div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Recorded on your log</span>
        </div>
        <div className="glass-panel" style={{ padding: '12px 16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Completed Trips</span>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', margin: '4px 0', color: 'var(--secondary)' }}>{totalTrips} {totalTrips === 1 ? 'Trip' : 'Trips'}</div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Level: {levelName}</span>
        </div>
      </div>

      {/* Weather Overview (Google Weather Styled) */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '20px', 
          marginBottom: '20px', 
          background: weatherData ? weatherData.bg : 'linear-gradient(135deg, rgba(28,28,36,0.95) 0%, rgba(18,18,22,0.85) 100%)',
          color: 'white',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
          border: '1.5px solid var(--glass-border)',
          transition: 'all 0.4s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>🌤️ Live Google Weather</span>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'var(--font-display)', marginTop: '2px' }}>{weatherCity}</h3>
          </div>
          <span style={{ fontSize: '36px' }}>{weatherData ? weatherData.icon : '🌤️'}</span>
        </div>

        {weatherLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
            <div style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTopColor: 'white', borderRadius: '50%', animation: 'dash 1s linear infinite' }} />
            <span style={{ fontSize: '12px', opacity: 0.8 }}>Syncing weather telemetry...</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '42px', fontWeight: '800', fontFamily: 'var(--font-display)' }}>{weatherData ? weatherData.temp : '--°C'}</span>
              <span style={{ fontSize: '14px', fontWeight: '600', opacity: 0.9 }}>{weatherData ? weatherData.conditions : 'Checking...'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '12px', fontSize: '12px' }}>
              <div>
                <span style={{ opacity: 0.6, display: 'block', fontSize: '10px', marginBottom: '2px' }}>💨 Wind Speed</span>
                <strong>{weatherData ? weatherData.windSpeed : '--'}</strong>
              </div>
              <div>
                <span style={{ opacity: 0.6, display: 'block', fontSize: '10px', marginBottom: '2px' }}>💧 Humidity</span>
                <strong>{weatherData ? weatherData.humidity : '--'}</strong>
              </div>
            </div>

            {weatherData && weatherData.warning && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                background: weatherData.warning.includes('🟢') ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 34, 51, 0.1)', 
                border: `1px solid ${weatherData.warning.includes('🟢') ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 34, 51, 0.2)'}`, 
                borderRadius: '8px', 
                padding: '6px 10px', 
                fontSize: '11px', 
                color: weatherData.warning.includes('🟢') ? 'var(--success)' : 'var(--accent)',
                marginTop: '4px'
              }}>
                <span style={{ fontSize: '13px' }}>⚠️</span>
                <span>{weatherData.warning}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── REMINDERS WIDGET ──────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h4 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bell size={16} color="var(--primary)" /> My Reminders
          </h4>
          <button
            onClick={() => setShowAddReminder(v => !v)}
            style={{ fontSize: '11px', background: 'rgba(255,85,0,0.1)', color: 'var(--primary)', border: '1px solid rgba(255,85,0,0.2)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {showAddReminder ? 'Close' : '+ Add'}
          </button>
        </div>

        {showAddReminder && (
          <form onSubmit={addReminder} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px' }} className="animate-zoom-in">
            <input
              type="text"
              placeholder="Reminder title (e.g. Bike Service, Oil Change)"
              value={newReminderTitle}
              onChange={e => setNewReminderTitle(e.target.value)}
              required
              style={{ padding: '9px 12px', fontSize: '12px', background: '#1c1c24', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
            />
            <input
              type="date"
              value={newReminderDate}
              onChange={e => setNewReminderDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
              style={{ padding: '9px 12px', fontSize: '12px', background: '#1c1c24', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '8px', fontSize: '12px', borderRadius: '8px' }}>
              Save Reminder
            </button>
          </form>
        )}

        {reminders.length === 0 && !showAddReminder ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Clock size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
            No reminders yet. Add service dates, ride dates or essentials.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {reminders.map(r => {
              const { label, color } = getDaysUntil(r.date);
              return (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: r.done ? 'rgba(255,255,255,0.02)' : 'rgba(255,85,0,0.04)', border: `1px solid ${r.done ? 'rgba(255,255,255,0.04)' : 'rgba(255,85,0,0.12)'}`, borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => toggleReminderDone(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: r.done ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0 }}>
                      {r.done ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                    <div>
                      <span style={{ fontSize: '13px', color: r.done ? 'var(--text-muted)' : 'white', fontWeight: '600', textDecoration: r.done ? 'line-through' : 'none' }}>{r.title}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        <Calendar size={10} color="var(--text-muted)" />
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {!r.done && <span style={{ fontSize: '10px', color, fontWeight: 'bold' }}>• {label}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteReminder(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RIDE ESSENTIALS CHECKLIST ──────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckSquare size={16} color="var(--secondary)" /> Ride Essentials
          </h4>
          <span style={{ fontSize: '11px', color: essentialsCheckedCount === ESSENTIALS.length ? 'var(--success)' : 'var(--text-muted)', fontWeight: 'bold' }}>
            {essentialsCheckedCount}/{ESSENTIALS.length} Ready
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ height: '100%', width: `${(essentialsCheckedCount / ESSENTIALS.length) * 100}%`, background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '2px', transition: 'width 0.3s ease' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {ESSENTIALS.map(item => {
            const checked = checkedEssentials.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleEssential(item.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: checked ? 'rgba(0,230,118,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${checked ? 'rgba(0,230,118,0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
              >
                <span style={{ fontSize: '16px' }}>{item.label.split(' ')[0]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '11px', color: checked ? 'var(--success)' : 'white', fontWeight: '600', display: 'block', textDecoration: checked ? 'line-through' : 'none' }}>
                    {item.label.split(' ').slice(1).join(' ')}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.desc}</span>
                </div>
                {checked && <CheckSquare size={12} color="var(--success)" />}
              </button>
            );
          })}
        </div>

        {essentialsCheckedCount === ESSENTIALS.length && (
          <div style={{ marginTop: '12px', textAlign: 'center', background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: '10px', padding: '10px', fontSize: '12px', color: 'var(--success)', fontWeight: 'bold' }}>
            ✅ All essentials packed! You're ready to ride! 🏍️
          </div>
        )}
      </div>

      {/* Interactive Fuel Estimator */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Fuel size={16} color="var(--primary)" /> Quick Fuel Estimator
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
          
          {validationError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', background: 'rgba(255,34,51,0.08)', padding: '8px 10px', borderRadius: '8px', fontSize: '11px' }}>
              <AlertCircle size={14} />
              <span>{validationError}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Start Location</label>
              <input 
                type="text" 
                placeholder="Type 1+ letters" 
                value={fuelStartLocation}
                onChange={(e) => handleStartTyping(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', background: '#1c1c24' }}
              />
              {startSuggestions.length > 0 && (
                <div className="glass-panel animate-zoom-in" style={{ position: 'absolute', top: '56px', left: 0, right: 0, zIndex: 110, background: '#121217', maxHeight: '140px', overflowY: 'auto' }}>
                  {startSuggestions.map((c, i) => (
                    <div key={i} onClick={() => handleSelectStartSuggestion(c)} className="suggestion-item" style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', cursor: 'pointer' }}>
                      📍 {c.name.split(',')[0]}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Destination</label>
              <input 
                type="text" 
                placeholder="Type 1+ letters" 
                value={fuelDestination}
                onChange={(e) => handleDestTyping(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                style={{ width: '100%', padding: '8px 10px', fontSize: '12px', background: '#1c1c24' }}
              />
              {destSuggestions.length > 0 && (
                <div className="glass-panel animate-zoom-in" style={{ position: 'absolute', top: '56px', left: 0, right: 0, zIndex: 110, background: '#121217', maxHeight: '140px', overflowY: 'auto' }}>
                  {destSuggestions.map((c, i) => (
                    <div key={i} onClick={() => handleSelectDestSuggestion(c)} className="suggestion-item" style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', cursor: 'pointer' }}>
                      🏁 {c.name.split(',')[0]}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Select Biker Machine</label>
            <select value={selectedBike} onChange={(e) => handleBikeSelect(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: '12px', background: '#1c1c24' }}>
              {userGarage.length > 0 ? (
                userGarage.map((b, idx) => (
                  <option key={idx} value={b.name}>{b.name}</option>
                ))
              ) : (
                BIKES_DATABASE.map((b, idx) => (
                  <option key={idx} value={b.name}>{b.name} ({b.type})</option>
                ))
              )}
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Road Distance:</span>
              <span style={{ color: 'white', fontWeight: 'bold' }}>{fuelDistance} KM</span>
            </div>
            <input 
              type="range" min="20" max="1500" step="10"
              value={fuelDistance}
              onChange={(e) => { setFuelDistance(Number(e.target.value)); updateCalculations(selectedBike, startCoords, destCoords, Number(e.target.value)); }}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Fuel Preference</label>
            <select value={fuelType} onChange={(e) => { const nf = e.target.value; setFuelType(nf); setFuelPrice((getFuelPriceForLocation(fuelStartLocation, nf) + getFuelPriceForLocation(fuelDestination, nf)) / 2); }} style={{ width: '100%', padding: '8px 10px', fontSize: '12px', background: '#1c1c24' }}>
              <option value="Normal Petrol">Normal Petrol</option>
              <option value="Power Petrol">Power Petrol</option>
            </select>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right' }}>
              Average Price: <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>₹ {fuelPrice.toFixed(2)}/L</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '6px', marginTop: '4px', background: 'rgba(0,0,0,0.15)', padding: '12px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)', fontSize: '11px' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Mileage</span>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{bikeMileage} km/l</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Fuel Liters</span>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{fuelNeeded} L</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Fuel Cost</span>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--secondary)' }}>₹ {fuelCost}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bike Health Reminders */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wrench size={16} color="var(--secondary)" /> Bike Health Status
        </h4>
        {userGarage.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Bike size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
            No active bike in your garage. Add a bike in your Profile tab to track health stats.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(0,230,118,0.05)', borderRadius: '10px', border: '1px solid rgba(0,230,118,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gauge size={14} color="var(--success)" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>Tire Pressure</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Front 32 | Rear 36 PSI</span>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>Normal</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,170,0,0.05)', borderRadius: '10px', border: '1px solid rgba(255,170,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Droplet size={14} color="var(--secondary)" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>Engine Oil Quality</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Last service 4,200 km ago</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '600' }}>Service Due</span>
                <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>in 800 km</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,34,51,0.05)', borderRadius: '10px', border: '1px solid rgba(255,34,51,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={14} color="var(--accent)" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>Brake Pad Thickness</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Rear brake pads worn</span>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600' }}>Replace Soon</span>
            </div>
          </div>
        )}
      </div>

      {/* Crew notifications drawer */}
      {showNotifications && (
        <div className="bottom-sheet-overlay animate-fade-in" style={{ zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNotifications(false)}>
          <div className="glass-panel animate-zoom-in" style={{ width: '90%', maxWidth: '380px', background: '#121217', maxHeight: '80vh', overflowY: 'auto', padding: '24px 20px', borderRadius: '20px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={20} color="var(--primary)" /> Crew Deck Notifications
              </h3>
              <button onClick={() => setShowNotifications(false)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {pendingRideRequests.length === 0 && pendingFriendRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                <p style={{ fontSize: '13px' }}>All quiet on the crew deck! 🏍️</p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>No pending ride or friend requests.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Ride Requests Section */}
                {pendingRideRequests.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '13px', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', marginBottom: '10px', fontWeight: 'bold' }}>
                      🏍️ Ride Join Requests ({pendingRideRequests.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {pendingRideRequests.map((req) => (
                        <div key={req.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: 'bold' }}>
                            <span>👤 {req.name} (Age: {req.age})</span>
                            <span style={{ color: 'var(--secondary)' }}>{req.crewType}</span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)' }}>
                            Wants to join: <strong style={{ color: 'white' }}>{req.rideTitle}</strong>
                          </div>
                          <div style={{ color: 'var(--text-secondary)' }}>
                            Bike: {req.bikeModel} | Phone: {req.phone}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button 
                              className="btn-secondary" 
                              style={{ flex: 1, padding: '6px 10px', fontSize: '10.5px', borderRadius: '8px', background: 'rgba(255, 23, 68, 0.1)', borderColor: 'rgba(255, 23, 68, 0.3)', color: '#ff1744' }}
                              onClick={() => handleDeclineRideRequest(req.rideId, req.id, req.name)}
                            >
                              Decline
                            </button>
                            <button 
                              className="btn-primary" 
                              style={{ flex: 1.5, padding: '6px 10px', fontSize: '10.5px', borderRadius: '8px', background: 'linear-gradient(135deg, #00e676 0%, #00b0ff 100%)', border: 'none', color: 'white' }}
                              onClick={() => handleAcceptRideRequest(req.rideId, req.id, req.name)}
                            >
                              Accept
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friend Requests Section */}
                {pendingFriendRequests.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '13px', color: 'var(--info)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', marginBottom: '10px', fontWeight: 'bold' }}>
                      🤝 Friend Requests ({pendingFriendRequests.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {pendingFriendRequests.map((req) => (
                        <div key={req.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: 'bold' }}>
                            <span>👤 {req.displayName}</span>
                            <span style={{ color: 'var(--info)' }}>{req.level}</span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)' }}>
                            Garage: {req.bike}
                          </div>
                          {req.note && (
                            <div style={{ fontStyle: 'italic', color: 'var(--secondary)', marginTop: '4px', background: 'rgba(255, 170, 0, 0.05)', padding: '6px 8px', borderRadius: '6px' }}>
                              💬 "{req.note}"
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button 
                              className="btn-secondary" 
                              style={{ flex: 1, padding: '6px 10px', fontSize: '10.5px', borderRadius: '8px', background: 'rgba(255, 23, 68, 0.1)', borderColor: 'rgba(255, 23, 68, 0.3)', color: '#ff1744' }}
                              onClick={() => handleDeclineFriendRequest(req)}
                            >
                              Decline
                            </button>
                            <button 
                              className="btn-primary" 
                              style={{ flex: 1.5, padding: '6px 10px', fontSize: '10.5px', borderRadius: '8px', background: 'linear-gradient(135deg, #00b0ff 0%, #00e676 100%)', border: 'none', color: 'white' }}
                              onClick={() => handleAcceptFriendRequest(req)}
                            >
                              Accept
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom In-App Toast Notification */}
      {toastMessage && (
        <div 
          className="animate-slide-up"
          style={{
            position: 'absolute',
            bottom: '90px',
            left: '16px',
            right: '16px',
            zIndex: 200,
            background: 'rgba(18, 18, 22, 0.95)',
            border: '1.5px solid var(--primary)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 32px rgba(255, 85, 0, 0.25)',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '13px'
          }}
        >
          <span style={{ fontSize: '18px' }}>🏍️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer spacer */}
      <div style={{ height: '40px' }} />
    </div>
  );
}
