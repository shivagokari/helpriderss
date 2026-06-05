const url = 'https://dssezlmepxplwdicyjvq.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzc2V6bG1lcHhwbHdkaWN5anZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjE0OTIsImV4cCI6MjA5NTUzNzQ5Mn0.qUDpVo-VLp1GY4bzpimN8RkJjHrCNeBiTXg2v0XMWHc';

async function testJoin() {
  const rideId = 'social-1780421166408';
  
  // Fetch current ride details
  const fetchRes = await fetch(`${url}/rest/v1/rides?id=eq.${rideId}&select=*`, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });
  
  const rides = await fetchRes.json();
  if (rides.length === 0) {
    console.error("Ride not found");
    return;
  }
  
  const ride = rides[0];
  console.log("Current join requests:", ride.join_requests);

  // Attempt to update
  const newRequest = {
    id: 'req-test-' + Date.now(),
    user_id: null,
    name: 'Verification Bot',
    bikeModel: 'Royal Enfield Classic 350',
    phone: '9876543210',
    age: '25',
    crewType: 'Solo',
    status: 'Pending',
    isMe: true
  };
  const updatedJoinRequests = [...(ride.join_requests || []), newRequest];

  console.log("Attempting to update join_requests...");
  const updateRes = await fetch(`${url}/rest/v1/rides?id=eq.${rideId}`, {
    method: 'PATCH',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation' // This corresponds to .select() in Supabase JS!
    },
    body: JSON.stringify({
      join_requests: updatedJoinRequests,
      joined_count: (ride.joined_count || 1) + 1
    })
  });

  const updatedData = await updateRes.json();
  console.log("Response status:", updateRes.status);
  console.log("Response data:", updatedData);
}

testJoin();
