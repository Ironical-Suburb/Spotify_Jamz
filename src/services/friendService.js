import { db } from "./firebase";
import { ref, set, get, remove } from "firebase/database";

const FRIENDS = "friends";
const USERS = "users";

export const searchUsers = async (searchTerm, currentUserId) => {
  const clean = searchTerm.replace("@", "").trim().toLowerCase();
  if (!clean) return [];
  try {
    const snap = await get(ref(db, USERS));
    if (!snap.exists()) return [];
    return Object.entries(snap.val())
      .filter(([uid, u]) => uid !== currentUserId && u.nickname && u.nickname.toLowerCase().includes(clean))
      .map(([uid, u]) => ({ id: uid, ...u }));
  } catch (e) {
    console.error("Search error:", e);
    return [];
  }
};

export const getFriends = async (currentUserId) => {
  try {
    const snap = await get(ref(db, `${FRIENDS}/${currentUserId}`));
    if (!snap.exists()) return [];
    return Object.values(snap.val());
  } catch (e) {
    console.error("Get friends error:", e);
    return [];
  }
};

export const addFriend = async (currentUserId, targetUser) => {
  try {
    await set(ref(db, `${FRIENDS}/${currentUserId}/${targetUser.id}`), {
      id: targetUser.id,
      nickname: targetUser.nickname || "Unknown",
      emoji: targetUser.emoji || "👤",
      addedAt: Date.now(),
    });
    return true;
  } catch (e) {
    console.error("Add friend error:", e);
    return false;
  }
};

export const removeFriend = async (currentUserId, targetUserId) => {
  try {
    await remove(ref(db, `${FRIENDS}/${currentUserId}/${targetUserId}`));
    return true;
  } catch (e) {
    console.error("Remove friend error:", e);
    return false;
  }
};
