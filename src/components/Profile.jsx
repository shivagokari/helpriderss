import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Award, Bike, PhoneCall, ShieldAlert, 
  LogOut, Plus, Trash2,
  Camera, MessageSquare, Send, X, MapPin, Headphones
} from 'lucide-react';
import { supabase } from '../utils/supabase';

export default function Profile({ user, onLogout, rides }) {
  // 1. Avatar Image Upload & Persistence
  const [avatar, setAvatar] = useState(() => localStorage.getItem('helpriders_avatar') || null);
  const fileInputRef = useRef(null);

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        setLocalToast('⚠️ Please upload an image smaller than 1.5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
        localStorage.setItem('helpriders_avatar', reader.result);
        setLocalToast('✅ Profile picture updated successfully!');
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. Dynamic Gamification levels
  const baselineKMs = 1200;
  const totalKMs = baselineKMs + (rides || []).reduce((sum, r) => sum + (r.distance || 0), 0);
  const totalTrips = 5 + (rides || []).filter(r => r.status === 'Completed').length;
  
  let levelName = 'Rookie Rider';
  let levelNum = 1;
  let nextLevelKM = 1800;
  let prevLevelKM = 0;
  
  if (totalKMs >= 2500) {
    levelName = 'Iron Butt Legend';
    levelNum = 4;
    nextLevelKM = 5000;
    prevLevelKM = 2500;
  } else if (totalKMs >= 1800) {
    levelName = 'Asphalt Veteran';
    levelNum = 3;
    nextLevelKM = 2500;
    prevLevelKM = 1800;
  } else if (totalKMs >= 1300) {
    levelName = 'Highway Explorer';
    levelNum = 2;
    nextLevelKM = 1800;
    prevLevelKM = 1300;
  }
  
  const progressPercent = Math.min(100, Math.max(0, ((totalKMs - prevLevelKM) / (nextLevelKM - prevLevelKM)) * 100));

  // 3. Garage and SOS Contacts States
  const [activeBike, setActiveBike] = useState('KTM Adventure 390');
  const [garage, setGarage] = useState([
    { name: 'KTM Adventure 390', number: 'MH-12-RS-3939', type: 'Adventure' },
    { name: 'RE Himalayan 450', number: 'MH-14-RE-4500', type: 'Dual-sport' },
  ]);
  const [newBikeName, setNewBikeName] = useState('');
  const [newBikeNumber, setNewBikeNumber] = useState('');

  const [emergencyContacts, setEmergencyContacts] = useState([
    { name: 'Sarah (Wife)', phone: '+91 98220 12345' },
    { name: 'Alex (Riding Buddy)', phone: '+91 98810 54321' }
  ]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  // Contact Developer form
  const [devName, setDevName] = useState('');
  const [devMobile, setDevMobile] = useState('');
  const [devSent, setDevSent] = useState(false);

  // 4. Friends and Messaging States
  const [friends, setFriends] = useState(() => {
    const saved = localStorage.getItem('helpriders_friends');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Rahul Sharma', bike: 'Royal Enfield Classic 350', status: 'Online', avatar: null },
      { id: 2, name: 'Amit Patel', bike: 'KTM Duke 390', status: 'Riding', avatar: null },
      { id: 3, name: 'Vikram Singh', bike: 'Himalayan 450', status: 'Offline', avatar: null }
    ];
  });
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendBike, setNewFriendBike] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);

  // Active chat session
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('helpriders_chats');
    return saved ? JSON.parse(saved) : {
      1: [
        { id: 101, sender: 'them', text: 'Hey, are you down for the Yadagirigutta ride this Sunday?' },
        { id: 102, sender: 'you', text: 'Yeah, planning to meet at Uppal Metro station at 5:30 AM!' }
      ],
      2: [
        { id: 201, sender: 'them', text: 'Biker alert! Roads near Lonavala are extremely foggy, take care.' }
      ],
      3: []
    };
  });

  const [localToast, setLocalToast] = useState('');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('helpriders_friends', JSON.stringify(friends));
  }, [friends]);

  useEffect(() => {
    localStorage.setItem('helpriders_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatFriend, chats]);

  // Toast Auto-clear
  useEffect(() => {
    if (localToast) {
      const t = setTimeout(() => setLocalToast(''), 3500);
      return () => clearTimeout(t);
    }
  }, [localToast]);

  // Operations
  const handleAddBike = (e) => {
    e.preventDefault();
    if (!newBikeName) return;
    setGarage([...garage, { name: newBikeName, number: newBikeNumber || 'MH-12-TEMP', type: 'Cruiser' }]);
    setNewBikeName('');
    setNewBikeNumber('');
    setLocalToast('🏍️ Machine added to Virtual Garage!');
  };

  const handleRemoveBike = (name) => {
    setGarage(garage.filter(b => b.name !== name));
    if (activeBike === name && garage.length > 1) {
      setActiveBike(garage[0].name);
    }
  };

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone) return;
    setEmergencyContacts([...emergencyContacts, { name: newContactName, phone: newContactPhone }]);
    setNewContactName('');
    setNewContactPhone('');
    setLocalToast('✅ Emergency contact saved.');
  };

  const handleRemoveContact = (phone) => {
    setEmergencyContacts(emergencyContacts.filter(c => c.phone !== phone));
  };

  const triggerCall = (contact) => {
    setLocalToast(`📞 Simulated SOS Call sent to: ${contact.name}`);
  };

  const handleAddFriend = (e) => {
    e.preventDefault();
    if (!newFriendName.trim()) return;
    const fId = Date.now();
    const newF = {
      id: fId,
      name: newFriendName,
      bike: newFriendBike || 'Cruiser Machine',
      status: 'Online',
      avatar: null
    };
    setFriends([...friends, newF]);
    setChats(prev => ({ ...prev, [fId]: [] }));
    setNewFriendName('');
    setNewFriendBike('');
    setShowAddFriend(false);
    setLocalToast(`👥 Added ${newF.name} to Biker Crew!`);
  };

  // Chat Filter Logic
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !activeChatFriend) return;

    const text = chatMessage.trim();

    // 1. Phone number filter regex
    const phonePattern = /(?:(?:\+|0{0,2})91[- ]?)?[6-9]\d{9}|\b\d{10}\b|\b\d{3}[- ]?\d{3}[- ]?\d{4}\b|\b\d{5}[- ]?\d{5}\b/g;
    if (phonePattern.test(text)) {
      setLocalToast('⚠️ Security Policy: Sharing phone numbers in chat is restricted. Use the request approval system.');
      return;
    }

    // 2. Illegal keywords filter
    const illegalPattern = /drugs|weapons|marijuana|cocaine|scam|abuse|illegal|hack|violence|stolen|weapon/i;
    if (illegalPattern.test(text)) {
      setLocalToast('⚠️ Message blocked: Illegal or policy-violating content detected.');
      return;
    }

    // Add message
    const newMsg = {
      id: Date.now(),
      sender: 'you',
      text: text
    };

    setChats(prev => ({
      ...prev,
      [activeChatFriend.id]: [...(prev[activeChatFriend.id] || []), newMsg]
    }));

    setChatMessage('');

    // Trigger auto-responses for location, urls or text to make chat active
    setTimeout(() => {
      let replyText = "Ride hard, ride safe! 🏍️";
      if (text.toLowerCase().includes('location') || text.toLowerCase().includes('where')) {
        replyText = "Here is my live location: lat: 17.3850, lon: 78.4867";
      } else if (text.toLowerCase().includes('photo') || text.toLowerCase().includes('image')) {
        replyText = "Check this route image out! https://images.unsplash.com/photo-1558981806-ec527fa84c39";
      } else if (text.toLowerCase().includes('link') || text.toLowerCase().includes('route')) {
        replyText = "Check the route planning map: https://helpriderss.com/routes/303";
      }

      const botMsg = {
        id: Date.now() + 1,
        sender: 'them',
        text: replyText
      };

      setChats(prev => ({
        ...prev,
        [activeChatFriend.id]: [...(prev[activeChatFriend.id] || []), botMsg]
      }));
    }, 1200);
  };

  // Rendering chat text dynamically (detects URLs, images, and coordinates)
  const formatChatMessage = (text) => {
    // 1. Detect live coordinates
    const coordPattern = /lat:\s*([0-9.]+),\s*lon:\s*([0-9.]+)/i;
    const coordMatch = text.match(coordPattern);
    if (coordMatch) {
      const lat = coordMatch[1];
      const lon = coordMatch[2];
      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span>{text}</span>
          <a 
            href={mapsLink} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              color: 'var(--primary)', 
              fontSize: '11px', 
              fontWeight: 'bold', 
              textDecoration: 'none',
              background: 'rgba(255,85,0,0.1)',
              padding: '6px 10px',
              borderRadius: '6px',
              width: 'fit-content'
            }}
          >
            <MapPin size={12} /> Open Map Location
          </a>
        </div>
      );
    }

    // 2. Detect image URLs
    const imgPattern = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i;
    const imgMatch = text.match(imgPattern);
    if (imgMatch) {
      const url = imgMatch[1];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span>{text.replace(url, '')}</span>
          <img 
            src={url} 
            alt="Shared pic" 
            style={{ maxWidth: '100%', maxHeight: '140px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      );
    }

    // 3. Detect standard URLs
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    if (urlPattern.test(text)) {
      const parts = text.split(urlPattern);
      return (
        <span>
          {parts.map((part, i) => {
            if (part.match(urlPattern)) {
              return (
                <a 
                  key={i} 
                  href={part} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: 'var(--secondary)', textDecoration: 'underline', fontWeight: 'bold' }}
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

    return <span>{text}</span>;
  };

  const badges = [
    { title: 'Highway King', desc: 'Covered 1000+ KM on expressways', icon: '👑', color: '#ffaa00' },
    { title: 'Curve Carver', desc: 'Completed 15 mountain pass twisties', icon: '⛰️', color: '#00e676' },
    { title: 'Night Owl', desc: 'Logged 10 midnight rally miles', icon: '🌙', color: '#00b0ff' },
    { title: 'Monsoon Shield', desc: 'Ridden 200+ KM under wet rainfall alerts', icon: '🌧️', color: '#ff2233' },
  ];

  return (
    <div className="profile-section scroll-y" style={{ padding: '20px 16px', position: 'relative' }}>
      
      {/* Profile Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }} className="animate-fade-in">
        <div style={{ position: 'relative', width: '95px', height: '95px', margin: '0 auto 12px', cursor: 'pointer' }} onClick={handleAvatarClick}>
          {avatar ? (
            <img 
              src={avatar} 
              alt="Avatar" 
              style={{ width: '95px', height: '95px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', boxShadow: '0 8px 25px rgba(255, 85, 0, 0.25)' }} 
            />
          ) : (
            <div style={{ width: '95px', height: '95px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold', color: 'white', border: '3px solid var(--bg-tertiary)', boxShadow: '0 8px 25px rgba(255, 85, 0, 0.25)' }}>
              {(user?.displayName || 'G')[0].toUpperCase()}
            </div>
          )}
          <div style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--primary)', border: '2px solid var(--bg-primary)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Change Profile Picture">
            <Camera size={14} color="white" />
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleAvatarChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>
        
        <h2 style={{ fontSize: '22px', color: 'white', marginBottom: '2px' }}>{user?.displayName || 'GhostRider'}</h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Level {levelNum} Biker</span>
      </div>

      {/* Gamification Progress Bar Card */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <strong style={{ fontSize: '13px', color: 'white' }}>Rank: {levelName}</strong>
          <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>{totalKMs} KM Ridden</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '4px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-secondary)' }}>
          <span>{prevLevelKM} KM</span>
          <span>Next: {nextLevelKM} KM</span>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '12px 6px', textAlign: 'center' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>KMs Ridden</span>
          <strong style={{ fontSize: '15px', color: 'white' }}>{totalKMs} KM</strong>
        </div>
        <div className="glass-panel" style={{ padding: '12px 6px', textAlign: 'center' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Trips Done</span>
          <strong style={{ fontSize: '15px', color: 'white' }}>{totalTrips} Runs</strong>
        </div>
        <div className="glass-panel" style={{ padding: '12px 6px', textAlign: 'center' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Active Days</span>
          <strong style={{ fontSize: '15px', color: 'white' }}>142 Days</strong>
        </div>
      </div>

      {/* Friends List connect Panel */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '15px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Biker Crew Friends
          </h4>
          <button 
            onClick={() => setShowAddFriend(!showAddFriend)}
            style={{ fontSize: '11px', background: 'rgba(255,85,0,0.1)', color: 'var(--primary)', border: '1px solid rgba(255,85,0,0.2)', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {showAddFriend ? 'Close' : '+ Add'}
          </button>
        </div>

        {showAddFriend && (
          <form onSubmit={handleAddFriend} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px' }} className="animate-zoom-in">
            <input 
              type="text" 
              placeholder="Friend's Full Name" 
              value={newFriendName}
              onChange={(e) => setNewFriendName(e.target.value)}
              required
              style={{ fontSize: '11px', padding: '6px 10px', background: '#1c1c24' }}
            />
            <input 
              type="text" 
              placeholder="Bike Machine Model (e.g. Pulsar N160)" 
              value={newFriendBike}
              onChange={(e) => setNewFriendBike(e.target.value)}
              style={{ fontSize: '11px', padding: '6px 10px', background: '#1c1c24' }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '6px' }}>
              Add to Crew
            </button>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {friends.map((f) => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1.5px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
                  {f.name[0]}
                </div>
                <div>
                  <strong style={{ fontSize: '12px', color: 'white', display: 'block' }}>{f.name}</strong>
                  <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{f.bike}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', color: f.status === 'Riding' ? 'var(--secondary)' : f.status === 'Online' ? 'var(--success)' : 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {f.status}
                </span>
                <button 
                  onClick={() => setActiveChatFriend(f)}
                  style={{ background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(255,85,0,0.2)' }}
                  title={`Chat with ${f.name}`}
                >
                  <MessageSquare size={13} color="white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Virtual Garage */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '15px', color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bike size={16} color="var(--primary)" /> Virtual Garage
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {garage.map((bike) => {
            const isActive = activeBike === bike.name;
            return (
              <div 
                key={bike.name} 
                onClick={() => setActiveBike(bike.name)}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '10px 12px', 
                  background: isActive ? 'rgba(255,85,0,0.06)' : 'rgba(0,0,0,0.15)',
                  border: isActive ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <strong style={{ fontSize: '12px', color: 'white', display: 'block' }}>{bike.name}</strong>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{bike.number} • {bike.type}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isActive ? (
                    <span style={{ fontSize: '10px', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Active</span>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveBike(bike.name); }} 
                      style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleAddBike} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Bike Name (e.g. Duke 390)" 
            value={newBikeName}
            onChange={(e) => setNewBikeName(e.target.value)}
            style={{ flex: 1.5, padding: '8px 10px', fontSize: '11px', background: '#1c1c24' }}
          />
          <input 
            type="text" 
            placeholder="Plate Num" 
            value={newBikeNumber}
            onChange={(e) => setNewBikeNumber(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', fontSize: '11px', background: '#1c1c24' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '8px 12px', borderRadius: '8px' }}>
            <Plus size={14} />
          </button>
        </form>
      </div>

      {/* Achievement Badges */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '15px', color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={16} color="var(--secondary)" /> Unlocked Badges
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {badges.map((b, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ fontSize: '24px' }}>{b.icon}</div>
              <div>
                <strong style={{ fontSize: '12px', color: 'white', display: 'block' }}>{b.title}</strong>
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', lineHeight: '1.2', display: 'block', marginTop: '2px' }}>{b.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency SOS Setup */}
      <div className="glass-panel" style={{ padding: '16px', borderLeft: '3px solid var(--accent)', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '15px', color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} /> Emergency SOS Contacts
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {emergencyContacts.map((c) => (
            <div key={c.phone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <strong style={{ fontSize: '12px', color: 'white', display: 'block' }}>{c.name}</strong>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{c.phone}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={() => triggerCall(c)} style={{ color: 'var(--success)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <PhoneCall size={14} />
                </button>
                <button onClick={() => handleRemoveContact(c.phone)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddContact} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Contact Name" 
            value={newContactName}
            onChange={(e) => setNewContactName(e.target.value)}
            style={{ flex: 1.2, padding: '8px 10px', fontSize: '11px', background: '#1c1c24' }}
          />
          <input 
            type="tel" 
            placeholder="Phone Number" 
            value={newContactPhone}
            onChange={(e) => setNewContactPhone(e.target.value)}
            style={{ flex: 1.5, padding: '8px 10px', fontSize: '11px', background: '#1c1c24' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '8px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--accent) 0%, #aa0011 100%)', boxShadow: 'none' }}>
            <Plus size={14} />
          </button>
        </form>
      </div>

      {/* Contact Developer Section */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px', border: '1px solid rgba(255, 170, 0, 0.15)' }}>
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
            <button
              onClick={() => { setDevSent(false); setDevName(''); setDevMobile(''); }}
              style={{ marginTop: '10px', fontSize: '11px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Send another message
            </button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!devName.trim() || devMobile.replace(/\D/g, '').length < 10) {
                setLocalToast('⚠️ Please enter a valid name and 10-digit mobile number.');
                return;
              }
              setLoading && null; // no-op
              try {
                const { error } = await supabase.from('dev_contacts').insert({
                  name: devName.trim(),
                  mobile: devMobile.trim(),
                  email: user?.email || 'Unknown',
                  user_id: user?.uid || null,
                  is_read: false
                });
                if (error) {
                  console.error('Supabase insert error:', error.message);
                  setLocalToast('⚠️ Could not send message. Please try again.');
                  return;
                }
                setDevSent(true);
                setLocalToast('📨 Your message has been sent to the developer!');
              } catch (err) {
                setLocalToast('⚠️ Network error. Please try again.');
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Your Full Name"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 12px', fontSize: '13px', background: '#1c1c24', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="tel"
                placeholder="Working Mobile Number (10 digits)"
                value={devMobile}
                onChange={(e) => setDevMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                style={{ width: '100%', padding: '10px 12px', fontSize: '13px', background: '#1c1c24', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #ffaa00, #ff7700)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Send size={14} /> Send to Developer
            </button>
          </form>
        )}
      </div>

      {/* Logout */}
      <div style={{ marginBottom: '10px' }}>
        <button 
          onClick={onLogout}
          className="btn-secondary" 
          style={{ width: '100%', borderColor: 'rgba(255,34,51,0.2)', color: 'var(--accent)', gap: '8px', cursor: 'pointer' }}
        >
          <LogOut size={16} /> Sign Out of Helpriderss
        </button>
      </div>

      {/* MODAL: Crew Friend Messaging Chat Session */}
      {activeChatFriend && (
        <div className="bottom-sheet-overlay animate-fade-in" style={{ zIndex: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-zoom-in" style={{ width: '92%', maxWidth: '360px', height: '460px', padding: '0', background: 'rgba(18,18,24,0.98)', borderColor: 'var(--primary)', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Chat Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                  {activeChatFriend.name[0]}
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: 'white', display: 'block' }}>{activeChatFriend.name}</strong>
                  <span style={{ fontSize: '9px', color: 'var(--success)' }}>Active Chat Session</span>
                </div>
              </div>
              <button 
                onClick={() => setActiveChatFriend(null)} 
                style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Display Box */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(chats[activeChatFriend.id] || []).length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                  <MessageSquare size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <span>No messages. Say hello to {activeChatFriend.name.split(' ')[0]}!</span>
                </div>
              ) : (
                (chats[activeChatFriend.id] || []).map((msg) => {
                  const isYou = msg.sender === 'you';
                  return (
                    <div 
                      key={msg.id} 
                      style={{ 
                        alignSelf: isYou ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        padding: '10px 12px',
                        background: isYou ? 'linear-gradient(135deg, var(--primary) 0%, #cc4400 100%)' : 'rgba(255,255,255,0.04)',
                        border: isYou ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: isYou ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        color: 'white',
                        fontSize: '12px',
                        lineHeight: '1.4',
                        boxShadow: isYou ? '0 4px 12px rgba(255,85,0,0.15)' : 'none'
                      }}
                    >
                      {formatChatMessage(msg.text)}
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Message input bar */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <input 
                type="text" 
                placeholder="Type location, links or messages..." 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', fontSize: '12px', background: '#121216', color: 'white', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}
              />
              <button 
                type="submit" 
                style={{ background: 'var(--primary)', border: 'none', borderRadius: '12px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Send size={14} color="white" />
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Floating Local Toast Banner */}
      {localToast && (
        <div 
          className="animate-slide-up"
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '16px',
            right: '16px',
            zIndex: 300,
            background: 'rgba(18, 18, 22, 0.96)',
            border: '1.5px solid var(--primary)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 32px rgba(255, 85, 0, 0.35)',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '13px'
          }}
        >
          <span style={{ fontSize: '16px' }}>🏍️</span>
          <span>{localToast}</span>
        </div>
      )}

      {/* Spacer */}
      <div style={{ height: '40px' }} />

    </div>
  );
}
