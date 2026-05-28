import React, { useState, useEffect } from 'react';
import { 
  Home, PlusCircle, History, Map, User, Users, X, Info, 
  Download, Navigation, CheckCircle, ShieldAlert, Sparkles 
} from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import HomeDashboard from './components/HomeDashboard';
import NewRideWizard from './components/NewRideWizard';
import MyRides from './components/MyRides';
import LetsRide from './components/LetsRide';
import Profile from './components/Profile';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [newRideOpen, setNewRideOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  
  // Custom slide-up sheet drawers
  const [briefingSheetRide, setBriefingSheetRide] = useState(null);
  const [replaySheetRide, setReplaySheetRide] = useState(null);
  const [isReplaying, setIsReplaying] = useState(false);

  // User-created rides list state (persisted dynamically)
  const [customRides, setCustomRides] = useState([]);

  // Check PWA Install availability
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('[PWA] Service Worker registered: ', reg.scope))
          .catch(err => console.warn('[PWA] Service Worker registration failed: ', err));
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
      }
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    });
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('helpriders_session');
    sessionStorage.removeItem('helpriders_session');
    setUser(null);
    setActiveTab('home');
  };

  const handleSaveRide = (newRide) => {
    // Inject custom created ride from the wizard into the rides state list
    const enrichedRide = {
      ...newRide,
      status: 'Upcoming',
      duration: '8h 45m',
      isFavorite: false,
      photos: ['🏍️ Planned Map', '📍 Checklist'],
      pathPoints: 'M 30,110 C 130,20 180,180 250,90 T 370,120' // Custom SVG route line
    };
    setCustomRides(prev => [enrichedRide, ...prev]);
    // Take user to My Rides tab to see their newly planned ride
    setActiveTab('my-rides');
    
    // Send browser native notification mock
    if (Notification.permission === 'granted') {
      new Notification('Ride Planned!', {
        body: `Itinerary to ${newRide.formData.destination} is saved. Offline files synced.`,
        icon: '/logo.svg'
      });
    } else {
      alert(`🎉 Ride planned successfully! Telemetry stored locally.`);
    }
  };

  // Request notifications permission on login success
  useEffect(() => {
    if (user && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  // Request GPS mock permission status
  useEffect(() => {
    if (user && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => console.log('[GPS] Access granted'),
        () => console.warn('[GPS] Access denied - using mock backup coordinates')
      );
    }
  }, [user]);

  if (!user) {
    return (
      <div className="app-shell animate-fade-in">
        <LoginScreen onLoginSuccess={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      
      {/* Dynamic PWA Install Banner */}
      {showInstallBanner && (
        <div 
          className="glass-panel animate-slide-up" 
          style={{ 
            position: 'absolute', 
            top: '20px', 
            left: '16px', 
            right: '16px', 
            zIndex: 95, 
            padding: '12px 14px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderColor: 'rgba(255, 85, 0, 0.4)',
            background: 'rgba(18, 18, 22, 0.95)'
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Download size={18} color="var(--primary)" />
            <div>
              <strong style={{ fontSize: '11px', color: 'white', display: 'block' }}>Install Helpriderss</strong>
              <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Add to Home Screen for offline track logs.</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleInstallClick}
              className="btn-primary" 
              style={{ padding: '6px 12px', fontSize: '10px', borderRadius: '6px' }}
            >
              Add
            </button>
            <button 
              onClick={() => setShowInstallBanner(false)}
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Screen Router Box */}
      <div style={{ flex: 1, position: 'relative', height: 'calc(100% - 72px)', overflow: 'hidden' }}>
        {activeTab === 'home' && (
          <HomeDashboard 
            user={user} 
            onTabChange={setActiveTab} 
            onOpenDetails={setBriefingSheetRide} 
            openWizard={() => setNewRideOpen(true)}
          />
        )}
        
        {activeTab === 'my-rides' && (
          <MyRides 
            rides={customRides} 
            onOpenReplay={(ride) => {
              setReplaySheetRide(ride);
              setIsReplaying(true);
            }} 
          />
        )}
        
        {activeTab === 'lets-ride' && <LetsRide />}
        
        {activeTab === 'profile' && (
          <Profile user={user} onLogout={handleLogout} />
        )}
      </div>

      {/* Floating Action Button (Quick New Ride Wizard Trigger) */}
      {activeTab !== 'profile' && (
        <button 
          className="fab" 
          onClick={() => setNewRideOpen(true)}
          title="Plan new ride"
        >
          <PlusCircle size={28} />
        </button>
      )}

      {/* Bottom Navigation Menu */}
      <nav 
        className="glass-panel" 
        style={{ 
          position: 'absolute', 
          bottom: '0', 
          left: '0', 
          right: '0', 
          height: '72px', 
          borderRadius: '0', 
          borderWidth: '1px 0 0 0', 
          display: 'flex', 
          justifyContent: 'space-around', 
          alignItems: 'center', 
          padding: '0 10px',
          zIndex: 85,
          background: 'rgba(10, 10, 12, 0.95)',
          paddingBottom: 'env(safe-area-inset-bottom)' // For notched mobile devices
        }}
      >
        <button 
          onClick={() => setActiveTab('home')} 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'home' ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          <Home size={20} />
          <span style={{ fontSize: '9px', fontWeight: activeTab === 'home' ? 'bold' : 'normal' }}>Home</span>
        </button>

        <button 
          onClick={() => setNewRideOpen(true)} 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: newRideOpen ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          <PlusCircle size={20} />
          <span style={{ fontSize: '9px' }}>New Ride</span>
        </button>

        <button 
          onClick={() => setActiveTab('my-rides')} 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'my-rides' ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          <History size={20} />
          <span style={{ fontSize: '9px', fontWeight: activeTab === 'my-rides' ? 'bold' : 'normal' }}>My Rides</span>
        </button>

        <button 
          onClick={() => setActiveTab('lets-ride')} 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'lets-ride' ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          <Users size={20} />
          <span style={{ fontSize: '9px', fontWeight: activeTab === 'lets-ride' ? 'bold' : 'normal' }}>Let's Ride</span>
        </button>

        <button 
          onClick={() => setActiveTab('profile')} 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          <User size={20} />
          <span style={{ fontSize: '9px', fontWeight: activeTab === 'profile' ? 'bold' : 'normal' }}>Profile</span>
        </button>
      </nav>

      {/* FULL SCREEN MODAL: New Ride Wizard */}
      {newRideOpen && (
        <NewRideWizard 
          onClose={() => setNewRideOpen(false)} 
          onSaveRide={handleSaveRide} 
        />
      )}

      {/* SLIDE-UP SHEET: Upcoming Ride Briefing */}
      {briefingSheetRide && (
        <div className="bottom-sheet-overlay" onClick={() => setBriefingSheetRide(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-handle"></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px 0' }}>
              <h3 style={{ fontSize: '18px', color: 'white' }}>Ride Briefing</h3>
              <button onClick={() => setBriefingSheetRide(null)} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>

            <div className="bottom-sheet-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>MISSION PROTOCOL</span>
                  <h4 style={{ fontSize: '20px', color: 'white', marginTop: '2px' }}>{briefingSheetRide.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>Route: {briefingSheetRide.route || `${briefingSheetRide.startLocation} ➔ ${briefingSheetRide.destination}`}</p>
                </div>

                {/* Warning details */}
                <div style={{ display: 'flex', gap: '12px', background: 'rgba(255, 34, 51, 0.08)', border: '1px solid rgba(255, 34, 51, 0.2)', padding: '12px', borderRadius: '12px', alignItems: 'flex-start' }}>
                  <ShieldAlert color="var(--accent)" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ fontSize: '13px', color: 'white', display: 'block' }}>Altitude Acclimatization Alert</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', display: 'block', marginTop: '2px' }}>
                      Jispa to Leh crosses Taglang La (17,480 ft). Carry portable oxygen canisters. Avoid overnight halts above 11,000 ft on Day 1.
                    </span>
                  </div>
                </div>

                {/* High Altitude checklist */}
                <div>
                  <h4 style={{ fontSize: '14px', color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Info size={14} color="var(--primary)" /> Pre-Ride Logistics
                  </h4>
                  <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>Check engine coolant levels - sub-zero temps expected.</li>
                    <li>Verify inner tube spares (17" and 21" wheels).</li>
                    <li>Inner Line Permit (ILP) required for Nubra/Pangong sectors.</li>
                    <li>Save offline maps - mobile cellular network cuts out past Jispa.</li>
                  </ul>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setBriefingSheetRide(null)}>
                    Dismiss
                  </button>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1.5 }}
                    onClick={() => {
                      setBriefingSheetRide(null);
                      setActiveTab('my-rides');
                    }}
                  >
                    <Navigation size={14} /> Start Route Telemetry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-UP SHEET: Route Telemetry Replay */}
      {replaySheetRide && (
        <div className="bottom-sheet-overlay" onClick={() => { setReplaySheetRide(null); setIsReplaying(false); }}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-handle"></div>
            
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', padding: '10px 20px 0' }}>
              <h3 style={{ fontSize: '18px', color: 'white' }}>Telemetry Playback</h3>
              <button onClick={() => { setReplaySheetRide(null); setIsReplaying(false); }} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>

            <div className="bottom-sheet-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                  <span style={{ fontSize: '10px', background: 'rgba(255,170,0,0.1)', color: 'var(--secondary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>PLAYBACK ROUTE</span>
                  <h4 style={{ fontSize: '18px', color: 'white', marginTop: '4px' }}>{replaySheetRide.title}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{replaySheetRide.distance} KM • {replaySheetRide.duration} log time</p>
                </div>

                {/* Animated Replay Graphics */}
                <div style={{ background: '#08080a', padding: '10px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <svg width="100%" height="180" viewBox="0 0 400 160" style={{ background: 'radial-gradient(circle, #15151c 0%, #08080a 100%)', borderRadius: '12px' }}>
                    <path 
                      id="replay-path"
                      d={replaySheetRide.pathPoints || "M 30,80 Q 150,150 250,50 T 370,80"}
                      fill="none" 
                      stroke="rgba(255,85,0,0.1)" 
                      strokeWidth="6" 
                    />
                    <path 
                      d={replaySheetRide.pathPoints || "M 30,80 Q 150,150 250,50 T 370,80"}
                      fill="none" 
                      stroke="var(--primary)" 
                      strokeWidth="3" 
                      className={isReplaying ? "route-trail" : ""}
                    />
                    
                    {/* Start Indicator */}
                    <circle cx="30" cy={replaySheetRide.id === 'ride-101' ? 120 : replaySheetRide.id === 'ride-102' ? 50 : 90} r="5" fill="var(--success)" />
                    
                    {/* End Indicator */}
                    <circle cx="370" cy={replaySheetRide.id === 'ride-101' ? 50 : replaySheetRide.id === 'ride-102' ? 120 : 90} r="5" fill="var(--accent)" />

                    {/* Glowing Biker dot along the path */}
                    <circle r="7" fill="var(--secondary)" stroke="white" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px var(--secondary))' }}>
                      {isReplaying && (
                        <animateMotion 
                          dur="6s" 
                          repeatCount="indefinite"
                          path={replaySheetRide.pathPoints || "M 30,80 Q 150,150 250,50 T 370,80"}
                        />
                      )}
                    </circle>
                  </svg>
                </div>

                {/* Telemetry log summaries */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Peak Speed</span>
                    <strong style={{ color: 'white' }}>108 KM/H</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Average Speed</span>
                    <strong style={{ color: 'white' }}>56 KM/H</strong>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Lean Angle (Max)</span>
                    <strong style={{ color: 'var(--secondary)' }}>34° Right</strong>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Altitude Delta</span>
                    <strong style={{ color: 'white' }}>+840 MTRS</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => setIsReplaying(!isReplaying)}
                  >
                    {isReplaying ? 'Pause' : 'Resume'} Playback
                  </button>
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1.2 }}
                    onClick={() => {
                      setReplaySheetRide(null);
                      setIsReplaying(false);
                      alert('GPX activity log shared to Strava & Helpriders Feed!');
                    }}
                  >
                    Share Telemetry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
