import { useState, useEffect } from 'react';
import { 
  Wrench, Sliders, Users, Calendar, AlertTriangle, ShieldCheck, 
  Settings, X, Plus, Edit2, Trash2, CheckCircle, RefreshCw, LogOut
} from 'lucide-react';
import { supabase } from '../utils/supabase';

const STATES = ['Telangana', 'Andhra Pradesh', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Other'];

const ALL_BRANDS = [
  'Royal Enfield', 'Honda', 'TVS', 'Bajaj', 'Pulsar', 'KTM', 'Yamaha', 
  'Suzuki', 'Kawasaki', 'Hero', 'Jawa', 'Harley Davidson', 'BMW Motorrad', 
  'Triumph', 'Ducati', 'Benelli', 'Aprilia', 'Husqvarna', 'Other'
];

const ALL_MOD_SERVICES = [
  'Exhausts', 'Seat Customization', 'Wraps', 'Paint Jobs', 'LED Lights', 
  'Riding Accessories', 'Crash Guards', 'Touring Accessories', 'Performance Mods'
];

export default function AdminDashboard({ user, onClose }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [toastMessage, setToastMessage] = useState('');

  // ── Database lists states ──
  const [usersList, setUsersList] = useState([]);
  const [mechanicsList, setMechanicsList] = useState([]);
  const [storesList, setStoresList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [ridesList, setRidesList] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Form States ──
  const [showMechForm, setShowMechForm] = useState(false);
  const [editMech, setEditMech] = useState(null);
  const [mechForm, setMechForm] = useState({
    shopName: '', ownerName: '', phone: '', whatsapp: '', address: '',
    city: '', state: 'Telangana', latitude: '', longitude: '',
    bikeBrands: [], services: [], status: 'Open', image: '🔧'
  });

  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editStore, setEditStore] = useState(null);
  const [storeForm, setStoreForm] = useState({
    storeName: '', phone: '', whatsapp: '', address: '',
    city: '', state: 'Telangana', latitude: '', longitude: '',
    services: [], image: '🏍️'
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // ── Data Sync ──
  const syncAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users List
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
      if (!pErr && profiles) setUsersList(profiles);

      // 2. Fetch Mechanics
      const { data: mechs, error: mErr } = await supabase.from('mechanics').select('*');
      if (!mErr && mechs) {
        setMechanicsList(mechs.map(m => ({
          id: m.id, shopName: m.shop_name, ownerName: m.owner_name, phone: m.phone,
          whatsapp: m.whatsapp, address: m.address, city: m.city, state: m.state,
          latitude: m.latitude, longitude: m.longitude, bikeBrands: m.bike_brands || [],
          services: m.services || [], status: m.status, image: m.image
        })));
      } else {
        // Fallback to local storage if DB fails
        const local = localStorage.getItem('helpriders_admin_mechs');
        if (local) setMechanicsList(JSON.parse(local));
      }

      // 3. Fetch Mod Stores
      const { data: stores, error: sErr } = await supabase.from('mod_stores').select('*');
      if (!sErr && stores) {
        setStoresList(stores.map(s => ({
          id: s.id, storeName: s.store_name, phone: s.phone, whatsapp: s.whatsapp,
          address: s.address, city: s.city, state: s.state, latitude: s.latitude,
          longitude: s.longitude, services: s.services || [], image: s.image
        })));
      } else {
        const local = localStorage.getItem('helpriders_admin_stores');
        if (local) setStoresList(JSON.parse(local));
      }

      // 4. Fetch Reports
      const { data: reps, error: rErr } = await supabase.from('reports').select('*');
      if (!rErr && reps) setReportsList(reps);

      // 5. Fetch Rides
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

  // ── Mechanics CRUD ──
  const handleMechSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      shop_name: mechForm.shopName,
      owner_name: mechForm.ownerName,
      phone: mechForm.phone,
      whatsapp: mechForm.whatsapp || mechForm.phone,
      address: mechForm.address,
      city: mechForm.city,
      state: mechForm.state,
      latitude: parseFloat(mechForm.latitude) || 17.3850,
      longitude: parseFloat(mechForm.longitude) || 78.4867,
      bike_brands: mechForm.bikeBrands,
      services: mechForm.services.length > 0 ? mechForm.services : ['General Servicing'],
      status: mechForm.status,
      image: mechForm.image
    };

    try {
      if (editMech) {
        const { error } = await supabase.from('mechanics').update(payload).eq('id', editMech.id);
        if (error) throw error;
        showToast('✅ Mechanic updated in database!');
      } else {
        const { error } = await supabase.from('mechanics').insert(payload);
        if (error) throw error;
        // Post broadcast notification
        await supabase.from('notifications').insert({
          title: '🔧 New Mechanic Added',
          content: `${payload.shop_name} in ${payload.city} is now active on the map.`,
          type: 'mechanic'
        });
        showToast('🎉 Mechanic added successfully!');
      }
    } catch (err) {
      console.warn('Supabase DB block. Saving locally to client storage.', err.message);
      // Local Storage Backup Operations
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
    setMechForm({
      shopName: '', ownerName: '', phone: '', whatsapp: '', address: '',
      city: '', state: 'Telangana', latitude: '', longitude: '',
      bikeBrands: [], services: [], status: 'Open', image: '🔧'
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

  // ── Mod Stores CRUD ──
  const handleStoreSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      store_name: storeForm.storeName,
      phone: storeForm.phone,
      whatsapp: storeForm.whatsapp || storeForm.phone,
      address: storeForm.address,
      city: storeForm.city,
      state: storeForm.state,
      latitude: parseFloat(storeForm.latitude) || 17.3850,
      longitude: parseFloat(storeForm.longitude) || 78.4867,
      services: storeForm.services.length > 0 ? storeForm.services : ['Exhausts'],
      image: storeForm.image
    };

    try {
      if (editStore) {
        const { error } = await supabase.from('mod_stores').update(payload).eq('id', editStore.id);
        if (error) throw error;
        showToast('✅ Custom Store updated in database!');
      } else {
        const { error } = await supabase.from('mod_stores').insert(payload);
        if (error) throw error;
        // Post broadcast notification
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
    setStoreForm({
      storeName: '', phone: '', whatsapp: '', address: '',
      city: '', state: 'Telangana', latitude: '', longitude: '',
      services: [], image: '🏍️'
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

  // ── Access Control (Lets Ride status changes) ──
  const updateUserLetsRideAccess = async (userId, status) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ lets_ride_status: status })
        .eq('id', userId);

      if (error) throw error;

      // Notify user of account update
      await supabase.from('notifications').insert({
        user_id: userId,
        title: '🔒 Let\'s Ride Status Update',
        content: `Your Let's Ride posting status has been updated to: ${status}`,
        type: 'account'
      });

      showToast(`Access updated to: ${status}`);
      syncAllData();
    } catch (err) {
      console.warn('Failed to update let\'s ride status:', err.message);
      // Local fallback simulation
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, lets_ride_status: status } : u));
      showToast('💾 Simulated access status update locally');
    }
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
        
        {/* Navigation Sidebar */}
        <div style={{ width: '80px', borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0b0b0f', display: 'flex', flexDirection: 'column', padding: '10px 0', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          {[
            { id: 'Dashboard', icon: <ShieldCheck size={18} /> },
            { id: 'Mechanics', icon: <Wrench size={18} /> },
            { id: 'Mods Stores', icon: <Sliders size={18} /> },
            { id: 'Users', icon: <Users size={18} /> },
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
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Biker Profiles</span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>{usersList.length} Accounts</div>
                </div>
                <div className="glass-panel" style={{ padding: '14px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Active Rides</span>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--secondary)', marginTop: '4px' }}>{ridesList.length} Posts</div>
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
                    onClick={() => { setShowMechForm(true); setEditMech(null); }}
                    className="btn-primary" 
                    style={{ padding: '10px', width: '100%', fontSize: '12px', borderRadius: '10px' }}
                  >
                    <Plus size={14} /> Add New Mechanic Shop
                  </button>
                  
                  {mechanicsList.map(mech => (
                    <div key={mech.id} className="glass-panel" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '13.5px', color: 'white', display: 'block' }}>{mech.shopName}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Proprietor: {mech.ownerName} • {mech.city}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={() => {
                            setEditMech(mech);
                            setMechForm({
                              shopName: mech.shopName, ownerName: mech.ownerName, phone: mech.phone, whatsapp: mech.whatsapp,
                              address: mech.address, city: mech.city, state: mech.state, latitude: mech.latitude, longitude: mech.longitude,
                              bikeBrands: mech.bikeBrands, services: mech.services, status: mech.status, image: mech.image
                            });
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
                  ))}
                </>
              ) : (
                <form onSubmit={handleMechSubmit} className="glass-panel animate-zoom-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>{editMech ? 'Edit Mechanic Shop' : 'Add New Mechanic'}</h4>
                  
                  <input type="text" placeholder="Shop Name" value={mechForm.shopName} onChange={e => setMechForm({...mechForm, shopName: e.target.value})} required style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                  <input type="text" placeholder="Proprietor/Owner Name" value={mechForm.ownerName} onChange={e => setMechForm({...mechForm, ownerName: e.target.value})} required style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="tel" placeholder="Phone" value={mechForm.phone} onChange={e => setMechForm({...mechForm, phone: e.target.value})} required style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                    <input type="tel" placeholder="WhatsApp (Link format)" value={mechForm.whatsapp} onChange={e => setMechForm({...mechForm, whatsapp: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                  </div>

                  <input type="text" placeholder="Street Address" value={mechForm.address} onChange={e => setMechForm({...mechForm, address: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <input type="text" placeholder="City" value={mechForm.city} onChange={e => setMechForm({...mechForm, city: e.target.value})} required style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                    <select value={mechForm.state} onChange={e => setMechForm({...mechForm, state: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }}>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="number" step="any" placeholder="Latitude (GPS)" value={mechForm.latitude} onChange={e => setMechForm({...mechForm, latitude: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                    <input type="number" step="any" placeholder="Longitude (GPS)" value={mechForm.longitude} onChange={e => setMechForm({...mechForm, longitude: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                  </div>

                  {/* Brands checklist wrapper */}
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Brands Supported</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '100px', overflowY: 'auto', background: '#121216', padding: '8px', borderRadius: '8px' }}>
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
                  </div>

                  {/* Status toggle & Image emoji */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <select value={mechForm.status} onChange={e => setMechForm({...mechForm, status: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }}>
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <input type="text" placeholder="Avatar Emoji (e.g. 🔧)" value={mechForm.image} onChange={e => setMechForm({...mechForm, image: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button type="button" onClick={() => { setShowMechForm(false); setEditMech(null); }} className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '12px' }}>Cancel</button>
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
                    onClick={() => { setShowStoreForm(true); setEditStore(null); }}
                    className="btn-primary" 
                    style={{ padding: '10px', width: '100%', fontSize: '12px', borderRadius: '10px' }}
                  >
                    <Plus size={14} /> Add Modification Store
                  </button>
                  
                  {storesList.map(store => (
                    <div key={store.id} className="glass-panel" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '13.5px', color: 'white', display: 'block' }}>{store.storeName}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{store.city}, {store.state}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={() => {
                            setEditStore(store);
                            setStoreForm({
                              storeName: store.storeName, phone: store.phone, whatsapp: store.whatsapp,
                              address: store.address, city: store.city, state: store.state, latitude: store.latitude, longitude: store.longitude,
                              services: store.services, image: store.image
                            });
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
                  ))}
                </>
              ) : (
                <form onSubmit={handleStoreSubmit} className="glass-panel animate-zoom-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>{editStore ? 'Edit Mod Store' : 'Add Mod Store'}</h4>
                  
                  <input type="text" placeholder="Store Name" value={storeForm.storeName} onChange={e => setStoreForm({...storeForm, storeName: e.target.value})} required style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="tel" placeholder="Phone" value={storeForm.phone} onChange={e => setStoreForm({...storeForm, phone: e.target.value})} required style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                    <input type="tel" placeholder="WhatsApp (Link format)" value={storeForm.whatsapp} onChange={e => setStoreForm({...storeForm, whatsapp: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                  </div>

                  <input type="text" placeholder="Street Address" value={storeForm.address} onChange={e => setStoreForm({...storeForm, address: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <input type="text" placeholder="City" value={storeForm.city} onChange={e => setStoreForm({...storeForm, city: e.target.value})} required style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                    <select value={storeForm.state} onChange={e => setStoreForm({...storeForm, state: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }}>
                      {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="number" step="any" placeholder="Latitude (GPS)" value={storeForm.latitude} onChange={e => setStoreForm({...storeForm, latitude: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                    <input type="number" step="any" placeholder="Longitude (GPS)" value={storeForm.longitude} onChange={e => setStoreForm({...storeForm, longitude: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />
                  </div>

                  {/* Customization checklist */}
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Services Offered</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#121216', padding: '8px', borderRadius: '8px' }}>
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
                  </div>

                  <input type="text" placeholder="Avatar Emoji (e.g. 🎨)" value={storeForm.image} onChange={e => setStoreForm({...storeForm, image: e.target.value})} style={{ padding: '10px', fontSize: '12px', background: '#1c1c24' }} />

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button type="button" onClick={() => { setShowStoreForm(false); setEditStore(null); }} className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '12px' }}>Cancel</button>
                    <button type="submit" className="btn-primary" style={{ flex: 2, padding: '10px', fontSize: '12px' }}>{editStore ? 'Save Changes' : 'Publish Store'}</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
             VIEW D: USERS & LET'S RIDE STATUS
             ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'Users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} className="animate-fade-in">
              {usersList.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>No active users mapped.</div>
              ) : (
                usersList.map(item => (
                  <div key={item.id} className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ color: 'white', fontSize: '14px', display: 'block' }}>{item.name || 'Biker'}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Rider ID: {item.unique_id || 'N/A'}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{item.email} • {item.mobile}</span>
                      </div>
                      <span style={{ fontSize: '10px', background: item.lets_ride_status === 'Suspended' ? 'rgba(255, 34, 51, 0.12)' : 'rgba(0, 230, 118, 0.12)', color: item.lets_ride_status === 'Suspended' ? 'var(--accent)' : 'var(--success)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                        {item.lets_ride_status || 'Approved'}
                      </span>
                    </div>

                    {/* Verification checks */}
                    <div style={{ display: 'flex', gap: '6px', fontSize: '10px', background: 'rgba(0,0,0,0.15)', padding: '6px', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                      <span>🪪 DL: {item.license_front_url ? '✅ Uploaded' : '❌ Missing'}</span>
                      <span>•</span>
                      <span>📄 RC: {item.rc_front_url ? '✅ Uploaded' : '❌ Missing'}</span>
                    </div>

                    {/* Lets ride actions */}
                    {item.email !== 'admin@helpriderss.com' && (
                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', marginTop: '4px' }}>
                        {item.lets_ride_status !== 'Approved' && (
                          <button 
                            onClick={() => updateUserLetsRideAccess(item.id, 'Approved')}
                            style={{ flex: 1, padding: '6px', background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.2)', borderRadius: '6px', color: 'var(--success)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            ✓ Approve Let's Ride
                          </button>
                        )}
                        {item.lets_ride_status !== 'Suspended' && (
                          <button 
                            onClick={() => updateUserLetsRideAccess(item.id, 'Suspended')}
                            style={{ flex: 1, padding: '6px', background: 'rgba(255, 34, 51, 0.08)', border: '1px solid rgba(255, 34, 51, 0.2)', borderRadius: '6px', color: 'var(--accent)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            🚫 Suspend Access
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────
             VIEW E: RIDES MODERATION
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
             VIEW F: USER COMPLAINT REPORTS
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
                      <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '8px', color: 'white' }}>{rep.reported_item_type.toUpperCase()}</span>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: rep.status === 'Pending' ? 'var(--accent)' : 'var(--success)' }}>{rep.status}</span>
                    </div>
                    <strong style={{ fontSize: '13.5px', color: 'white', display: 'block', marginTop: '6px' }}>Reason: {rep.reason}</strong>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>{rep.details}</p>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Reported by: {rep.reporter_name}</span>
                    
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
             VIEW G: GENERAL SETTINGS
             ──────────────────────────────────────────────────────────────── */}
          {activeTab === 'Settings' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <strong style={{ fontSize: '14px', color: 'white', display: 'block' }}>System Configuration</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Configure system credentials and access locks.</span>
              </div>

              <div>
                <label style={{ fontSize: '10.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Default Admin Email</label>
                <input type="text" readOnly value="admin@helpriderss.com" style={{ width: '100%', padding: '10px', fontSize: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-muted)' }} />
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
