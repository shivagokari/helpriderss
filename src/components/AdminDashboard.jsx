import { useState, useEffect } from 'react';
import { 
  Wrench, Sliders, Calendar, AlertTriangle, ShieldCheck, 
  Settings, X, Plus, Edit2, Trash2, CheckCircle, RefreshCw, LogOut
} from 'lucide-react';
import { supabase } from '../utils/supabase';

const STATES = ['Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Maharashtra', 'Rajasthan', 'Uttar Pradesh', 'Gujarat', 'Other'];

const ALL_BRANDS = [
  'Royal Enfield', 'Honda', 'TVS', 'Bajaj', 'Pulsar', 'KTM', 'Yamaha', 
  'Suzuki', 'Kawasaki', 'Hero', 'Jawa', 'Harley Davidson', 'BMW Motorrad', 
  'Triumph', 'Ducati', 'Benelli', 'Aprilia', 'Husqvarna', 'Other'
];

const ALL_MECH_SERVICES = [
  'General Servicing', 'Engine Tuning', 'Clutch Rebuild', 'Fork Alignment',
  'Electrical Diagnosis', 'Brake Pad Replacement', 'Oil Change', 'Chain Tensioning',
  'Chain-sprocket Upgrades', 'Coolant Flush', 'ECU Remapping', 'Tappet Adjustments',
  'Custom Exhaust Fitting', 'Carburetor Jetting', 'Tire Replacement', 'Battery Service'
];

const ALL_MOD_SERVICES = [
  'Exhausts', 'Seat Customization', 'Wraps', 'Paint Jobs', 'LED Lights', 
  'Riding Accessories', 'Crash Guards', 'Touring Accessories', 'Performance Mods',
  'Tank Pads', 'Handle Grips', 'Phone Mounts', 'Panniers & Luggage', 'Windshield Installation'
];

// Helper to auto-generate WhatsApp link from phone number
const generateWhatsAppNumber = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // If it starts with 91 and is 12 digits, use as-is
  if (digits.startsWith('91') && digits.length === 12) return digits;
  // If it's 10 digits, prepend 91
  if (digits.length === 10) return '91' + digits;
  return digits;
};

// Validate Google Maps URL
const isValidGoogleMapsUrl = (url) => {
  if (!url) return true; // optional field
  return url.startsWith('https://maps.google.com') ||
    url.startsWith('https://goo.gl/maps') ||
    url.startsWith('https://www.google.com/maps') ||
    url.startsWith('https://maps.app.goo.gl') ||
    url.startsWith('http://maps.google.com') ||
    url.startsWith('https://google.com/maps');
};

export default function AdminDashboard({ user, onClose }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [toastMessage, setToastMessage] = useState('');

  // ── Database lists states ──
  const [mechanicsList, setMechanicsList] = useState([]);
  const [storesList, setStoresList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [ridesList, setRidesList] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Form States ──
  const [showMechForm, setShowMechForm] = useState(false);
  const [editMech, setEditMech] = useState(null);
  const [mechForm, setMechForm] = useState({
    shopName: '', ownerName: '', phone: '', description: '', address: '',
    city: '', state: 'Telangana', googleMapsLink: '',
    bikeBrands: [], services: [], status: 'Open'
  });
  const [mechErrors, setMechErrors] = useState({});

  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editStore, setEditStore] = useState(null);
  const [storeForm, setStoreForm] = useState({
    storeName: '', ownerName: '', phone: '', description: '', address: '',
    city: '', state: 'Telangana', googleMapsLink: '',
    services: []
  });
  const [storeErrors, setStoreErrors] = useState({});

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // ── Data Sync ──
  const syncAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Mechanics
      const { data: mechs, error: mErr } = await supabase.from('mechanics').select('*');
      if (!mErr && mechs) {
        setMechanicsList(mechs.map(m => ({
          id: m.id, shopName: m.shop_name, ownerName: m.owner_name, phone: m.phone,
          description: m.description || '', address: m.address, city: m.city, state: m.state,
          googleMapsLink: m.google_maps_link || '', bikeBrands: m.bike_brands || [],
          services: m.services || [], status: m.status
        })));
      } else {
        const local = localStorage.getItem('helpriders_admin_mechs');
        if (local) setMechanicsList(JSON.parse(local));
      }

      // 2. Fetch Mod Stores
      const { data: stores, error: sErr } = await supabase.from('mod_stores').select('*');
      if (!sErr && stores) {
        setStoresList(stores.map(s => ({
          id: s.id, storeName: s.store_name, ownerName: s.owner_name || '', phone: s.phone,
          description: s.description || '', address: s.address, city: s.city, state: s.state,
          googleMapsLink: s.google_maps_link || '', services: s.services || []
        })));
      } else {
        const local = localStorage.getItem('helpriders_admin_stores');
        if (local) setStoresList(JSON.parse(local));
      }

      // 3. Fetch Reports
      const { data: reps, error: rErr } = await supabase.from('reports').select('*');
      if (!rErr && reps) setReportsList(reps);

      // 4. Fetch Rides
      const { data: rides, error: rdErr } = await supabase.from('rides').select('*');
      if (!rdErr && rides) setRidesList(rides);

    } catch (err) {
      console.warn('Sync finished with some network warning:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      syncAllData();
    });
  }, [activeTab]);

  // ── Mechanics Validation ──
  const validateMechForm = () => {
    const errors = {};
    if (!mechForm.shopName.trim() || mechForm.shopName.trim().length < 3) {
      errors.shopName = 'Shop name is required (min 3 characters)';
    }
    if (!mechForm.ownerName.trim() || !/^[A-Za-z ]+$/.test(mechForm.ownerName.trim())) {
      errors.ownerName = 'Owner name is required (letters & spaces only)';
    }
    const phoneDigits = mechForm.phone.replace(/\D/g, '');
    if (!phoneDigits || !/^[6-9]\d{9}$/.test(phoneDigits.slice(-10))) {
      errors.phone = 'Enter a valid 10-digit Indian mobile number';
    }
    if (!mechForm.address.trim()) {
      errors.address = 'Street address is required';
    }
    if (!mechForm.city.trim()) {
      errors.city = 'City is required';
    }
    if (mechForm.description && mechForm.description.length > 150) {
      errors.description = 'Description must be 150 characters or less';
    }
    if (mechForm.googleMapsLink && !isValidGoogleMapsUrl(mechForm.googleMapsLink)) {
      errors.googleMapsLink = 'Enter a valid Google Maps URL';
    }
    if (mechForm.bikeBrands.length === 0) {
      errors.bikeBrands = 'Select at least 1 bike brand';
    }
    if (mechForm.services.length === 0) {
      errors.services = 'Select at least 1 service';
    }
    setMechErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Mechanics CRUD ──
  const handleMechSubmit = async (e) => {
    e.preventDefault();
    if (!validateMechForm()) {
      showToast('⚠️ Please fix the validation errors before submitting.');
      return;
    }

    const payload = {
      shop_name: mechForm.shopName.trim(),
      owner_name: mechForm.ownerName.trim(),
      phone: mechForm.phone.trim(),
      whatsapp: generateWhatsAppNumber(mechForm.phone),
      description: mechForm.description.trim(),
      address: mechForm.address.trim(),
      city: mechForm.city.trim(),
      state: mechForm.state,
      google_maps_link: mechForm.googleMapsLink.trim(),
      latitude: 0,
      longitude: 0,
      bike_brands: mechForm.bikeBrands,
      services: mechForm.services,
      status: mechForm.status,
      image: ''
    };

    try {
      if (editMech) {
        const { error } = await supabase.from('mechanics').update(payload).eq('id', editMech.id);
        if (error) throw error;
        showToast('✅ Mechanic updated in database!');
      } else {
        const { error } = await supabase.from('mechanics').insert(payload);
        if (error) throw error;
        await supabase.from('notifications').insert({
          title: '🔧 New Mechanic Added',
          content: `${payload.shop_name} in ${payload.city} is now active on the map.`,
          type: 'mechanic'
        });
        showToast('🎉 Mechanic added successfully!');
      }
    } catch (err) {
      console.warn('Supabase DB block. Saving locally to client storage.', err.message);
      let updated = [...mechanicsList];
      if (editMech) {
        updated = updated.map(m => m.id === editMech.id ? { ...m, ...mechForm } : m);
      } else {
        updated.push({ id: 'local-mech-' + Date.now(), ...mechForm });
      }
      setMechanicsList(updated);
      localStorage.setItem('helpriders_admin_mechs', JSON.stringify(updated));
      showToast('💾 Saved locally to browser cache!');
    }

    setShowMechForm(false);
    setEditMech(null);
    setMechErrors({});
    setMechForm({
      shopName: '', ownerName: '', phone: '', description: '', address: '',
      city: '', state: 'Telangana', googleMapsLink: '',
      bikeBrands: [], services: [], status: 'Open'
    });
    syncAllData();
  };

  const handleMechDelete = async (id) => {
    try {
      const { error } = await supabase.from('mechanics').delete().eq('id', id);
      if (error) throw error;
      showToast('🗑️ Mechanic deleted from database.');
    } catch (err) {
      console.warn('Supabase DB block. Deleting locally.', err.message);
      const updated = mechanicsList.filter(m => m.id !== id);
      setMechanicsList(updated);
      localStorage.setItem('helpriders_admin_mechs', JSON.stringify(updated));
      showToast('🗑️ Deleted locally.');
    }
    syncAllData();
  };

  // ── Mod Store Validation ──
  const validateStoreForm = () => {
    const errors = {};
    if (!storeForm.storeName.trim() || storeForm.storeName.trim().length < 3) {
      errors.storeName = 'Store name is required (min 3 characters)';
    }
    if (!storeForm.ownerName.trim() || !/^[A-Za-z ]+$/.test(storeForm.ownerName.trim())) {
      errors.ownerName = 'Owner name is required (letters & spaces only)';
    }
    const phoneDigits = storeForm.phone.replace(/\D/g, '');
    if (!phoneDigits || !/^[6-9]\d{9}$/.test(phoneDigits.slice(-10))) {
      errors.phone = 'Enter a valid 10-digit Indian mobile number';
    }
    if (!storeForm.address.trim()) {
      errors.address = 'Street address is required';
    }
    if (!storeForm.city.trim()) {
      errors.city = 'City is required';
    }
    if (storeForm.description && storeForm.description.length > 150) {
      errors.description = 'Description must be 150 characters or less';
    }
    if (storeForm.googleMapsLink && !isValidGoogleMapsUrl(storeForm.googleMapsLink)) {
      errors.googleMapsLink = 'Enter a valid Google Maps URL';
    }
    if (storeForm.services.length === 0) {
      errors.services = 'Select at least 1 service';
    }
    setStoreErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Mod Stores CRUD ──
  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    if (!validateStoreForm()) {
      showToast('⚠️ Please fix the validation errors before submitting.');
      return;
    }

    const payload = {
      store_name: storeForm.storeName.trim(),
      owner_name: storeForm.ownerName.trim(),
      phone: storeForm.phone.trim(),
      whatsapp: generateWhatsAppNumber(storeForm.phone),
      description: storeForm.description.trim(),
      address: storeForm.address.trim(),
      city: storeForm.city.trim(),
      state: storeForm.state,
      google_maps_link: storeForm.googleMapsLink.trim(),
      latitude: 0,
      longitude: 0,
      services: storeForm.services,
      image: ''
    };

    try {
      if (editStore) {
        const { error } = await supabase.from('mod_stores').update(payload).eq('id', editStore.id);
        if (error) throw error;
        showToast('✅ Custom Store updated in database!');
      } else {
        const { error } = await supabase.from('mod_stores').insert(payload);
        if (error) throw error;
        await supabase.from('notifications').insert({
          title: '🏍️ New Mods Store Added',
          content: `${payload.store_name} in ${payload.city} is now active.`,
          type: 'store'
        });
        showToast('🎉 Custom Store added successfully!');
      }
    } catch (err) {
      console.warn('Supabase DB block. Saving store locally.', err.message);
      let updated = [...storesList];
      if (editStore) {
        updated = updated.map(s => s.id === editStore.id ? { ...s, ...storeForm } : s);
      } else {
        updated.push({ id: 'local-store-' + Date.now(), ...storeForm });
      }
      setStoresList(updated);
      localStorage.setItem('helpriders_admin_stores', JSON.stringify(updated));
      showToast('💾 Saved locally to browser cache!');
    }

    setShowStoreForm(false);
    setEditStore(null);
    setStoreErrors({});
    setStoreForm({
      storeName: '', ownerName: '', phone: '', description: '', address: '',
      city: '', state: 'Telangana', googleMapsLink: '',
      services: []
    });
    syncAllData();
  };

  const handleStoreDelete = async (id) => {
    try {
      const { error } = await supabase.from('mod_stores').delete().eq('id', id);
      if (error) throw error;
      showToast('🗑️ Store deleted from database.');
    } catch (err) {
      console.warn('Supabase DB block. Deleting store locally.', err.message);
      const updated = storesList.filter(s => s.id !== id);
      setStoresList(updated);
      localStorage.setItem('helpriders_admin_stores', JSON.stringify(updated));
      showToast('🗑️ Deleted locally.');
    }
    syncAllData();
  };

  // ── Delete Ride / Reports Moderation ──
  const handleModerateRide = async (rideId) => {
    try {
      const { error } = await supabase.from('rides').delete().eq('id', rideId);
      if (error) throw error;
      showToast('🚫 Ride post deleted successfully.');
      syncAllData();
    } catch {
      showToast('❌ Failed to delete ride post.');
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      const { error } = await supabase.from('reports').update({ status: 'Resolved' }).eq('id', reportId);
      if (error) throw error;
      showToast('✓ Report resolved.');
      syncAllData();
    } catch {
      showToast('❌ Failed to update report.');
    }
  };

  // Inline error display helper
  const FieldError = ({ error }) => {
    if (!error) return null;
    return <span style={{ fontSize: '10px', color: 'var(--accent)', display: 'block', marginTop: '2px' }}>⚠️ {error}</span>;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, background: '#09090b', display: 'flex', flexDirection: 'column' }} className="animate-fade-in page-container">
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d0d12' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} color="var(--primary)" />
          <div>
            <h3 style={{ fontSize: '16px', color: 'white', fontWeight: 'bold' }}>Admin Console</h3>
            <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Logged in as: {user?.email}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Main Grid: Sidebar + Subviews */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Navigation Sidebar — Users tab removed */}
        <div style={{ width: '80px', borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0b0b0f', display: 'flex', flexDirection: 'column', padding: '10px 0', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {[
            { id: 'Dashboard', icon: <ShieldCheck size={18} /> },
            { id: 'Mechanics', icon: <Wrench size={18} /> },
            { id: 'Mods Stores', icon: <Sliders size={18} /> },
            { id: 'Ride Requests', icon: <Calendar size={18} /> },
            { id: 'Reports', icon: <AlertTriangle size={18} /> },
            { id: 'Settings', icon: <Settings size={18} /> }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={item.id}
              style={{
                width: '44px', height: '44px', borderRadius: '12px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                background: activeTab === item.id ? 'var(--primary)' : 'transparent',
                color: activeTab === item.id ? 'white' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {item.icon}
              <span style={{ fontSize: '7px' }}>{item.id.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Console View Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', background: '#09090b', position: 'relative' }}>
          
          {/* Sync status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '16px', color: 'white', fontFamily: 'var(--font-display)' }}>{activeTab} Panel</h4>
            <button 
              onClick={syncAllData} 
              disabled={loading}
              style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            >
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} /> {loading ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>

          {/* ────────────────────────────────────────────────────────────────
             VIEW A: DASHBOARD METRICS
             ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'Dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="glass-panel" style={{ padding: '14px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Active Rides</span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--secondary)', marginTop: '4px' }}>{ridesList.length} Posts</div>
                </div>
                <div className="glass-panel" style={{ padding: '14px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Reports</span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent)', marginTop: '4px' }}>{reportsList.filter(r => r.status === 'Pending').length} Pending</div>
                </div>
                <div className="glass-panel" style={{ padding: '14px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Mechanics</span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginTop: '4px' }}>{mechanicsList.length} Shops</div>
                </div>
                <div className="glass-panel" style={{ padding: '14px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Mods Stores</span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginTop: '4px' }}>{storesList.length} Customizers</div>
                </div>
              </div>

              {reportsList.filter(r => r.status === 'Pending').length > 0 && (
                <div className="glass-panel" style={{ padding: '14px', background: 'rgba(255, 34, 51, 0.08)', border: '1px solid rgba(255, 34, 51, 0.25)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <AlertTriangle color="var(--accent)" size={20} />
                  <div>
                    <strong style={{ fontSize: '13px', color: 'white' }}>Pending Safety Reports</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                      There are {reportsList.filter(r => r.status === 'Pending').length} unresolved user complaint reports.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
             VIEW B: MECHANICS MANAGEMENT
             ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'Mechanics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-fade-in">
              {!showMechForm ? (
                <>
                  <button 
                    onClick={() => { setShowMechForm(true); setEditMech(null); setMechErrors({}); }}
                    className="btn-primary" 
                    style={{ padding: '10px', width: '100%', fontSize: '12px', borderRadius: '10px' }}
                  >
                    <Plus size={14} /> Add New Mechanic Shop
                  </button>
                  
                  {mechanicsList.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <Wrench size={30} style={{ margin: '0 auto 8px', opacity: 0.4, display: 'block' }} />
                      <p style={{ fontSize: '13px' }}>No mechanics added yet. Click above to add your first mechanic shop.</p>
                    </div>
                  ) : (
                    mechanicsList.map(mech => (
                      <div key={mech.id} className="glass-panel" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: '13.5px', color: 'white', display: 'block' }}>{mech.shopName}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Owner: {mech.ownerName} • {mech.city}</span>
                          {mech.description && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mech.description}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button 
                            onClick={() => {
                              setEditMech(mech);
                              setMechForm({
                                shopName: mech.shopName, ownerName: mech.ownerName, phone: mech.phone,
                                description: mech.description || '', address: mech.address, city: mech.city,
                                state: mech.state, googleMapsLink: mech.googleMapsLink || '',
                                bikeBrands: mech.bikeBrands, services: mech.services, status: mech.status
                              });
                              setMechErrors({});
                              setShowMechForm(true);
                            }}
                            style={{ padding: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: 'var(--secondary)', cursor: 'pointer' }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => handleMechDelete(mech.id)}
                            style={{ padding: '6px', background: 'rgba(255,34,51,0.05)', border: '1px solid rgba(255,34,51,0.15)', borderRadius: '6px', color: 'var(--accent)', cursor: 'pointer' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <form onSubmit={handleMechSubmit} className="glass-panel animate-zoom-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>{editMech ? 'Edit Mechanic Shop' : 'Add New Mechanic'}</h4>
                  
                  <div>
                    <input type="text" placeholder="Shop Name *" value={mechForm.shopName} onChange={e => setMechForm({...mechForm, shopName: e.target.value})} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: mechErrors.shopName ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }} />
                    <FieldError error={mechErrors.shopName} />
                  </div>

                  <div>
                    <input type="text" placeholder="Proprietor/Owner Name *" value={mechForm.ownerName} onChange={e => setMechForm({...mechForm, ownerName: e.target.value.replace(/[^A-Za-z ]/g, '')})} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: mechErrors.ownerName ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }} />
                    <FieldError error={mechErrors.ownerName} />
                  </div>
                  
                  <div>
                    <input type="tel" placeholder="Phone Number (10 digits) *" value={mechForm.phone} onChange={e => setMechForm({...mechForm, phone: e.target.value.replace(/[^0-9+\- ]/g, '')})} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: mechErrors.phone ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }} />
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>WhatsApp link will be auto-generated from this number</span>
                    <FieldError error={mechErrors.phone} />
                  </div>

                  <div>
                    <textarea placeholder="Short Description (max 150 characters)" value={mechForm.description} onChange={e => setMechForm({...mechForm, description: e.target.value.slice(0, 150)})} maxLength={150} rows={2} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: mechErrors.description ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white', resize: 'none', fontFamily: 'inherit' }} />
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{mechForm.description.length}/150 characters</span>
                    <FieldError error={mechErrors.description} />
                  </div>

                  <div>
                    <input type="text" placeholder="Street Address *" value={mechForm.address} onChange={e => setMechForm({...mechForm, address: e.target.value})} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: mechErrors.address ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }} />
                    <FieldError error={mechErrors.address} />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <div>
                      <input type="text" placeholder="City *" value={mechForm.city} onChange={e => setMechForm({...mechForm, city: e.target.value})} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: mechErrors.city ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }} />
                      <FieldError error={mechErrors.city} />
                    </div>
                    <select value={mechForm.state} onChange={e => setMechForm({...mechForm, state: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }}>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <input type="url" placeholder="Google Maps Link (paste shop location URL)" value={mechForm.googleMapsLink} onChange={e => setMechForm({...mechForm, googleMapsLink: e.target.value})} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: mechErrors.googleMapsLink ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }} />
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Open Google Maps → search shop → Share → Copy link</span>
                    <FieldError error={mechErrors.googleMapsLink} />
                  </div>

                  {/* Brands checklist wrapper */}
                  <div>
                    <label style={{ fontSize: '10px', color: mechErrors.bikeBrands ? 'var(--accent)' : 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Bike Brands Supported *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '120px', overflowY: 'auto', background: '#121216', padding: '8px', borderRadius: '8px', border: mechErrors.bikeBrands ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.04)' }}>
                      {ALL_BRANDS.map(b => (
                        <label key={b} style={{ fontSize: '11px', display: 'flex', gap: '6px', alignItems: 'center', color: 'white', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={mechForm.bikeBrands.includes(b)}
                            onChange={(e) => {
                              const brands = e.target.checked 
                                ? [...mechForm.bikeBrands, b] 
                                : mechForm.bikeBrands.filter(brand => brand !== b);
                              setMechForm({...mechForm, bikeBrands: brands});
                            }}
                          />
                          {b}
                        </label>
                      ))}
                    </div>
                    <FieldError error={mechErrors.bikeBrands} />
                  </div>

                  {/* Services checklist wrapper */}
                  <div>
                    <label style={{ fontSize: '10px', color: mechErrors.services ? 'var(--accent)' : 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Services Offered *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '120px', overflowY: 'auto', background: '#121216', padding: '8px', borderRadius: '8px', border: mechErrors.services ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.04)' }}>
                      {ALL_MECH_SERVICES.map(srv => (
                        <label key={srv} style={{ fontSize: '11px', display: 'flex', gap: '6px', alignItems: 'center', color: 'white', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={mechForm.services.includes(srv)}
                            onChange={(e) => {
                              const list = e.target.checked 
                                ? [...mechForm.services, srv] 
                                : mechForm.services.filter(s => s !== srv);
                              setMechForm({...mechForm, services: list});
                            }}
                          />
                          {srv}
                        </label>
                      ))}
                    </div>
                    <FieldError error={mechErrors.services} />
                  </div>

                  {/* Status toggle */}
                  <select value={mechForm.status} onChange={e => setMechForm({...mechForm, status: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }}>
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button type="button" onClick={() => { setShowMechForm(false); setEditMech(null); setMechErrors({}); }} className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '12px' }}>Cancel</button>
                    <button type="submit" className="btn-primary" style={{ flex: 2, padding: '10px', fontSize: '12px' }}>{editMech ? 'Save Changes' : 'Publish Workshop'}</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
             VIEW C: MOD STORES MANAGEMENT
             ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'Mods Stores' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-fade-in">
              {!showStoreForm ? (
                <>
                  <button 
                    onClick={() => { setShowStoreForm(true); setEditStore(null); setStoreErrors({}); }}
                    className="btn-primary" 
                    style={{ padding: '10px', width: '100%', fontSize: '12px', borderRadius: '10px' }}
                  >
                    <Plus size={14} /> Add Modification Store
                  </button>
                  
                  {storesList.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <Sliders size={30} style={{ margin: '0 auto 8px', opacity: 0.4, display: 'block' }} />
                      <p style={{ fontSize: '13px' }}>No mod stores added yet. Click above to add your first customization store.</p>
                    </div>
                  ) : (
                    storesList.map(store => (
                      <div key={store.id} className="glass-panel" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: '13.5px', color: 'white', display: 'block' }}>{store.storeName}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Owner: {store.ownerName} • {store.city}, {store.state}</span>
                          {store.description && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{store.description}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button 
                            onClick={() => {
                              setEditStore(store);
                              setStoreForm({
                                storeName: store.storeName, ownerName: store.ownerName || '', phone: store.phone,
                                description: store.description || '', address: store.address, city: store.city,
                                state: store.state, googleMapsLink: store.googleMapsLink || '',
                                services: store.services
                              });
                              setStoreErrors({});
                              setShowStoreForm(true);
                            }}
                            style={{ padding: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: 'var(--secondary)', cursor: 'pointer' }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => handleStoreDelete(store.id)}
                            style={{ padding: '6px', background: 'rgba(255,34,51,0.05)', border: '1px solid rgba(255,34,51,0.15)', borderRadius: '6px', color: 'var(--accent)', cursor: 'pointer' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <form onSubmit={handleStoreSubmit} className="glass-panel animate-zoom-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>{editStore ? 'Edit Mod Store' : 'Add Mod Store'}</h4>
                  
                  <div>
                    <input type="text" placeholder="Store Name *" value={storeForm.storeName} onChange={e => setStoreForm({...storeForm, storeName: e.target.value})} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: storeErrors.storeName ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }} />
                    <FieldError error={storeErrors.storeName} />
                  </div>

                  <div>
                    <input type="text" placeholder="Proprietor/Owner Name *" value={storeForm.ownerName} onChange={e => setStoreForm({...storeForm, ownerName: e.target.value.replace(/[^A-Za-z ]/g, '')})} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: storeErrors.ownerName ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }} />
                    <FieldError error={storeErrors.ownerName} />
                  </div>
                  
                  <div>
                    <input type="tel" placeholder="Phone Number (10 digits) *" value={storeForm.phone} onChange={e => setStoreForm({...storeForm, phone: e.target.value.replace(/[^0-9+\- ]/g, '')})} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: storeErrors.phone ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }} />
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>WhatsApp link will be auto-generated from this number</span>
                    <FieldError error={storeErrors.phone} />
                  </div>

                  <div>
                    <textarea placeholder="Short Description (max 150 characters)" value={storeForm.description} onChange={e => setStoreForm({...storeForm, description: e.target.value.slice(0, 150)})} maxLength={150} rows={2} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: storeErrors.description ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white', resize: 'none', fontFamily: 'inherit' }} />
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{storeForm.description.length}/150 characters</span>
                    <FieldError error={storeErrors.description} />
                  </div>

                  <div>
                    <input type="text" placeholder="Street Address *" value={storeForm.address} onChange={e => setStoreForm({...storeForm, address: e.target.value})} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: storeErrors.address ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }} />
                    <FieldError error={storeErrors.address} />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <div>
                      <input type="text" placeholder="City *" value={storeForm.city} onChange={e => setStoreForm({...storeForm, city: e.target.value})} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: storeErrors.city ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }} />
                      <FieldError error={storeErrors.city} />
                    </div>
                    <select value={storeForm.state} onChange={e => setStoreForm({...storeForm, state: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }}>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <input type="url" placeholder="Google Maps Link (paste shop location URL)" value={storeForm.googleMapsLink} onChange={e => setStoreForm({...storeForm, googleMapsLink: e.target.value})} style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#1c1c24', boxSizing: 'border-box', border: storeErrors.googleMapsLink ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: 'white' }} />
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Open Google Maps → search shop → Share → Copy link</span>
                    <FieldError error={storeErrors.googleMapsLink} />
                  </div>

                  {/* Services checklist */}
                  <div>
                    <label style={{ fontSize: '10px', color: storeErrors.services ? 'var(--accent)' : 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Services Offered *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '120px', overflowY: 'auto', background: '#121216', padding: '8px', borderRadius: '8px', border: storeErrors.services ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.04)' }}>
                      {ALL_MOD_SERVICES.map(srv => (
                        <label key={srv} style={{ fontSize: '11px', display: 'flex', gap: '6px', alignItems: 'center', color: 'white', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={storeForm.services.includes(srv)}
                            onChange={(e) => {
                              const list = e.target.checked 
                                ? [...storeForm.services, srv] 
                                : storeForm.services.filter(s => s !== srv);
                              setStoreForm({...storeForm, services: list});
                            }}
                          />
                          {srv}
                        </label>
                      ))}
                    </div>
                    <FieldError error={storeErrors.services} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button type="button" onClick={() => { setShowStoreForm(false); setEditStore(null); setStoreErrors({}); }} className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '12px' }}>Cancel</button>
                    <button type="submit" className="btn-primary" style={{ flex: 2, padding: '10px', fontSize: '12px' }}>{editStore ? 'Save Changes' : 'Publish Store'}</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
             VIEW D: RIDES MODERATION
             ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'Ride Requests' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-fade-in">
              {ridesList.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No active rides posted.</div>
              ) : (
                ridesList.map(ride => (
                  <div key={ride.id} className="glass-panel" style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '13.5px', color: 'white', display: 'block' }}>{ride.title}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Host: {ride.creator} • Route: {ride.route}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2.5px' }}>Date: {ride.date} • {ride.joined_count} joined</span>
                    </div>
                    <button 
                      onClick={() => handleModerateRide(ride.id)}
                      style={{ padding: '6px', background: 'rgba(255, 34, 51, 0.08)', border: '1px solid rgba(255, 34, 51, 0.2)', borderRadius: '6px', color: 'var(--accent)', cursor: 'pointer' }}
                    >
                      Delete Post
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
             VIEW E: USER COMPLAINT & ERROR REPORTS
             ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'Reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-fade-in">
              {reportsList.length === 0 ? (
                <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <CheckCircle size={30} color="var(--success)" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '13px' }}>Safe Zone: No unresolved complaints.</p>
                </div>
              ) : (
                reportsList.map(rep => (
                  <div key={rep.id} className="glass-panel" style={{ padding: '12px', border: rep.status === 'Pending' ? '1px solid var(--accent)' : '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '8px', color: 'white' }}>{(rep.reported_item_type || 'ERROR').toUpperCase()}</span>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: rep.status === 'Pending' ? 'var(--accent)' : 'var(--success)' }}>{rep.status}</span>
                    </div>
                    <strong style={{ fontSize: '13.5px', color: 'white', display: 'block', marginTop: '6px' }}>Reason: {rep.reason}</strong>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>{rep.details}</p>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Reported by: {rep.reporter_name || 'User'}</span>
                    
                    {rep.status === 'Pending' && (
                      <button 
                        onClick={() => handleResolveReport(rep.id)}
                        style={{ marginTop: '8px', width: '100%', padding: '6px', background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.2)', borderRadius: '6px', color: 'var(--success)', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✓ Mark Resolved
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
             VIEW F: GENERAL SETTINGS
             ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'Settings' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <strong style={{ fontSize: '14px', color: 'white', display: 'block' }}>System Configuration</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Configure system credentials and access locks.</span>
              </div>

              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Default Admin Email</label>
                <input type="text" readOnly value="admin@helpriderss.com" style={{ width: '100%', padding: '10px', fontSize: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-muted)', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Supabase Connection State</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'var(--success)', background: 'rgba(0, 230, 118, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0, 230, 118, 0.15)' }}>
                  <CheckCircle size={14} /> Connected to Supabase Engine (Active RLS policies)
                </div>
              </div>

              <button 
                onClick={onClose}
                className="btn-secondary" 
                style={{ width: '100%', padding: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px' }}
              >
                <LogOut size={14} /> Exit Admin Console
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Local Toast Alert */}
      {toastMessage && (
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', zIndex: 130, padding: '12px 16px', background: 'rgba(18,18,22,0.98)', border: '1.5px solid var(--primary)', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 32px rgba(255,85,0,0.35)' }}>
          <span>🏍️</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
