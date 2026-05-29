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

    // Determine start and destination points
    const startPoint = getCoordinates(ride.startLocation, [17.3850, 78.4867]);
    const endPoint = getCoordinates(ride.destination, [17.9689, 79.5941]);

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

export default function MyRides({ rides, onOpenReplay, onEditRide, onDeleteRide, onToggleFavoriteRide }) {
  const [filter, setFilter] = useState('All'); // All, Upcoming, Completed, Saved
  const [expandedRideId, setExpandedRideId] = useState(null);
  const [confirmDeleteRideId, setConfirmDeleteRideId] = useState(null);
  
  // (the rest of MyRides state and defaultRides remains unchanged...)


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
                  <MapPin size={12} color="var(--primary)" /> {ride.startLocation} ➔ {ride.destination}
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
                          href={ride.mapsLink || generateGoogleMapsLink(ride.startLocation, ride.destination)}
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
                        <Star size={20} color="var(--secondary)" fill="var(--secondary)" />
                        <div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Trip Rating</span>
                          <span style={{ fontSize: '11px', color: 'white', fontWeight: '500' }}>{ride.rating} / 5.0 Rating</span>
                        </div>
                      </div>
                    </div>

                    {/* Photo memories */}
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>📸 Memories & Snapshots</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        {ride.photos.map((ph, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              aspectRatio: '1', 
                              borderRadius: '8px', 
                              background: '#1c1c24', 
                              border: '1px solid rgba(255,255,255,0.05)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '11px',
                              color: 'var(--text-secondary)',
                              fontWeight: '600',
                              flexDirection: 'column',
                              gap: '4px'
                            }}
                          >
                            <span>{ph}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

              </div>
            );
          })
        )}
      </div>


    </div>
  );
}
