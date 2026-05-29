import React, { useState, useEffect, useRef } from 'react';
import { 
  History, Calendar, Heart, MapPin, Gauge, Fuel, Clock, 
  DollarSign, Star, CloudSun, Film, ChevronDown, ChevronUp, Play, ExternalLink
} from 'lucide-react';
import { generateGoogleMapsLink } from '../utils/geo';

// Clean subcomponent to manage the Leaflet map lifecycle inside an expanded card list
function ReplayMap({ ride }) {
  const mapContainerRef = useRef(null);
  const mapObj = useRef(null);

  // Approximate coordinate locks for default locations
  const getCoordinates = (locName, defaultCoords) => {
    if (!locName) return defaultCoords;
    const name = locName.toLowerCase();
    if (name.includes('manali')) return [32.2396, 77.1887];
    if (name.includes('leh')) return [34.1526, 77.5771];
    if (name.includes('mumbai')) return [19.0760, 72.8777];
    if (name.includes('goa') || name.includes('panaji')) return [15.4909, 73.8278];
    if (name.includes('pune')) return [18.5204, 73.8567];
    if (name.includes('mahabaleshwar')) return [17.9220, 73.6644];
    return defaultCoords;
  };

  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    const startLoc = ride.startLocation || (ride.formData && ride.formData.startLocation) || '';
    const destLoc = ride.destination || (ride.formData && ride.formData.destination) || '';

    // Determine start and destination points
    const startPoint = getCoordinates(startLoc, [17.3850, 78.4867]);
    const endPoint = getCoordinates(destLoc, [17.9689, 79.5941]);

    // Initialize Leaflet Map
    const map = window.L.map(mapContainerRef.current, {
      center: startPoint,
      zoom: 8,
      zoomControl: false,
      attributionControl: false
    });

    // Load Google Maps Tile Layer
    window.L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    // Add Start Marker (Green)
    const startIcon = window.L.divIcon({
      className: 'start-marker-pin',
      html: '<div style="width:12px;height:12px;background:#00e676;border:2px solid white;border-radius:50%;box-shadow:0 0 8px #00e676"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
    window.L.marker(startPoint, { icon: startIcon }).addTo(map);

    // Add Destination Marker (Red)
    const endIcon = window.L.divIcon({
      className: 'end-marker-pin',
      html: '<div style="width:12px;height:12px;background:#ff2233;border:2px solid white;border-radius:50%;box-shadow:0 0 8px #ff2233"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
    window.L.marker(endPoint, { icon: endIcon }).addTo(map);

    // Draw routing Polyline
    const polyline = window.L.polyline([startPoint, endPoint], {
      color: '#ff5500',
      weight: 4,
      opacity: 0.85
    }).addTo(map);

    // Fit map view bounds to show the complete route polyline
    map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

    mapObj.current = map;

    return () => {
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, [ride]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ 
        width: '100%', 
        height: '160px', 
        borderRadius: '12px', 
        border: '1px solid rgba(255,255,255,0.06)',
        background: '#0d0d0f'
      }} 
    />
  );
}

const isRideTimePassed = (ride) => {
  if (!ride.formData || !ride.formData.rideDates) return false;
  
  const dateStr = ride.formData.rideDates;
  const timingStr = ride.formData.rideTiming || '';
  
  let endHour = 23;
  let endMinute = 59;
  
  if (timingStr.includes('Dawn')) {
    endHour = 6;
    endMinute = 0;
  } else if (timingStr.includes('Morning')) {
    endHour = 12;
    endMinute = 0;
  } else if (timingStr.includes('Afternoon')) {
    endHour = 16;
    endMinute = 0;
  } else if (timingStr.includes('Sunset') || timingStr.includes('Night')) {
    endHour = 21;
    endMinute = 0;
  }
  
  const [year, month, day] = dateStr.split('-').map(Number);
  const rideEndDateTime = new Date(year, month - 1, day, endHour, endMinute);
  const now = new Date();
  
  return now > rideEndDateTime;
};

export default function MyRides({ rides, onOpenReplay, onEditRide, onDeleteRide, onToggleFavoriteRide, onCompleteRide }) {
  const [filter, setFilter] = useState('All'); // All, Upcoming, Completed, Saved
  const [expandedRideId, setExpandedRideId] = useState(null);
  const [confirmDeleteRideId, setConfirmDeleteRideId] = useState(null);
  const [ratingModalRide, setRatingModalRide] = useState(null); // ride to rate
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [localRatings, setLocalRatings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('helpriders_ride_ratings') || '{}'); } catch { return {}; }
  });

  const saveRating = (rideId, rating) => {
    const updated = { ...localRatings, [rideId]: rating };
    setLocalRatings(updated);
    localStorage.setItem('helpriders_ride_ratings', JSON.stringify(updated));
  };


  const filteredRides = rides.filter(ride => {
    if (filter === 'All') return true;
    return ride.status === filter;
  });

  const toggleExpand = (id) => {
    setExpandedRideId(expandedRideId === id ? null : id);
  };

  return (
    <div className="my-rides scroll-y" style={{ padding: '20px 16px' }}>
      
      {/* Page Title */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History color="var(--primary)" /> Ride Ledger
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Track past, current, and planned itineraries.
        </p>
      </div>

      {/* Tabs / Filter Pills */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
        {['All', 'Upcoming', 'Completed', 'Saved'].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              background: filter === t ? 'var(--primary)' : 'var(--bg-tertiary)',
              border: '1px solid',
              borderColor: filter === t ? 'var(--primary)' : 'var(--glass-border)',
              color: filter === t ? 'white' : 'var(--text-secondary)'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Rides List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredRides.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Calendar size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '14px' }}>No rides found matching this status.</p>
          </div>
        ) : (
          filteredRides.map((ride) => {
            const isExpanded = expandedRideId === ride.id;
            return (
              <div 
                key={ride.id} 
                className="glass-panel animate-fade-in" 
                style={{ 
                  padding: '16px',
                  border: isExpanded ? '1.5px solid var(--primary)' : '1px solid var(--glass-border)',
                  background: isExpanded ? 'rgba(28,28,36,0.95)' : 'var(--glass-bg)',
                  boxShadow: isExpanded ? '0 10px 25px rgba(255, 85, 0, 0.08)' : 'var(--glass-shadow)',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Header Information */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h3 style={{ fontSize: '16px', color: 'white' }}>{ride.title}</h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleFavoriteRide) onToggleFavoriteRide(ride.id);
                        }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                      >
                        <Heart 
                          size={14} 
                          fill={ride.isFavorite ? "var(--accent)" : "none"} 
                          color={ride.isFavorite ? "var(--accent)" : "var(--text-muted)"} 
                          style={{ transition: 'all 0.2s ease' }}
                        />
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                      {ride.dates}
                    </span>
                  </div>
                  <span 
                    style={{ 
                      fontSize: '10px', 
                      fontWeight: '700', 
                      textTransform: 'uppercase',
                      padding: '2px 8px', 
                      borderRadius: '12px',
                      background: ride.status === 'Completed' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 170, 0, 0.15)',
                      color: ride.status === 'Completed' ? 'var(--success)' : 'var(--secondary)'
                    }}
                  >
                    {ride.status}
                  </span>
                </div>

                {/* Subtitle location summary */}
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '14px' }}>
                  <MapPin size={12} color="var(--primary)" /> {ride.startLocation || (ride.formData && ride.formData.startLocation) || ''} ➔ {ride.destination || (ride.formData && ride.formData.destination) || ''}
                </p>

                {/* Quick Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '10px', fontSize: '11px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '9px' }}>Distance</span>
                    <strong style={{ color: 'white' }}>{ride.distance} KM</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '9px' }}>Fuel Used</span>
                    <strong style={{ color: 'white' }}>{ride.fuelConsumption} L</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '9px' }}>Duration</span>
                    <strong style={{ color: 'white' }}>{ride.duration}</strong>
                  </div>
                </div>

                {/* Toggle details and Edit triggers */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                  <button
                    onClick={() => toggleExpand(ride.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      color: 'var(--text-secondary)',
                      fontSize: '11px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{isExpanded ? 'Hide Details' : 'Expand Route & Expenses'}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  
                  {ride.status === 'Upcoming' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isRideTimePassed(ride) && ride.status !== 'Completed' && onCompleteRide && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRatingModalRide(ride);
                            setSelectedRating(0);
                            setHoverRating(0);
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: '10px',
                            borderRadius: '6px',
                            background: 'rgba(0, 230, 118, 0.1)',
                            border: '1px solid rgba(0, 230, 118, 0.25)',
                            color: 'var(--success)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontWeight: '600'
                          }}
                        >
                          ✓ Mark Completed
                        </button>
                      )}
                      {onEditRide && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditRide(ride);
                          }}
                          style={{
                            padding: '4px 10px',
                            fontSize: '10px',
                            borderRadius: '6px',
                            background: 'rgba(255, 85, 0, 0.1)',
                            border: '1px solid rgba(255, 85, 0, 0.25)',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontWeight: '600'
                          }}
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Details section */}
                {isExpanded && (
                  <div className="animate-zoom-in" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    {/* Google Maps Render in Card */}
                    <div style={{ background: '#0a0a0c', padding: '14px 10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>📡 Google Maps Telemetry Replay</span>
                        <a 
                          href={ride.mapsLink || generateGoogleMapsLink(ride.startLocation || (ride.formData && ride.formData.startLocation) || '', ride.destination || (ride.formData && ride.formData.destination) || '')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary" 
                          style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '9px', gap: '4px', textDecoration: 'none' }}
                        >
                          Google Directions <ExternalLink size={10} />
                        </a>
                      </div>
                      
                      {/* Leaflet Google Map component */}
                      <ReplayMap ride={ride} />
                    </div>

                    {/* Expense Breakdown */}
                    <div style={{ background: '#121216', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>💰 Ride Expense Distribution</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Fuel Cost</span>
                            <span style={{ color: 'white' }}>₹ {ride.fuelCost}</span>
                          </div>
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                            <div style={{ height: '100%', background: 'var(--primary)', width: `${(ride.fuelCost / ride.totalExpenses) * 100}%`, borderRadius: '2px' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Hotels / Stays</span>
                            <span style={{ color: 'white' }}>₹ {ride.hotelEstimate}</span>
                          </div>
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                            <div style={{ height: '100%', background: 'var(--secondary)', width: `${(ride.hotelEstimate / ride.totalExpenses) * 100}%`, borderRadius: '2px' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Food & Permits</span>
                            <span style={{ color: 'white' }}>₹ {ride.foodEstimate}</span>
                          </div>
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                            <div style={{ height: '100%', background: 'var(--info)', width: `${(ride.foodEstimate / ride.totalExpenses) * 100}%`, borderRadius: '2px' }} />
                          </div>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Total Spent</span>
                          <span style={{ color: 'var(--secondary)' }}>₹ {ride.totalExpenses}</span>
                        </div>
                      </div>
                    </div>

                    {/* Weather condition & Rating details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                      <div style={{ background: '#121216', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CloudSun size={20} color="var(--info)" />
                        <div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Weather Record</span>
                          <span style={{ fontSize: '11px', color: 'white', fontWeight: '500' }}>{ride.weatherForecast}</span>
                        </div>
                      </div>
                      <div style={{ background: '#121216', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Star size={20} color="var(--secondary)" fill={localRatings[ride.id] ? 'var(--secondary)' : 'none'} />
                        <div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Trip Rating</span>
                          {localRatings[ride.id] ? (
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} size={12} color="var(--secondary)" fill={s <= localRatings[ride.id] ? 'var(--secondary)' : 'none'} />
                              ))}
                            </div>
                          ) : (
                            ride.status === 'Completed' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setRatingModalRide(ride); setSelectedRating(0); setHoverRating(0); }}
                                style={{ background: 'none', border: 'none', color: 'var(--secondary)', fontSize: '10px', cursor: 'pointer', padding: 0, fontWeight: '600' }}
                              >Rate this ride ★</button>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>Not rated</span>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* ─── Rate this Ride Modal ─── */}
      {ratingModalRide && (
        <div
          className="bottom-sheet-overlay animate-fade-in"
          onClick={() => setRatingModalRide(null)}
        >
          <div
            className="bottom-sheet animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: '24px 20px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>⭐</div>
            <h3 style={{ fontSize: '17px', color: 'white', marginBottom: '4px' }}>
              Rate This Ride
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
              {ratingModalRide.title || 'Your Ride'} — how was it?
            </p>

            {/* Star selector */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setSelectedRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    transition: 'transform 0.1s',
                    transform: (hoverRating || selectedRating) >= star ? 'scale(1.2)' : 'scale(1)'
                  }}
                >
                  <Star
                    size={36}
                    color="var(--secondary)"
                    fill={(hoverRating || selectedRating) >= star ? 'var(--secondary)' : 'none'}
                  />
                </button>
              ))}
            </div>

            {selectedRating > 0 && (
              <p style={{ fontSize: '13px', color: 'var(--secondary)', marginBottom: '16px', fontWeight: '600' }}>
                {['', 'Poor 😞', 'Fair 😐', 'Good 🙂', 'Great 😄', 'Excellent 🔥'][selectedRating]}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setRatingModalRide(null)}
                className="btn-secondary"
                style={{ flex: 1, padding: '12px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                disabled={selectedRating === 0}
                onClick={() => {
                  saveRating(ratingModalRide.id, selectedRating);
                  if (onCompleteRide) onCompleteRide(ratingModalRide.id);
                  setRatingModalRide(null);
                }}
                style={{
                  flex: 2,
                  padding: '12px',
                  background: selectedRating > 0
                    ? 'linear-gradient(135deg, #00e676, #00b248)'
                    : 'rgba(255,255,255,0.08)',
                  color: selectedRating > 0 ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: selectedRating > 0 ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s'
                }}
              >
                ✓ Mark Complete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
