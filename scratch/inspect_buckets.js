const url = 'https://dssezlmepxplwdicyjvq.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzc2V6bG1lcHhwbHdkaWN5anZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjE0OTIsImV4cCI6MjA5NTUzNzQ5Mn0.qUDpVo-VLp1GY4bzpimN8RkJjHrCNeBiTXg2v0XMWHc';

async function inspectBuckets() {
  try {
    const res = await fetch(`${url}/storage/v1/bucket`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    const data = await res.json();
    console.log("Storage buckets:", data);
  } catch (err) {
    console.error("Failed to inspect storage buckets:", err);
  }
}

inspectBuckets();
