import { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, Phone, MessageSquare, MapPin, Search, Navigation, 
  X, Award, Compass
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import { calculateRoadDistance } from '../utils/geo';

// Local Backup/Seed Data for Mechanics
const SEED_MECHANICS = [
  {
    id: 'mech-1',
    shopName: 'Asphalt Kings Garage',
    ownerName: 'Vikram Singh',
    phone: '+91 98765 43210',
    whatsapp: '+919876543210',
    address: 'Plot 42, Gachibowli Outer Ring Road',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.4401,
    longitude: 78.3489,
    bikeBrands: ['Royal Enfield', 'Honda', 'KTM', 'Jawa', 'Triumph'],
    services: ['Engine Tuning', 'Clutch Rebuild', 'Fork Alignment', 'Electrical Diagnosis'],
    status: 'Open',
    image: '🔧'
  },
  {
    id: 'mech-2',
    shopName: 'RE Bullet Specialists',
    ownerName: 'Manpreet Singh',
    phone: '+91 99887 76655',
    whatsapp: '+919988776655',
    address: 'Near Begumpet Metro Station',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.4375,
    longitude: 78.4613,
    bikeBrands: ['Royal Enfield', 'Jawa', 'Harley Davidson', 'Other'],
    services: ['Vintage Restoration', 'Tappet Adjustments', 'Custom Exhaust Fitting', 'Carburetor Jetting'],
    status: 'Open',
    image: '🏍️'
  },
  {
    id: 'mech-3',
    shopName: 'MotoCorp Performance',
    ownerName: 'Ravi Teja',
    phone: '+91 91234 56789',
    whatsapp: '+919123456789',
    address: 'Hitech City Road, Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.4483,
    longitude: 78.3741,
    bikeBrands: ['KTM', 'Yamaha', 'Kawasaki', 'BMW Motorrad', 'Ducati'],
    services: ['ECU Remapping', 'Superbike Servicing', 'Chain-sprocket Upgrades', 'Coolant Flush'],
    status: 'Open',
    image: '⚡'
  },
  {
    id: 'mech-4',
    shopName: 'Biker Point TVS & Bajaj',
    ownerName: 'K. Srinivasan',
    phone: '+91 90001 22334',
    whatsapp: '+919000122334',
    address: 'Chandrayangutta Flyover Road',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.3200,
    longitude: 78.4700,
    bikeBrands: ['Bajaj', 'Pulsar', 'TVS', 'Hero', 'Honda'],
    services: ['General Servicing', 'Brake Pad Replacement', 'Oil Change', 'Chain Tensioning'],
    status: 'Closed',
    image: '🛠️'
  }
];

const BRANDS = [
  'All Bikes', 'Royal Enfield', 'Honda', 'TVS', 'Bajaj', 'Pulsar', 
  'KTM', 'Yamaha', 'Suzuki', 'Kawasaki', 'Hero', 'Jawa', 
  'Harley Davidson', 'BMW Motorrad', 'Triumph', 'Ducati', 
  'Benelli', 'Aprilia', 'Husqvarna', 'Other'
];

export default function MechanicsTab() {
  const [mechanics, setMechanics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All Bikes');
  const [loading, setLoading] = useState(true);
  const [selectedMechanic, setSelectedMechanic] = useState(null);
  
  // Geolocation states
  const [userCoords, setUserCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Fetch mechanics from Supabase with local fallback
  const fetchMechanics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mechanics')
        .select('*')
        .order('shop_name', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Map snake_case database columns to camelCase component properties
        const mapped = data.map(m => ({
          id: m.id,
          shopName: m.shop_name,
          ownerName: m.owner_name,
          phone: m.phone,
          whatsapp: m.whatsapp,
          address: m.address,
          city: m.city,
          state: m.state,
          latitude: m.latitude,
          longitude: m.longitude,
          bikeBrands: m.bike_brands || [],
          services: m.services || [],
          status: m.status || 'Open',
          image: m.image
        }));
        setMechanics(mapped);
      } else {
        setMechanics(SEED_MECHANICS);
      }
    } catch (err) {
      console.warn('Failed to load mechanics from database, using seed data:', err.message);
      setMechanics(SEED_MECHANICS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchMechanics();
    });
  }, []);

  // Request GPS Coordinates
  const handleGPSDetect = () => {
    setGpsLoading(true);
    setGpsError('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          setGpsLoading(false);
        },
        (error) => {
          console.warn('[GPS] Error detecting location:', error);
          setGpsError('Could not acquire GPS lock. Please check permissions.');
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setGpsError('GPS geolocation not supported by browser.');
      setGpsLoading(false);
    }
  };

  // Filter & Distance Sorting
  const filteredAndSortedMechanics = useMemo(() => {
    let list = [...mechanics];

    // Search query by shop name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => m.shopName.toLowerCase().includes(q) || m.ownerName.toLowerCase().includes(q));
    }

    // Search query by city
    if (searchCity.trim()) {
      const c = searchCity.toLowerCase();
      list = list.filter(m => m.city.toLowerCase().includes(c) || m.address.toLowerCase().includes(c));
    }

    // Filter by Brand Support
    if (selectedBrand !== 'All Bikes') {
      list = list.filter(m => m.bikeBrands.includes(selectedBrand));
    }

    // Add distance calculation if user coordinates are locked
    if (userCoords) {
      list = list.map(m => {
        if (m.latitude && m.longitude) {
          const dist = calculateRoadDistance(userCoords.lat, userCoords.lon, m.latitude, m.longitude);
          return { ...m, distance: dist };
        }
        return { ...m, distance: Infinity };
      });
      // Sort by distance (nearest first)
      list.sort((a, b) => a.distance - b.distance);
    }

    return list;
  }, [mechanics, searchQuery, searchCity, selectedBrand, userCoords]);

  return (
    <div className="mechanics-tab scroll-y page-container" style={{ padding: '20px 16px', maxWidth: '360px', margin: '0 auto' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Support Deck</span>
        <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Mechanics <Wrench size={22} color="var(--primary)" />
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Find verified mechanics nearby and filter by your motorcycle brand.
        </p>
      </div>

      {/* Geolocation Trigger */}
      <div className="glass-panel" style={{ padding: '12px 14px', marginBottom: '16px', border: '1px solid rgba(255,170,0,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} className={gpsLoading ? 'animate-spin' : ''} color={userCoords ? 'var(--success)' : 'var(--secondary)'} style={gpsLoading ? { animation: 'spin 1s linear infinite' } : {}} />
            <div>
              <strong style={{ fontSize: '12.5px', color: 'white', display: 'block' }}>GPS Location Sorting</strong>
              <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)' }}>
                {userCoords ? 'GPS locked! Sorting by nearest.' : 'Sort mechanics by proximity to you.'}
              </span>
            </div>
          </div>
          <button 
            className="btn-primary" 
            onClick={handleGPSDetect} 
            disabled={gpsLoading}
            style={{ padding: '6px 12px', fontSize: '10.5px', borderRadius: '8px', flexShrink: 0 }}
          >
            {gpsLoading ? 'Syncing...' : userCoords ? 'Refresh GPS' : 'Find Nearby'}
          </button>
        </div>
        {gpsError && (
          <span style={{ fontSize: '9px', color: 'var(--accent)' }}>⚠️ {gpsError}</span>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {/* Search Inputs */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="has-left-icon"
            placeholder="Search by shop/mechanic name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 38px', fontSize: '13px', background: 'var(--bg-tertiary)' }}
          />
        </div>
        <div style={{ position: 'relative', width: '100%' }}>
          <MapPin size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="has-left-icon"
            placeholder="Search by city..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 38px', fontSize: '13px', background: 'var(--bg-tertiary)' }}
          />
        </div>

        {/* Brand Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px' }}>
          {BRANDS.map(brand => (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand)}
              style={{
                padding: '6px 12px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                background: selectedBrand === brand ? 'var(--primary)' : 'var(--bg-tertiary)',
                color: selectedBrand === brand ? 'white' : 'var(--text-secondary)',
                border: '1px solid',
                borderColor: selectedBrand === brand ? 'var(--primary)' : 'var(--glass-border)',
                cursor: 'pointer'
              }}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>

      {/* List content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid transparent', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'dash 1s linear infinite' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>Mapping workshops...</span>
        </div>
      ) : filteredAndSortedMechanics.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Wrench size={32} style={{ marginBottom: '12px', opacity: 0.5, margin: '0 auto' }} />
          <p style={{ fontSize: '13px' }}>No mechanics found matching your query.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredAndSortedMechanics.map((mech) => (
            <div 
              key={mech.id} 
              className="glass-panel animate-fade-in" 
              onClick={() => setSelectedMechanic(mech)}
              style={{ 
                padding: '14px', 
                border: '1px solid var(--glass-border)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* Profile Avatar / Image */}
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {mech.image || '🔧'}
                </div>
                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h4 style={{ fontSize: '15px', color: 'white', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mech.shopName}</h4>
                    <span style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', padding: '1px 6px', borderRadius: '8px', background: mech.status === 'Open' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 34, 51, 0.15)', color: mech.status === 'Open' ? 'var(--success)' : 'var(--accent)' }}>
                      {mech.status}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>👨‍🔧 {mech.ownerName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {mech.city}, {mech.state}</span>
                </div>
              </div>

              {/* Supported brands summary tags */}
              <div style={{ display: 'flex', gap: '4px', overflowX: 'hidden', marginTop: '10px', flexWrap: 'wrap' }}>
                {mech.bikeBrands.slice(0, 3).map((brand) => (
                  <span key={brand} style={{ fontSize: '9px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {brand}
                  </span>
                ))}
                {mech.bikeBrands.length > 3 && (
                  <span style={{ fontSize: '9px', background: 'rgba(255,85,0,0.08)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                    +{mech.bikeBrands.length - 3} more
                  </span>
                )}
              </div>

              {/* GPS Distance / Google navigation shortcuts */}
              {mech.distance !== undefined && mech.distance !== Infinity && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '11px' }}>
                  <span style={{ color: 'var(--secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Compass size={12} /> {mech.distance.toFixed(1)} KM away
                  </span>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${mech.latitude},${mech.longitude}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 'bold' }}
                  >
                    Navigate <Navigation size={11} />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FULL SCREEN / SLIDE-UP DETAIL MODAL */}
      {selectedMechanic && (
        <div className="bottom-sheet-overlay animate-fade-in" onClick={() => setSelectedMechanic(null)} style={{ zIndex: 120 }}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85%' }}>
            <div className="bottom-sheet-handle"></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px 0', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Workshop Details</span>
              <button onClick={() => setSelectedMechanic(null)} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>

            <div className="bottom-sheet-content" style={{ padding: '16px 20px 30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header Profile */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {selectedMechanic.image || '🔧'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', color: 'white', fontWeight: 'bold' }}>{selectedMechanic.shopName}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>👨‍🔧 Proprietor: {selectedMechanic.ownerName}</span>
                    <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '10px', background: selectedMechanic.status === 'Open' ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 34, 51, 0.12)', color: selectedMechanic.status === 'Open' ? 'var(--success)' : 'var(--accent)', display: 'inline-block', marginTop: '6px' }}>
                      Workshop is {selectedMechanic.status}
                    </span>
                  </div>
                </div>

                {/* Support and Distance Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', gap: '6px', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'white' }}>Address:</strong> {selectedMechanic.address}, {selectedMechanic.city}, {selectedMechanic.state}
                  </div>
                  {selectedMechanic.distance !== undefined && selectedMechanic.distance !== Infinity && (
                    <div style={{ color: 'var(--secondary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <Compass size={13} /> Straight Proximity: {selectedMechanic.distance.toFixed(1)} KM
                    </div>
                  )}
                </div>

                {/* Supported Brands */}
                <div>
                  <h4 style={{ fontSize: '13px', color: 'white', marginBottom: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={14} color="var(--primary)" /> Bike Brands Supported
                  </h4>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedMechanic.bikeBrands.map(brand => (
                      <span key={brand} style={{ fontSize: '11px', background: 'rgba(255,85,0,0.06)', border: '1px solid rgba(255,85,0,0.15)', color: 'var(--primary)', padding: '3px 10px', borderRadius: '8px', fontWeight: '600' }}>
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Services Catalog */}
                <div>
                  <h4 style={{ fontSize: '13px', color: 'white', marginBottom: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wrench size={14} color="var(--secondary)" /> Services Offered
                  </h4>
                  <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedMechanic.services.map((service, idx) => (
                      <li key={idx}>{service}</li>
                    ))}
                  </ul>
                </div>

                {/* Contact CTA buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <a 
                    href={`tel:${selectedMechanic.phone}`}
                    className="btn-secondary"
                    style={{ flex: 1, textDecoration: 'none', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Phone size={14} /> Call Shop
                  </a>
                  <a 
                    href={`https://api.whatsapp.com/send?phone=${selectedMechanic.whatsapp.replace(/\D/g, '')}&text=Hello%20${encodeURIComponent(selectedMechanic.ownerName)},%20I%20found%20your%20shop%20on%20Help%20Riders!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ flex: 1.2, textDecoration: 'none', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', boxShadow: '0 4px 15px rgba(37,211,102,0.25)' }}
                  >
                    <MessageSquare size={14} /> WhatsApp
                  </a>
                </div>

                {/* Navigation directions */}
                {selectedMechanic.latitude && selectedMechanic.longitude && (
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMechanic.latitude},${selectedMechanic.longitude}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ width: '100%', textDecoration: 'none', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}
                  >
                    <Navigation size={14} /> Route on Google Maps
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
