import React, { useState, useEffect } from 'react';
import { 
  CloudSun, Droplet, Gauge, MapPin, Calendar, Fuel, 
  Sparkles, Navigation, AlertTriangle, 
  Wrench, Share2, Bell, AlertCircle, CheckSquare, Square,
  Plus, Trash2, Clock
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

export default function HomeDashboard({ user, onTabChange, onOpenDetails, openWizard }) {
  // Fuel Estimator States
  const [fuelStartLocation, setFuelStartLocation] = useState('');
  const [fuelDestination, setFuelDestination] = useState('');
  const [selectedBike, setSelectedBike] = useState('Royal Enfield Classic 350');
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
            onClick={() => setShowAddReminder(true)}
          >
            <Bell size={18} />
            {reminders.filter(r => !r.done).length > 0 && (
              <span style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></span>
            )}
          </button>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' }}>
            {(user?.displayName || 'R')[0].toUpperCase()}
          </div>
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
              {BIKES_DATABASE.map((b, idx) => (
                <option key={idx} value={b.name}>{b.name} ({b.type})</option>
              ))}
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

      {/* Footer spacer */}
      <div style={{ height: '40px' }} />
    </div>
  );
}
