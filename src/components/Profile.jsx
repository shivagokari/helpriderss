import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Award, Bike, PhoneCall, ShieldAlert, 
  LogOut, Plus, Trash2,
  Camera, MessageSquare, Send, X, MapPin, Headphones,
  Copy, UserPlus, Search, Check, Ban, Bell, Share2, ChevronRight, Users
} from 'lucide-react';
import { supabase } from '../utils/supabase';

// ─── Outside component to prevent keyboard re-mount ────────────────────────
const inputStyle = { width: '100%', padding: '10px 12px', fontSize: '13px', background: '#1c1c24', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', boxSizing: 'border-box' };
const smallInputStyle = { flex: 1, padding: '8px 10px', fontSize: '11px', background: '#1c1c24', color: 'white', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', boxSizing: 'border-box' };

export default function Profile({ user, onLogout, rides }) {
  // ── Avatar ────────────────────────────────────────────────────────────────
  const [avatar, setAvatar] = useState(() => localStorage.getItem('helpriders_avatar') || null);
  const fileInputRef = useRef(null);
  const [localToast, setLocalToast] = useState('');

  const showToast = useCallback((msg) => { setLocalToast(msg); }, []);
  useEffect(() => {
    if (localToast) { const t = setTimeout(() => setLocalToast(''), 3500); return () => clearTimeout(t); }
  }, [localToast]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) { showToast('⚠️ Please upload an image smaller than 1.5MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setAvatar(reader.result); localStorage.setItem('helpriders_avatar', reader.result); showToast('✅ Profile picture updated!'); };
    reader.readAsDataURL(file);
  };

  // ── Unique Rider ID ───────────────────────────────────────────────────────
  const [uniqueId, setUniqueId] = useState(() => {
    const saved = localStorage.getItem('helpriders_unique_id');
    if (saved) return saved;
    const generated = 'HR-' + Math.floor(10000 + Math.random() * 90000);
    localStorage.setItem('helpriders_unique_id', generated);
    return generated;
  });

  const copyUniqueId = () => {
    navigator.clipboard.writeText(uniqueId).then(() => showToast('✅ Your Rider ID copied to clipboard!'));
  };

  // ── Gamification ─────────────────────────────────────────────────────────
  const baselineKMs = 0;
  const totalKMs = baselineKMs + (rides || []).reduce((sum, r) => sum + (r.distance || 0), 0);
  const totalTrips = (rides || []).filter(r => r.status === 'Completed').length;

  let levelName = 'Rookie Rider', levelNum = 1, nextLevelKM = 500, prevLevelKM = 0;
  if (totalKMs >= 2500) { levelName = 'Iron Butt Legend'; levelNum = 4; nextLevelKM = 5000; prevLevelKM = 2500; }
  else if (totalKMs >= 1000) { levelName = 'Asphalt Veteran'; levelNum = 3; nextLevelKM = 2500; prevLevelKM = 1000; }
  else if (totalKMs >= 300) { levelName = 'Highway Explorer'; levelNum = 2; nextLevelKM = 1000; prevLevelKM = 300; }
  const progressPercent = Math.min(100, Math.max(0, ((totalKMs - prevLevelKM) / (nextLevelKM - prevLevelKM)) * 100));

  // ── Garage (real data only) ───────────────────────────────────────────────
  const [garage, setGarage] = useState(() => {
    try { return JSON.parse(localStorage.getItem('helpriders_garage_v2') || '[]'); } catch { return []; }
  });
  const [activeBike, setActiveBike] = useState(() => {
    const g = JSON.parse(localStorage.getItem('helpriders_garage_v2') || '[]');
    return g.length > 0 ? g[0].name : '';
  });
  const [newBikeName, setNewBikeName] = useState('');
  const [newBikeNumber, setNewBikeNumber] = useState('');
  const [newBikeType, setNewBikeType] = useState('Cruiser');

  useEffect(() => { localStorage.setItem('helpriders_garage_v2', JSON.stringify(garage)); }, [garage]);

  const handleAddBike = (e) => {
    e.preventDefault();
    if (!newBikeName.trim()) return;
    const b = { name: newBikeName.trim(), number: newBikeNumber.trim() || '—', type: newBikeType };
    setGarage(prev => [...prev, b]);
    if (!activeBike) setActiveBike(b.name);
    setNewBikeName(''); setNewBikeNumber(''); setNewBikeType('Cruiser');
    showToast('🏍️ Bike added to your garage!');
  };

  const handleRemoveBike = (name) => {
    setGarage(prev => { const next = prev.filter(b => b.name !== name); if (activeBike === name && next.length > 0) setActiveBike(next[0].name); else if (next.length === 0) setActiveBike(''); return next; });
  };

  // ── Emergency Contacts (real data only) ──────────────────────────────────
  const [emergencyContacts, setEmergencyContacts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('helpriders_contacts_v2') || '[]'); } catch { return []; }
  });
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  useEffect(() => { localStorage.setItem('helpriders_contacts_v2', JSON.stringify(emergencyContacts)); }, [emergencyContacts]);

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    setEmergencyContacts(prev => [...prev, { name: newContactName.trim(), phone: newContactPhone.trim() }]);
    setNewContactName(''); setNewContactPhone('');
    showToast('✅ Emergency contact saved.');
  };

  // ── Friend System ─────────────────────────────────────────────────────────
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Friends list stored in localStorage (keyed by uniqueId)
  const [friends, setFriends] = useState(() => {
    try { return JSON.parse(localStorage.getItem('helpriders_friends_v2') || '[]'); } catch { return []; }
  });
  const [pendingIn, setPendingIn] = useState(() => {
    try { return JSON.parse(localStorage.getItem('helpriders_pending_in') || '[]'); } catch { return []; }
  });
  const [pendingOut, setPendingOut] = useState(() => {
    try { return JSON.parse(localStorage.getItem('helpriders_pending_out') || '[]'); } catch { return []; }
  });
  const [blocked, setBlocked] = useState(() => {
    try { return JSON.parse(localStorage.getItem('helpriders_blocked') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('helpriders_friends_v2', JSON.stringify(friends)); }, [friends]);
  useEffect(() => { localStorage.setItem('helpriders_pending_in', JSON.stringify(pendingIn)); }, [pendingIn]);
  useEffect(() => { localStorage.setItem('helpriders_pending_out', JSON.stringify(pendingOut)); }, [pendingOut]);
  useEffect(() => { localStorage.setItem('helpriders_blocked', JSON.stringify(blocked)); }, [blocked]);

  const handleSearchRider = async () => {
    const query = searchId.trim().toUpperCase();
    if (!query) return;
    if (query === uniqueId) { setSearchError("That's your own Rider ID!"); setSearchResult(null); return; }
    setSearchLoading(true); setSearchError(''); setSearchResult(null);
    // Simulate finding a rider (in production, query Supabase profiles table)
    setTimeout(() => {
      // Mock result — in real app: supabase.from('profiles').select().eq('unique_id', query)
      if (query.startsWith('HR-') && query.length === 8) {
        setSearchResult({ unique_id: query, displayName: 'Rider ' + query.split('-')[1], bike: 'Unknown Bike', totalRides: 0, level: 'Rookie Rider' });
      } else {
        setSearchError('No rider found with ID: ' + query);
      }
      setSearchLoading(false);
    }, 800);
  };

  const sendFriendRequest = (rider) => {
    if (pendingOut.find(p => p.unique_id === rider.unique_id) || friends.find(f => f.unique_id === rider.unique_id)) {
      showToast('⚠️ Request already sent or already friends.');
      return;
    }
    setPendingOut(prev => [...prev, { ...rider, sentAt: new Date().toISOString() }]);
    setSearchResult(null); setSearchId('');
    showToast(`📨 Friend request sent to ${rider.displayName}!`);
  };

  const acceptRequest = (req) => {
    setFriends(prev => [...prev, { ...req, addedAt: new Date().toISOString() }]);
    setPendingIn(prev => prev.filter(p => p.unique_id !== req.unique_id));
    showToast(`✅ You and ${req.displayName} are now connected!`);
  };

  const rejectRequest = (req) => {
    setPendingIn(prev => prev.filter(p => p.unique_id !== req.unique_id));
    showToast('❌ Request rejected.');
  };

  const blockRider = (rider) => {
    setBlocked(prev => [...prev, rider]);
    setFriends(prev => prev.filter(f => f.unique_id !== rider.unique_id));
    setPendingIn(prev => prev.filter(p => p.unique_id !== rider.unique_id));
    showToast(`🚫 ${rider.displayName} has been blocked.`);
  };

  const unblockRider = (rider) => {
    setBlocked(prev => prev.filter(b => b.unique_id !== rider.unique_id));
    showToast(`✅ ${rider.displayName} has been unblocked.`);
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chats, setChats] = useState(() => { try { return JSON.parse(localStorage.getItem('helpriders_chats_v2') || '{}'); } catch { return {}; } });
  const chatBottomRef = useRef(null);

  useEffect(() => { localStorage.setItem('helpriders_chats_v2', JSON.stringify(chats)); }, [chats]);
  useEffect(() => { if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: 'smooth' }); }, [activeChatFriend, chats]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !activeChatFriend) return;
    const text = chatMessage.trim();
    const phonePattern = /(?:(?:\+|0{0,2})91[- ]?)?[6-9]\d{9}|\b\d{10}\b/g;
    if (phonePattern.test(text)) { showToast('⚠️ Sharing phone numbers in chat is restricted.'); return; }
    const newMsg = { id: Date.now(), sender: 'you', text };
    setChats(prev => ({ ...prev, [activeChatFriend.unique_id]: [...(prev[activeChatFriend.unique_id] || []), newMsg] }));
    setChatMessage('');
  };

  // ── Contact Developer ─────────────────────────────────────────────────────
  const [devName, setDevName] = useState('');
  const [devMobile, setDevMobile] = useState('');
  const [devSent, setDevSent] = useState(false);

  // ── Referral ───────────────────────────────────────────────────────────────
  const referralLink = `https://helpriderss.vercel.app?ref=${uniqueId}`;
  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink).then(() => showToast('✅ Referral link copied! Share with friends.'));
  };

  // ── Badges (earned, not fake) ─────────────────────────────────────────────
  const badges = [];
  if (totalKMs >= 1000) badges.push({ title: 'Highway King', icon: '👑', color: '#ffaa00' });
  if (totalTrips >= 5) badges.push({ title: 'Road Warrior', icon: '🏍️', color: '#00e676' });
  if (garage.length >= 2) badges.push({ title: 'Multi-Machine', icon: '🔧', color: '#00b0ff' });
  if (emergencyContacts.length >= 1) badges.push({ title: 'Safety First', icon: '🛡️', color: '#ff2233' });

  return (
    <div className="profile-section scroll-y" style={{ padding: '20px 16px', position: 'relative' }}>

      {/* Profile Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }} className="animate-fade-in">
        <div style={{ position: 'relative', width: '95px', height: '95px', margin: '0 auto 12px', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
          {avatar ? (
            <img src={avatar} alt="Avatar" style={{ width: '95px', height: '95px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', boxShadow: '0 8px 25px rgba(255,85,0,0.25)' }} />
          ) : (
            <div style={{ width: '95px', height: '95px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold', color: 'white', border: '3px solid var(--bg-tertiary)', boxShadow: '0 8px 25px rgba(255,85,0,0.25)' }}>
              {(user?.displayName || 'R')[0].toUpperCase()}
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', border: '2px solid var(--bg-primary)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={14} color="white" />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
        </div>
        <h2 style={{ fontSize: '22px', color: 'white', marginBottom: '2px' }}>{user?.displayName || 'My Profile'}</h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Level {levelNum} — {levelName}</span>
      </div>

      {/* Unique Rider ID Card */}
      <div className="glass-panel" style={{ padding: '14px 16px', marginBottom: '16px', background: 'linear-gradient(135deg, rgba(255,85,0,0.08) 0%, rgba(255,170,0,0.05) 100%)', border: '1px solid rgba(255,170,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Your Unique Rider ID</span>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--secondary)', letterSpacing: '2px', marginTop: '2px' }}>{uniqueId}</div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Share this ID so friends can find you</span>
          </div>
          <button onClick={copyUniqueId} style={{ background: 'rgba(255,170,0,0.15)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--secondary)', fontWeight: 'bold', fontSize: '12px' }}>
            <Copy size={14} /> Copy
          </button>
        </div>
      </div>

      {/* Gamification Progress Bar */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <strong style={{ fontSize: '13px', color: 'white' }}>Rank: {levelName}</strong>
          <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>{totalKMs} KM Ridden</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-secondary)' }}>
          <span>{prevLevelKM} KM</span>
          <span>Next rank: {nextLevelKM} KM</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        <div className="glass-panel" style={{ padding: '12px 6px', textAlign: 'center' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>KMs Ridden</span>
          <strong style={{ fontSize: '15px', color: 'white' }}>{totalKMs} KM</strong>
        </div>
        <div className="glass-panel" style={{ padding: '12px 6px', textAlign: 'center' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Trips Done</span>
          <strong style={{ fontSize: '15px', color: 'white' }}>{totalTrips}</strong>
        </div>
        <div className="glass-panel" style={{ padding: '12px 6px', textAlign: 'center' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Friends</span>
          <strong style={{ fontSize: '15px', color: 'white' }}>{friends.length}</strong>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '15px', color: 'white', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={16} color="var(--secondary)" /> Earned Badges
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {badges.map((b, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ fontSize: '22px' }}>{b.icon}</div>
                <strong style={{ fontSize: '12px', color: 'white' }}>{b.title}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FRIEND SYSTEM ──────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '15px', color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={16} color="var(--primary)" /> Biker Crew
          {pendingIn.length > 0 && (
            <span style={{ background: 'var(--accent)', color: 'white', fontSize: '9px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px' }}>{pendingIn.length} requests</span>
          )}
        </h4>

        {/* Search by unique ID */}
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>Enter a Rider ID (e.g. HR-48291) to find and connect</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Enter Rider ID (HR-XXXXX)"
              value={searchId}
              onChange={e => { setSearchId(e.target.value.toUpperCase()); setSearchError(''); setSearchResult(null); }}
              style={{ ...smallInputStyle, textTransform: 'uppercase', flex: 1 }}
            />
            <button
              onClick={handleSearchRider}
              disabled={searchLoading}
              style={{ padding: '8px 14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
            >
              <Search size={13} /> {searchLoading ? '...' : 'Find'}
            </button>
          </div>
          {searchError && <p style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '6px' }}>{searchError}</p>}
          {searchResult && (
            <div style={{ marginTop: '10px', background: 'rgba(255,85,0,0.06)', border: '1px solid rgba(255,85,0,0.2)', borderRadius: '10px', padding: '12px' }} className="animate-zoom-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: 'white', display: 'block' }}>{searchResult.displayName}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {searchResult.unique_id} • {searchResult.level}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>{searchResult.totalRides} rides</span>
                </div>
                <button
                  onClick={() => sendFriendRequest(searchResult)}
                  style={{ padding: '8px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <UserPlus size={13} /> Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Incoming Friend Requests */}
        {pendingIn.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 'bold', marginBottom: '8px' }}>📬 Incoming Requests</p>
            {pendingIn.map(req => (
              <div key={req.unique_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,170,0,0.05)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: '10px', marginBottom: '6px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: 'white', display: 'block' }}>{req.displayName}</strong>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{req.unique_id} • {req.bike}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>{req.totalRides || 0} rides done</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => acceptRequest(req)} style={{ padding: '6px 10px', background: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.3)', borderRadius: '8px', cursor: 'pointer', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                    <Check size={12} /> Accept
                  </button>
                  <button onClick={() => rejectRequest(req)} style={{ padding: '6px 10px', background: 'rgba(255,34,51,0.1)', border: '1px solid rgba(255,34,51,0.2)', borderRadius: '8px', cursor: 'pointer', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sent Requests */}
        {pendingOut.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', marginBottom: '8px' }}>📤 Sent Requests</p>
            {pendingOut.map(req => (
              <div key={req.unique_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{req.displayName} ({req.unique_id})</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Pending...</span>
              </div>
            ))}
          </div>
        )}

        {/* Friends List */}
        {friends.length === 0 && pendingIn.length === 0 && pendingOut.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Users size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
            No crew yet. Search a Rider ID above to connect!
          </div>
        ) : friends.length > 0 && (
          <div>
            <p style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 'bold', marginBottom: '8px' }}>✅ Connected ({friends.length})</p>
            {friends.map(f => (
              <div key={f.unique_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', marginBottom: '6px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1.5px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', color: 'white' }}>
                    {f.displayName?.[0] || 'R'}
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', color: 'white', display: 'block' }}>{f.displayName}</strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{f.unique_id} • {f.totalRides || 0} rides</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button onClick={() => setActiveChatFriend(f)} style={{ background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <MessageSquare size={13} color="white" />
                  </button>
                  <button onClick={() => blockRider(f)} title="Block" style={{ background: 'rgba(255,34,51,0.1)', border: '1px solid rgba(255,34,51,0.15)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent)' }}>
                    <Ban size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Blocked List */}
        {blocked.length > 0 && (
          <details style={{ marginTop: '10px' }}>
            <summary style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 'bold' }}>🚫 Blocked ({blocked.length})</summary>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {blocked.map(b => (
                <div key={b.unique_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,34,51,0.05)', borderRadius: '8px', border: '1px solid rgba(255,34,51,0.1)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{b.displayName} ({b.unique_id})</span>
                  <button onClick={() => unblockRider(b)} style={{ fontSize: '10px', color: 'var(--success)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Unblock</button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Virtual Garage */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '15px', color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bike size={16} color="var(--primary)" /> My Garage
        </h4>

        {garage.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Bike size={22} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
            No bikes added yet. Add your real bike below!
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {garage.map(bike => {
            const isActive = activeBike === bike.name;
            return (
              <div key={bike.name} onClick={() => setActiveBike(bike.name)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: isActive ? 'rgba(255,85,0,0.06)' : 'rgba(0,0,0,0.15)', border: isActive ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', cursor: 'pointer' }}>
                <div>
                  <strong style={{ fontSize: '12px', color: 'white', display: 'block' }}>{bike.name}</strong>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{bike.number} • {bike.type}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isActive ? (
                    <span style={{ fontSize: '10px', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Active</span>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); handleRemoveBike(bike.name); }} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleAddBike} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input type="text" placeholder="Bike Name (e.g. KTM Duke 390)" value={newBikeName} onChange={e => setNewBikeName(e.target.value)} style={smallInputStyle} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" placeholder="Number Plate" value={newBikeNumber} onChange={e => setNewBikeNumber(e.target.value)} style={{ ...smallInputStyle, flex: 1.5 }} />
            <select value={newBikeType} onChange={e => setNewBikeType(e.target.value)} style={{ ...smallInputStyle, flex: 1 }}>
              <option>Cruiser</option>
              <option>Adventure</option>
              <option>Streetfighter</option>
              <option>Dual-sport</option>
              <option>Scooter</option>
              <option>Sports</option>
            </select>
            <button type="submit" className="btn-primary" style={{ padding: '8px 12px', borderRadius: '8px', flexShrink: 0 }}><Plus size={14} /></button>
          </div>
        </form>
      </div>

      {/* Emergency SOS Contacts */}
      <div className="glass-panel" style={{ padding: '16px', borderLeft: '3px solid var(--accent)', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '15px', color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} /> Emergency SOS Contacts
        </h4>

        {emergencyContacts.length === 0 && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>Add real emergency contacts — family or trusted friends.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {emergencyContacts.map(c => (
            <div key={c.phone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <strong style={{ fontSize: '12px', color: 'white', display: 'block' }}>{c.name}</strong>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{c.phone}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a href={`tel:${c.phone}`} style={{ color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
                  <PhoneCall size={14} />
                </a>
                <button onClick={() => setEmergencyContacts(prev => prev.filter(x => x.phone !== c.phone))} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddContact} style={{ display: 'flex', gap: '8px' }}>
          <input type="text" placeholder="Name" value={newContactName} onChange={e => setNewContactName(e.target.value)} style={{ ...smallInputStyle, flex: 1.2 }} />
          <input type="tel" placeholder="Phone" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} style={{ ...smallInputStyle, flex: 1.5 }} />
          <button type="submit" className="btn-primary" style={{ padding: '8px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--accent) 0%, #aa0011 100%)', boxShadow: 'none', flexShrink: 0 }}><Plus size={14} /></button>
        </form>
      </div>

      {/* Refer a Friend */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px', border: '1px solid rgba(0,176,255,0.15)' }}>
        <h4 style={{ fontSize: '15px', color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Share2 size={16} color="#00b0ff" /> Refer Friends
        </h4>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.5' }}>
          Invite your real riding friends to join HELPRIDERSS! Share your referral link.
        </p>
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{referralLink}</span>
          <button onClick={copyReferral} style={{ background: 'rgba(0,176,255,0.1)', border: '1px solid rgba(0,176,255,0.2)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: '#00b0ff', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <Copy size={12} /> Copy
          </button>
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          📱 Works on WhatsApp, Instagram, SMS — share anywhere!
        </p>
      </div>

      {/* Contact Developer */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px', border: '1px solid rgba(255,170,0,0.15)' }}>
        <h4 style={{ fontSize: '15px', color: 'white', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Headphones size={16} color="#ffaa00" /> Contact Developer
        </h4>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.5' }}>
          Have a suggestion or issue? Drop your details and we'll reach out to you directly.
        </p>

        {devSent ? (
          <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
            <strong style={{ color: '#22c55e', fontSize: '13px', display: 'block' }}>Message Sent!</strong>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '4px 0 0' }}>Our team will contact you soon.</p>
            <button onClick={() => { setDevSent(false); setDevName(''); setDevMobile(''); }} style={{ marginTop: '10px', fontSize: '11px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Send another message
            </button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!devName.trim() || devMobile.replace(/\D/g, '').length < 10) {
                showToast('⚠️ Please enter a valid name and 10-digit mobile number.');
                return;
              }
              try {
                const { error } = await supabase.from('dev_contacts').insert({
                  name: devName.trim(), mobile: devMobile.trim(),
                  email: user?.email || 'Unknown', user_id: user?.uid || null, is_read: false
                });
                if (error) { showToast('⚠️ Could not send message. Please try again.'); return; }
                setDevSent(true);
                showToast('📨 Your message has been sent to the developer!');
              } catch { showToast('⚠️ Network error. Please try again.'); }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <input type="text" placeholder="Your Full Name" value={devName} onChange={e => setDevName(e.target.value)} required style={inputStyle} />
            <input type="tel" placeholder="Working Mobile Number (10 digits)" value={devMobile} onChange={e => setDevMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} required style={inputStyle} />
            <button type="submit" style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #ffaa00, #ff7700)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Send size={14} /> Send to Developer
            </button>
          </form>
        )}
      </div>

      {/* Sign Out */}
      <div style={{ marginBottom: '10px' }}>
        <button onClick={onLogout} className="btn-secondary" style={{ width: '100%', borderColor: 'rgba(255,34,51,0.2)', color: 'var(--accent)', gap: '8px', cursor: 'pointer' }}>
          <LogOut size={16} /> Sign Out of Helpriderss
        </button>
      </div>

      {/* Chat Modal */}
      {activeChatFriend && (
        <div className="bottom-sheet-overlay animate-fade-in" style={{ zIndex: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-zoom-in" style={{ width: '92%', maxWidth: '360px', height: '460px', padding: '0', background: 'rgba(18,18,24,0.98)', borderColor: 'var(--primary)', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                  {activeChatFriend.displayName?.[0] || 'R'}
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'white', display: 'block' }}>{activeChatFriend.displayName}</strong>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{activeChatFriend.unique_id}</span>
                </div>
              </div>
              <button onClick={() => setActiveChatFriend(null)} style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(chats[activeChatFriend.unique_id] || []).length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                  <MessageSquare size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <span>No messages yet. Say hello!</span>
                </div>
              ) : (
                (chats[activeChatFriend.unique_id] || []).map(msg => {
                  const isYou = msg.sender === 'you';
                  return (
                    <div key={msg.id} style={{ alignSelf: isYou ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: '10px 12px', background: isYou ? 'linear-gradient(135deg, var(--primary) 0%, #cc4400 100%)' : 'rgba(255,255,255,0.04)', border: isYou ? 'none' : '1px solid rgba(255,255,255,0.05)', borderRadius: isYou ? '16px 16px 2px 16px' : '16px 16px 16px 2px', color: 'white', fontSize: '12px', lineHeight: '1.4' }}>
                      {msg.text}
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <input type="text" placeholder="Type a message..." value={chatMessage} onChange={e => setChatMessage(e.target.value)} style={{ flex: 1, padding: '8px 12px', fontSize: '12px', background: '#121216', color: 'white', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }} />
              <button type="submit" style={{ background: 'var(--primary)', border: 'none', borderRadius: '12px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Send size={14} color="white" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {localToast && (
        <div className="animate-slide-up" style={{ position: 'absolute', bottom: '20px', left: '16px', right: '16px', zIndex: 300, background: 'rgba(18,18,22,0.96)', border: '1.5px solid var(--primary)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 32px rgba(255,85,0,0.35)', color: 'white', fontWeight: 'bold', fontSize: '13px' }}>
          <span style={{ fontSize: '16px' }}>🏍️</span>
          <span>{localToast}</span>
        </div>
      )}

      <div style={{ height: '40px' }} />
    </div>
  );
}
