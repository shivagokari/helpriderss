import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, MapPin, Search, Navigation, Eye, 
  Map, Fuel, ShieldAlert, Wrench, Shield, Info, Radio, RefreshCw
} from 'lucide-react';
import { searchLocationInIndia, INDIAN_CITIES } from '../utils/geo';

export default function Explore() {
  const [activeFilters, setActiveFilters] = useState(['riders', 'fuel', 'repairs', 'emergency']);
  const [speed, setSpeed] = useState(65);
  const [heading, setHeading] = useState('NNE');
  const [gpsLocked, setGpsLocked] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Suggestions search states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [validationError, setValidationError] = useState('');

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  // Sync network connectivity status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Simulate real-time speed fluctuation slightly
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeed(s => {
        const delta = Math.floor(Math.random() * 7) - 3;
        const newSpeed = s + delta;
        return newSpeed > 120 ? 120 : newSpeed < 40 ? 40 : newSpeed;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Helper to filter local Indian cities instantly
  const getLocalCities = (query) => {
    if (!query) return [];
    const lower = query.toLowerCase();
    return INDIAN_CITIES.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      c.state.toLowerCase().includes(lower)
    );
  };

  // Autocomplete Suggestions Fetch on 1+ letters (instant local + async API)
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    const locals = getLocalCities(query);
    setSuggestions(locals);

    if (query.length >= 3 && navigator.onLine) {
      const timer = setTimeout(async () => {
        const res = await searchLocationInIndia(query);
        if (res && res.length > 0) {
          setSuggestions(prev => {
            const combined = [...prev];
            res.forEach(item => {
              if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
                combined.push(item);
              }
            });
            return combined.slice(0, 8);
          });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  // Leaflet Map Initialization
  useEffect(() => {
    if (!mapInstance.current && window.L) {
      // Set Hyderabad center default coordinates
      const hyderabadCoords = [17.3850, 78.4867];
      
      const map = window.L.map(mapRef.current, {
        center: hyderabadCoords,
        zoom: 12,
        zoomControl: false,
        attributionControl: false
      });

      // Load Google Maps Tile Layer
      window.L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      mapInstance.current = map;
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update Map Markers on filter changes
  useEffect(() => {
    if (!mapInstance.current || !window.L) return;

    // Clear old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Mock map points around Hyderabad
    const mapPoints = [
      { id: 'p1', name: 'DukeFlyer (KTM 390)', type: 'riders', lat: 17.4150, lon: 78.5100, info: 'Cruising @ 75km/h' },
      { id: 'p2', name: 'RE_Rider (Classic 350)', type: 'riders', lat: 17.3600, lon: 78.4400, info: 'Chilling at Cafe' },
      { id: 'p3', name: 'NH-65 HP Petrol Station', type: 'fuel', lat: 17.4350, lon: 78.4200, info: 'Open 24/7 | Normal & Power' },
      { id: 'p4', name: 'Highway MotoCare Center', type: 'repairs', lat: 17.3800, lon: 78.5400, info: 'Chain/Tire bay' },
      { id: 'p5', name: 'Global First Aid Care', type: 'emergency', lat: 17.3300, lon: 78.4800, info: '24hr Trauma Desk' },
    ];

    const filteredPoints = mapPoints.filter(p => activeFilters.includes(p.type));

    // Custom CSS styling icons to prevent Vite asset packaging broken issues
    filteredPoints.forEach(pt => {
      const color = pt.type === 'riders' ? '#ffaa00' : pt.type === 'fuel' ? '#ff5500' : pt.type === 'repairs' ? '#00b0ff' : '#ef4444';
      
      const customIcon = window.L.divIcon({
        className: 'leaflet-custom-marker',
        html: `<div style="width: 14px; height: 14px; background: ${color}; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px ${color};"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = window.L.marker([pt.lat, pt.lon], { icon: customIcon })
        .bindPopup(`<strong style="color:black">${pt.name}</strong><br/><span style="color:#555;font-size:11px;">${pt.info}</span>`)
        .addTo(mapInstance.current);

      markersRef.current.push(marker);
    });

    // Add User Current Location Pin (Hyderabad default)
    if (gpsLocked) {
      const userIcon = window.L.divIcon({
        className: 'leaflet-user-marker',
        html: `<div style="position: relative; width: 16px; height: 16px; background: #ff5500; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 12px #ff5500;">
                 <div style="position: absolute; top:-4px; left:-4px; width:20px; height:20px; border-radius:50%; border:2px solid #ff5500; animation: dash 2s infinite opacity;"></div>
               </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const userMarker = window.L.marker([17.3850, 78.4867], { icon: userIcon })
        .bindPopup('<strong style="color:black">You are here</strong><br/><span style="color:#555;font-size:11px;">GPS High Accuracy lock</span>')
        .addTo(mapInstance.current);

      markersRef.current.push(userMarker);
    }

  }, [activeFilters, gpsLocked]);

  const handleSelectSuggestion = (city) => {
    setSearchQuery(city.name);
    setSuggestions([]);
    setValidationError('');
    
    if (mapInstance.current) {
      // Pan map directly to the geocoded location
      mapInstance.current.setView([city.lat, city.lon], 13);
      
      const targetIcon = window.L.divIcon({
        className: 'leaflet-target-marker',
        html: '<div style="width: 18px; height: 18px; background: #00b0ff; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 12px #00b0ff;"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const targetMarker = window.L.marker([city.lat, city.lon], { icon: targetIcon })
        .bindPopup(`<strong style="color:black">${city.name.split(',')[0]}</strong><br/><span style="color:#555">Geocode lock</span>`)
        .addTo(mapInstance.current)
        .openPopup();

      markersRef.current.push(targetMarker);
    }
  };

  const toggleFilter = (filter) => {
    if (activeFilters.includes(filter)) {
      setActiveFilters(activeFilters.filter(f => f !== filter));
    } else {
      setActiveFilters([...activeFilters, filter]);
    }
  };

  return (
    <div className="explore-section scroll-y" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Map Header Overlay */}
      <div style={{ position: 'absolute', top: '70px', left: '16px', right: '16px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' }} className="animate-fade-in">
        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', webkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '10px 14px', alignItems: 'center', gap: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <Search size={18} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Search Indian towns, highway passes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              style={{ border: 'none', background: 'none', padding: '0', color: 'white', flex: 1, fontSize: '13px' }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSuggestions([]); }} style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 'bold' }}>
                Clear
              </button>
            )}
            <MapPin size={18} color="var(--primary)" style={{ cursor: 'pointer' }} onClick={() => {
              if (mapInstance.current) {
                mapInstance.current.setView([17.3850, 78.4867], 12);
                setGpsLocked(true);
              }
            }} />
          </div>

          {/* suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="glass-panel animate-zoom-in" style={{ position: 'absolute', top: '48px', left: 0, right: 0, zIndex: 120, background: '#121217', maxHeight: '180px', overflowY: 'auto' }}>
              {suggestions.map((city, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleSelectSuggestion(city)}
                  className="suggestion-item"
                  style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', cursor: 'pointer', color: 'white' }}
                >
                  📍 {city.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Offline / Online banner */}
        {isOffline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 34, 51, 0.9)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold' }}>
            <Radio size={14} className="route-trail" />
            <span>App Offline. Running map from cache.</span>
          </div>
        )}

        {/* Filters Carousel */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'riders', label: '🏍️ Riders', color: 'var(--secondary)' },
            { id: 'fuel', label: '⛽ Fuel', color: 'var(--primary)' },
            { id: 'repairs', label: '🔧 Repairs', color: 'var(--info)' },
            { id: 'emergency', label: '🚨 Safety', color: 'red' }
          ].map(f => {
            const isSelected = activeFilters.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  background: isSelected ? f.color : 'rgba(18,18,22,0.85)',
                  border: '1px solid',
                  borderColor: isSelected ? f.color : 'var(--glass-border)',
                  color: isSelected ? 'black' : 'var(--text-secondary)',
                  backdropFilter: 'var(--glass-blur)',
                  webkitBackdropFilter: 'var(--glass-blur)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Map Container Div */}
      <div 
        ref={mapRef}
        style={{ 
          width: '100%', 
          height: '460px', 
          background: '#0d0d0f'
        }}
      />

      {/* Telemetry Dashboard Stats Overlay (Bottom Panel) */}
      <div className="glass-panel animate-slide-up" style={{ padding: '16px 20px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', margin: '-10px 0 0 0', zIndex: 12, position: 'relative', flex: 1, minHeight: '160px', background: '#0e0e12' }}>
        
        {/* Panel drag indicator */}
        <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', margin: '-8px auto 14px' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Route segment</span>
            <h4 style={{ fontSize: '15px', color: 'white' }}>Hyderabad Outer Ring Road (NH-65)</h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,85,0,0.1)', border: '1px solid rgba(255,85,0,0.2)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>
            {heading} Direction
          </div>
        </div>

        {/* Real-time statistics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
          <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '12px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Sim Speed</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-display)', color: 'var(--secondary)' }}>{speed} <span style={{ fontSize: '10px' }}>KM/H</span></strong>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '12px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Alt. Level</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-display)', color: 'white' }}>542 <span style={{ fontSize: '10px' }}>MTRS</span></strong>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '12px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Next Fuel Stop</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-display)', color: 'var(--primary)' }}>12 <span style={{ fontSize: '10px' }}>KM</span></strong>
          </div>
        </div>

        {/* Ride Telemetry Controls */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
          <button 
            className="btn-secondary" 
            style={{ flex: 1, padding: '10px', fontSize: '12px' }}
            onClick={() => {
              setSpeed(Math.floor(Math.random() * 40) + 50);
              const headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
              setHeading(headings[Math.floor(Math.random() * headings.length)]);
            }}
          >
            <RefreshCw size={12} /> Force Recalculation
          </button>
          <button 
            className="btn-primary" 
            style={{ flex: 1.2, padding: '10px', fontSize: '12px' }}
            onClick={() => alert('Smart SOS system triggered. Sending current GPS coords to emergency contacts.')}
          >
            🚨 Trigger Smart SOS
          </button>
        </div>

      </div>

    </div>
  );
}
