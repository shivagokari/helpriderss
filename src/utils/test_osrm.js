async function testOSRM() {
  const coords = [
    { lat: 17.4834, lon: 78.4084 }, // Kukatpally
    { lat: 16.0747, lon: 78.8687 }  // Srisailam
  ];
  const coordString = coords.map(c => `${c.lon},${c.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=false`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'HelpridersBikerPlannerApp/2.0 (contact@helpriders.com)'
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      console.log("Distance in KM:", Math.round(data.routes[0].distance / 1000));
    } else {
      console.log("No routes found:", data);
    }
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testOSRM();
