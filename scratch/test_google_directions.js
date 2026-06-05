import { getGoogleMapsRoute } from '../src/utils/geo.js';

async function run() {
  const coords = [
    { lat: 17.4834, lon: 78.4084 }, // Kukatpally, Hyderabad
    { lat: 17.0675, lon: 78.2045 }  // Shadnagar
  ];
  
  console.log("Testing getGoogleMapsRoute...");
  try {
    const result = await getGoogleMapsRoute(coords);
    console.log("Calculated Distance:", result.distance, "KM");
    console.log("Detailed coordinates count:", result.routeCoords.length);
    if (result.routeCoords.length > 0) {
      console.log("First point:", result.routeCoords[0]);
      console.log("Last point:", result.routeCoords[result.routeCoords.length - 1]);
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

run();
