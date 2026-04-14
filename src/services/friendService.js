import { db } from "./firebase";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

// ─── Search for users by exact nickname ───
export const searchUsers = async (searchTerm, currentUserId) => {
  try {
    // Strip the "@" if they typed it
    const cleanTerm = searchTerm.replace("@", "").trim();
    if (!cleanTerm) return [];

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("nickname", "==", cleanTerm));
    const snapshot = await getDocs(q);

    const results = [];
    snapshot.forEach((doc) => {
      // Don't show the current user in search results
      if (doc.id !== currentUserId) {
        results.push({ id: doc.id, ...doc.data() });
      }
    });
    return results;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
};

// ─── Add a friend ───
export const addFriend = async (currentUserId, targetUser) => {
  try {
    // Save the target user's basic info into a subcollection under the current user
    const friendRef = doc(db, `users/${currentUserId}/friends`, targetUser.id);
    await setDoc(friendRef, {
      id: targetUser.id,
      nickname: targetUser.nickname || "Unknown",
      emoji: targetUser.emoji || "👤",
      addedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Add friend error:", error);
    return false;
  }
};

// ─── Remove a friend ───
export const removeFriend = async (currentUserId, targetUserId) => {
  try {
    const friendRef = doc(db, `users/${currentUserId}/friends`, targetUserId);
    await deleteDoc(friendRef);
    return true;
  } catch (error) {
    console.error("Remove friend error:", error);
    return false;
  }
};

// ─── Get current user's friends list ───
export const getFriends = async (currentUserId) => {
  try {
    const friendsRef = collection(db, `users/${currentUserId}/friends`);
    const snapshot = await getDocs(friendsRef);
    
    const friends = [];
    snapshot.forEach((doc) => {
      friends.push(doc.data());
    });
    return friends;
  } catch (error) {
    console.error("Get friends error:", error);
    return [];
  }
};