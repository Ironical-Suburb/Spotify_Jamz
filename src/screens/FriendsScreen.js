import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@hooks/useAuth";
import { searchUsers, addFriend, removeFriend, getFriends } from "@services/friendService";
import { COLORS } from "@constants";

export default function FriendsScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("My Friends");
  
  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [myFriends, setMyFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load friends when "My Friends" tab is active
  useEffect(() => {
    if (activeTab === "My Friends") {
      loadFriends();
    }
  }, [activeTab]);

  const loadFriends = async () => {
    setLoading(true);
    const friendsData = await getFriends(user.uid);
    setMyFriends(friendsData);
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const results = await searchUsers(searchQuery, user.uid);
    setSearchResults(results);
    setLoading(false);
  };

  const handleAddFriend = async (targetUser) => {
    const success = await addFriend(user.uid, targetUser);
    if (success) {
      Alert.alert("Added!", `${targetUser.nickname} has been added to your crew.`);
      // Optional: switch back to My Friends tab to see them
      setActiveTab("My Friends");
      setSearchQuery("");
      setSearchResults([]);
    } else {
      Alert.alert("Error", "Could not add friend. Try again.");
    }
  };

  const handleRemoveFriend = async (targetUserId) => {
    const success = await removeFriend(user.uid, targetUserId);
    if (success) {
      // Remove them from local state instantly so the UI updates without a reload
      setMyFriends((prev) => prev.filter((f) => f.id !== targetUserId));
    } else {
      Alert.alert("Error", "Could not remove friend.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>⬅️</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Friends</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ── Tab Selector ── */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "My Friends" && styles.tabActive]}
            onPress={() => setActiveTab("My Friends")}
          >
            <Text style={[styles.tabText, activeTab === "My Friends" && styles.tabTextActive]}>
              My Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "Add Friends" && styles.tabActive]}
            onPress={() => setActiveTab("Add Friends")}
          >
            <Text style={[styles.tabText, activeTab === "Add Friends" && styles.tabTextActive]}>
              Add Friends
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Content Area ── */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {loading && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />}

          {/* MY FRIENDS TAB */}
          {!loading && activeTab === "My Friends" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Crew ({myFriends.length})</Text>
              <View style={styles.card}>
                {myFriends.length === 0 ? (
                  <Text style={styles.emptyText}>You haven't added anyone yet.</Text>
                ) : (
                  myFriends.map((friend) => (
                    <View key={friend.id} style={styles.friendRow}>
                      <View style={styles.friendAvatar}>
                        <Text style={styles.friendEmoji}>{friend.emoji || "👤"}</Text>
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>{friend.nickname}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.removeBtn}
                        onPress={() => handleRemoveFriend(friend.id)}
                      >
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* ADD FRIENDS TAB */}
          {!loading && activeTab === "Add Friends" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Find by Username</Text>
              
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="@username"
                  placeholderTextColor={COLORS.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.8}>
                  <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                {searchResults.length === 0 && searchQuery.length > 0 ? (
                  <Text style={styles.emptyText}>No users found. Hit search!</Text>
                ) : searchResults.length === 0 ? (
                  <Text style={styles.emptyText}>Search results will appear here...</Text>
                ) : (
                  searchResults.map((userResult) => {
                    // Check if they are already our friend to prevent duplicates
                    const isAlreadyFriend = myFriends.some(f => f.id === userResult.id);

                    return (
                      <View key={userResult.id} style={styles.friendRow}>
                        <View style={styles.friendAvatar}>
                          <Text style={styles.friendEmoji}>{userResult.emoji || "👤"}</Text>
                        </View>
                        <View style={styles.friendInfo}>
                          <Text style={styles.friendName}>{userResult.nickname}</Text>
                        </View>
                        {isAlreadyFriend ? (
                          <Text style={styles.textMuted}>Added</Text>
                        ) : (
                          <TouchableOpacity 
                            style={styles.addBtn}
                            onPress={() => handleAddFriend(userResult)}
                          >
                            <Text style={styles.addBtnText}>Add</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 24 },
  
  topBar: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, marginTop: 8 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.textPrimary },
  iconBtn: { padding: 2 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: COLORS.surfaceAlt },
  iconEmoji: { fontSize: 20 },

  tabContainer: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.surfaceAlt },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: COLORS.textPrimary, fontWeight: "bold" },

  scrollContent: { paddingBottom: 40 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: COLORS.textSecondary, marginLeft: 4, marginBottom: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, gap: 16 },
  
  friendRow: { flexDirection: "row", alignItems: "center" },
  friendAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceAlt, justifyContent: "center", alignItems: "center", marginRight: 12 },
  friendEmoji: { fontSize: 20 },
  friendInfo: { flex: 1 },
  friendName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  
  removeBtn: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  removeBtnText: { color: "#FF5252", fontSize: 13, fontWeight: "bold" },
  
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: COLORS.background, fontSize: 13, fontWeight: "bold" },

  searchRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: COLORS.surface, color: COLORS.textPrimary, borderRadius: 12, padding: 16, fontSize: 15 },
  searchBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 20, justifyContent: "center", alignItems: "center" },
  searchBtnText: { color: COLORS.background, fontWeight: "bold", fontSize: 15 },
  
  emptyText: { color: COLORS.textMuted, fontStyle: "italic", textAlign: "center", paddingVertical: 20 },
  textMuted: { color: COLORS.textMuted, fontStyle: "italic", paddingRight: 8 },
});