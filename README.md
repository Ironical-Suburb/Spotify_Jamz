# 🎵 Spotify Jam Sesh

Listen to the same Spotify song with friends and strangers in real time — no shared network required.

---

## How It Works

1. A **host** logs in with Spotify, creates a room, and gets a 4-letter code.
2. **Listeners** enter that code on their device.
3. The host picks a song — Firebase broadcasts the track + position to every listener.
4. Each listener's Spotify app syncs automatically, accounting for network delay.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
- [Expo Go](https://expo.dev/go) app on your Android device (for testing)
- A **Spotify Premium** account (free tier cannot control playback via API)
- A [Spotify Developer](https://developer.spotify.com/dashboard) account
- A [Firebase](https://console.firebase.google.com/) project

---

## Setup

### 1. Clone & Install

```bash
cd SpotifyJamSesh
npm install
```

### 2. Spotify Developer Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `spotifyjamsesh://callback` to **Redirect URIs**
4. Copy your **Client ID** and **Client Secret**

### 3. Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Realtime Database** (start in test mode for development)
3. Enable **Anonymous Authentication** under Authentication → Sign-in methods
4. Copy your Firebase config from Project Settings → Your Apps

### 4. Environment Variables

```bash
cp .env.example .env
```

Fill in your `.env` with the values from steps 2 and 3.

### 5. Run on Android

```bash
npm run android
# or
expo start   # then press 'a' for Android
```

---

## Project Structure

```
SpotifyJamSesh/
├── App.js                    # Entry point
├── app.json                  # Expo config
├── .env.example              # Env var template (copy to .env)
└── src/
    ├── constants/
    │   ├── colors.js         # All colour tokens
    │   └── index.js          # App-wide constants (scopes, intervals etc.)
    ├── hooks/
    │   ├── useAuth.js        # Firebase anonymous auth + Spotify token context
    │   └── useRoom.js        # Room subscription, sync orchestration
    ├── navigation/
    │   └── AppNavigator.js   # Stack navigator, auth gate
    ├── screens/
    │   ├── LoginScreen.js    # Spotify OAuth login
    │   ├── HomeScreen.js     # Create / join a room
    │   ├── RoomScreen.js     # Live room view (host + listener)
    │   └── SearchScreen.js   # Spotify track search (host only)
    ├── services/
    │   ├── firebase.js       # Firebase app init
    │   ├── spotify.js        # Spotify OAuth + Web API helpers
    │   └── roomService.js    # Firebase room CRUD + real-time subscription
    └── utils/
        └── syncEngine.js     # Drift detection + seek logic
```

---

## Firebase Realtime DB Schema

```json
{
  "rooms": {
    "X7K2": {
      "code": "X7K2",
      "hostId": "firebase-uid",
      "hostDisplayName": "Priyanshu",
      "createdAt": 1712345678,
      "ended": false,
      "playback": {
        "trackUri": "spotify:track:abc123",
        "trackName": "Blinding Lights",
        "artistName": "The Weeknd",
        "albumArt": "https://...",
        "isPlaying": true,
        "positionMs": 34200,
        "updatedAt": 1712345700000
      },
      "listeners": {
        "firebase-uid": { "displayName": "Priyanshu", "joinedAt": 1712345678 },
        "other-uid":    { "displayName": "Alex",      "joinedAt": 1712345690 }
      }
    }
  }
}
```

---

## Sync Strategy

| Event | What Happens |
|---|---|
| Host plays/changes track | Firebase `playback` node updated with `trackUri`, `positionMs`, `updatedAt` |
| Listener receives update | Calculates `networkDelay = now - updatedAt`, seeks to `positionMs + networkDelay` |
| Drift correction (every 30s) | Listener fetches local Spotify position, seeks if drift > 2000ms |
| Listener joins mid-song | Same sync logic applies on first snapshot receive |
| Host ends room | `ended: true` written to room, all listeners navigated back to Home |

---

## Known Limitations

- **Spotify Premium required** — the playback control API is Premium-only.
- **Spotify app must be open** on each device — `react-native-spotify-remote` remote-controls the native app.
- **~1-2s sync tolerance** — perfect frame-level sync is not possible over public internet without a dedicated media server.

---

## Roadmap

- [ ] Song queue / voting system
- [ ] Chat inside the room
- [ ] Persistent rooms with history
- [ ] Deep link to join via URL (no code needed)
- [ ] iOS support

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo |
| Spotify Playback | react-native-spotify-remote |
| Spotify Data | Spotify Web API (REST) |
| Real-time Sync | Firebase Realtime Database |
| Auth | Firebase Anonymous + Spotify OAuth 2.0 |
