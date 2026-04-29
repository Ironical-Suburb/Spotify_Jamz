import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@hooks/useAuth";
import { useProfile } from "@hooks/useProfile";
import {
  sendFriendRequest, cancelFriendRequest, acceptFriendRequest,
  declineFriendRequest, removeFriend, getFriends,
  subscribeToPendingRequests, checkRelationship,
} from "@services/friendRequestService";
import { getOrCreateDM } from "@services/dmService";
import { COLORS } from "@constants";

const TABS = ["Find", "Requests", "Friends"];

export default function FriendsScreen({ navigation }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState("Find");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [relationMap, setRelationMap] = useState({});
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToPendingRequests(user.uid, setPendingRequests);
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (activeTab === "Friends") loadFriends();
  }, [activeTab]);

  const loadFriends = async () => {
    setLoading(true);
    const list = await getFriends(user.uid);
    setFriends(list);
    setLoading(false);
  };

  const handleSearch = async () => {
    const clean = searchQuery.replace("@", "").trim().toLowerCase();
    if (!clean) return;
    setLoading(true);
    try {
      const { get, ref } = await import("firebase/database");
      const { db } = await import("@services/firebase");
      const snap = await get(ref(db, "users"));
      if (!snap.exists()) { setSearchResults([]); return; }
      const results = Object.entries(snap.val())
        .filter(([uid, u]) => uid !== user.uid && u.nickname?.toLowerCase().includes(clean))
        .map(([uid, u]) => ({ uid, ...u }));
      setSearchResults(results);

      const rels = {};
      await Promise.all(results.map(async (u) => {
        rels[u.uid] = await checkRelationship(user.uid, u.uid);
      }));
      setRelationMap(rels);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (target) => {
    setActing(target.uid);
    try {
      await sendFriendRequest(user.uid, profile, target.uid);
      setRelationMap(r => ({ ...r, [target.uid]: "pending_sent" }));
    } catch { Alert.alert("Error", "Could not send request."); }
    finally { setActing(null); }
  };

  const handleCancelRequest = async (target) => {
    setActing(target.uid);
    try {
      await cancelFriendRequest(user.uid, target.uid);
      setRelationMap(r => ({ ...r, [target.uid]: "none" }));
    } catch { Alert.alert("Error", "Could not cancel."); }
    finally { setActing(null); }
  };

  const handleAccept = async (req) => {
    setActing(req.fromUid);
    try {
      await acceptFriendRequest(user.uid, profile, req.fromUid);
    } catch { Alert.alert("Error", "Could not accept."); }
    finally { setActing(null); }
  };

  const handleDecline = async (req) => {
    setActing(req.fromUid);
    try {
      await declineFriendRequest(user.uid, req.fromUid);
    } catch { Alert.alert("Error", "Could not decline."); }
    finally { setActing(null); }
  };

  const handleRemoveFriend = (friendUid) => {
    Alert.alert("Remove Friend", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          await removeFriend(user.uid, friendUid);
          setFriends(f => f.filter(x => x.uid !== friendUid));
        },
      },
    ]);
  };

  const handleMessage = async (friend) => {
    const dmId = await getOrCreateDM(user.uid, friend.uid);
    navigation.navigate("DMChat", {
      dmId,
      otherUid: friend.uid,
      otherNickname: friend.nickname,
      otherEmoji: friend.emoji,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>Friends</Text>
          <TouchableOpacity style={styles.messagesBtn} onPress={() => navigation.navigate("DMList")}>
            <Text style={styles.messagesBtnText}>💬 Messages</Text>
          </TouchableOpacity>
        </View>

        {/* Tab selector */}
        <View style={styles.tabRow}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && styles.tabActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t}{t === "Requests" && pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── FIND TAB ── */}
          {activeTab === "Find" && (
            <View style={styles.section}>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by nickname..."
                  placeholderTextColor={COLORS.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                  <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
              </View>

              {loading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}

              {!loading && searchResults.map(u => {
                const rel = relationMap[u.uid] ?? "none";
                const isActing = acting === u.uid;
                return (
                  <View key={u.uid} style={styles.userRow}>
                    <Text style={styles.userEmoji}>{u.emoji ?? "🎵"}</Text>
                    <View style={styles.userInfo}>
                      <Text style={styles.userNickname}>{u.nickname}</Text>
                    </View>
                    {isActing
                      ? <ActivityIndicator color={COLORS.primary} size="small" />
                      : rel === "friends"
                        ? <Text style={styles.tagFriends}>Friends ✓</Text>
                        : rel === "pending_sent"
                          ? <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelRequest(u)}>
                              <Text style={styles.cancelBtnText}>Requested</Text>
                            </TouchableOpacity>
                          : rel === "pending_received"
                            ? <Text style={styles.tagPending}>Wants to add you</Text>
                            : <TouchableOpacity style={styles.addBtn} onPress={() => handleSendRequest(u)}>
                                <Text style={styles.addBtnText}>Add</Text>
                              </TouchableOpacity>
                    }
                  </View>
                );
              })}

              {!loading && searchResults.length === 0 && searchQuery.length > 0 && (
                <Text style={styles.emptyText}>No users found.</Text>
              )}
            </View>
          )}

          {/* ── REQUESTS TAB ── */}
          {activeTab === "Requests" && (
            <View style={styles.section}>
              {pendingRequests.length === 0
                ? <Text style={styles.emptyText}>No pending friend requests.</Text>
                : pendingRequests.map(req => (
                    <View key={req.fromUid} style={styles.userRow}>
                      <Text style={styles.userEmoji}>{req.emoji ?? "🎵"}</Text>
                      <View style={styles.userInfo}>
                        <Text style={styles.userNickname}>{req.nickname}</Text>
                        <Text style={styles.userSub}>Wants to be your friend</Text>
                      </View>
                      {acting === req.fromUid
                        ? <ActivityIndicator color={COLORS.primary} size="small" />
                        : <View style={styles.requestBtns}>
                            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(req)}>
                              <Text style={styles.acceptBtnText}>✓</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(req)}>
                              <Text style={styles.declineBtnText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                      }
                    </View>
                  ))
              }
            </View>
          )}

          {/* ── FRIENDS TAB ── */}
          {activeTab === "Friends" && (
            <View style={styles.section}>
              {loading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}
              {!loading && friends.length === 0 && (
                <Text style={styles.emptyText}>No friends yet — find people in the Find tab.</Text>
              )}
              {!loading && friends.map(f => (
                <View key={f.uid} style={styles.userRow}>
                  <Text style={styles.userEmoji}>{f.emoji ?? "🎵"}</Text>
                  <View style={styles.userInfo}>
                    <Text style={styles.userNickname}>{f.nickname}</Text>
                  </View>
                  <TouchableOpacity style={styles.msgBtn} onPress={() => handleMessage(f)}>
                    <Text style={styles.msgBtnText}>💬</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveFriend(f.uid)}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 20 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, marginTop: 8 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: COLORS.textPrimary },
  messagesBtn: { backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  messagesBtnText: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 13 },

  tabRow: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.surfaceAlt },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: COLORS.textPrimary, fontWeight: "bold" },

  scroll: { paddingBottom: 40 },
  section: { gap: 12 },

  searchRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  searchInput: { flex: 1, backgroundColor: COLORS.surface, color: COLORS.textPrimary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14 },
  searchBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 18, justifyContent: "center" },
  searchBtnText: { color: COLORS.background, fontWeight: "bold", fontSize: 14 },

  userRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, gap: 12 },
  userEmoji: { fontSize: 32 },
  userInfo: { flex: 1 },
  userNickname: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "bold" },
  userSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },

  addBtn: { backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: COLORS.background, fontWeight: "bold", fontSize: 13 },
  cancelBtn: { backgroundColor: COLORS.surfaceAlt, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: "bold", fontSize: 13 },
  tagFriends: { color: COLORS.primary, fontWeight: "bold", fontSize: 12 },
  tagPending: { color: COLORS.textMuted, fontSize: 12, fontStyle: "italic" },

  requestBtns: { flexDirection: "row", gap: 8 },
  acceptBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center" },
  acceptBtnText: { color: COLORS.background, fontWeight: "bold", fontSize: 16 },
  declineBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, justifyContent: "center", alignItems: "center" },
  declineBtnText: { color: COLORS.textSecondary, fontWeight: "bold", fontSize: 16 },

  msgBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, justifyContent: "center", alignItems: "center" },
  msgBtnText: { fontSize: 16 },
  removeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, justifyContent: "center", alignItems: "center" },
  removeBtnText: { color: "#FF5252", fontWeight: "bold", fontSize: 14 },

  emptyText: { color: COLORS.textMuted, textAlign: "center", paddingVertical: 32, fontStyle: "italic" },
});
