import { db } from "./firebase";
import { ref, set, get, update, onValue, off, serverTimestamp } from "firebase/database";

const USERS = "users";

// ─── Profile CRUD ─────────────────────────────────────────────────────────────

/**
 * Check if a user profile exists in Firebase.
 */
export async function profileExists(uid) {
  const snapshot = await get(ref(db, `${USERS}/${uid}`));
  return snapshot.exists();
}

/**
 * Create a new user profile.
 */
export async function createProfile(uid, profileData) {
  // Firebase rejects undefined values — clean everything before saving
  const clean = (val) => val ?? null;
  const cleanArray = (arr) => (arr || []).filter((v) => v !== undefined && v !== null);

  await set(ref(db, `${USERS}/${uid}`), {
    ...profileData,
    topGenres: cleanArray(profileData.topGenres),
    topArtists: cleanArray(profileData.topArtists),
    spotifyDisplayName: clean(profileData.spotifyDisplayName),
    spotifyAvatar: clean(profileData.spotifyAvatar),
    followerCount: clean(profileData.followerCount),
    createdAt: Date.now(),
    currentRoom: null,
    currentTrack: null,
    online: true,
  });
}
/**
 * Update an existing profile (partial update).
 */
export async function updateProfile(uid, updates) {
  await update(ref(db, `${USERS}/${uid}`), updates);
}

/**
 * Get a user's profile once.
 */
export async function getProfile(uid) {
  const snapshot = await get(ref(db, `${USERS}/${uid}`));
  return snapshot.exists() ? snapshot.val() : null;
}

/**
 * Subscribe to a user's profile in real time.
 * Returns unsubscribe function.
 */
export function subscribeToProfile(uid, onUpdate) {
  const userRef = ref(db, `${USERS}/${uid}`);
  onValue(userRef, (snapshot) => onUpdate(snapshot.val()));
  return () => off(userRef);
}

/**
 * Set user online/offline status and current room.
 */
export async function setOnlineStatus(uid, online, currentRoom = null) {
  await update(ref(db, `${USERS}/${uid}`), {
    online,
    currentRoom,
    lastSeen: serverTimestamp(),
  });
}

/**
 * Update what track the user is currently listening to.
 */
export async function setCurrentTrack(uid, trackInfo) {
  await update(ref(db, `${USERS}/${uid}`), {
    currentTrack: trackInfo,
  });
}

/**
 * Search public users by nickname (simple prefix match).
 * Firebase RTDB doesn't support full-text search so we use
 * orderByChild + startAt + endAt for prefix matching.
 */
export async function searchPublicUsers(nickname) {
  const { query, ref: dbRef, orderByChild, startAt, endAt, get: dbGet } =
    await import("firebase/database");
  const q = query(
    dbRef(db, USERS),
    orderByChild("nickname"),
    startAt(nickname),
    endAt(nickname + "\uf8ff")
  );
  const snapshot = await dbGet(q);
  if (!snapshot.exists()) return [];

  return Object.entries(snapshot.val())
    .filter(([, user]) => user.isPublic)
    .map(([uid, user]) => ({ uid, ...user }));
}
