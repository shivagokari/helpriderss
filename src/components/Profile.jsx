import React, { useState } from 'react';
import { 
  User, Award, Bike, PhoneCall, ShieldAlert, 
  Settings, LogOut, ChevronRight, Check, Plus, Trash2, Heart
} from 'lucide-react';

export default function Profile({ user, onLogout }) {
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

  const badges = [
    { title: 'Highway King', desc: 'Covered 1000+ KM on expressways', icon: '👑', color: '#ffaa00' },
    { title: 'Curve Carver', desc: 'Completed 15 mountain pass twisties', icon: '⛰️', color: '#00e676' },
    { title: 'Night Owl', desc: 'Logged 10 midnight rally miles', icon: '🌙', color: '#00b0ff' },
    { title: 'Monsoon Shield', desc: 'Ridden 200+ KM under wet rainfall alerts', icon: '🌧️', color: '#ff2233' },
  ];

  const handleAddBike = (e) => {
    e.preventDefault();
    if (!newBikeName) return;
    setGarage([...garage, { name: newBikeName, number: newBikeNumber || 'MH-12-TEMP', type: 'Cruiser' }]);
    setNewBikeName('');
    setNewBikeNumber('');
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
  };

  const handleRemoveContact = (phone) => {
    setEmergencyContacts(emergencyContacts.filter(c => c.phone !== phone));
  };

  const triggerCall = (contact) => {
    alert(`Calling ${contact.name} (${contact.phone}) via phone integration...`);
  };

  return (
    <div className="profile-section scroll-y" style={{ padding: '20px 16px' }}>
      
      {/* Profile Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }} className="animate-fade-in">
        <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 12px' }}>
          <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: 'white', border: '3px solid var(--bg-tertiary)', boxShadow: '0 8px 25px rgba(255, 85, 0, 0.25)' }}>
            {(user?.displayName || 'G')[0].toUpperCase()}
          </div>
          <div style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--primary)', border: '2px solid var(--bg-primary)', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }} title="Pro Biker Subscription Unlocked">
            Pro
          </div>
        </div>
        <h2 style={{ fontSize: '22px', color: 'white' }}>{user?.displayName || 'GhostRider'}</h2>
        <span style={{ fontSize: '12px', background: 'rgba(255,170,0,0.1)', color: 'var(--secondary)', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', marginTop: '6px', display: 'inline-block' }}>
          🏆 Apex Rider Level
        </span>
      </div>

      {/* Stats Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        <div className="glass-panel" style={{ padding: '12px 6px', textAlign: 'center' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>KMs Ridden</span>
          <strong style={{ fontSize: '15px', color: 'white' }}>4,820 KM</strong>
        </div>
        <div className="glass-panel" style={{ padding: '12px 6px', textAlign: 'center' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Trips Done</span>
          <strong style={{ fontSize: '15px', color: 'white' }}>28 Runs</strong>
        </div>
        <div className="glass-panel" style={{ padding: '12px 6px', textAlign: 'center' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Active Days</span>
          <strong style={{ fontSize: '15px', color: 'white' }}>142 Days</strong>
        </div>
      </div>

      {/* Subscription Card */}
      <div className="glass-panel" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(255,170,0,0.15) 0%, rgba(18,18,22,0.85) 100%)', borderColor: 'rgba(255,170,0,0.3)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h4 style={{ fontSize: '15px', color: 'white' }}>Rider Pro Membership</h4>
          <span style={{ fontSize: '10px', background: 'var(--secondary)', color: 'black', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>ACTIVE</span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Offline map caching, unlimited AI ride wizard generation, and automatic emergency SMS alerts are active. Next renewal: June 28, 2026.
        </p>
      </div>

      {/* Virtual Garage */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '15px', color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bike size={16} color="var(--primary)" /> Virtual Garage
        </h4>
        
        {/* Bike list */}
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
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add bike mini form */}
        <form onSubmit={handleAddBike} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Bike Name (e.g. Duke 390)" 
            value={newBikeName}
            onChange={(e) => setNewBikeName(e.target.value)}
            style={{ flex: 1.5, padding: '8px 10px', fontSize: '11px' }}
          />
          <input 
            type="text" 
            placeholder="Plate Num" 
            value={newBikeNumber}
            onChange={(e) => setNewBikeNumber(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', fontSize: '11px' }}
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

        {/* Contacts list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {emergencyContacts.map((c) => (
            <div key={c.phone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <strong style={{ fontSize: '12px', color: 'white', display: 'block' }}>{c.name}</strong>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{c.phone}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={() => triggerCall(c)} style={{ color: 'var(--success)' }}>
                  <PhoneCall size={14} />
                </button>
                <button onClick={() => handleRemoveContact(c.phone)} style={{ color: 'var(--text-muted)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add contact form */}
        <form onSubmit={handleAddContact} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Contact Name" 
            value={newContactName}
            onChange={(e) => setNewContactName(e.target.value)}
            style={{ flex: 1.2, padding: '8px 10px', fontSize: '11px' }}
          />
          <input 
            type="tel" 
            placeholder="Phone Number" 
            value={newContactPhone}
            onChange={(e) => setNewContactPhone(e.target.value)}
            style={{ flex: 1.5, padding: '8px 10px', fontSize: '11px' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '8px 12px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--accent) 0%, #aa0011 100%)', boxShadow: 'none' }}>
            <Plus size={14} />
          </button>
        </form>
      </div>

      {/* Account Settings / Logout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={() => alert('App cache optimized. Storage usage: 4.8MB. Settings saved.')}
          style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>Advanced Application Settings</span>
          <ChevronRight size={14} />
        </button>
        <button 
          onClick={onLogout}
          className="btn-secondary" 
          style={{ width: '100%', borderColor: 'rgba(255,34,51,0.2)', color: 'var(--accent)', gap: '8px' }}
        >
          <LogOut size={16} /> Sign Out of Helpriderss
        </button>
      </div>

      {/* Spacer */}
      <div style={{ height: '40px' }} />

    </div>
  );
}
