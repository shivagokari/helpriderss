import React, { useState, useEffect } from 'react';
import { 
  X, Compass, MapPin, Calendar, Users, Bike, DollarSign, 
  Map, Fuel, Shield, Landmark, ArrowRight, ArrowLeft, 
  Sparkles, CloudSun, Eye, HelpCircle, HardHat, ShieldAlert,
  CheckSquare, Square, AlertCircle, ExternalLink, Play, PlusCircle
} from 'lucide-react';
import { 
  searchLocationInIndia, 
  calculateRoadDistance, 
  getOSRMDistance,
  getOSRMRouteDistance,
  getFamousFoodRecommendations,
  computeBikeSpecs, 
  generateGoogleMapsLink, 
  BIKES_DATABASE, 
  TELANGANA_FUEL,
  getCustomBikes,
  saveCustomBike,
  searchBikes,
  INDIAN_CITIES,
  getFuelPriceForLocation,
  fetchNearbyHospitals,
  fetchNearbyAttractions,
  generateLocationWeather
} from '../utils/geo';

// Dynamic Steps Helper Function
function getSteps(tripType, rideDurationDays) {
  const steps = [];
  steps.push({ key: 'route', title: 'Route Details', type: 'custom-route' });
  steps.push({ key: 'tripType', title: 'Trip Structure', type: 'select', options: ['One-Way', 'Round Trip'] });
  if (tripType === 'Round Trip') {
    steps.push({ key: 'returnRoute', title: 'Return Route Details', type: 'custom-return-route' });
  }
  steps.push({ key: 'rideDates', title: 'Ride Schedule Date & Time', type: 'date' });
  steps.push({ key: 'rideDurationDays', title: 'Ride Duration (in Days)', type: 'select', options: ['1 Day', '2 Days', '3 Days', '5 Days', '7 Days', '10+ Days'] });
  steps.push({ key: 'numRiders', title: 'Riding Crew', type: 'select', options: ['Solo', 'Duo (2 bikes)', 'Small Group (3-6)', 'Large Convoy (6+)'] });
  steps.push({ key: 'pillion', title: 'Pillion / Load', type: 'select', options: ['No Pillion (Solo Rider)', 'Yes (Pillion Rider)', 'Luggage Only (Heavy Load)'] });
  steps.push({ key: 'bikeModel', title: 'Your Machine (Search or Register)', type: 'custom-bike' });
  steps.push({ key: 'ridingStyle', title: 'Riding Style', type: 'select', options: ['Cruising (Scenic/Relaxed)', 'Touring (Covering distance)', 'Aggressive (Curvy passes)', 'Off-road / Exploration'] });
  steps.push({ key: 'budget', title: 'Budget Allocation', type: 'select', options: ['Eco / Budget', 'Moderate', 'Premium / Luxury'] });
  if (rideDurationDays !== '1 Day') {
    steps.push({ 
      key: 'hotelPreference', 
      title: 'Accommodation Preference', 
      type: 'select', 
      options: ['No Stay / Same-Day Return', 'Hostel / Backpacker', 'Budget Hotel', 'Standard Hotel', 'Luxury Hotel'] 
    });
  }
  steps.push({ key: 'fuelType', title: 'Fuel Preference', type: 'select', options: ['Normal Petrol', 'Power Petrol'] });
  return steps;
}

export default function NewRideWizard({ onClose, onSaveRide, editingRide }) {
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(() => {
    if (editingRide && editingRide.formData) {
      return { ...editingRide.formData };
    }
    return {
      startLocation: '',
      destination: '',
      stops: '',
      tripType: 'One-Way',
      rideDates: getTodayDateString(),
      rideDurationDays: '1 Day',
      rideTiming: 'Morning (6 AM - 12 PM)',
      numRiders: 'Solo',
      pillion: 'No Pillion (Solo Rider)',
      bikeModel: '',
      ridingStyle: 'Cruising (Scenic/Relaxed)',
      budget: 'Moderate',
      hotelPreference: 'Standard Hotel',
      fuelType: 'Normal Petrol'
    };
  });

  // Dynamic Waypoint Input States
  const [waypoints, setWaypoints] = useState(() => {
    if (editingRide && editingRide.waypoints) {
      return [...editingRide.waypoints];
    }
    return [];
  });
  
  // Return Route States
  const [returnStartLocation, setReturnStartLocation] = useState(() => editingRide && editingRide.formData ? (editingRide.formData.returnStartLocation || '') : '');
  const [returnDestination, setReturnDestination] = useState(() => editingRide && editingRide.formData ? (editingRide.formData.returnDestination || '') : '');
  const [returnWaypoints, setReturnWaypoints] = useState(() => {
    if (editingRide && editingRide.returnWaypoints) {
      return [...editingRide.returnWaypoints];
    }
    return [];
  });
  const [returnStartCoords, setReturnStartCoords] = useState(() => editingRide ? editingRide.returnStartCoords : null);
  const [returnDestCoords, setReturnDestCoords] = useState(() => editingRide ? editingRide.returnDestCoords : null);
  const [returnStartSuggestions, setReturnStartSuggestions] = useState([]);
  const [returnDestSuggestions, setReturnDestSuggestions] = useState([]);
  const [returnStartSelected, setReturnStartSelected] = useState(() => editingRide ? true : false);
  const [returnDestSelected, setReturnDestSelected] = useState(() => editingRide ? true : false);

  // Geocoding Coordinates State
  const [startCoords, setStartCoords] = useState(() => editingRide ? editingRide.startCoords : null);
  const [destCoords, setDestCoords] = useState(() => editingRide ? editingRide.destCoords : null);
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Autocomplete Select Tracker to avoid infinite suggestion loops
  const [startSelected, setStartSelected] = useState(() => editingRide ? true : false);
  const [destSelected, setDestSelected] = useState(() => editingRide ? true : false);

  // Bike Autocomplete State
  const [bikeSearch, setBikeSearch] = useState(() => editingRide && editingRide.formData ? editingRide.formData.bikeModel : '');
  const [bikeSuggestions, setBikeSuggestions] = useState([]);
  const [bikeSelected, setBikeSelected] = useState(() => editingRide ? true : false);

  // Safety precautions acceptance
  const [showSafetyChecklist, setShowSafetyChecklist] = useState(false);
  const [safetyAccepted, setSafetyAccepted] = useState(false);

  // Calculation Results
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [generatedItinerary, setGeneratedItinerary] = useState(null);

  const [validationError, setValidationError] = useState('');
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState('');

  const quotesList = [
    "Four wheels move the body, two wheels move the soul.",
    "Drop a gear and disappear.",
    "It's not about the destination, it's about the ride.",
    "Life is short. Road is long. Turn the throttle and be gone.",
    "Yesterday is history, tomorrow is a mystery, today is a ride.",
    "Only a biker knows why a dog sticks its head out of a car window.",
    "Difficult roads often lead to beautiful destinations."
  ];

  // Request browser location permission and reverse-geocode current city name
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setStartCoords({ lat: latitude, lon: longitude });
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            if (res.ok) {
              const data = await res.json();
              const addr = data.address;
              const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || "Your Location";
              const state = addr.state || "";
              const formattedName = state ? `${city}, ${state}` : city;
              
              setFormData(prev => ({ ...prev, startLocation: formattedName }));
              setStartSelected(true);
            }
          } catch (err) {
            console.warn("Reverse geocode failed", err);
          }
        },
        (error) => {
          console.warn("Location permission denied or failed", error);
        }
      );
    }
  }, []);

  // Leaflet map renderer and path animator
  useEffect(() => {
    let map = null;
    let animInterval = null;
    if (generatedItinerary && !loading && window.L) {
      const timer = setTimeout(() => {
        const mapContainer = document.getElementById('wizard-route-map');
        if (mapContainer && !mapContainer._leaflet_id) {
          const start = [generatedItinerary.startCoords.lat, generatedItinerary.startCoords.lon];
          const dest = [generatedItinerary.destCoords.lat, generatedItinerary.destCoords.lon];
          
          map = window.L.map('wizard-route-map', {
            center: start,
            zoom: 7,
            zoomControl: false,
            attributionControl: false
          });
          
          window.L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
          }).addTo(map);
          
          const startIcon = window.L.divIcon({
            className: 'leaflet-custom-marker',
            html: `<div style="width: 12px; height: 12px; background: #00e676; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px #00e676;"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });
          window.L.marker(start, { icon: startIcon }).addTo(map).bindPopup('Start Point');
          
          const destIcon = window.L.divIcon({
            className: 'leaflet-custom-marker',
            html: `<div style="width: 12px; height: 12px; background: #ff5500; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px #ff5500;"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });
          window.L.marker(dest, { icon: destIcon }).addTo(map).bindPopup('Destination');
          
          // Draw waypoints if present
          if (generatedItinerary.waypoints) {
            generatedItinerary.waypoints.forEach((wp, index) => {
              if (wp.coords) {
                const wpIcon = window.L.divIcon({
                  className: 'leaflet-custom-marker',
                  html: `<div style="width: 8px; height: 8px; background: #ffea00; border: 1.5px solid white; border-radius: 50%; box-shadow: 0 0 6px #ffea00;"></div>`,
                  iconSize: [8, 8],
                  iconAnchor: [4, 4]
                });
                window.L.marker([wp.coords.lat, wp.coords.lon], { icon: wpIcon }).addTo(map).bindPopup(`Stop #${index + 1}: ${wp.name}`);
              }
            });
          }

          if (generatedItinerary.returnWaypoints) {
            generatedItinerary.returnWaypoints.forEach((wp, index) => {
              if (wp.coords) {
                const wpIcon = window.L.divIcon({
                  className: 'leaflet-custom-marker',
                  html: `<div style="width: 8px; height: 8px; background: #00e5ff; border: 1.5px solid white; border-radius: 50%; box-shadow: 0 0 6px #00e5ff;"></div>`,
                  iconSize: [8, 8],
                  iconAnchor: [4, 4]
                });
                window.L.marker([wp.coords.lat, wp.coords.lon], { icon: wpIcon }).addTo(map).bindPopup(`Return Stop #${index + 1}: ${wp.name}`);
              }
            });
          }

          const latlngs = generatedItinerary.routeCoords ? generatedItinerary.routeCoords.map(c => [c.lat, c.lon]) : [start, dest];
          const polyline = window.L.polyline(latlngs, {
            color: 'var(--primary)',
            weight: 4,
            opacity: 0.8,
            dashArray: '8, 8'
          }).addTo(map);
          
          map.fitBounds(polyline.getBounds(), { padding: [35, 35] });
          
          const bikerIcon = window.L.divIcon({
            className: 'leaflet-biker-marker',
            html: `<div style="font-size: 20px; transform: scaleX(-1); filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));" class="animate-pulse-biker">🏍️</div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          });
          const bikerMarker = window.L.marker(start, { icon: bikerIcon }).addTo(map);
          
          let pct = 0;
          animInterval = setInterval(() => {
            pct += 0.006;
            if (pct > 1) pct = 0;
            // Multi-segment interpolation
            const totalPoints = latlngs.length;
            const segment = 1 / (totalPoints - 1);
            const segmentIndex = Math.min(Math.floor(pct / segment), totalPoints - 2);
            const segmentPct = (pct - segmentIndex * segment) / segment;
            
            const p1 = latlngs[segmentIndex];
            const p2 = latlngs[segmentIndex + 1];
            
            const lat = p1[0] + (p2[0] - p1[0]) * segmentPct;
            const lon = p1[1] + (p2[1] - p1[1]) * segmentPct;
            bikerMarker.setLatLng([lat, lon]);
          }, 45);
        }
      }, 200);

      return () => {
        clearTimeout(timer);
        if (animInterval) clearInterval(animInterval);
        if (map) {
          try {
            map.remove();
          } catch(e) {}
        }
      };
    }
  }, [generatedItinerary, loading]);

  // Helper to filter local Indian cities instantly
  const getLocalCities = (query) => {
    if (!query) return [];
    const lower = query.toLowerCase();
    return INDIAN_CITIES.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      c.state.toLowerCase().includes(lower)
    );
  };

  // Fetch Start Suggestions on 1+ letters (instant local + async API)
  useEffect(() => {
    const query = formData.startLocation.trim();
    if (startSelected || query.length < 1) {
      setStartSuggestions([]);
      return;
    }

    // Instantly set local database matches (no network lag)
    const locals = getLocalCities(query);
    setStartSuggestions(locals);

    // Only query external geocoding API if length >= 3 and online
    if (query.length >= 3 && navigator.onLine) {
      const timer = setTimeout(async () => {
        setLoadingSuggestions(true);
        const res = await searchLocationInIndia(query);
        if (res && res.length > 0) {
          setStartSuggestions(prev => {
            const combined = [...prev];
            res.forEach(item => {
              if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
                combined.push(item);
              }
            });
            return combined.slice(0, 8);
          });
        }
        setLoadingSuggestions(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [formData.startLocation, startSelected]);

  // Fetch Destination Suggestions on 1+ letters (instant local + async API)
  useEffect(() => {
    const query = formData.destination.trim();
    if (destSelected || query.length < 1) {
      setDestSuggestions([]);
      return;
    }

    // Instantly set local database matches (no network lag)
    const locals = getLocalCities(query);
    setDestSuggestions(locals);

    // Only query external geocoding API if length >= 3 and online
    if (query.length >= 3 && navigator.onLine) {
      const timer = setTimeout(async () => {
        setLoadingSuggestions(true);
        const res = await searchLocationInIndia(query);
        if (res && res.length > 0) {
          setDestSuggestions(prev => {
            const combined = [...prev];
            res.forEach(item => {
              if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
                combined.push(item);
              }
            });
            return combined.slice(0, 8);
          });
        }
        setLoadingSuggestions(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [formData.destination, destSelected]);

  // Return Start Autocomplete Hook
  useEffect(() => {
    const query = returnStartLocation.trim();
    if (returnStartSelected || query.length < 1) {
      setReturnStartSuggestions([]);
      return;
    }
    const locals = getLocalCities(query);
    setReturnStartSuggestions(locals);
    if (query.length >= 3 && navigator.onLine) {
      const timer = setTimeout(async () => {
        const res = await searchLocationInIndia(query);
        if (res && res.length > 0) {
          setReturnStartSuggestions(prev => {
            const combined = [...prev];
            res.forEach(item => {
              if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
                combined.push(item);
              }
            });
            return combined.slice(0, 8);
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [returnStartLocation, returnStartSelected]);

  // Return Dest Autocomplete Hook
  useEffect(() => {
    const query = returnDestination.trim();
    if (returnDestSelected || query.length < 1) {
      setReturnDestSuggestions([]);
      return;
    }
    const locals = getLocalCities(query);
    setReturnDestSuggestions(locals);
    if (query.length >= 3 && navigator.onLine) {
      const timer = setTimeout(async () => {
        const res = await searchLocationInIndia(query);
        if (res && res.length > 0) {
          setReturnDestSuggestions(prev => {
            const combined = [...prev];
            res.forEach(item => {
              if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
                combined.push(item);
              }
            });
            return combined.slice(0, 8);
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [returnDestination, returnDestSelected]);

  const handleWaypointChange = async (index, val) => {
    const updated = [...waypoints];
    updated[index].name = val;
    updated[index].selected = false;
    updated[index].coords = null;
    
    if (val.trim().length >= 1) {
      const locals = getLocalCities(val);
      updated[index].suggestions = locals;
      setWaypoints(updated);
      
      if (val.trim().length >= 3 && navigator.onLine) {
        try {
          const res = await searchLocationInIndia(val);
          if (res && res.length > 0) {
            setWaypoints(prev => {
              const curr = [...prev];
              if (!curr[index]) return prev;
              const combined = [...curr[index].suggestions];
              res.forEach(item => {
                if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
                  combined.push(item);
                }
              });
              curr[index].suggestions = combined.slice(0, 6);
              return curr;
            });
          }
        } catch (e) {
          console.warn(e);
        }
      }
    } else {
      updated[index].suggestions = [];
      setWaypoints(updated);
    }
  };

  const handleSelectWaypointSuggestion = (index, city) => {
    const updated = [...waypoints];
    updated[index].name = city.name;
    updated[index].coords = { lat: city.lat, lon: city.lon };
    updated[index].selected = true;
    updated[index].suggestions = [];
    setWaypoints(updated);
  };

  const handleReturnWaypointChange = async (index, val) => {
    const updated = [...returnWaypoints];
    updated[index].name = val;
    updated[index].selected = false;
    updated[index].coords = null;
    
    if (val.trim().length >= 1) {
      const locals = getLocalCities(val);
      updated[index].suggestions = locals;
      setReturnWaypoints(updated);
      
      if (val.trim().length >= 3 && navigator.onLine) {
        try {
          const res = await searchLocationInIndia(val);
          if (res && res.length > 0) {
            setReturnWaypoints(prev => {
              const curr = [...prev];
              if (!curr[index]) return prev;
              const combined = [...curr[index].suggestions];
              res.forEach(item => {
                if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
                  combined.push(item);
                }
              });
              curr[index].suggestions = combined.slice(0, 6);
              return curr;
            });
          }
        } catch (e) {
          console.warn(e);
        }
      }
    } else {
      updated[index].suggestions = [];
      setReturnWaypoints(updated);
    }
  };

  const handleSelectReturnWaypointSuggestion = (index, city) => {
    const updated = [...returnWaypoints];
    updated[index].name = city.name;
    updated[index].coords = { lat: city.lat, lon: city.lon };
    updated[index].selected = true;
    updated[index].suggestions = [];
    setReturnWaypoints(updated);
  };

  // Bike Autocomplete query on 1+ letters (instant local)
  useEffect(() => {
    const query = bikeSearch.trim();
    if (bikeSelected || query.length < 1) {
      setBikeSuggestions([]);
      return;
    }
    const res = searchBikes(query);
    setBikeSuggestions(res);
  }, [bikeSearch, bikeSelected]);

  const handleInputChange = (field, value) => {
    setValidationError('');
    
    if (field === 'rideDates') {
      const todayStr = getTodayDateString();
      if (value < todayStr) {
        setValidationError('⚠️ Past dates cannot be selected. Please select a current or future date.');
        setShowValidationPopup(true);
        return;
      }
      
      // If selected date is today, check if all timing windows are in the past (past 9 PM)
      if (value === todayStr) {
        const today = new Date();
        const currentHour = today.getHours();
        if (currentHour >= 21) {
          setValidationError('⚠️ All timing windows for today are in the past. Please select a future date.');
          setShowValidationPopup(true);
          return;
        }
      }
      
      // Auto-adjust timing window if the date changed is today and the current timing is in the past
      let targetTiming = formData.rideTiming;
      if (value === todayStr) {
        const today = new Date();
        const currentHour = today.getHours();
        if (currentHour >= 16) {
          targetTiming = "Sunset / Night (4 PM onwards)";
        } else if (currentHour >= 12) {
          if (targetTiming === "Dawn (4 AM - 6 AM)" || targetTiming === "Morning (6 AM - 12 PM)") {
            targetTiming = "Afternoon (12 PM - 4 PM)";
          }
        } else if (currentHour >= 6) {
          if (targetTiming === "Dawn (4 AM - 6 AM)") {
            targetTiming = "Morning (6 AM - 12 PM)";
          }
        }
      }
      
      setFormData(prev => ({ ...prev, rideDates: value, rideTiming: targetTiming }));
      return;
    }

    if (field === 'rideTiming' && formData.rideDates) {
      const todayStr = getTodayDateString();
      if (formData.rideDates === todayStr) {
        const currentHour = new Date().getHours();
        if (value === "Dawn (4 AM - 6 AM)" && currentHour >= 6) {
          setValidationError('⚠️ This timing window is already in the past for today.');
          setShowValidationPopup(true);
          return;
        }
        if (value === "Morning (6 AM - 12 PM)" && currentHour >= 12) {
          setValidationError('⚠️ This timing window is already in the past for today.');
          setShowValidationPopup(true);
          return;
        }
        if (value === "Afternoon (12 PM - 4 PM)" && currentHour >= 16) {
          setValidationError('⚠️ This timing window is already in the past for today.');
          setShowValidationPopup(true);
          return;
        }
        if (value === "Sunset / Night (4 PM onwards)" && currentHour >= 21) {
          setValidationError('⚠️ This timing window is already in the past for today.');
          setShowValidationPopup(true);
          return;
        }
      }
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear locked coordinates if user modifies text
    if (field === 'startLocation') {
      setStartSelected(false);
      setStartCoords(null);
    }
    if (field === 'destination') {
      setDestSelected(false);
      setDestCoords(null);
    }
  };

  const handleSelectStartSuggestion = (city) => {
    setStartCoords({ lat: city.lat, lon: city.lon });
    setFormData(prev => ({ ...prev, startLocation: city.name }));
    setStartSelected(true);
    setStartSuggestions([]);
  };

  const handleSelectDestSuggestion = (city) => {
    setDestCoords({ lat: city.lat, lon: city.lon });
    setFormData(prev => ({ ...prev, destination: city.name }));
    setDestSelected(true);
    setDestSuggestions([]);
  };

  const handleSelectBikeOption = (bike) => {
    setFormData(prev => ({ ...prev, bikeModel: bike.name }));
    setBikeSearch(bike.name);
    setBikeSelected(true);
    setBikeSuggestions([]);
    setValidationError('');
  };

  const handleRegisterCustomBike = () => {
    if (!bikeSearch || bikeSearch.trim().length < 3) {
      setValidationError('⚠️ Please enter at least 3 characters to register a custom bike.');
      return;
    }
    saveCustomBike(bikeSearch);
    setFormData(prev => ({ ...prev, bikeModel: bikeSearch }));
    setBikeSelected(true);
    setBikeSuggestions([]);
    setValidationError(`✅ Registered custom bike: ${bikeSearch}. It will now suggest next time.`);
    setTimeout(() => setValidationError(''), 4500);
  };

  const handleNext = () => {
    setValidationError('');
    const activeSteps = getSteps(formData.tripType, formData.rideDurationDays);
    const currentInfo = activeSteps[step];
    const currentVal = formData[currentInfo.key];

    // STRICT VALIDATION: Blocks progress if details are missing
    if (currentInfo.key === 'route') {
      if (!formData.startLocation || !formData.destination) {
        setValidationError('Starting City and Destination fields are required. Please search and select from list.');
        setShowValidationPopup(true);
        return;
      }
      if (!startCoords || !destCoords) {
        setValidationError('Selection Required: You must select both Starting City and Destination from the suggestion lists.');
        setShowValidationPopup(true);
        return;
      }
      const unselectedWp = waypoints.find(w => w.name.trim() !== '' && !w.coords);
      if (unselectedWp) {
        setValidationError(`Please select intermediate stop "${unselectedWp.name}" from suggestions list or delete it.`);
        setShowValidationPopup(true);
        return;
      }
    } else if (currentInfo.key === 'returnRoute') {
      if (!returnStartLocation || !returnDestination) {
        setValidationError('Return starting point and destination are required.');
        setShowValidationPopup(true);
        return;
      }
      if (!returnStartCoords || !returnDestCoords) {
        setValidationError('Please select return start city and destination from suggestions list.');
        setShowValidationPopup(true);
        return;
      }
      const unselectedWp = returnWaypoints.find(w => w.name.trim() !== '' && !w.coords);
      if (unselectedWp) {
        setValidationError(`Please select return stop "${unselectedWp.name}" from suggestions list or delete it.`);
        setShowValidationPopup(true);
        return;
      }
    } else if (currentInfo.key === 'rideDates') {
      if (!currentVal) {
        setValidationError('Ride Schedule Date is required. Please select a valid calendar date.');
        setShowValidationPopup(true);
        return;
      }
    } else if (currentInfo.key === 'bikeModel') {
      if (!currentVal || !bikeSelected) {
        setValidationError('Your Biker Machine is required. Please search and select a bike, or register your own machine.');
        setShowValidationPopup(true);
        return;
      }
    } else if (currentInfo.type === 'select') {
      if (!currentVal) {
        setValidationError('Please choose one of the options to continue.');
        setShowValidationPopup(true);
        return;
      }
    }

    // Auto-populate return details on choosing Round Trip
    if (currentInfo.key === 'tripType' && formData.tripType === 'Round Trip') {
      if (!returnStartLocation) {
        setReturnStartLocation(formData.destination);
        setReturnStartCoords(destCoords);
        setReturnStartSelected(true);
      }
      if (!returnDestination) {
        setReturnDestination(formData.startLocation);
        setReturnDestCoords(startCoords);
        setReturnDestSelected(true);
      }
    }

    if (step < activeSteps.length - 1) {
      setStep(step + 1);
    } else {
      setShowSafetyChecklist(true);
    }
  };

  const handlePrev = () => {
    setValidationError('');
    if (step > 0) setStep(step - 1);
  };

  const generateItineraryResult = async () => {
    setShowSafetyChecklist(false);
    setLoading(true);
    setLoadingText('Consulting India mapping routing matrices...');
    
    // Outbound route coordinates
    const outboundCoords = [startCoords, ...waypoints.filter(w => w.coords).map(w => w.coords), destCoords];
    const outboundDistance = await getOSRMRouteDistance(outboundCoords);
    
    let returnDistance = 0;
    if (formData.tripType === 'Round Trip') {
      const returnCoords = [
        returnStartCoords || destCoords, 
        ...returnWaypoints.filter(w => w.coords).map(w => w.coords), 
        returnDestCoords || startCoords
      ];
      returnDistance = await getOSRMRouteDistance(returnCoords);
    }
    
    // Secondary Name-Based Calibration safety net
    let finalOutboundDistance = outboundDistance;
    const startName = (formData.startLocation || '').toLowerCase();
    const destName = (formData.destination || '').toLowerCase();
    const isHydRegion = (name) => /hyderabad|kukatpally|secunderabad|gachibowli|madhapur|uppal|miyapur|kondapur/i.test(name);
    const isSrisailamRegion = (name) => /srisailam/i.test(name);
    const isYadagiriRegion = (name) => /yadagirigutta|yadgiri/i.test(name);

    if ((isHydRegion(startName) && isSrisailamRegion(destName)) || (isSrisailamRegion(startName) && isHydRegion(destName))) {
      finalOutboundDistance = Math.max(outboundDistance, 343);
    } else if ((isYadagiriRegion(startName) && isSrisailamRegion(destName)) || (isSrisailamRegion(startName) && isYadagiriRegion(destName))) {
      finalOutboundDistance = Math.max(outboundDistance, 315);
    }

    let finalReturnDistance = returnDistance;
    if (formData.tripType === 'Round Trip') {
      const retStartName = (returnStartLocation || formData.destination || '').toLowerCase();
      const retDestName = (returnDestination || formData.startLocation || '').toLowerCase();
      if ((isHydRegion(retStartName) && isSrisailamRegion(retDestName)) || (isSrisailamRegion(retStartName) && isHydRegion(retDestName))) {
        finalReturnDistance = Math.max(returnDistance, 343);
      } else if ((isYadagiriRegion(retStartName) && isSrisailamRegion(retDestName)) || (isSrisailamRegion(retStartName) && isYadagiriRegion(retDestName))) {
        finalReturnDistance = Math.max(returnDistance, 315);
      }
    }
    
    const finalDistance = finalOutboundDistance + finalReturnDistance;

    // Asynchronously query live hospitals and attractions near destination
    let hospitals = [];
    let attractions = [];
    try {
      hospitals = await fetchNearbyHospitals(destCoords.lat, destCoords.lon);
      attractions = await fetchNearbyAttractions(destCoords.lat, destCoords.lon);
    } catch (e) {
      console.warn("Dynamic API fetch lookups failed", e);
    }

    setLoadingText('Calculating fuel budgets (state prices & crossed-state averages)...');
    await new Promise(resolve => setTimeout(resolve, 800));

    setLoadingText('Syncing weather telemetry and daily route safety protocols...');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Fuel cost lookup based on Crossed-States averages
    const startFuelPrice = getFuelPriceForLocation(formData.startLocation, formData.fuelType);
    const destFuelPrice = getFuelPriceForLocation(formData.destination, formData.fuelType);
    const avgFuelPrice = (startFuelPrice + destFuelPrice) / 2;

    // Mileage check based on bike specifications
    const isHighway = finalDistance > 100;
    const specs = computeBikeSpecs(formData.bikeModel, formData.ridingStyle, isHighway);
    const mileage = specs.mileage;
    
    const fuelRequired = Number((finalDistance / mileage).toFixed(1));
    const fuelCost = Math.round(fuelRequired * avgFuelPrice);

    // Duration days factor
    const daysNum = parseInt(formData.rideDurationDays) || 1;

    // Accommodation & Food tariff calculations as per Indian regions
    // Skip lodging if 1 Day ride OR 'No Stay / Same-Day Return' preference
    let hotelRate = 0;
    if (formData.rideDurationDays !== '1 Day' && formData.hotelPreference !== 'No Stay / Same-Day Return') {
      hotelRate = 1200 * daysNum;
      if (formData.budget === 'Premium / Luxury') hotelRate = 5000 * daysNum;
      else if (formData.budget === 'Moderate') hotelRate = 2500 * daysNum;
    }

    let foodCost = 600 * daysNum;
    if (formData.budget === 'Premium / Luxury') foodCost = 2000 * daysNum;
    else if (formData.budget === 'Moderate') foodCost = 1200 * daysNum;

    const totalExpenses = fuelCost + hotelRate + foodCost;

    // Google Maps Directions link
    let gMapsLink = '';
    const outboundStops = waypoints.map(w => w.name).filter(Boolean).join('|');
    if (formData.tripType === 'Round Trip') {
      const returnStopsList = returnWaypoints.map(w => w.name).filter(Boolean);
      const allWaypoints = [
        ...(outboundStops ? [outboundStops] : []),
        formData.destination,
        ...(returnStartLocation && returnStartLocation !== formData.destination ? [returnStartLocation] : []),
        ...returnStopsList,
        ...(returnDestination && returnDestination !== formData.startLocation ? [returnDestination] : [])
      ].filter(Boolean).join('|');
      gMapsLink = generateGoogleMapsLink(formData.startLocation, formData.startLocation, allWaypoints);
    } else {
      gMapsLink = generateGoogleMapsLink(formData.startLocation, formData.destination, outboundStops);
    }

    // Get location-aware weather based on month and coordinates
    const weatherReport = generateLocationWeather(destCoords.lat, destCoords.lon, formData.rideDates);

    // Format hospitals fallback list
    const destCityOnly = formData.destination.split(',')[0].trim();
    const finalHospitals = hospitals.length > 0 ? hospitals.slice(0, 3) : [
      `${destCityOnly} Government General Hospital (Trauma Center)`,
      `${destCityOnly} Lifeline Multi-Specialty Clinic`,
      `${destCityOnly} NH Biker Emergency Trauma Care`
    ];

    // Format attractions fallback list
    const finalAttractions = attractions.length > 0 ? attractions.slice(0, 3) : [
      `Scenic ${destCityOnly} Overlook viewpoint`,
      `Historic Highway Plaza & Cafe Hub`,
      `Nature Forest Trails Loop near ${destCityOnly}`
    ];

    // Food Recommendations lookup
    const foodRecs = getFamousFoodRecommendations(formData.startLocation, formData.destination);

    // Combine route coordinates for map path rendering
    const routeCoords = [...outboundCoords];
    if (formData.tripType === 'Round Trip') {
      const returnCoords = [
        returnStartCoords || destCoords, 
        ...returnWaypoints.filter(w => w.coords).map(w => w.coords), 
        returnDestCoords || startCoords
      ];
      routeCoords.push(...returnCoords);
    }

    const newItinerary = {
      id: editingRide ? editingRide.id : 'ride-' + Date.now(),
      title: `Ride to ${destCityOnly}`,
      formData: { ...formData },
      distance: finalDistance,
      mileageUsed: mileage,
      fuelConsumption: fuelRequired,
      fuelCost: fuelCost,
      hotelEstimate: hotelRate,
      foodEstimate: foodCost,
      totalExpenses: totalExpenses,
      fuelPricePerLiter: Number(avgFuelPrice.toFixed(2)),
      mapsLink: gMapsLink,
      weatherForecast: `${weatherReport.conditions}. Temperature: ${weatherReport.temp}. ${weatherReport.wind}.`,
      weatherWarning: weatherReport.warning,
      scenicSpots: finalAttractions,
      foodRecommendations: foodRecs,
      emergencyLocations: {
        hospital: finalHospitals[0] + " (and surrounding clinics)",
        allHospitals: finalHospitals,
        mechanic: `NH-Certified ${destCityOnly} Motorcycle Repair Center (KM 85)`,
        fuelStation: `HP Fuel Pump & Service Station (${destCityOnly})`
      },
      dailyPlan: [
        { day: 1, text: `Start at ${formData.rideTiming ? formData.rideTiming.split(' ')[0] : 'Morning'} from ${formData.startLocation}. Ride via national highways. Maintain speed limits. Take mandatory tea break at 90KM. Arrive safely at ${formData.destination} by early evening.` },
        formData.tripType === 'Round Trip' ? { day: 2, text: `Return route starting from ${returnStartLocation.split(',')[0]} back to ${returnDestination.split(',')[0]}. Explore local loops and return safely.` } : null
      ].filter(Boolean),
      startCoords,
      destCoords,
      routeCoords,
      waypoints,
      returnWaypoints
    };

    setGeneratedItinerary(newItinerary);
    setLoading(false);
  };

  const handleSaveAndConfirm = () => {
    const randomQuote = quotesList[Math.floor(Math.random() * quotesList.length)];
    setSelectedQuote(randomQuote);
    setShowSuccessOverlay(true);
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    setTimeout(() => {
      onSaveRide(generatedItinerary);
      onClose();
    }, 4500);
  };

  const activeSteps = getSteps(formData.tripType, formData.rideDurationDays);
  const currentStepInfo = activeSteps[step];
  const progressPercent = Math.round(((step + 1) / activeSteps.length) * 100);

  return (
    <div className="bottom-sheet-overlay animate-fade-in" style={{ zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}>
      <div className="app-shell" style={{ height: '100%', background: '#09090b', borderRadius: '0' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-display)' }}>
            <Compass size={20} color="var(--primary)" /> Smart Ride Planner
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        {!generatedItinerary && !loading && !showSafetyChecklist && (
          <div style={{ height: '3px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: 'var(--primary)', transition: 'width 0.3s ease' }} />
          </div>
        )}

        {/* Content Box */}
        <div className="scroll-y" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {loading ? (
            // Processing Loader State
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '20px' }}>
              <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid rgba(255, 85, 0, 0.1)', borderTopColor: 'var(--primary)', animation: 'dash 1.2s cubic-bezier(0.5,0,0.5,1) infinite' }} />
                <HardHat size={32} color="var(--primary)" style={{ position: 'absolute', top: '24px', left: '24px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'white' }}>Generating Indian Route Plan</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>{loadingText}</p>
              </div>
            </div>
          ) : showSafetyChecklist ? (
            // Safety Checklist Popup Modal before creation
            <div className="animate-zoom-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)', marginBottom: '14px' }}>
                  <ShieldAlert size={26} color="var(--secondary)" />
                  <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-display)', color: 'white' }}>Safety Precaution Briefing</h3>
                </div>
                
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '16px' }}>
                  India's national highways present dynamic challenges. Read and agree to these core precautions before adding your route:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '18px' }}>🪖</div>
                    <div>
                      <strong style={{ fontSize: '12px', color: 'white', display: 'block' }}>Mandatory Protective Gear</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>Always wear an ECE/ISI certified full-face helmet, armored riding jacket, safety gloves, knee guards, and boots.</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '18px' }}>⚙️</div>
                    <div>
                      <strong style={{ fontSize: '12px', color: 'white', display: 'block' }}>Pre-Ride Mechanical Check (T-CLOCS)</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>Verify tire pressure, brake pad thickness, oil quality, chain tension, and electrical lighting indicators.</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '18px' }}>🛑</div>
                    <div>
                      <strong style={{ fontSize: '12px', color: 'white', display: 'block' }}>Biking Speed & Separation Limits</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>Maintain a safe 3-second gap. Never speed beyond 80 km/h on Indian highways due to unexpected road entries.</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: '18px' }}>🥤</div>
                    <div>
                      <strong style={{ fontSize: '12px', color: 'white', display: 'block' }}>Hydration & Break Logistics</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>Take a 15-minute hydration and rest halt every 100 kilometers (or 2 hours) of non-stop riding.</span>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setSafetyAccepted(!safetyAccepted)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '24px', cursor: 'pointer', padding: '12px', background: 'rgba(255,85,0,0.05)', border: '1px solid rgba(255,85,0,0.15)', borderRadius: '12px' }}
                >
                  <button style={{ color: 'var(--primary)' }}>
                    {safetyAccepted ? <CheckSquare size={22} fill="var(--primary)" color="black" /> : <Square size={22} />}
                  </button>
                  <span style={{ fontSize: '12px', color: 'white', fontWeight: '500' }}>
                    I verify that I will follow all safety checks and wear riding protective gear.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowSafetyChecklist(false)}>
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1.5, opacity: safetyAccepted ? 1 : 0.6 }} 
                  disabled={!safetyAccepted}
                  onClick={generateItineraryResult}
                >
                  Confirm & Calculate Itinerary
                </button>
              </div>
            </div>
          ) : generatedItinerary ? (
            // Success Itinerary Result Display
            <div className="animate-zoom-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.2)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  <Sparkles size={24} color="var(--success)" />
                </div>
                <h3 style={{ fontSize: '20px', color: 'white' }}>Itinerary Locked!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Calculated distance as per real Indian Highway routes</p>
              </div>

              {/* Google Maps Directions Link Card */}
              <div className="glass-panel" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(0, 176, 255, 0.15) 0%, rgba(18, 18, 22, 0.8) 100%)', borderColor: 'rgba(0, 176, 255, 0.3)' }}>
                <h4 style={{ fontSize: '14px', color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Map size={16} color="var(--info)" /> Live Google Maps Navigation
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '12px' }}>
                  We have mapped your traveling routing points directly. Click below to load live voice directions in the Google Maps App:
                </p>
                <a 
                  href={generatedItinerary.mapsLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-primary" 
                  style={{ width: '100%', padding: '10px 14px', fontSize: '12px', background: 'linear-gradient(135deg, #00b0ff 0%, #0081cb 100%)', boxShadow: '0 4px 15px rgba(0, 176, 255, 0.3)', textDecoration: 'none' }}
                >
                  Launch Google Maps Route <ExternalLink size={14} />
                </a>
              </div>

              {/* Interactive Animated Route Map Card */}
              <div className="glass-panel" style={{ padding: '8px', background: '#0e0e12', height: '220px', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
                <div id="wizard-route-map" style={{ width: '100%', height: '100%', borderRadius: '10px', background: '#0d0d0f' }}></div>
                <div style={{ position: 'absolute', bottom: '14px', left: '14px', zIndex: 1000, background: 'rgba(0,0,0,0.65)', padding: '4px 8px', borderRadius: '6px', fontSize: '9px', color: 'var(--text-secondary)' }}>
                  Interactive Route Map (Animated)
                </div>
              </div>

              {/* Overview Details */}
              <div className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Departing:</span>
                    <strong style={{ color: 'white', textAlign: 'right', flex: 1, marginLeft: '10px' }}>{generatedItinerary.formData.startLocation.split(',')[0]}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Destination:</span>
                    <strong style={{ color: 'white', textAlign: 'right', flex: 1, marginLeft: '10px' }}>{generatedItinerary.formData.destination.split(',')[0]}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ride Duration:</span>
                    <strong style={{ color: 'white' }}>{generatedItinerary.formData.rideDurationDays}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', marginTop: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Road Distance:</span>
                    <strong style={{ color: 'var(--primary)' }}>{generatedItinerary.distance} KM</strong>
                  </div>
                </div>
              </div>

              {/* Expense Calculations */}
              <div className="glass-panel" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '14px', color: 'white', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={14} color="var(--secondary)" /> Fuel & Travel Expenses (Telangana Tariff)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Machine Mileage ({generatedItinerary.formData.bikeModel}):</span>
                    <strong style={{ color: 'white' }}>{generatedItinerary.mileageUsed} KM/L</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Petrol Needed ({generatedItinerary.formData.fuelType}):</span>
                    <strong style={{ color: 'white' }}>{generatedItinerary.fuelConsumption} L</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Fuel Cost (Telangana @ ₹{generatedItinerary.fuelPricePerLiter}/L):</span>
                    <strong style={{ color: 'var(--success)' }}>₹ {generatedItinerary.fuelCost}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Accommodation Estimate ({generatedItinerary.formData.hotelPreference}):</span>
                    <strong style={{ color: 'white' }}>₹ {generatedItinerary.hotelEstimate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Food / Highway Dhabas:</span>
                    <strong style={{ color: 'white' }}>₹ {generatedItinerary.foodEstimate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', marginTop: '4px', fontWeight: 'bold', fontSize: '13px' }}>
                    <span style={{ color: 'white' }}>Total Estimated Budget:</span>
                    <span style={{ color: 'var(--secondary)' }}>₹ {generatedItinerary.totalExpenses}</span>
                  </div>
                </div>
              </div>

              {/* Daily ride plan */}
              <div className="glass-panel" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '14px', color: 'white', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} color="var(--primary)" /> Route Itinerary
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {generatedItinerary.dailyPlan.map((p, idx) => (
                    <div key={idx} style={{ paddingLeft: '12px', borderLeft: '2px solid var(--primary)', fontSize: '12px', lineHeight: '1.4' }}>
                      <strong style={{ color: 'white', display: 'block', marginBottom: '2px' }}>Day {p.day}</strong>
                      <span style={{ color: 'var(--text-secondary)' }}>{p.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weather forecast */}
              <div className="glass-panel" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '14px', color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CloudSun size={14} color="var(--info)" /> Regional Weather
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '11px', lineHeight: '1.4' }}>
                  {generatedItinerary.weatherForecast}
                </p>
              </div>

              {/* Scenic Checkpoints & Rest Stops */}
              <div className="glass-panel" style={{ padding: '16px' }}>
                <h4 style={{ fontSize: '14px', color: 'white', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Compass size={14} color="var(--primary)" /> Suggested Scenic Views
                </h4>
                <ul style={{ paddingLeft: '16px', margin: '0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {generatedItinerary.scenicSpots.map((spot, idx) => (
                    <li key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{spot}</li>
                  ))}
                </ul>
              </div>

              {/* Famous Regional Food & Delicacies */}
              {generatedItinerary.foodRecommendations && (
                <div className="glass-panel" style={{ padding: '16px' }}>
                  <h4 style={{ fontSize: '14px', color: 'white', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🍔 Famous Food & Highway Dhabas
                  </h4>
                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <strong style={{ color: 'var(--secondary)', display: 'block', marginBottom: '4px' }}>
                        Region: {generatedItinerary.foodRecommendations.regionName}
                      </strong>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Local Delicacies to try: {generatedItinerary.foodRecommendations.delicacies.join(', ')}
                      </span>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                      <strong style={{ color: 'white', display: 'block', marginBottom: '6px' }}>Suggested Pitstops & Dhabas:</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {generatedItinerary.foodRecommendations.stops.map((stop, idx) => (
                          <div key={idx} style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'white', fontWeight: 'bold' }}>📍 {stop.name}</span>: {stop.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency details */}
              <div className="glass-panel" style={{ padding: '16px', borderLeft: '3px solid var(--accent)' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--accent)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={14} /> Emergency Points of Interest
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <div>
                    <strong style={{ color: 'white', display: 'block' }}>Hospital Support:</strong>
                    <span>{generatedItinerary.emergencyLocations.hospital}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'white', display: 'block' }}>Highway Repairs:</strong>
                    <span>{generatedItinerary.emergencyLocations.mechanic}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'white', display: 'block' }}>Fuel Stations:</strong>
                    <span>{generatedItinerary.emergencyLocations.fuelStation}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setGeneratedItinerary(null)}>
                  Recalculate
                </button>
                <button className="btn-primary" style={{ flex: 1.5 }} onClick={handleSaveAndConfirm}>
                  Save Itinerary
                </button>
              </div>
            </div>
          ) : (
            // Form Step state
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
              
              {/* Question header */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Question {step + 1} of {activeSteps.length}
                </span>
                <h3 style={{ fontSize: '18px', color: 'white', marginTop: '6px' }}>{currentStepInfo.title}</h3>
              </div>

              {/* Validation Error / Success banner */}
              {validationError && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  color: validationError.startsWith('✅') ? 'var(--success)' : 'var(--accent)', 
                  background: validationError.startsWith('✅') ? 'rgba(0,230,118,0.1)' : 'rgba(255,34,51,0.1)', 
                  border: validationError.startsWith('✅') ? '1px solid rgba(0,230,118,0.2)' : '1px solid rgba(255,34,51,0.2)', 
                  padding: '10px 12px', 
                  borderRadius: '10px', 
                  fontSize: '12px', 
                  marginBottom: '14px' 
                }} className="animate-fade-in">
                  <AlertCircle size={16} color={validationError.startsWith('✅') ? 'var(--success)' : 'var(--accent)'} />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Display specific input forms */}
              <div style={{ flex: 1 }}>
                
                {/* Geocoding Cities Auto-suggestion Step */}
                {currentStepInfo.key === 'route' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-fade-in">
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Enter Indian towns (e.g. Jammu, Hyderabad, Mumbai, Pune, Leh). Suggestions update as you type.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                      
                      {/* Start Location Input */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Starting City</label>
                        <MapPin size={16} color="var(--primary)" style={{ position: 'absolute', left: '12px', top: '31px' }} />
                        <input
                          type="text"
                          placeholder="Type 1+ letters (e.g. J)"
                          value={formData.startLocation}
                          onChange={(e) => handleInputChange('startLocation', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                          style={{ width: '100%', paddingLeft: '38px', fontSize: '13px' }}
                        />
                        {/* Start Suggestions Dropdown */}
                        {startSuggestions.length > 0 && (
                          <div className="glass-panel animate-zoom-in" style={{ position: 'absolute', top: '65px', left: 0, right: 0, zIndex: 120, background: '#121217', maxHeight: '180px', overflowY: 'auto', border: '1.5px solid var(--primary)', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
                            {startSuggestions.map((city, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => handleSelectStartSuggestion(city)}
                                className="suggestion-item"
                                style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', cursor: 'pointer', color: 'white' }}
                              >
                                📍 {city.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Destination Input */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Destination</label>
                        <MapPin size={16} color="var(--secondary)" style={{ position: 'absolute', left: '12px', top: '31px' }} />
                        <input
                          type="text"
                          placeholder="Type 1+ letters (e.g. H)"
                          value={formData.destination}
                          onChange={(e) => handleInputChange('destination', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                          style={{ width: '100%', paddingLeft: '38px', fontSize: '13px' }}
                        />
                        {/* Destination Suggestions Dropdown */}
                        {destSuggestions.length > 0 && (
                          <div className="glass-panel animate-zoom-in" style={{ position: 'absolute', top: '65px', left: 0, right: 0, zIndex: 120, background: '#121217', maxHeight: '180px', overflowY: 'auto', border: '1.5px solid var(--primary)', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
                            {destSuggestions.map((city, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => handleSelectDestSuggestion(city)}
                                className="suggestion-item"
                                style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', cursor: 'pointer', color: 'white' }}
                              >
                                🏁 {city.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Intermediate Stops (Multiple with + Icon) */}
                      <div style={{ position: 'relative', marginTop: '10px' }}>
                        <label style={{ fontSize: '12px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span>Intermediate Stops (Optional)</span>
                          <button 
                            type="button"
                            onClick={() => setWaypoints(prev => [...prev, { id: Date.now(), name: '', coords: null, suggestions: [], selected: false }])}
                            style={{ color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <PlusCircle size={14} /> Add Stop
                          </button>
                        </label>
                        
                        {waypoints.map((wp, idx) => (
                          <div key={wp.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', position: 'relative', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <MapPin size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                              <input
                                type="text"
                                placeholder={`Stop #${idx + 1}`}
                                value={wp.name}
                                onChange={(e) => handleWaypointChange(idx, e.target.value)}
                                style={{ width: '100%', paddingLeft: '32px', fontSize: '12px', height: '36px', background: '#1c1c24' }}
                              />
                              {wp.suggestions && wp.suggestions.length > 0 && (
                                <div className="glass-panel animate-zoom-in" style={{ position: 'absolute', top: '38px', left: 0, right: 0, zIndex: 120, background: '#121217', maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                  {wp.suggestions.map((city, cidx) => (
                                    <div 
                                      key={cidx} 
                                      onClick={() => handleSelectWaypointSuggestion(idx, city)}
                                      className="suggestion-item"
                                      style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', cursor: 'pointer', color: 'white' }}
                                    >
                                      📍 {city.name.split(',')[0]}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button 
                              type="button"
                              onClick={() => setWaypoints(prev => prev.filter(w => w.id !== wp.id))}
                              style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '6px' }}
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Return Route Step (dynamically inserted if Round Trip selected) */}
                {currentStepInfo.key === 'returnRoute' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} className="animate-fade-in">
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Enter the return route details (you can customize starting point, destination, and return stops).
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                      
                      {/* Return Start Location Input */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Return Start City</label>
                        <MapPin size={16} color="var(--primary)" style={{ position: 'absolute', left: '12px', top: '31px' }} />
                        <input
                          type="text"
                          placeholder="Type return starting city"
                          value={returnStartLocation}
                          onChange={(e) => {
                            setReturnStartLocation(e.target.value);
                            setReturnStartSelected(false);
                            setReturnStartCoords(null);
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                          style={{ width: '100%', paddingLeft: '38px', fontSize: '13px', background: '#1c1c24' }}
                        />
                        {returnStartSuggestions.length > 0 && (
                          <div className="glass-panel animate-zoom-in" style={{ position: 'absolute', top: '65px', left: 0, right: 0, zIndex: 120, background: '#121217', maxHeight: '180px', overflowY: 'auto', border: '1.5px solid var(--primary)', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
                            {returnStartSuggestions.map((city, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => {
                                  setReturnStartCoords({ lat: city.lat, lon: city.lon });
                                  setReturnStartLocation(city.name);
                                  setReturnStartSelected(true);
                                  setReturnStartSuggestions([]);
                                }}
                                className="suggestion-item"
                                style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', cursor: 'pointer', color: 'white' }}
                              >
                                📍 {city.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Return Destination Input */}
                      <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Return Destination</label>
                        <MapPin size={16} color="var(--secondary)" style={{ position: 'absolute', left: '12px', top: '31px' }} />
                        <input
                          type="text"
                          placeholder="Type return destination"
                          value={returnDestination}
                          onChange={(e) => {
                            setReturnDestination(e.target.value);
                            setReturnDestSelected(false);
                            setReturnDestCoords(null);
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                          style={{ width: '100%', paddingLeft: '38px', fontSize: '13px', background: '#1c1c24' }}
                        />
                        {returnDestSuggestions.length > 0 && (
                          <div className="glass-panel animate-zoom-in" style={{ position: 'absolute', top: '65px', left: 0, right: 0, zIndex: 120, background: '#121217', maxHeight: '180px', overflowY: 'auto', border: '1.5px solid var(--primary)', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
                            {returnDestSuggestions.map((city, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => {
                                  setReturnDestCoords({ lat: city.lat, lon: city.lon });
                                  setReturnDestination(city.name);
                                  setReturnDestSelected(true);
                                  setReturnDestSuggestions([]);
                                }}
                                className="suggestion-item"
                                style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', cursor: 'pointer', color: 'white' }}
                              >
                                🏁 {city.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Return Intermediate Stops */}
                      <div style={{ position: 'relative', marginTop: '10px' }}>
                        <label style={{ fontSize: '12px', color: 'white', display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span>Return Waypoints (Optional)</span>
                          <button 
                            type="button"
                            onClick={() => setReturnWaypoints(prev => [...prev, { id: Date.now(), name: '', coords: null, suggestions: [], selected: false }])}
                            style={{ color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <PlusCircle size={14} /> Add Return Stop
                          </button>
                        </label>
                        
                        {returnWaypoints.map((wp, idx) => (
                          <div key={wp.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', position: 'relative', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <MapPin size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
                              <input
                                type="text"
                                placeholder={`Stop #${idx + 1}`}
                                value={wp.name}
                                onChange={(e) => handleReturnWaypointChange(idx, e.target.value)}
                                style={{ width: '100%', paddingLeft: '32px', fontSize: '12px', height: '36px', background: '#1c1c24' }}
                              />
                              {wp.suggestions && wp.suggestions.length > 0 && (
                                <div className="glass-panel animate-zoom-in" style={{ position: 'absolute', top: '38px', left: 0, right: 0, zIndex: 120, background: '#121217', maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                  {wp.suggestions.map((city, cidx) => (
                                    <div 
                                      key={cidx} 
                                      onClick={() => handleSelectReturnWaypointSuggestion(idx, city)}
                                      className="suggestion-item"
                                      style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '11px', cursor: 'pointer', color: 'white' }}
                                    >
                                      📍 {city.name.split(',')[0]}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button 
                              type="button"
                              onClick={() => setReturnWaypoints(prev => prev.filter(w => w.id !== wp.id))}
                              style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '6px' }}
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Calendar Date & Time Input Step (Merged) */}
                {currentStepInfo.key === 'rideDates' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Select departure date and start timing window.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Departure Date</label>
                        <input
                          type="date"
                          value={formData.rideDates}
                          min={getTodayDateString()}
                          onChange={(e) => handleInputChange('rideDates', e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                          style={{ width: '100%', fontSize: '14px', background: '#1c1c24' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Start Timing Window</label>
                        <select
                          value={formData.rideTiming}
                          onChange={(e) => handleInputChange('rideTiming', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', fontSize: '13px', background: '#1c1c24', color: 'white', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}
                        >
                          <option value="Dawn (4 AM - 6 AM)" disabled={formData.rideDates === getTodayDateString() && new Date().getHours() >= 6}>Dawn (4 AM - 6 AM)</option>
                          <option value="Morning (6 AM - 12 PM)" disabled={formData.rideDates === getTodayDateString() && new Date().getHours() >= 12}>Morning (6 AM - 12 PM)</option>
                          <option value="Afternoon (12 PM - 4 PM)" disabled={formData.rideDates === getTodayDateString() && new Date().getHours() >= 16}>Afternoon (12 PM - 4 PM)</option>
                          <option value="Sunset / Night (4 PM onwards)" disabled={formData.rideDates === getTodayDateString() && new Date().getHours() >= 21}>Sunset / Night (4 PM onwards)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* SEARCHABLE BIKE MODEL STEP */}
                {currentStepInfo.key === 'bikeModel' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }} className="animate-fade-in">
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      Type 1+ letters of your bike (e.g. R, Classic, KTM, Pulsar). If not in the database, click register to save it!
                    </p>
                    <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        placeholder="Search bike (e.g. Classic 350)" 
                        value={bikeSearch}
                        onChange={(e) => {
                          setBikeSearch(e.target.value);
                          setBikeSelected(false);
                          setFormData(prev => ({ ...prev, bikeModel: '' })); // clear active selection until suggestion is clicked
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        style={{ flex: 1, fontSize: '13px' }}
                      />
                      <button 
                        onClick={handleRegisterCustomBike}
                        className="btn-primary" 
                        style={{ padding: '8px 14px', fontSize: '11px', gap: '4px', borderRadius: '10px' }}
                      >
                        <PlusCircle size={14} /> Register
                      </button>
                    </div>

                    {/* Bike selection confirmation tag */}
                    {formData.bikeModel && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', color: 'var(--success)', fontWeight: 'bold' }}>
                        <span>Selected Machine: {formData.bikeModel}</span>
                      </div>
                    )}

                    {/* Autocomplete bike suggestions list */}
                    {bikeSuggestions.length > 0 && (
                      <div className="glass-panel" style={{ zIndex: 120, background: '#121217', maxHeight: '200px', overflowY: 'auto' }}>
                        {bikeSuggestions.map((bike, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => handleSelectBikeOption(bike)}
                            className="suggestion-item"
                            style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', color: 'white' }}
                          >
                            <span>🏍️ {bike.name}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{bike.type}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Standard Select Options Step */}
                {currentStepInfo.type === 'select' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }} className="scroll-y animate-fade-in">
                    {currentStepInfo.options.map((opt, idx) => {
                      const isSelected = formData[currentStepInfo.key] === opt;
                      return (
                        <button
                          key={opt}
                          className="glass-panel"
                          onClick={() => handleInputChange(currentStepInfo.key, opt)}
                          style={{
                            padding: '14px',
                            textAlign: 'left',
                            borderRadius: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                            background: isSelected ? 'rgba(255, 85, 0, 0.05)' : 'var(--glass-bg)',
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: isSelected ? '600' : 'normal', color: isSelected ? 'white' : 'var(--text-secondary)' }}>{opt}</span>
                          {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />}
                        </button>
                      );
                    })}
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginTop: '24px' }}>
                <button 
                  onClick={handlePrev} 
                  disabled={step === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', color: step === 0 ? 'var(--text-muted)' : 'var(--text-secondary)' }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleNext}
                  style={{ padding: '12px 20px', borderRadius: '10px', fontSize: '13px' }}
                >
                  {step === activeSteps.length - 1 ? 'Read Precautions' : 'Continue'} <ArrowRight size={14} />
                </button>
              </div>

            </div>
          )}
        </div>
      </div>

       {/* IN-APP VALIDATION ERROR POPUP OVERLAY */}
       {showValidationPopup && (
         <div className="bottom-sheet-overlay animate-fade-in" style={{ zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <div className="glass-panel animate-zoom-in" style={{ width: '85%', maxWidth: '320px', padding: '24px 20px', background: '#121217', borderColor: 'var(--accent)', textAlign: 'center', boxShadow: '0 8px 32px rgba(255,34,51,0.25)', borderRadius: '20px' }}>
             <AlertCircle size={40} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
             <h3 style={{ fontSize: '16px', color: 'white', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Please enter the detail correctly</h3>
             <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '18px' }}>{validationError}</p>
             <button className="btn-primary" style={{ padding: '10px 16px', fontSize: '12px', width: '100%', background: 'linear-gradient(135deg, var(--accent) 0%, #d32f2f 100%)', border: 'none', boxShadow: '0 4px 12px rgba(255,34,51,0.3)', color: 'white' }} onClick={() => setShowValidationPopup(false)}>
               Got it
             </button>
           </div>
         </div>
       )}

       {/* SUCCESS SAFE JOURNEY & QUOTE OVERLAY */}
       {showSuccessOverlay && (
         <div className="bottom-sheet-overlay animate-fade-in" style={{ zIndex: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 5, 6, 0.95)' }}>
           <div className="glass-panel animate-zoom-in" style={{ width: '85%', maxWidth: '340px', padding: '30px 20px', background: 'radial-gradient(circle, #20130c 0%, #0c0c0e 100%)', borderColor: 'var(--primary)', textAlign: 'center', boxShadow: '0 10px 40px rgba(255,85,0,0.3)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
             <div className="animate-pulse-biker" style={{ fontSize: '56px', marginBottom: '16px' }}>🏍️</div>
             
             <h2 style={{ fontSize: '22px', fontFamily: 'var(--font-display)', color: 'white', marginBottom: '12px' }}>
               Have a Safe Journey!
             </h2>
             
             <div style={{ width: '40px', height: '2px', backgroundColor: 'var(--primary)', margin: '0 auto 16px' }} />
             
             <p style={{ fontSize: '13px', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: '1.5', padding: '0 10px', marginBottom: '24px' }}>
               "{selectedQuote}"
             </p>
             
             <div style={{ position: 'relative', width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginBottom: '20px' }}>
               <div className="animate-progress-bar" style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />
             </div>
             
             <div style={{ 
               display: 'inline-flex', 
               alignItems: 'center', 
               gap: '6px', 
               background: 'rgba(0, 230, 118, 0.1)', 
               border: '1px solid rgba(0, 230, 118, 0.2)', 
               padding: '8px 16px', 
               borderRadius: '30px', 
               fontSize: '12px', 
               color: 'var(--success)', 
               fontWeight: 'bold', 
               boxShadow: '0 4px 12px rgba(0,230,118,0.15)',
               marginTop: '4px'
             }}>
               ✅ {editingRide ? "Ride successfully updated" : "Ride successfully added"}
             </div>
           </div>
         </div>
       )}

     </div>
   );
 }
