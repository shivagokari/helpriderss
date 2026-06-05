const url = 'https://dssezlmepxplwdicyjvq.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzc2V6bG1lcHhwbHdkaWN5anZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjE0OTIsImV4cCI6MjA5NTUzNzQ5Mn0.qUDpVo-VLp1GY4bzpimN8RkJjHrCNeBiTXg2v0XMWHc';

async function fetchRides() {
  try {
    const res = await fetch(`${url}/rest/v1/rides?select=*`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    const data = await res.json();
    console.log("Rides count:", data.length);
    if (data.length > 0) {
      data.forEach(r => {
        console.log(`ID: ${r.id}, Title: ${r.title}, Creator: ${r.creator}, UserID: ${r.user_id}, JoinRequests:`, r.join_requests);
      });
    }
  } catch (err) {
    console.error("Failed to fetch rides:", err);
  }
}

fetchRides();
