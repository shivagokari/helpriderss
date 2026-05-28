import React, { useState, useEffect } from 'react';
import { 
  CloudSun, Droplet, Gauge, MapPin, Calendar, Fuel, 
  Settings, Award, Sparkles, Navigation, AlertTriangle, 
  Wrench, ChevronRight, Share2, Compass, Heart, Bell, AlertCircle
} from 'lucide-react';
import { 
  searchLocationInIndia, 
  calculateRoadDistance, 
  getOSRMDistance,
  computeBikeSpecs, 
  BIKES_DATABASE, 
  TELANGANA_FUEL,
  INDIAN_CITIES,
  getFuelPriceForLocation
} from '../utils/geo';

export default function HomeDashboard({ user, onTabChange, onOpenDetails, openWizard }) {
  // Fuel Estimator States
  const [fuelStartLocation, setFuelStartLocation] = useState('');
  const [fuelDestination, setFuelDestination] = useState('');
  const [selectedBike, setSelectedBike] = useState('Royal Enfield Classic 350');
  const [fuelDistance, setFuelDistance] = useState(350);
  const [bikeMileage, setBikeMileage] = useState(35); // default highway Classic 350
  const [fuelPrice, setFuelPrice] = useState(115.73); // Telangana default normal price
  const [fuelType, setFuelType] = useState('Normal Petrol');

  // Suggestions & Geocoding Coordinates State
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [startCoords, setStartCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Autocomplete Select Tracker to avoid infinite loops
  const [startSelected, setStartSelected] = useState(false);
  const [destSelected, setDestSelected] = useState(false);

  // Helper to filter local Indian cities instantly
  const getLocalCities = (query) => {
    if (!query) return [];
    const lower = query.toLowerCase();
    return INDIAN_CITIES.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      c.state.toLowerCase().includes(lower)
    );
  };

  // Fetch Start Suggestions on 1+ letters (instant local + async API)
  useEffect(() => {
    const query = fuelStartLocation.trim();
    if (startSelected || query.length < 1) {
      setStartSuggestions([]);
      return;
    }

    const locals = getLocalCities(query);
    setStartSuggestions(locals);

    if (query.length >= 3 && navigator.onLine) {
      const timer = setTimeout(async () => {
        const res = await searchLocationInIndia(query);
        if (res && res.length > 0) {
          setStartSuggestions(prev => {
            const combined = [...prev];
            res.forEach(item => {
              if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
                combined.push(item);
              }
            });
            return combined.slice(0, 8);
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [fuelStartLocation, startSelected]);

  // Fetch Dest Suggestions on 1+ letters (instant local + async API)
  useEffect(() => {
    const query = fuelDestination.trim();
    if (destSelected || query.length < 1) {
      setDestSuggestions([]);
      return;
    }

    const locals = getLocalCities(query);
    setDestSuggestions(locals);

    if (query.length >= 3 && navigator.onLine) {
      const timer = setTimeout(async () => {
        const res = await searchLocationInIndia(query);
        if (res && res.length > 0) {
          setDestSuggestions(prev => {
            const combined = [...prev];
            res.forEach(item => {
              if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
                combined.push(item);
              }
            });
            return combined.slice(0, 8);
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [fuelDestination, destSelected]);

  // Handle bike changes and set mileage
  const handleBikeSelect = (bikeName) => {
    setSelectedBike(bikeName);
    updateCalculations(bikeName, startCoords, destCoords, fuelDistance);
  };

  const updateCalculations = async (bike, sCoords, dCoords, currentDist, startLoc = fuelStartLocation, destLoc = fuelDestination, currentFuelType = fuelType) => {
    setValidationError('');
    
    // Determine whether highway or city mileage is appropriate
    const isHighway = currentDist > 100;
    const specs = computeBikeSpecs(bike, 'Cruising (Scenic/Relaxed)', isHighway);
    setBikeMileage(specs.mileage);

    // Calculate dynamic state-by-state fuel price averages
    const startPrice = getFuelPriceForLocation(startLoc, currentFuelType);
    const destPrice = getFuelPriceForLocation(destLoc, currentFuelType);
    const avgPrice = (startPrice + destPrice) / 2;
    setFuelPrice(avgPrice);

    if (sCoords && dCoords) {
      let roadDist = calculateRoadDistance(sCoords.lat, sCoords.lon, dCoords.lat, dCoords.lon);
      setFuelDistance(roadDist);
      
      try {
        const osrmDist = await getOSRMDistance(sCoords.lat, sCoords.lon, dCoords.lat, dCoords.lon);
        if (osrmDist && osrmDist > 0) {
          roadDist = osrmDist;
          setFuelDistance(roadDist);
        }
      } catch (err) {
        console.warn("OSRM distance lookup failed", err);
      }
      
      // Re-trigger mileage based on newly calculated road distance
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
    setFuelStartLocation(val);
    setStartSelected(false);
    setStartCoords(null); // Reset lock
    if (val.trim() && !destCoords) {
      setValidationError('Please select start and destination from suggestions to lock coordinates.');
    }
  };

  const handleDestTyping = (val) => {
    setFuelDestination(val);
    setDestSelected(false);
    setDestCoords(null); // Reset lock
    if (val.trim() && !startCoords) {
      setValidationError('Please select start and destination from suggestions to lock coordinates.');
    }
  };

  // Calculate fuel stats
  const fuelNeeded = (fuelDistance / bikeMileage).toFixed(1);
  const fuelCost = Math.round(fuelNeeded * fuelPrice);

  const upcomingRide = {
    id: 'up-1',
    title: 'Trans-Himalayan Pass',
    dates: 'June 12 - June 18, 2026',
    route: 'Manali ➔ Jispa ➔ Leh',
    distance: '428 KM',
    riders: 8,
    difficulty: 'Hard',
    rating: 4.8,
    memories: 14
  };

  const aiSuggestions = [
    { title: 'Western Coastal Sweep', km: '210 KM', style: 'Cruising', desc: 'Sunny morning forecast. Low traffic window 6-9 AM.' },
    { title: 'Muddy Trails Ridge', km: '65 KM', style: 'Off-Road', desc: 'High soil dampness today. Ideal for trail traction.' },
  ];

  const bikerEvents = [
    { title: 'Helpriders Midnight Rally', date: 'Tonight, 10 PM', loc: 'Downtown Plaza Hub', joined: 42 },
    { title: 'Weekend Breakfast Meet', date: 'Sunday, 7 AM', loc: 'Highway Coffee Cafe', joined: 18 }
  ];

  return (
    <div className="home-dashboard scroll-y" style={{ padding: '20px 16px' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }} className="animate-fade-in">
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Welcome back,</span>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {user?.displayName || 'GhostRider'} <Sparkles size={18} color="var(--secondary)" />
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
            onClick={() => alert('All sensors active. Background tracking enabled.')}
          >
            <Bell size={18} />
            <span style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></span>
          </button>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' }}>
            {(user?.displayName || 'G')[0].toUpperCase()}
          </div>
        </div>
      </div>

      {/* Upcoming Ride Card */}
      <div 
        className="glass-panel" 
        style={{ 
          background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.15) 0%, rgba(18, 18, 22, 0.8) 100%)',
          borderColor: 'rgba(255, 85, 0, 0.25)', 
          padding: '18px', 
          marginBottom: '20px',
          boxShadow: '0 8px 30px rgba(255, 85, 0, 0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', background: 'var(--primary)', color: 'white', padding: '3px 8px', borderRadius: '20px', fontWeight: '600', textTransform: 'uppercase' }}>
            Upcoming Ride
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} /> {upcomingRide.dates.split(' - ')[0]}
          </span>
        </div>
        <h3 style={{ fontSize: '20px', marginBottom: '4px' }}>{upcomingRide.title}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '14px' }}>
          <MapPin size={13} color="var(--primary)" /> {upcomingRide.route}
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '12px' }}>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Distance</span>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{upcomingRide.distance}</div>
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Terrain Rating</span>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--secondary)' }}>{upcomingRide.difficulty} ({upcomingRide.rating} ★)</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-primary" 
            style={{ flex: 1, padding: '10px 14px', fontSize: '13px', borderRadius: '10px' }}
            onClick={() => onOpenDetails(upcomingRide)}
          >
            <Navigation size={14} /> Open Briefing
          </button>
          <button 
            className="btn-secondary" 
            style={{ padding: '10px', borderRadius: '10px' }}
            onClick={() => alert('GPX telemetry file exported to phone downloads.')}
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>

      {/* Weather Overview */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ background: 'rgba(0, 176, 255, 0.1)', padding: '12px', borderRadius: '16px' }}>
          <CloudSun size={32} color="var(--info)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h4 style={{ fontSize: '16px' }}>Clear for Cruising</h4>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>28°C</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
            Wind: 14 km/h NW | Humidity: 45%
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: '6px', padding: '4px 8px', marginTop: '8px', fontSize: '10px', color: 'var(--secondary)' }}>
            <AlertTriangle size={10} />
            <span>Riding Alert: Rain expected on mountain passes later today.</span>
          </div>
        </div>
      </div>

      {/* Ride Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '12px 16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Distance</span>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', margin: '4px 0', color: 'var(--primary)' }}>4,820 KM</div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+240 KM this week</span>
        </div>
        <div className="glass-panel" style={{ padding: '12px 16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Completed Trips</span>
          <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', margin: '4px 0', color: 'var(--secondary)' }}>28 Trips</div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Level: Apex Biker</span>
        </div>
      </div>

      {/* Interactive Fuel Estimator */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Fuel size={16} color="var(--primary)" /> Quick Fuel Estimator
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
          
          {/* Validation Warnings */}
          {validationError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', background: 'rgba(255,34,51,0.08)', padding: '8px 10px', borderRadius: '8px', fontSize: '11px' }}>
              <AlertCircle size={14} />
              <span>{validationError}</span>
            </div>
          )}
          
          {/* Start and Destination Inputs with Suggestions */}
          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            
            {/* Start Location Input */}
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
                    <div 
                      key={i} 
                      onClick={() => handleSelectStartSuggestion(c)}
                      className="suggestion-item"
                      style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', cursor: 'pointer' }}
                    >
                      📍 {c.name.split(',')[0]}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Destination Input */}
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
                    <div 
                      key={i} 
                      onClick={() => handleSelectDestSuggestion(c)}
                      className="suggestion-item"
                      style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', cursor: 'pointer' }}
                    >
                      🏁 {c.name.split(',')[0]}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Bike Selection Dropdown (All indian bikes database) */}
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Select Biker Machine</label>
            <select 
              value={selectedBike} 
              onChange={(e) => handleBikeSelect(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', fontSize: '12px', background: '#1c1c24' }}
            >
              {BIKES_DATABASE.map((b, idx) => (
                <option key={idx} value={b.name}>{b.name} ({b.type})</option>
              ))}
            </select>
          </div>

          {/* Distance Slider (Fine-tune) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Road Distance:</span>
              <span style={{ color: 'white', fontWeight: 'bold' }}>{fuelDistance} KM</span>
            </div>
            <input 
              type="range" 
              min="20" 
              max="1500" 
              step="10"
              value={fuelDistance}
              onChange={(e) => {
                setFuelDistance(Number(e.target.value));
                updateCalculations(selectedBike, startCoords, destCoords, Number(e.target.value));
              }}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
          </div>

          {/* Fuel Price Selector */}
          <div>
            <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Fuel Preference</label>
            <select 
              value={fuelType} 
              onChange={(e) => {
                const newFuelType = e.target.value;
                setFuelType(newFuelType);
                const startPrice = getFuelPriceForLocation(fuelStartLocation, newFuelType);
                const destPrice = getFuelPriceForLocation(fuelDestination, newFuelType);
                setFuelPrice((startPrice + destPrice) / 2);
              }}
              style={{ width: '100%', padding: '8px 10px', fontSize: '12px', background: '#1c1c24' }}
            >
              <option value="Normal Petrol">Normal Petrol</option>
              <option value="Power Petrol">Power Petrol</option>
            </select>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right' }}>
              Average Price: <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>₹ {fuelPrice.toFixed(2)}/L</span>
            </div>
          </div>

          {/* Calculations Output */}
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
          <Wrench size={16} color="var(--secondary)" /> Bike Health Reminders
        </h4>
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
      </div>

      {/* AI Ride Suggestions */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} color="var(--primary)" /> AI Suggestions
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {aiSuggestions.map((s, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '12px 14px', borderLeft: '3px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h5 style={{ fontSize: '13px', color: 'white' }}>{s.title}</h5>
                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px' }}>{s.style}</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{s.desc}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{s.km} Est.</span>
                <button 
                  onClick={() => alert(`Saved '${s.title}' to Saved Itineraries.`)} 
                  style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  Save <ChevronRight size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nearby Biker Events */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Compass size={16} color="var(--info)" /> Nearby Biker Events
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {bikerEvents.map((e, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ fontSize: '13px', color: 'white', marginBottom: '2px' }}>{e.title}</h5>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>{e.date} • {e.loc}</span>
                <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '600', marginTop: '4px', display: 'inline-block' }}>🔥 {e.joined} Bikers joining</span>
              </div>
              <button 
                onClick={() => alert(`You have registered for '${e.title}'!`)}
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', color: 'white', fontWeight: 'bold' }}
              >
                Join
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Branding spacer */}
      <div style={{ height: '40px' }} />

    </div>
  );
}
