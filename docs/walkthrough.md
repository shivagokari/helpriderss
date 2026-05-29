# Walkthrough - Supabase Database Migration & Real-Time Social Features

We have successfully migrated the application's profile and social data storage from `localStorage` to **Supabase**! The site now functions like a real platform, persisting and sharing accounts, unique IDs, friendship connections, and messages between connected users.

---

## Technical Implementations

### 1. Database Schema Configurations
* **Dev Contacts**: Form submissions are stored directly in the `dev_contacts` table in Supabase.
* **Profiles Upgrade**: Added the `unique_id`, `name`, `garage` (JSONB array), and `emergency_contacts` (JSONB array) columns to the `profiles` table.
* **Friend Connections**: Friend requests, accepts, and blocks are tracked globally via the `friend_requests` table.
* **Direct Messaging**: Direct messages are logged in the `messages` table.

### 2. Session & Auto-Login upgrades ([LoginScreen.jsx](file:///c:/Users/ymn%20safety/OneDrive/Desktop/Anti%20grvty/bikers/src/components/LoginScreen.jsx))
* During sign-in or auto-login, the client queries the `profiles` table.
* If a profile lacks a `unique_id`, one is generated (e.g. `HR-XXXXX`) and saved to the database.
* During sign-up, the user profile is inserted with a newly generated `unique_id`.

### 3. Dynamic Profile & Relationship Syncing ([Profile.jsx](file:///c:/Users/ymn%20safety/OneDrive/Desktop/Anti%20grvty/bikers/src/components/Profile.jsx))
* **Garage & Contacts**: Custom bikes and emergency contacts are now saved directly into the database profiles, syncing across devices.
* **Search Rider**: Users search for other riders by their unique `HR-XXXXX` ID.
* **Friend Requests**: Connections are request-based. Users see pending requests and can accept or reject them.
* **Blocking**: Blocking deletes any mutual friendships/pending requests and sets a block relation, preventing future connections.

### 4. Real-Time Rich Chat Room ([Profile.jsx](file:///c:/Users/ymn%20safety/OneDrive/Desktop/Anti%20grvty/bikers/src/components/Profile.jsx))
* Spawns a real-time postgres changes channel subscription.
* Chat window loads messages dynamically and appends sent messages instantly.
* Parsers are in place for coordinate points (mapping to Google Maps), link references, and inline images (.png, .jpg, .gif).

---

## Deployment Status

* **GitHub Push**: Completed successfully!
* **Vercel Live URL**: **https://helpriderss.vercel.app** (Auto-deploying commit `419e4f5`).
