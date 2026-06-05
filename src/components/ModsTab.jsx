import { useState, useEffect, useMemo } from 'react';
import { 
  Phone, MessageSquare, Navigation, 
  Search, Sparkles, Sliders, X
} from 'lucide-react';
import { supabase } from '../utils/supabase';

// Local Backup/Seed Data for Mod Stores
const SEED_MOD_STORES = [
  {
    id: 'store-1',
    storeName: 'Redline Custom Exhausts & Accessories',
    phone: '+91 97766 55443',
    whatsapp: '+919776655443',
    address: 'Opposite Gachibowli Stadium Road',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.4450,
    longitude: 78.3400,
    services: ['Exhausts', 'Performance Mods', 'Crash Guards', 'Touring Accessories'],
    image: '🔥'
  },
  {
    id: 'store-2',
    storeName: 'Royal Wraps & Custom Seats',
    phone: '+91 96655 44332',
    whatsapp: '+919665544332',
    address: 'Metro Pillar 1042, Madhapur Main Road',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.4490,
    longitude: 78.3800,
    services: ['Seat Customization', 'Wraps', 'Paint Jobs', 'LED Lights'],
    image: '🎨'
  },
  {
    id: 'store-3',
    storeName: 'GearUp Riding gear & Touring Mods',
    phone: '+91 95544 33221',
    whatsapp: '+919554433221',
    address: 'PG Road, Near Paradise, Secunderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    latitude: 17.4439,
    longitude: 78.4980,
    services: ['Riding Accessories', 'Touring Accessories', 'Crash Guards', 'LED Lights'],
    image: '🎒'
  }
];

export default function ModsTab() {
  const [stores, setStores] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState(null);

  // Fetch mod stores from Supabase with local fallback
  const fetchModStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mod_stores')
        .select('*')
        .order('store_name', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Map snake_case database columns to camelCase component properties
        const mapped = data.map(s => ({
          id: s.id,
          storeName: s.store_name,
          phone: s.phone,
          whatsapp: s.whatsapp,
          address: s.address,
          city: s.city,
          state: s.state,
          latitude: s.latitude,
          longitude: s.longitude,
          services: s.services || [],
          image: s.image
        }));
        setStores(mapped);
      } else {
        setStores(SEED_MOD_STORES);
      }
    } catch (err) {
      console.warn('Failed to load mod stores from database, using seed data:', err.message);
      setStores(SEED_MOD_STORES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchModStores();
    });
  }, []);

  // Filter list by search query
  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return stores;
    const q = searchQuery.toLowerCase();
    return stores.filter(s => 
      s.storeName.toLowerCase().includes(q) || 
      s.services.some(srv => srv.toLowerCase().includes(q)) ||
      s.city.toLowerCase().includes(q)
    );
  }, [stores, searchQuery]);

  return (
    <div className="mods-tab scroll-y page-container" style={{ padding: '20px 16px', maxWidth: '360px', margin: '0 auto' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Customizations</span>
        <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Mods Store <Sliders size={22} color="var(--primary)" />
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Explore premium motorcycle modification workshops and styling centers.
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          className="has-left-icon"
          placeholder="Search by store or custom service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 12px 10px 38px', fontSize: '13px', background: 'var(--bg-tertiary)' }}
        />
      </div>

      {/* List content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid transparent', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'dash 1s linear infinite' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>Scanning custom shops...</span>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Sliders size={32} style={{ marginBottom: '12px', opacity: 0.5, margin: '0 auto' }} />
          <p style={{ fontSize: '13px' }}>No mod stores found matching your query.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredStores.map((store) => (
            <div 
              key={store.id} 
              className="glass-panel animate-fade-in" 
              onClick={() => setSelectedStore(store)}
              style={{ 
                padding: '14px', 
                border: '1px solid var(--glass-border)', 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* Logo wrapper */}
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {store.image || '🏍️'}
                </div>
                {/* Info details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '15px', color: 'white', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{store.storeName}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {store.address}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{store.city}, {store.state}</span>
                </div>
              </div>

              {/* Services Offered Badges */}
              <div style={{ display: 'flex', gap: '4px', overflowX: 'hidden', marginTop: '10px', flexWrap: 'wrap' }}>
                {store.services.slice(0, 3).map((service) => (
                  <span key={service} style={{ fontSize: '9.5px', background: 'rgba(255,170,0,0.06)', color: 'var(--secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,170,0,0.15)', fontWeight: '600' }}>
                    {service}
                  </span>
                ))}
                {store.services.length > 3 && (
                  <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                    +{store.services.length - 3} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL DETAILS MODAL SHEET */}
      {selectedStore && (
        <div className="bottom-sheet-overlay animate-fade-in" onClick={() => setSelectedStore(null)} style={{ zIndex: 120 }}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80%' }}>
            <div className="bottom-sheet-handle"></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px 0', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Customizer Profile</span>
              <button onClick={() => setSelectedStore(null)} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>

            <div className="bottom-sheet-content" style={{ padding: '16px 20px 30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header branding */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {selectedStore.image || '🏍️'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', color: 'white', fontWeight: 'bold' }}>{selectedStore.storeName}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>📍 {selectedStore.city}, {selectedStore.state}</span>
                  </div>
                </div>

                {/* Address summary */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>
                    <strong style={{ color: 'white' }}>Store Address:</strong>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '2px', lineHeight: '1.4' }}>{selectedStore.address}, {selectedStore.city}, {selectedStore.state}</span>
                  </div>
                </div>

                {/* Services Catalog */}
                <div>
                  <h4 style={{ fontSize: '13px', color: 'white', marginBottom: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} color="var(--primary)" /> Modification Services Offered
                  </h4>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedStore.services.map(service => (
                      <span key={service} style={{ fontSize: '11px', background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)', color: 'var(--secondary)', padding: '4px 10px', borderRadius: '8px', fontWeight: '600' }}>
                        {service}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Call & WhatsApp CTAs */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <a 
                    href={`tel:${selectedStore.phone}`}
                    className="btn-secondary"
                    style={{ flex: 1, textDecoration: 'none', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Phone size={14} /> Call Store
                  </a>
                  <a 
                    href={`https://api.whatsapp.com/send?phone=${selectedStore.whatsapp.replace(/\D/g, '')}&text=Hello,%20I%20saw%20your%20modification%20store%20on%20Help%20Riders!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ flex: 1.2, textDecoration: 'none', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', boxShadow: '0 4px 15px rgba(37,211,102,0.25)' }}
                  >
                    <MessageSquare size={14} /> WhatsApp
                  </a>
                </div>

                {/* Map routing direction */}
                {selectedStore.latitude && selectedStore.longitude && (
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStore.latitude},${selectedStore.longitude}`} 
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
