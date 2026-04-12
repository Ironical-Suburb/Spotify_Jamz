import { db } from "./firebase";
import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  serverTimestamp,
} from "firebase/database";
import { DB_ROOMS } from "@constants";
import uuid from "react-native-uuid";

// ─── Room helpers ─────────────────────────────────────────────────────────────

/** Generate a short human-friendly room code e.g. "X7K2" */
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

/**
 * Create a new room. Returns the room code.
 * @param {string} hostId  Firebase UID of the host
 * @param {string} hostDisplayName
 */
export async function createRoom(hostId, hostDisplayName) {
  const code = generateRoomCode();
  const roomRef = ref(db, `${DB_ROOMS}/${code}`);

  await set(roomRef, {
    code,
    hostId,
    hostDisplayName,
    createdAt: serverTimestamp(),
    // Playback state — updated by host in real time
    playback: {
      trackUri: null,
      trackName: null,
      artistName: null,
      albumArt: null,
      isPlaying: false,
      positionMs: 0,
      updatedAt: null,
    },
    // Listeners keyed by uid
    listeners: {
      [hostId]: { displayName: hostDisplayName, joinedAt: serverTimestamp() },
    },
  });

  return code;
}

/**
 * Join an existing room.
 * @returns {object} room snapshot or throws if room not found
 */
export async function joinRoom(code, userId, displayName) {
  const roomRef = ref(db, `${DB_ROOMS}/${code}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error("Room not found. Check the code and try again.");
  }

  // Add this user to the listeners map
  await update(ref(db, `${DB_ROOMS}/${code}/listeners/${userId}`), {
    displayName,
    joinedAt: serverTimestamp(),
  });

  return snapshot.val();
}

/**
 * Subscribe to room changes. Returns unsubscribe function.
 * @param {string} code
 * @param {function} onUpdate  called with room data on every change
 */
export function subscribeToRoom(code, onUpdate) {
  const roomRef = ref(db, `${DB_ROOMS}/${code}`);
  onValue(roomRef, (snapshot) => onUpdate(snapshot.val()));
  return () => off(roomRef);
}

/**
 * Push a new playback state from the host.
 */
export async function updatePlaybackState(code, playback) {
  await update(ref(db, `${DB_ROOMS}/${code}/playback`), {
    ...playback,
    updatedAt: Date.now(), // client timestamp for drift calculation
  });
}

/**
 * Remove a user from the room. If they're the host, mark room as ended.
 */
export async function leaveRoom(code, userId, isHost) {
  if (isHost) {
    await update(ref(db, `${DB_ROOMS}/${code}`), { ended: true });
  } else {
    await set(ref(db, `${DB_ROOMS}/${code}/listeners/${userId}`), null);
  }
}
