import { db } from "./firebase";
import { ref, set, get, remove, onValue, off } from "firebase/database";

const REQUESTS = "friendRequests";
const FRIENDS = "friends";

export async function sendFriendRequest(fromUid, fromProfile, toUid) {
  await set(ref(db, `${REQUESTS}/${toUid}/${fromUid}`), {
    fromUid,
    nickname: fromProfile.nickname,
    emoji: fromProfile.emoji || "🎵",
    sentAt: Date.now(),
  });
}

export async function cancelFriendRequest(fromUid, toUid) {
  await remove(ref(db, `${REQUESTS}/${toUid}/${fromUid}`));
}

export async function acceptFriendRequest(myUid, myProfile, fromUid) {
  const snap = await get(ref(db, `users/${fromUid}`));
  const fp = snap.exists() ? snap.val() : {};
  const now = Date.now();
  await Promise.all([
    set(ref(db, `${FRIENDS}/${myUid}/${fromUid}`), {
      uid: fromUid,
      nickname: fp.nickname || "Unknown",
      emoji: fp.emoji || "🎵",
      addedAt: now,
    }),
    set(ref(db, `${FRIENDS}/${fromUid}/${myUid}`), {
      uid: myUid,
      nickname: myProfile.nickname,
      emoji: myProfile.emoji || "🎵",
      addedAt: now,
    }),
    remove(ref(db, `${REQUESTS}/${myUid}/${fromUid}`)),
  ]);
}

export async function declineFriendRequest(myUid, fromUid) {
  await remove(ref(db, `${REQUESTS}/${myUid}/${fromUid}`));
}

export async function removeFriend(uid, friendUid) {
  await Promise.all([
    remove(ref(db, `${FRIENDS}/${uid}/${friendUid}`)),
    remove(ref(db, `${FRIENDS}/${friendUid}/${uid}`)),
  ]);
}

export async function getFriends(uid) {
  const snap = await get(ref(db, `${FRIENDS}/${uid}`));
  if (!snap.exists()) return [];
  return Object.values(snap.val());
}

export function subscribeToPendingRequests(uid, onUpdate) {
  const r = ref(db, `${REQUESTS}/${uid}`);
  onValue(r, (snap) => {
    const val = snap.val();
    if (!val) { onUpdate([]); return; }
    onUpdate(Object.entries(val).map(([fromUid, info]) => ({ fromUid, ...info })));
  });
  return () => off(r);
}

// Returns: 'friends' | 'pending_sent' | 'pending_received' | 'none'
export async function checkRelationship(myUid, otherUid) {
  const [friendSnap, receivedSnap, sentSnap] = await Promise.all([
    get(ref(db, `${FRIENDS}/${myUid}/${otherUid}`)),
    get(ref(db, `${REQUESTS}/${myUid}/${otherUid}`)),
    get(ref(db, `${REQUESTS}/${otherUid}/${myUid}`)),
  ]);
  if (friendSnap.exists())   return "friends";
  if (receivedSnap.exists()) return "pending_received";
  if (sentSnap.exists())     return "pending_sent";
  return "none";
}
