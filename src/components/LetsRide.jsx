import React, { useState, useEffect } from 'react';
import { 
  Users, MapPin, Calendar, Clock, PlusCircle, AlertTriangle, 
  CheckCircle, MessageSquare, Phone, Bike, Compass, X, ShieldAlert 
} from 'lucide-react';
import { BIKES_DATABASE } from '../utils/geo';

export default function LetsRide() {
  const [rides, setRides] = useState([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  
  // New Ride Form State
  const [newRide, setNewRide] = useState({
    title: '',
    route: '',
    date: '',
    time: '',
    distance: '',
    bikeType: 'All Bikes Welcome',
    description: ''
  });

  // Join Ride Form State
  const [joinForm, setJoinForm] = useState({
    name: '',
    bikeModel: '',
    phone: '',
    age: '',
    crewType: 'Solo'
  });

  const [notifications, setNotifications] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  // Load rides & notifications from localStorage or seed defaults
  useEffect(() => {
    const savedRides = localStorage.getItem('helpriders_social_rides');
    const defaultRides = [
      {
        id: 'social-1',
        creator: 'Rahul Sharma',
        creatorPhone: '+91 98765 43210',
        title: 'Sunday Morning Cruise to Yadagirigutta',
        route: 'Hyderabad ➔ Yadagirigutta Temple',
        date: '2026-05-31',
        time: '05:30 AM',
        distance: '65 KM',
        bikeType: 'Cruisers & Commuters',
        description: 'Planning a relaxed breakfast ride. Riding at a comfortable pace of 70-80 km/h. Meetup at Uppal Metro Station.',
        joinedCount: 4,
        joinRequests: [
          { name: 'Karthik Kumar', bikeModel: 'Bajaj Pulsar N160', phone: '+91 91234 56789', age: '24', crewType: 'Solo' },
          { name: 'Srinivas Rao', bikeModel: 'Honda Unicorn', phone: '+91 82345 67890', age: '32', crewType: 'Duo' }
        ]
      },
      {
        id: 'social-2',
        creator: 'Vikram Singh',
        creatorPhone: '+91 87654 32109',
        title: 'Monsoon Ghat Ride to Srisailam Dam',
        route: 'Secunderabad ➔ Nallamala Forest ➔ Srisailam',
        date: '2026-06-03',
        time: '04:30 AM',
        distance: '315 KM',
        bikeType: '150cc+ Adventure/Sports',
        description: 'Scenic highway ride through Nallamala forest reserve. Please wear full safety gears. Rain coats are mandatory.',
        joinedCount: 8,
        joinRequests: []
      }
    ];

    if (savedRides) {
      setRides(JSON.parse(savedRides));
    } else {
      setRides(defaultRides);
      localStorage.setItem('helpriders_social_rides', JSON.stringify(defaultRides));
    }
  }, []);

  const saveRidesToStorage = (updatedRides) => {
    setRides(updatedRides);
    localStorage.setItem('helpriders_social_rides', JSON.stringify(updatedRides));
  };

  const handlePostInputChange = (field, val) => {
    setNewRide(prev => ({ ...prev, [field]: val }));
  };

  const handleJoinInputChange = (field, val) => {
    setJoinForm(prev => ({ ...prev, [field]: val }));
  };

  // Submit Post a Ride
  const handlePostSubmit = (e) => {
    e.preventDefault();
    if (!newRide.title || !newRide.route || !newRide.date || !newRide.time) {
      showToast('⚠️ Please fill out all required details.');
      return;
    }

    const createdRide = {
      id: 'social-' + Date.now(),
      creator: 'You (Host)',
      creatorPhone: '+91 99009 90099',
      ...newRide,
      joinedCount: 1,
      joinRequests: []
    };

    const updated = [createdRide, ...rides];
    saveRidesToStorage(updated);
    setShowPostModal(false);
    
    // Reset Form
    setNewRide({
      title: '',
      route: '',
      date: '',
      time: '',
      distance: '',
      bikeType: 'All Bikes Welcome',
      description: ''
    });

    showToast('🏍️ Ride posted successfully to community feed!');
  };

  // Trigger Safety Modal before Join Submission
  const handleJoinClick = (ride) => {
    setSelectedRide(ride);
    setShowJoinModal(true);
  };

  const handleJoinSubmitAttempt = (e) => {
    e.preventDefault();
    if (!joinForm.name || !joinForm.bikeModel || !joinForm.phone || !joinForm.age) {
      showToast('⚠️ Please fill out all details correctly.');
      return;
    }
    // Show safety popup warning first
    setShowSafetyModal(true);
  };

  // Confirm Join and submit
  const handleConfirmSafetyAndJoin = () => {
    setShowSafetyModal(false);
    setShowJoinModal(false);

    const updated = rides.map(r => {
      if (r.id === selectedRide.id) {
        const requests = r.joinRequests ? [...r.joinRequests] : [];
        requests.push({ ...joinForm });
        return {
          ...r,
          joinedCount: r.joinedCount + 1,
          joinRequests: requests
        };
      }
      return r;
    });

    saveRidesToStorage(updated);

    // Create a notification for the ride plan creator showing all the details
    const newNotification = {
      id: 'notif-' + Date.now(),
      rideTitle: selectedRide.title,
      creatorName: selectedRide.creator,
      joinerName: joinForm.name,
      joinerPhone: joinForm.phone,
      joinerBike: joinForm.bikeModel,
      joinerAge: joinForm.age,
      joinerCrew: joinForm.crewType
    };

    setNotifications(prev => [newNotification, ...prev]);
    setActiveNotification(newNotification);

    // Reset join form
    setJoinForm({
      name: '',
      bikeModel: '',
      phone: '',
      age: '',
      crewType: 'Solo'
    });
  };

  return (
    <div className="lets-ride-section scroll-y" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Social Connect</span>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Let's Ride <Compass size={22} color="var(--primary)" />
          </h2>
        </div>
        <button 
          className="btn-primary" 
          style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => setShowPostModal(true)}
        >
          <PlusCircle size={16} /> Post a Ride
        </button>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', marginTop: '-10px' }}>
        Don't ride alone! Explore rides posted by other community members, or post your own trip plan to gather a crew.
      </p>

      {/* Ride Creator Notifications Banner */}
      {activeNotification && (
        <div className="glass-panel animate-zoom-in" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(0, 230, 118, 0.15) 0%, rgba(10, 10, 12, 0.95) 100%)', borderColor: 'var(--success)', position: 'relative' }}>
          <button 
            onClick={() => setActiveNotification(null)} 
            style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
          <h4 style={{ fontSize: '13px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 'bold' }}>
            🔔 New Join Request Notification
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Biker <strong style={{ color: 'white' }}>{activeNotification.joinerName}</strong> wants to join your ride: 
            <span style={{ color: 'var(--primary)', display: 'block', margin: '4px 0', fontWeight: 'bold' }}>"{activeNotification.rideTitle}"</span>
          </p>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', fontSize: '11px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>🏍️ <strong>Bike Model</strong>: {activeNotification.joinerBike}</div>
            <div>📞 <strong>Contact No</strong>: {activeNotification.joinerPhone}</div>
            <div>👤 <strong>Age</strong>: {activeNotification.joinerAge} | <strong>Mode</strong>: {activeNotification.joinerCrew}</div>
          </div>
          <p style={{ fontSize: '10px', color: 'var(--success)', marginTop: '8px', fontStyle: 'italic' }}>
            * This notification is sent directly to the ride plan creator ({activeNotification.creatorName}) to contact the rider.
          </p>
        </div>
      )}

      {/* Feed List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
        <h3 style={{ fontSize: '16px', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>Active Ride Posts</h3>
        
        {rides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            No rides posted yet. Be the first to post a ride!
          </div>
        ) : (
          rides.map(ride => (
            <div key={ride.id} className="glass-panel animate-fade-in" style={{ padding: '18px', background: 'linear-gradient(135deg, rgba(28,28,36,0.5) 0%, rgba(18,18,22,0.85) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', color: 'var(--primary)', background: 'rgba(255,85,0,0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                  Posted by {ride.creator}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> {ride.date}
                </span>
              </div>

              <h4 style={{ fontSize: '16px', color: 'white', fontWeight: 'bold', marginBottom: '6px' }}>{ride.title}</h4>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                <MapPin size={13} color="var(--primary)" /> {ride.route}
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '14px' }}>
                {ride.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', fontSize: '11px', marginBottom: '14px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Distance</span>
                  <div style={{ color: 'white', fontWeight: 'bold' }}>{ride.distance || 'N/A'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Bike Class</span>
                  <div style={{ color: 'white', fontWeight: 'bold' }}>{ride.bikeType}</div>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Start Time</span>
                  <div style={{ color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={10} /> {ride.time}
                  </div>
                </div>
                <div style={{ marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Joined Biker Crew</span>
                  <div style={{ color: 'var(--secondary)', fontWeight: 'bold' }}>{ride.joinedCount} Bikers</div>
                </div>
              </div>

              {/* Creator dashboard view for join requests */}
              {ride.creator === 'You (Host)' && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '12px' }}>
                  <h5 style={{ fontSize: '12px', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    👥 Join Requests ({ride.joinRequests ? ride.joinRequests.length : 0})
                  </h5>
                  {(!ride.joinRequests || ride.joinRequests.length === 0) ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No requests to join yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {ride.joinRequests.map((req, rIdx) => (
                        <div key={rIdx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', fontSize: '11px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontWeight: 'bold', marginBottom: '2px' }}>
                            <span>👤 {req.name} (Age: {req.age})</span>
                            <span style={{ color: 'var(--secondary)' }}>{req.crewType}</span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>🏍️ {req.bikeModel}</span>
                            <a href={`tel:${req.phone}`} style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}>
                              <Phone size={10} /> Call
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Join Action button for other users */}
              {ride.creator !== 'You (Host)' && (
                <button 
                  className="btn-secondary" 
                  style={{ width: '100%', fontSize: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,85,0,0.08)', borderColor: 'rgba(255,85,0,0.2)' }}
                  onClick={() => handleJoinClick(ride)}
                >
                  Join Biker Crew
                </button>
              )}

            </div>
          ))
        )}
      </div>

      {/* MODAL: Post a Ride Form */}
      {showPostModal && (
        <div className="bottom-sheet-overlay animate-fade-in" style={{ zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-zoom-in" style={{ width: '90%', maxWidth: '400px', background: '#121217', maxHeight: '90vh', overflowY: 'auto', padding: '24px 20px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusCircle size={20} color="var(--primary)" /> Post New Ride
              </h3>
              <button onClick={() => setShowPostModal(false)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePostSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Ride Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Weekend breakfast cruise to Narsapur forest"
                  value={newRide.title}
                  onChange={(e) => handlePostInputChange('title', e.target.value)}
                  style={{ width: '100%', fontSize: '13px', background: '#1c1c24' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Route Details *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Hyderabad Outer Ring Road ➔ Narsapur"
                  value={newRide.route}
                  onChange={(e) => handlePostInputChange('route', e.target.value)}
                  style={{ width: '100%', fontSize: '13px', background: '#1c1c24' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Date *</label>
                  <input 
                    type="date" 
                    required
                    value={newRide.date}
                    onChange={(e) => handlePostInputChange('date', e.target.value)}
                    style={{ width: '100%', fontSize: '13px', background: '#1c1c24' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Time *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 06:00 AM"
                    value={newRide.time}
                    onChange={(e) => handlePostInputChange('time', e.target.value)}
                    style={{ width: '100%', fontSize: '13px', background: '#1c1c24' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Est Distance (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 120 KM"
                    value={newRide.distance}
                    onChange={(e) => handlePostInputChange('distance', e.target.value)}
                    style={{ width: '100%', fontSize: '13px', background: '#1c1c24' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Bikes Preferred</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Cruiser or Open class"
                    value={newRide.bikeType}
                    onChange={(e) => handlePostInputChange('bikeType', e.target.value)}
                    style={{ width: '100%', fontSize: '13px', background: '#1c1c24' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description & Meetup Spot</label>
                <textarea 
                  rows="3"
                  placeholder="Mention meetup spot, target speeds, safety gear rules..."
                  value={newRide.description}
                  onChange={(e) => handlePostInputChange('description', e.target.value)}
                  style={{ width: '100%', fontSize: '13px', background: '#1c1c24', color: 'white', padding: '10px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', resize: 'vertical' }}
                />
              </div>

              <button className="btn-primary" type="submit" style={{ padding: '12px', fontSize: '13px', marginTop: '10px', borderRadius: '12px' }}>
                Post Ride Feed
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Join Ride Form */}
      {showJoinModal && (
        <div className="bottom-sheet-overlay animate-fade-in" style={{ zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-zoom-in" style={{ width: '90%', maxWidth: '380px', background: '#121217', padding: '24px 20px', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bike size={18} color="var(--primary)" /> Join Biker Crew Form
              </h3>
              <button onClick={() => setShowJoinModal(false)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleJoinSubmitAttempt} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Your Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Enter your name"
                  value={joinForm.name}
                  onChange={(e) => handleJoinInputChange('name', e.target.value)}
                  style={{ width: '100%', fontSize: '13px', background: '#1c1c24' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Your Bike Model</label>
                <select 
                  value={joinForm.bikeModel}
                  onChange={(e) => handleJoinInputChange('bikeModel', e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13px', background: '#1c1c24', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}
                  required
                >
                  <option value="">Select your bike</option>
                  {BIKES_DATABASE.map((b, idx) => (
                    <option key={idx} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Contact Number</label>
                <input 
                  type="tel" 
                  required
                  placeholder="e.g. +91 99999 88888"
                  value={joinForm.phone}
                  onChange={(e) => handleJoinInputChange('phone', e.target.value)}
                  style={{ width: '100%', fontSize: '13px', background: '#1c1c24' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Age</label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 26"
                    value={joinForm.age}
                    onChange={(e) => handleJoinInputChange('age', e.target.value)}
                    style={{ width: '100%', fontSize: '13px', background: '#1c1c24' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Crew Size</label>
                  <select
                    value={joinForm.crewType}
                    onChange={(e) => handleJoinInputChange('crewType', e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13px', background: '#1c1c24', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}
                  >
                    <option value="Solo">Solo Rider</option>
                    <option value="Duo">Duo (with Pillion)</option>
                  </select>
                </div>
              </div>

              <button className="btn-primary" type="submit" style={{ padding: '12px', fontSize: '13px', marginTop: '10px', borderRadius: '12px' }}>
                Continue to Submit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Safety warning before submitting */}
      {showSafetyModal && (
        <div className="bottom-sheet-overlay animate-fade-in" style={{ zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-zoom-in" style={{ width: '85%', maxWidth: '320px', padding: '24px 20px', background: '#121217', borderColor: 'var(--accent)', textAlign: 'center', boxShadow: '0 8px 32px rgba(255,34,51,0.25)', borderRadius: '20px' }}>
            <ShieldAlert size={40} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', color: 'white', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Important Biker Alert</h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '18px' }}>
              We do not ask for money for any rides. Do not pay any money to anyone. Report any member charging fee to admin.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '8px', fontSize: '12px' }} 
                onClick={() => setShowSafetyModal(false)}
              >
                Go Back
              </button>
              <button 
                className="btn-primary" 
                style={{ flex: 1.5, padding: '8px', fontSize: '12px', background: 'linear-gradient(135deg, var(--accent) 0%, #d32f2f 100%)', border: 'none', color: 'white' }} 
                onClick={handleConfirmSafetyAndJoin}
              >
                Agree & Join
              </button>
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

    </div>
  );
}
