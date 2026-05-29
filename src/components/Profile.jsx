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
const smallInputStyle = { flex: 1, padding: '8px 10px', fontSize: '11px', background: '#1c1c24', color: 'white', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', boxSizing: 'border-box', minWidth: '0' };

export default function Profile({ user, onLogout, rides }) {
  // ── Avatar ────────────────────────────────────────────────────────────────
  const [avatar, setAvatar] = useState(null);
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
    reader.onloadend = async () => {
      const base64 = reader.result;
      setAvatar(base64);
      showToast('✅ Profile picture updated!');
      if (user?.uid) {
        await supabase.from('profiles').update({ avatar_url: base64 }).eq('id', user.uid);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Unique Rider ID ───────────────────────────────────────────────────────
  const [uniqueId, setUniqueId] = useState(user?.uniqueId || '');

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
  const [garage, setGarage] = useState([]);
  const [activeBike, setActiveBike] = useState('');
  const [newBikeName, setNewBikeName] = useState('');
  const [newBikeNumber, setNewBikeNumber] = useState('');
  const [newBikeType, setNewBikeType] = useState('Cruiser');

  // ── Emergency Contacts (real data only) ──────────────────────────────────
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Fetch all profile details from Supabase on mount
  useEffect(() => {
    if (!user || !user.uid) return;
    const fetchProfileData = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('garage, emergency_contacts, avatar_url, unique_id')
          .eq('id', user.uid)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setGarage(data.garage || []);
          setEmergencyContacts(data.emergency_contacts || []);
          setAvatar(data.avatar_url || null);
          if (data.unique_id) setUniqueId(data.unique_id);
          if (data.garage && data.garage.length > 0) {
            setActiveBike(data.garage[0].name);
          }
        }
      } catch (err) {
        console.warn('Failed to load Supabase profile details:', err.message);
      }
    };
    fetchProfileData();
  }, [user]);

  const handleAddBike = async (e) => {
    e.preventDefault();
    if (!newBikeName.trim()) return;
    const b = { name: newBikeName.trim(), number: newBikeNumber.trim() || '—', type: newBikeType };
    const updatedGarage = [...garage, b];
    setGarage(updatedGarage);
    if (!activeBike) setActiveBike(b.name);
    setNewBikeName(''); setNewBikeNumber(''); setNewBikeType('Cruiser');
    showToast('🏍️ Bike added to your garage!');
    if (user?.uid) {
      await supabase.from('profiles').update({ garage: updatedGarage }).eq('id', user.uid);
    }
  };

  const handleRemoveBike = async (name) => {
    const updatedGarage = garage.filter(b => b.name !== name);
    setGarage(updatedGarage);
    if (activeBike === name && updatedGarage.length > 0) setActiveBike(updatedGarage[0].name);
    else if (updatedGarage.length === 0) setActiveBike('');
    showToast('❌ Bike removed.');
    if (user?.uid) {
      await supabase.from('profiles').update({ garage: updatedGarage }).eq('id', user.uid);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    const updatedContacts = [...emergencyContacts, { name: newContactName.trim(), phone: newContactPhone.trim() }];
    setEmergencyContacts(updatedContacts);
    setNewContactName(''); setNewContactPhone('');
    showToast('✅ Emergency contact saved.');
    if (user?.uid) {
      await supabase.from('profiles').update({ emergency_contacts: updatedContacts }).eq('id', user.uid);
    }
  };

  const handleRemoveContact = async (phone) => {
    const updatedContacts = emergencyContacts.filter(c => c.phone !== phone);
    setEmergencyContacts(updatedContacts);
    showToast('❌ Contact removed.');
    if (user?.uid) {
      await supabase.from('profiles').update({ emergency_contacts: updatedContacts }).eq('id', user.uid);
    }
  };

  // ── Friend System ─────────────────────────────────────────────────────────
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedRiderForRequest, setSelectedRiderForRequest] = useState(null);

  const [friends, setFriends] = useState([]);
  const [pendingIn, setPendingIn] = useState([]);
  const [pendingOut, setPendingOut] = useState([]);
  const [blocked, setBlocked] = useState([]);

  const fetchFriendsAndRequests = useCallback(async () => {
    if (!user || !user.uid) return;
    try {
      const { data: records, error } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`from_id.eq.${user.uid},to_id.eq.${user.uid}`);

      if (error) throw error;

      const userIds = [...new Set(records.flatMap(r => [r.from_id, r.to_id]))].filter(id => id !== user.uid);
      let profileMap = {};
      if (userIds.length > 0) {
        const { data: profs, error: profsErr } = await supabase
          .from('profiles')
          .select('id, name, email, unique_id, level, garage')
          .in('id', userIds);
        
        if (!profsErr && profs) {
          profs.forEach(p => {
            profileMap[p.id] = p;
          });
        }
      }

      const activeFriends = [];
      const incoming = [];
      const outgoing = [];
      const blockedList = [];

      records.forEach(r => {
        const otherId = r.from_id === user.uid ? r.to_id : r.from_id;
        const otherProfile = profileMap[otherId];
        if (!otherProfile) return;

        const mappedRider = {
          id: r.id,
          uid: otherProfile.id,
          unique_id: otherProfile.unique_id,
          displayName: otherProfile.name || otherProfile.email.split('@')[0],
          email: otherProfile.email,
          level: otherProfile.level || 'Rookie Rider',
          bike: otherProfile.garage && otherProfile.garage.length > 0 ? otherProfile.garage[0].name : 'Unknown Bike',
          totalRides: 0,
          note: r.note
        };

        if (r.status === 'accepted') {
          activeFriends.push(mappedRider);
        } else if (r.status === 'pending') {
          if (r.to_id === user.uid) {
            incoming.push(mappedRider);
          } else {
            outgoing.push(mappedRider);
          }
        } else if (r.status === 'blocked') {
          if (r.from_id === user.uid) {
            blockedList.push(mappedRider);
          }
        }
      });

      setFriends(activeFriends);
      setPendingIn(incoming);
      setPendingOut(outgoing);
      setBlocked(blockedList);
    } catch (err) {
      console.error('Error fetching friends:', err.message);
    }
  }, [user]);

  useEffect(() => {
    fetchFriendsAndRequests();
  }, [fetchFriendsAndRequests]);

  const handleSearchRider = async () => {
    let query = searchId.trim().toUpperCase();
    if (!query) return;
    if (query === 'ADMIN') {
      query = 'HR-ADMIN';
    }
    if (query === uniqueId) { setSearchError("That's your own Rider ID!"); setSearchResult(null); return; }
    setSearchLoading(true); setSearchError(''); setSearchResult(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, unique_id, level, garage')
        .eq('unique_id', query)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const isBlocked = blocked.some(b => b.unique_id === data.unique_id);
        const isFriend = friends.some(f => f.unique_id === data.unique_id);
        const isPendingIn = pendingIn.some(p => p.unique_id === data.unique_id);
        const isPendingOut = pendingOut.some(p => p.unique_id === data.unique_id);

        setSearchResult({
          uid: data.id,
          unique_id: data.unique_id,
          displayName: data.name || data.email.split('@')[0],
          email: data.email,
          level: data.level || 'Rookie Rider',
          bike: data.garage && data.garage.length > 0 ? data.garage[0].name : 'Unknown Bike',
          totalRides: 0,
          relationship: isFriend ? 'friend' : isBlocked ? 'blocked' : isPendingIn ? 'pending_in' : isPendingOut ? 'pending_out' : 'none'
        });
      } else if (query === 'HR-ADMIN') {
        const isBlocked = blocked.some(b => b.unique_id === 'HR-ADMIN');
        const isFriend = friends.some(f => f.unique_id === 'HR-ADMIN');
        const isPendingIn = pendingIn.some(p => p.unique_id === 'HR-ADMIN');
        const isPendingOut = pendingOut.some(p => p.unique_id === 'HR-ADMIN');

        setSearchResult({
          uid: 'admin-uuid-fallback',
          unique_id: 'HR-ADMIN',
          displayName: 'Admin Moderator',
          email: 'admin@helpriderss.com',
          level: 'System Administrator',
          bike: 'Cruiser',
          totalRides: 0,
          relationship: isFriend ? 'friend' : isBlocked ? 'blocked' : isPendingIn ? 'pending_in' : isPendingOut ? 'pending_out' : 'none',
          isMock: true
        });
      } else {
        setSearchError('No rider found with ID: ' + query);
      }
    } catch (err) {
      setSearchError('Failed to search: ' + err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (rider, noteVal = '') => {
    if (rider.relationship && rider.relationship !== 'none') {
      showToast('⚠️ Already connected, requested, or blocked.');
      return;
    }

    if (rider.isMock) {
      showToast('⚠️ Admin account is not yet initialized. Please ask the administrator to sign in first to initialize.');
      return;
    }

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          from_id: user.uid,
          to_id: rider.uid,
          status: 'pending',
          note: noteVal.trim().substring(0, 30)
        });

      if (error) throw error;

      showToast(`📨 Friend request sent to ${rider.displayName}!`);
      fetchFriendsAndRequests();
      setSearchResult(null); setSearchId('');
      setShowNoteModal(false);
      setNoteText('');
      setSelectedRiderForRequest(null);
    } catch (err) {
      showToast('❌ Failed to send request: ' + err.message);
    }
  };

  const acceptRequest = async (req) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('from_id', req.uid)
        .eq('to_id', user.uid);

      if (error) throw error;

      showToast(`✅ You and ${req.displayName} are now connected!`);
      fetchFriendsAndRequests();
    } catch (err) {
      showToast('❌ Failed to accept request: ' + err.message);
    }
  };

  const rejectRequest = async (req) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('from_id', req.uid)
        .eq('to_id', user.uid);

      if (error) throw error;

      showToast('❌ Request rejected.');
      fetchFriendsAndRequests();
    } catch (err) {
      showToast('❌ Failed to reject: ' + err.message);
    }
  };

  const blockRider = async (rider) => {
    try {
      await supabase
        .from('friend_requests')
        .delete()
        .or(`and(from_id.eq.${user.uid},to_id.eq.${rider.uid}),and(from_id.eq.${rider.uid},to_id.eq.${user.uid})`);

      const { error } = await supabase
        .from('friend_requests')
        .insert({
          from_id: user.uid,
          to_id: rider.uid,
          status: 'blocked'
        });

      if (error) throw error;

      showToast(`🚫 ${rider.displayName} has been blocked.`);
      fetchFriendsAndRequests();
    } catch (err) {
      showToast('❌ Failed to block: ' + err.message);
    }
  };

  const unblockRider = async (rider) => {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('from_id', user.uid)
        .eq('to_id', rider.uid)
        .eq('status', 'blocked');

      if (error) throw error;

      showToast(`✅ ${rider.displayName} has been unblocked.`);
      fetchFriendsAndRequests();
    } catch (err) {
      showToast('❌ Failed to unblock: ' + err.message);
    }
  };

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [messagesList, setMessagesList] = useState([]);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (!user || !user.uid || !activeChatFriend) {
      setMessagesList([]);
      return;
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.uid},receiver_id.eq.${activeChatFriend.uid}),and(sender_id.eq.${activeChatFriend.uid},receiver_id.eq.${user.uid})`)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessagesList(data);
      }
    };

    fetchMessages();

    // Subscribe to new messages in real-time
    const subscription = supabase
      .channel(`chat_${user.uid}_${activeChatFriend.uid}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const msg = payload.new;
        if (
          (msg.sender_id === user.uid && msg.receiver_id === activeChatFriend.uid) ||
          (msg.sender_id === activeChatFriend.uid && msg.receiver_id === user.uid)
        ) {
          setMessagesList(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, activeChatFriend]);

  useEffect(() => { 
    if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: 'smooth' }); 
  }, [activeChatFriend, messagesList]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !activeChatFriend) return;
    const text = chatMessage.trim();
    const phonePattern = /(?:(?:\+|0{0,2})91[- ]?)?[6-9]\d{9}|\b\d{10}\b/g;
    if (phonePattern.test(text)) { showToast('⚠️ Sharing phone numbers in chat is restricted.'); return; }

    const toxicKeywords = ['drugs', 'weapons', 'scam'];
    if (toxicKeywords.some(kw => text.toLowerCase().includes(kw))) {
      showToast('⚠️ Toxic content detected. Message blocked.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.uid,
          receiver_id: activeChatFriend.uid,
          content: text
        })
        .select()
        .single();

      if (error) throw error;

      setMessagesList(prev => [...prev, data]);
      setChatMessage('');
    } catch (err) {
      showToast('❌ Failed to send message: ' + err.message);
    }
  };

  const parseMessageContent = (text) => {
    if (!text) return '';

    const imgRegex = /^(https?:\/\/\S+\.(?:png|jpg|jpeg|gif))$/i;
    if (imgRegex.test(text.trim())) {
      return (
        <img 
          src={text.trim()} 
          alt="Shared" 
          style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', marginTop: '4px', display: 'block' }} 
        />
      );
    }

    const coordsRegex = /lat:\s*([+-]?\d+(?:\.\d+)?)\s*,?\s*lon:\s*([+-]?\d+(?:\.\d+)?)/i;
    const coordsMatch = text.match(coordsRegex);
    if (coordsMatch) {
      const lat = coordsMatch[1];
      const lon = coordsMatch[2];
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      return (
        <span>
          {text.substring(0, coordsMatch.index)}
          <a 
            href={mapsUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#ffaa00', textDecoration: 'underline', fontWeight: 'bold' }}
          >
            📍 Location (Google Maps)
          </a>
          {text.substring(coordsMatch.index + coordsMatch[0].length)}
        </span>
      );
    }

    const urlRegex = /(https?:\/\/\S+)/gi;
    const parts = text.split(urlRegex);
    if (parts.length > 1) {
      return (
        <span>
          {parts.map((part, i) => {
            if (urlRegex.test(part)) {
              return (
                <a 
                  key={i} 
                  href={part} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: '#ffaa00', textDecoration: 'underline' }}
                >
                  {part}
                </a>
              );
            }
            return part;
          })}
        </span>
      );
    }

    return text;
  };

  // ── Contact Developer ─────────────────────────────────────────────────────
  const [devName, setDevName] = useState('');
  const [devMobile, setDevMobile] = useState('');
  const [devSent, setDevSent] = useState(false);
  const [showDevForm, setShowDevForm] = useState(false);

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
                {searchResult.relationship === 'none' && (
                  <button
                    onClick={() => {
                      setSelectedRiderForRequest(searchResult);
                      setNoteText('');
                      setShowNoteModal(true);
                    }}
                    style={{ padding: '8px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <UserPlus size={13} /> Send Request
                  </button>
                )}
                {searchResult.relationship === 'pending_out' && (
                  <span style={{ fontSize: '12.5px', color: '#ffaa00', fontWeight: '600', padding: '6px 12px', background: 'rgba(255,170,0,0.1)', borderRadius: '8px' }}>
                    ⏳ Requested
                  </span>
                )}
                {searchResult.relationship === 'pending_in' && (
                  <button
                    onClick={() => acceptRequest(searchResult)}
                    style={{ padding: '8px 12px', background: 'rgba(0,230,118,0.15)', border: '1px solid rgba(0,230,118,0.3)', color: 'var(--success)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Check size={13} /> Accept
                  </button>
                )}
                {searchResult.relationship === 'friend' && (
                  <span style={{ fontSize: '12.5px', color: '#00e676', fontWeight: '600', padding: '6px 12px', background: 'rgba(0,230,118,0.1)', borderRadius: '8px' }}>
                    ✓ Connected
                  </span>
                )}
                {searchResult.relationship === 'blocked' && (
                  <span style={{ fontSize: '12.5px', color: 'var(--accent)', fontWeight: '600', padding: '6px 12px', background: 'rgba(255,34,51,0.1)', borderRadius: '8px' }}>
                    🚫 Blocked
                  </span>
                )}
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
                  {req.note && (
                    <span style={{ fontSize: '11px', color: 'var(--secondary)', fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
                      💬 "{req.note}"
                    </span>
                  )}
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{req.totalRides || 0} rides done</span>
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
                <button onClick={() => handleRemoveContact(c.phone)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
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
        <h4 style={{ fontSize: '15px', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Headphones size={16} color="#ffaa00" /> Contact Developer
        </h4>

        {/* Above that only mention that search Admin in req bar to add admin in you friend list */}
        <div style={{ background: 'rgba(255, 170, 0, 0.08)', border: '1px solid rgba(255, 170, 0, 0.2)', padding: '10px 12px', borderRadius: '10px', fontSize: '11.5px', color: 'var(--secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
          💡 Search Admin in req bar to add admin in you friend list
        </div>

        {!showDevForm && !devSent ? (
          <button 
            onClick={() => setShowDevForm(true)}
            className="btn-primary"
            style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #ffaa00, #ff7700)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Headphones size={14} /> Contact Developer
          </button>
        ) : devSent ? (
          <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
            <strong style={{ color: '#22c55e', fontSize: '13px', display: 'block' }}>Message Sent!</strong>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', margin: '4px 0 0' }}>Our team will contact you soon.</p>
            <button onClick={() => { setDevSent(false); setDevName(''); setDevMobile(''); setShowDevForm(false); }} style={{ marginTop: '10px', fontSize: '11px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
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
            className="animate-zoom-in"
          >
            <input type="text" placeholder="Your Full Name" value={devName} onChange={e => setDevName(e.target.value)} required style={inputStyle} />
            <input type="tel" placeholder="Working Mobile Number (10 digits)" value={devMobile} onChange={e => setDevMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} required style={inputStyle} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setShowDevForm(false)} className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '12px' }}>
                Cancel
              </button>
              <button type="submit" style={{ flex: 2, padding: '10px', background: 'linear-gradient(135deg, #ffaa00, #ff7700)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Send size={14} /> Send to Developer
              </button>
            </div>
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
              {messagesList.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                  <MessageSquare size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <span>No messages yet. Say hello!</span>
                </div>
              ) : (
                messagesList.map(msg => {
                  const isYou = msg.sender_id === user.uid;
                  return (
                    <div key={msg.id} style={{ alignSelf: isYou ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: '10px 12px', background: isYou ? 'linear-gradient(135deg, var(--primary) 0%, #cc4400 100%)' : 'rgba(255,255,255,0.04)', border: isYou ? 'none' : '1px solid rgba(255,255,255,0.05)', borderRadius: isYou ? '16px 16px 2px 16px' : '16px 16px 16px 2px', color: 'white', fontSize: '12px', lineHeight: '1.4' }}>
                      {parseMessageContent(msg.content)}
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

      {/* Friend Request Note Modal */}
      {showNoteModal && selectedRiderForRequest && (
        <div className="bottom-sheet-overlay animate-fade-in" style={{ zIndex: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 5, 8, 0.8)' }} onClick={() => { setShowNoteModal(false); setSelectedRiderForRequest(null); setNoteText(''); }}>
          <div className="glass-panel animate-zoom-in" style={{ width: '90%', maxWidth: '340px', background: 'rgba(18,18,24,0.98)', padding: '24px 20px', borderRadius: '20px', border: '1.5px solid var(--primary)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                📨 Add a Note
              </h3>
              <button 
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteText('');
                  setSelectedRiderForRequest(null);
                }} 
                style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
              Include a short message for <strong>{selectedRiderForRequest.displayName}</strong> (max 30 characters).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="e.g. Let's plan a breakfast ride!"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value.slice(0, 30))}
                  maxLength={30}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13px',
                    background: '#121216',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {noteText.length}/30 characters
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1, padding: '10px', fontSize: '12px', borderRadius: '10px' }}
                  onClick={() => {
                    setShowNoteModal(false);
                    setNoteText('');
                    setSelectedRiderForRequest(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 1.5, padding: '10px', fontSize: '12px', borderRadius: '10px', fontWeight: 'bold' }}
                  onClick={() => sendFriendRequest(selectedRiderForRequest, noteText)}
                >
                  Send Request
                </button>
              </div>
            </div>
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
