import { createClient } from '@supabase/supabase-js';

const url = 'https://dssezlmepxplwdicyjvq.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzc2V6bG1lcHhwbHdkaWN5anZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjE0OTIsImV4cCI6MjA5NTUzNzQ5Mn0.qUDpVo-VLp1GY4bzpimN8RkJjHrCNeBiTXg2v0XMWHc';

const supabase = createClient(url, anonKey);

async function testAuthenticatedJoin() {
  const email = 'test22@helpriders.com';
  const password = 'testing22';
  const rideId = 'social-1780421166408';

  console.log("Signing in...");
  let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.log("Sign in failed, trying to sign up...");
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          mobile: '+91 99999 22222',
          full_name: 'Rider TwentyTwo'
        }
      }
    });

    if (signUpError) {
      console.error("Sign up failed:", signUpError.message);
      return;
    }
    console.log("Sign up succeeded!");
    authData = signUpData;
  } else {
    console.log("Sign in succeeded!");
  }

  // Get current session token
  const session = authData.session;
  if (!session) {
    console.error("No active session. Email verification might be required.");
    return;
  }

  // Fetch current ride details
  const { data: rides, error: fetchErr } = await supabase
    .from('rides')
    .select('*')
    .eq('id', rideId);

  if (fetchErr || !rides || rides.length === 0) {
    console.error("Fetch error or ride not found:", fetchErr?.message);
    return;
  }

  const ride = rides[0];
  console.log("Current join requests count:", ride.join_requests?.length || 0);

  // Submit join request
  const newRequest = {
    id: 'req-test-' + Date.now(),
    user_id: authData.user.id,
    name: 'Rider TwentyTwo',
    bikeModel: 'Royal Enfield Classic 350',
    phone: '9999922222',
    age: '25',
    crewType: 'Solo',
    status: 'Pending',
    isMe: true
  };

  const updatedJoinRequests = [...(ride.join_requests || []), newRequest];

  console.log("Submitting join request under authenticated user session...");
  const { data: updatedRide, error: updateErr } = await supabase
    .from('rides')
    .update({
      join_requests: updatedJoinRequests,
      joined_count: (ride.joined_count || 1) + 1
    })
    .eq('id', rideId)
    .select();

  if (updateErr) {
    console.error("Update failed:", updateErr.message);
    return;
  }

  console.log("Update response data length:", updatedRide?.length || 0);
  if (updatedRide && updatedRide.length > 0) {
    console.log("Join requests updated successfully in DB! Current count:", updatedRide[0].join_requests.length);
    console.log("Latest request in DB:", updatedRide[0].join_requests[updatedRide[0].join_requests.length - 1]);
  } else {
    console.error("RLS blocked the update - returned empty list.");
  }
}

testAuthenticatedJoin();
