import { db } from "./firebase";
import {
  ref,
  set,
  get,
  update,
  push,
  onValue,
  off,
  serverTimestamp,
} from "firebase/database";
import { DB_ROOMS, DB_USERS } from "@constants";

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export async function createRoom(hostId, hostDisplayName) {
  const code = generateRoomCode();
  const now = Date.now();

  await set(ref(db, `${DB_ROOMS}/${code}`), {
    code,
    hostId,
    hostDisplayName,
    createdAt: now,
    ended: false,
    playback: {
      trackUri: "",
      trackName: "",
      artistName: "",
      albumArt: "",
      isPlaying: false,
      positionMs: 0,
      updatedAt: now,
    },
    listeners: {
      [hostId]: { displayName: hostDisplayName, joinedAt: now },
    },
  });

  return code;
}

export async function joinRoom(code, userId, displayName) {
  const roomRef = ref(db, `${DB_ROOMS}/${code}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) {
    throw new Error("Room not found. Check the code and try again.");
  }

  await update(ref(db, `${DB_ROOMS}/${code}/listeners/${userId}`), {
    displayName,
    joinedAt: Date.now(),
  });

  return snapshot.val();
}

export function subscribeToRoom(code, onUpdate) {
  const roomRef = ref(db, `${DB_ROOMS}/${code}`);
  onValue(roomRef, (snapshot) => onUpdate(snapshot.val()));
  return () => off(roomRef);
}

export async function updatePlaybackState(code, playback) {
  await update(ref(db, `${DB_ROOMS}/${code}/playback`), {
    ...playback,
    updatedAt: Date.now(),
  });
}

export async function leaveRoom(code, userId, isHost) {
  if (isHost) {
    await update(ref(db, `${DB_ROOMS}/${code}`), { ended: true });
  } else {
    await set(ref(db, `${DB_ROOMS}/${code}/listeners/${userId}`), null);
  }
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function sendChatMessage(code, userId, displayName, text) {
  const msgRef = push(ref(db, `${DB_ROOMS}/${code}/chat`));
  await set(msgRef, {
    uid: userId,
    displayName,
    text: text.trim(),
    sentAt: Date.now(),
  });
}

export function subscribeToChat(code, onUpdate) {
  const chatRef = ref(db, `${DB_ROOMS}/${code}/chat`);
  onValue(chatRef, (snapshot) => {
    const val = snapshot.val();
    if (!val) { onUpdate([]); return; }
    const messages = Object.entries(val)
      .map(([id, msg]) => ({ id, ...msg }))
      .sort((a, b) => a.sentAt - b.sentAt);
    onUpdate(messages);
  });
  return () => off(chatRef);
}

// ─── Track ratings ────────────────────────────────────────────────────────────

export async function rateTrack(userId, trackUri, trackName, artistName, rating) {
  const trackId = trackUri.split(":").pop();
  await set(ref(db, `${DB_USERS}/${userId}/ratings/${trackId}`), {
    trackUri,
    trackName,
    artistName,
    rating,
    ratedAt: Date.now(),
  });
}
