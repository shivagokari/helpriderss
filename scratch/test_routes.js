const routes = [
  {
    name: "Kukatpally to Srisailam",
    coords: [{ lat: 17.4834, lon: 78.4084 }, { lat: 16.0747, lon: 78.8687 }],
    gmaps: 233
  },
  {
    name: "Hyderabad to Warangal",
    coords: [{ lat: 17.3850, lon: 78.4867 }, { lat: 17.9689, lon: 79.5941 }],
    gmaps: 146
  },
  {
    name: "Hyderabad to Vijayawada",
    coords: [{ lat: 17.3850, lon: 78.4867 }, { lat: 16.5062, lon: 80.6480 }],
    gmaps: 274
  },
  {
    name: "Hyderabad to Bangalore",
    coords: [{ lat: 17.3850, lon: 78.4867 }, { lat: 12.9716, lon: 77.5946 }],
    gmaps: 575
  }
];

async function testRoutes() {
  for (const r of routes) {
    const coordString = r.coords.map(c => `${c.lon},${c.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=false`;
    
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'HelpridersBikerPlannerApp/2.0 (contact@helpriders.com)' }
      });
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const rawKm = Math.round(data.routes[0].distance / 1000);
        const calibratedKm = Math.round((data.routes[0].distance / 1000) * 0.925);
        console.log(`${r.name}:`);
        console.log(`  Google Maps: ${r.gmaps} KM`);
        console.log(`  Raw OSRM:    ${rawKm} KM (diff: ${rawKm - r.gmaps} KM)`);
        console.log(`  With 0.925:  ${calibratedKm} KM (diff: ${calibratedKm - r.gmaps} KM)`);
      }
    } catch (err) {
      console.error(`Failed for ${r.name}:`, err.message);
    }
  }
}

testRoutes();
