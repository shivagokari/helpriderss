const url = 'https://dssezlmepxplwdicyjvq.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzc2V6bG1lcHhwbHdkaWN5anZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjE0OTIsImV4cCI6MjA5NTUzNzQ5Mn0.qUDpVo-VLp1GY4bzpimN8RkJjHrCNeBiTXg2v0XMWHc';

async function inspect() {
  try {
    const res = await fetch(`${url}/rest/v1/profiles?select=*&limit=1`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    const data = await res.json();
    console.log("Profile keys:", data.length > 0 ? Object.keys(data[0]) : "No profiles found");
    if (data.length > 0) {
      console.log("Full profile data example:", data[0]);
    }
  } catch (err) {
    console.error("Failed to inspect profiles:", err);
  }
}

inspect();
