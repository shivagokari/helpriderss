import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { 
  Home, PlusCircle, History, Map, User, Users, X, Info, 
  Download, Navigation, CheckCircle, ShieldAlert, Sparkles, Bell, Phone
} from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import HomeDashboard from './components/HomeDashboard';
import { generateGoogleMapsLink } from './utils/geo';
import { supabase } from './utils/supabase';

// Lazily load heavier sub-screens and modals for code splitting and faster initial load
const NewRideWizard = lazy(() => import('./components/NewRideWizard'));
const MyRides = lazy(() => import('./components/MyRides'));
const LetsRide = lazy(() => import('./components/LetsRide'));
const Profile = lazy(() => import('./components/Profile'));

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('helpriders_session') || sessionStorage.getItem('helpriders_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse saved session", e);
      }
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState('home');
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [newRideOpen, setNewRideOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showDevNotifications, setShowDevNotifications] = useState(false);
  const [devContacts, setDevContacts] = useState([]);
  
  // Custom slide-up sheet drawers
  const [briefingSheetRide, setBriefingSheetRide] = useState(null);
  const [replaySheetRide, setReplaySheetRide] = useState(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  // Check and show welcome popup for new signups
  useEffect(() => {
    if (user) {
      const firstLogin = localStorage.getItem('helpriders_first_login');
      if (firstLogin === 'true') {
        setShowWelcomePopup(true);
      }
    }
  }, [user]);

  const handleCloseWelcome = () => {
    setShowWelcomePopup(false);
    localStorage.removeItem('helpriders_first_login');
  };

  // User-created rides list state (persisted dynamically)
  const [customRides, setCustomRides] = useState(() => {
    const saved = localStorage.getItem('helpriders_custom_rides');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse saved rides", e);
      }
    }
    return [];
  });

  const [editingRide, setEditingRide] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Persist custom rides to localStorage
  useEffect(() => {
    localStorage.setItem('helpriders_custom_rides', JSON.stringify(customRides));
  }, [customRides]);

  // Silently check and verify the Supabase session in the background
  useEffect(() => {
    if (user) {
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          if (!session) {
            console.log('[Auth] Cached session expired or invalid in Supabase');
            handleLogout();
          }
        })
        .catch(err => {
          console.warn('[Auth] Background session verification failed (possibly offline):', err.message);
        });
    }
  }, []);

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

  // Load dev contacts from Supabase whenever admin opens notifications or profile tab
  useEffect(() => {
    if (!user) return;
    const isAdminUser = user?.email === 'admin@helpriderss.com' || user?.level === 'System Administrator';
    if ((activeTab === 'profile' || showDevNotifications) && isAdminUser) {
      supabase
        .from('dev_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) setDevContacts(data);
        });
    }
  }, [activeTab, showDevNotifications, user]);

  const isAdmin = user?.email === 'admin@helpriderss.com' || user?.level === 'System Administrator';
  const unreadDevCount = devContacts.filter(c => !c.is_read).length;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Failed to sign out from Supabase Auth:", e);
    }
    localStorage.removeItem('helpriders_session');
    sessionStorage.removeItem('helpriders_session');
    localStorage.removeItem('helpriders_custom_rides');
    localStorage.removeItem('helpriders_reminders');
    localStorage.removeItem('helpriders_essentials');
    localStorage.removeItem('helpriders_ride_ratings');
    localStorage.removeItem('helpriders_first_login');
    localStorage.removeItem('helpriders_custom_bikes');
    localStorage.removeItem('helpriders_last_dev_contact');
    localStorage.removeItem('helpriders_weather_cache');
    setCustomRides([]);
    setUser(null);
    setActiveTab('home');
  };

  const handleSaveRide = (newRide) => {
    const isEdit = customRides.some(r => r.id === newRide.id);
    
    const enrichedRide = {
      ...newRide,
      status: 'Upcoming',
      duration: '8h 45m',
      isFavorite: newRide.isFavorite || false,
      photos: newRide.photos || ['🏍️ Planned Map', '📍 Checklist'],
      pathPoints: newRide.pathPoints || 'M 30,110 C 130,20 180,180 250,90 T 370,120'
    };

    if (isEdit) {
      setCustomRides(prev => prev.map(r => r.id === newRide.id ? enrichedRide : r));
      setToastMessage('✏️ Ride successfully updated!');
    } else {
      setCustomRides(prev => [enrichedRide, ...prev]);
      setToastMessage('🎉 Ride successfully added!');
    }

    setEditingRide(null);
    setNewRideOpen(false);
    setActiveTab('my-rides');
    
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  const handleDeleteRide = (rideId) => {
    setCustomRides(prev => prev.filter(r => r.id !== rideId));
    setToastMessage('🗑️ Ride deleted successfully!');
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleCompleteRide = (rideId) => {
    setCustomRides(prev => prev.map(r => r.id === rideId ? { ...r, status: 'Completed' } : r));
    setToastMessage('🎉 Ride successfully completed!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleToggleFavorite = (rideId) => {
    setCustomRides(prev => prev.map(r => {
      if (r.id === rideId) {
        const nextFav = !r.isFavorite;
        setToastMessage(nextFav ? '❤️ Added to favorites!' : '💔 Removed from favorites!');
        setTimeout(() => setToastMessage(''), 2500);
        return { ...r, isFavorite: nextFav };
      }
      return r;
    }));
  };



  // Request GPS mock permission status
  useEffect(() => {
    if (user && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => console.log('[GPS] Access granted'),
        () => console.warn('[GPS] Access denied - using mock backup coordinates')
      );
    }
  }, [user]);

  // Scroll detection to auto-hide bottom navigation bar
  const lastScrollTop = useRef(0);
  useEffect(() => {
    const handleScroll = (event) => {
      const target = event.target;
      if (target && target.classList && target.classList.contains('scroll-y')) {
        const scrollTop = target.scrollTop;
        if (scrollTop > lastScrollTop.current && scrollTop > 50) {
          setShowBottomNav(false);
        } else {
          setShowBottomNav(true);
        }
        lastScrollTop.current = scrollTop;
      }
    };

    window.addEventListener('scroll', handleScroll, { capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  // Show bottom nav on tab changes
  useEffect(() => {
    setShowBottomNav(true);
  }, [activeTab]);

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
      <div className="app-content" style={{ flex: 1, position: 'relative', height: 'calc(100% - 72px)', overflow: 'hidden' }}>
        <Suspense fallback={
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d12' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid transparent', borderTopColor: '#ff5500', borderRadius: '50%', animation: 'dash 1s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading crew deck...</p>
            </div>
          </div>
        }>
          {activeTab === 'home' && (
            <HomeDashboard 
              user={user} 
              onTabChange={setActiveTab} 
              onOpenDetails={setBriefingSheetRide} 
              openWizard={() => setNewRideOpen(true)}
              rides={customRides}
            />
          )}
          
          {activeTab === 'my-rides' && (
            <MyRides 
              rides={customRides} 
              onOpenReplay={(ride) => {
                setReplaySheetRide(ride);
                setIsReplaying(true);
              }} 
              onEditRide={(ride) => {
                setEditingRide(ride);
                setNewRideOpen(true);
              }}
              onDeleteRide={handleDeleteRide}
              onToggleFavoriteRide={handleToggleFavorite}
              onCompleteRide={handleCompleteRide}
            />
          )}
          
          {activeTab === 'lets-ride' && <LetsRide user={user} />}
          
          {activeTab === 'profile' && (
            <Profile user={user} onLogout={handleLogout} rides={customRides} />
          )}
        </Suspense>
      </div>

      {/* Floating Action Button (Quick New Ride Wizard Trigger) */}
      {activeTab !== 'profile' && activeTab !== 'lets-ride' && (
        <button 
          className="fab" 
          onClick={() => setNewRideOpen(true)}
          title="Plan new ride"
          style={{
            bottom: showBottomNav ? '85px' : '20px',
            transition: 'bottom 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
          }}
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
          paddingBottom: 'env(safe-area-inset-bottom)', // For notched mobile devices
          transform: showBottomNav ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
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
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-secondary)', position: 'relative' }}
        >
          <User size={20} />
          {isAdmin && unreadDevCount > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-2px', background: 'var(--accent)', color: 'white', fontSize: '8px', fontWeight: 'bold', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #0a0a0c' }}>
              {unreadDevCount}
            </span>
          )}
          <span style={{ fontSize: '9px', fontWeight: activeTab === 'profile' ? 'bold' : 'normal' }}>Profile</span>
        </button>
      </nav>

      {/* FULL SCREEN MODAL: New Ride Wizard */}
      {newRideOpen && (
        <Suspense fallback={
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d12' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid transparent', borderTopColor: '#ff5500', borderRadius: '50%', animation: 'dash 1s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Opening planner...</p>
            </div>
          </div>
        }>
          <NewRideWizard 
            onClose={() => {
              setNewRideOpen(false);
              setEditingRide(null);
            }} 
            onSaveRide={handleSaveRide} 
            editingRide={editingRide}
          />
        </Suspense>
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
                      setToastMessage('📈 GPX activity log shared to Strava & Feed!');
                      setTimeout(() => setToastMessage(''), 3500);
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

      {/* ADMIN: Developer Reachout Notifications Drawer */}
      {isAdmin && showDevNotifications && (
        <div className="bottom-sheet-overlay animate-fade-in" onClick={() => setShowDevNotifications(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '75%' }}>
            <div className="bottom-sheet-handle"></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px 0', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} color="#ffaa00" /> Developer Reachout
                {unreadDevCount > 0 && <span style={{ background: 'var(--accent)', color: 'white', fontSize: '9px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px' }}>{unreadDevCount} new</span>}
              </h3>
              <button onClick={() => setShowDevNotifications(false)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div className="bottom-sheet-content">
              {devContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <Bell size={32} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                  <p style={{ fontSize: '13px' }}>No developer contact requests yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {devContacts.map((c, idx) => (
                    <div key={c.id} style={{ background: c.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(255,170,0,0.05)', border: c.is_read ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,170,0,0.2)', borderRadius: '12px', padding: '12px 14px' }}>
                      {!c.is_read && <span style={{ fontSize: '9px', background: '#ffaa00', color: 'black', padding: '1px 6px', borderRadius: '6px', fontWeight: 'bold', marginBottom: '6px', display: 'inline-block' }}>NEW</span>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '14px', color: 'white', display: 'block' }}>{c.name}</strong>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <Phone size={12} color="var(--primary)" />
                            <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 'bold' }}>{c.mobile}</span>
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{c.email}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>📅 {new Date(c.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        </div>
                        <button
                          onClick={async () => {
                            await supabase.from('dev_contacts').update({ is_read: true }).eq('id', c.id);
                            const updated = devContacts.map((d, i) => i === idx ? { ...d, is_read: true } : d);
                            setDevContacts(updated);
                          }}
                          style={{ fontSize: '10px', color: c.is_read ? 'var(--text-muted)' : 'var(--success)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0 }}
                        >
                          {c.is_read ? '✓ Read' : 'Mark Read'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={async () => {
                      await supabase.from('dev_contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                      setDevContacts([]);
                    }}
                    style={{ width: '100%', padding: '10px', background: 'rgba(255,34,51,0.08)', color: 'var(--accent)', border: '1px solid rgba(255,34,51,0.15)', borderRadius: '10px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Clear All Notifications
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom In-App Toast Notification */}
      {toastMessage && (
        <div 
          className="animate-slide-up"
          style={{
            position: 'absolute',
            bottom: '90px',
            left: '16px',
            right: '16px',
            zIndex: 200,
            background: 'rgba(18, 18, 22, 0.95)',
            border: '1.5px solid var(--primary)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 32px rgba(255, 85, 0, 0.25)',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '13px'
          }}
        >
          <span style={{ fontSize: '18px' }}>🏍️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Welcome Rider Popup */}
      {showWelcomePopup && (
        <div 
          className="bottom-sheet-overlay animate-fade-in" 
          style={{ 
            zIndex: 300, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '20px',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(5, 5, 8, 0.85)'
          }}
          onClick={handleCloseWelcome}
        >
          <div 
            className="glass-panel animate-zoom-in" 
            style={{ 
              width: '100%', 
              maxWidth: '340px', 
              padding: '32px 24px', 
              textAlign: 'center', 
              background: 'rgba(18, 18, 22, 0.98)', 
              border: '1.5px solid rgba(255, 85, 0, 0.4)', 
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 85, 0, 0.15)',
              borderRadius: '20px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              style={{ 
                width: '72px', 
                height: '72px', 
                margin: '0 auto 20px', 
                background: 'rgba(255, 85, 0, 0.1)', 
                border: '1.5px solid rgba(255, 85, 0, 0.3)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}
            >
              <Sparkles size={36} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 85, 0, 0.5))' }} />
            </div>

            <h2 style={{ fontSize: '22px', color: 'white', marginBottom: '10px', fontFamily: 'var(--font-display)', fontWeight: '800' }}>
              Welcome Rider!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: '1.6', marginBottom: '24px' }}>
              I hope you do more safe rides.
            </p>

            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '12px', fontSize: '14px', borderRadius: '12px', fontWeight: 'bold' }}
              onClick={handleCloseWelcome}
            >
              Let's Ride 🏍️
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
