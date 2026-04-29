# Spotify Jam Sesh

A React Native social music app built on Expo. Users connect their Spotify account, listen to music together in real-time rooms, discover others based on music taste similarity, match with people they like, and chat directly.

---

## Features

### Listening Rooms
- A host creates a room and shares a 4-letter code
- Listeners join on any device, no shared network required
- The host picks tracks via Spotify search; Firebase broadcasts the track and position to every listener
- Each listener's Spotify app syncs automatically with drift correction every 30 seconds
- In-room live chat and a listener list with host badge
- Track rating modal (1-10 scale) saved per user

### Music Taste Matching
- Discover screen shows public profiles ranked by taste similarity
- Swipe right to like, swipe left to pass (full gesture with rotation and LIKE/PASS stamp overlay)
- Similarity score is calculated using cosine similarity on genre vectors (70%) and Jaccard similarity on artist sets (30%)
- Mutual likes create a match and open a chat
- Match chat supports real-time messaging and a Jam Together button that creates a room and sends a tappable invite card into the conversation
- Profiles are anonymous until both matched users opt in to share their Spotify photo

### Friends
- Instagram-style friend request system: send, cancel, accept, or decline requests
- Only mutual friends appear in the Friends list
- Friend requests show contextual state per search result: Add / Requested / Friends / Wants to add you

### Direct Messages
- Persistent 1-to-1 chat between friends stored in Firebase forever
- DM list screen sorted by latest message with unread indicators
- Accessible from the Friends tab via the message button next to each friend

### Listening Stats
- Top 5 artists and tracks across three time ranges: 4 Weeks, 6 Months, All Time
- Displays artist photos, album art, and Spotify popularity bars

### Authentication
- Spotify OAuth 2.0 with PKCE — no client secret required
- Token and refresh token persisted to AsyncStorage; app restores the session silently on every launch
- If the token is expired, a silent refresh runs before the home screen loads
- Persistent user identity stored in AsyncStorage (UUID generated once on first launch)

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Expo Go](https://expo.dev/go) on your Android device (SDK 55)
- A Spotify Premium account (free tier cannot control playback via API)
- A [Spotify Developer](https://developer.spotify.com/dashboard) app
- A [Firebase](https://console.firebase.google.com/) project with Realtime Database enabled

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd Spotify_Jamz
npm install
```

### 2. Spotify Developer setup

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app
2. Add the following to Redirect URIs:
   - `spotifyjamsesh://callback`
   - `exp://127.0.0.1:8081/--/callback` (for Expo Go on a local device)
3. Copy the Client ID

### 3. Firebase setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Realtime Database
3. Deploy the included security rules: `firebase deploy --only database`
4. Copy your Firebase config from Project Settings

### 4. Environment variables

Create a `.env` file in the project root:

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_DATABASE_URL=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
SPOTIFY_CLIENT_ID=
```

### 5. Run

```bash
npx expo start
```

Scan the QR code with Expo Go.

---

## Project Structure

```
src/
├── constants/
│   ├── colors.js               # Color tokens
│   └── index.js                # Scopes, sync intervals, DB keys
├── hooks/
│   ├── useAuth.js              # Persistent UID + Spotify token with silent refresh
│   ├── useProfile.js           # Real-time profile subscription
│   ├── useRoom.js              # Room subscription and sync orchestration
│   └── useRoomContext.js       # Broadcast ref shared across screens
├── navigation/
│   └── AppNavigator.js         # Stack + bottom tab navigator, auth gate
├── screens/
│   ├── LoginScreen.js          # Spotify OAuth with PKCE
│   ├── HomeScreen.js           # Create / join room
│   ├── RoomScreen.js           # Live room: playback, chat, listeners, rating
│   ├── SearchScreen.js         # Spotify track search (host only)
│   ├── ProfileScreen.js        # User profile editor
│   ├── ProfileSetupScreen.js   # First-time profile creation
│   ├── DiscoverScreen.js       # Swipe cards ranked by taste similarity
│   ├── MatchesScreen.js        # List of mutual matches
│   ├── MatchChatScreen.js      # Match chat with profile reveal and Jam Together
│   ├── FriendsScreen.js        # Friend requests, search, friends list
│   ├── DMListScreen.js         # All direct message conversations
│   ├── DMChatScreen.js         # Persistent 1-to-1 direct message chat
│   └── StatsScreen.js          # Spotify listening stats with artwork
├── services/
│   ├── firebase.js             # Firebase app init
│   ├── spotify.js              # OAuth + Web API helpers
│   ├── roomService.js          # Room CRUD, chat, track rating
│   ├── userService.js          # Profile CRUD, online status
│   ├── matchService.js         # Likes, passes, matches, match chat, pfp reveal
│   ├── friendRequestService.js # Friend requests and mutual friendship management
│   └── dmService.js            # Direct message creation and real-time sync
└── utils/
    ├── syncEngine.js           # Drift detection and seek logic
    └── similarity.js           # Cosine and Jaccard similarity for taste matching
```

---

## Firebase Realtime Database Schema

```
rooms/$roomCode
  code, hostId, hostDisplayName, createdAt, ended
  playback/  trackUri, trackName, artistName, albumArt, isPlaying, positionMs, updatedAt
  listeners/$uid/  displayName, joinedAt
  chat/$msgId/  uid, displayName, text, sentAt

users/$uid
  nickname, emoji, isPublic, topGenres[], topArtists[]
  spotifyDisplayName, spotifyAvatar, followerCount, createdAt
  ratings/$trackId/  trackUri, trackName, artistName, rating, ratedAt

likes/$fromUid/$toUid         true
passed/$fromUid/$toUid        true

matches/$matchId
  user1, user2, score, createdAt
  pfpShared/$uid              spotifyAvatarUrl
  chat/$msgId/  uid, displayName, text, sentAt, type?, roomCode?

friendRequests/$toUid/$fromUid
  fromUid, nickname, emoji, sentAt

friends/$uid/$friendUid
  uid, nickname, emoji, addedAt

dms/$dmId
  info/  participants, createdAt
  messages/$msgId/  uid, displayName, text, sentAt

userDMs/$uid/$dmId
  dmId, otherUid, otherNickname, otherEmoji, lastText, lastAt, unread
```

---

## Sync Strategy

| Event | Behavior |
|---|---|
| Host changes track | Firebase playback node updated with track URI, position, and timestamp |
| Listener receives update | Calculates network delay from updatedAt, seeks to positionMs + delay |
| Drift correction (every 30s) | Listener fetches local Spotify position, seeks if drift exceeds 2000ms |
| Listener joins mid-song | Same sync logic on first snapshot |
| Host ends room | ended: true written to room, listeners shown an alert and returned to Home |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo SDK 55 |
| Navigation | React Navigation 6 (stack + bottom tabs) |
| Auth | Spotify OAuth 2.0 PKCE via expo-auth-session |
| Spotify Data | Spotify Web API (REST) |
| Real-time sync | Firebase Realtime Database |
| Persistence | AsyncStorage (UID, token, refresh token) |
| Gestures | react-native-gesture-handler |

---

## Known Limitations

- Spotify Premium is required for playback control via the API
- The Spotify app must be open and active on each device for sync to work
- Sync tolerance is approximately 1-2 seconds over a typical internet connection
- Anonymous profiles use a custom emoji and nickname — no photo until both matched users opt in
