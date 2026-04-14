import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Switch, ActivityIndicator, Image, Alert, SafeAreaView
} from "react-native";
import { updateProfile } from "@services/userService";
import { useAuth } from "@hooks/useAuth";
import { useProfile } from "@hooks/useProfile";
import { COLORS } from "@constants";

const EMOJI_OPTIONS = [
  "🎵","🎧","🎸","🎹","🎺","🎻","🥁","🎤",
  "🦁","🐯","🐻","🦊","🐺","🦋","🐙","🦄",
  "🔥","⚡","🌊","🌙","⭐","🌈","❄️","🎯",
  "👾","🤖","👽","💀","🧠","👁️","🫀","🎭",
];

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { profile } = useProfile();

  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [selectedEmoji, setSelectedEmoji] = useState(profile?.emoji ?? "🎵");
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim() || nickname.trim().length < 2) {
      Alert.alert("Invalid nickname", "Must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user.uid, {
        nickname: nickname.trim(),
        emoji: selectedEmoji,
        isPublic,
      });
      setEditing(false);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Switch Account",
      "This will log you out of Spotify. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log out", style: "destructive", onPress: logout },
      ]
    );
  };

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>

        {/* ── Custom Top Bar ── */}
        <View style={styles.topBar}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>⬅️</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {editing ? "Edit Profile" : "Profile"}
          </Text>

          {/* Edit/Cancel Button */}
          <TouchableOpacity 
            style={styles.iconBtn} 
            onPress={() => setEditing(!editing)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, editing && styles.iconCircleActive]}>
              <Text style={styles.iconEmoji}>{editing ? "❌" : "✏️"}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{selectedEmoji}</Text>
          </View>
          {profile.spotifyPfp && (
            <Image source={{ uri: profile.spotifyPfp }} style={styles.spotifyPfp} />
          )}
          <View style={[styles.statusDot, { backgroundColor: COLORS.primary }]} />
        </View>

        {/* Nickname */}
        {editing ? (
          <>
            <Text style={styles.sectionLabel}>Nickname</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
              autoCapitalize="none"
              placeholderTextColor={COLORS.textMuted}
            />
          </>
        ) : (
          <Text style={styles.nickname}>{profile.nickname}</Text>
        )}

        <Text style={styles.spotifyName}>🎵 {profile.spotifyDisplayName}</Text>

        {/* Emoji picker (edit mode only) */}
        {editing && (
          <>
            <Text style={styles.sectionLabel}>Change emoji</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiOption,
                    selectedEmoji === emoji && styles.emojiOptionSelected,
                  ]}
                  onPress={() => setSelectedEmoji(emoji)}
                >
                  <Text style={styles.emojiOptionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Public / Private toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>
              {isPublic ? "🌐 Public profile" : "🔒 Private profile"}
            </Text>
            <Text style={styles.toggleSubLabel}>
              {isPublic
                ? "Anyone can find and add you"
                : "Only room members can add you"}
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={editing ? setIsPublic : undefined}
            disabled={!editing}
            trackColor={{ false: COLORS.surfaceAlt, true: COLORS.primary }}
            thumbColor={COLORS.textPrimary}
          />
        </View>

        {/* Spotify stats */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionLabel}>Spotify stats</Text>
          {profile.followerCount > 0 && (
            <Text style={styles.statRow}>👥 {profile.followerCount} followers</Text>
          )}
          {profile.topArtists?.length > 0 && (
            <Text style={styles.statRow}>
              🎵 Top artists: {profile.topArtists.slice(0, 3).join(", ")}
            </Text>
          )}
          {profile.topGenres?.length > 0 && (
            <Text style={styles.statRow}>
              🎸 Top genres: {profile.topGenres.slice(0, 3).join(", ")}
            </Text>
          )}
          <Text style={styles.privateNote}>🔒 Only visible to you</Text>
        </View>

        {/* Save button */}
        {editing && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.saveBtnText}>Save changes</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Switch account */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>⇄ Switch Spotify Account</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  container: { padding: 24, paddingBottom: 48, alignItems: "center" },
  
  // ── Top Bar Styles ──
  topBar: { 
    width: "100%", 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    marginBottom: 32,
    marginTop: 8,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: COLORS.textPrimary,
  },
  iconBtn: { padding: 2 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.surfaceAlt,
  },
  iconCircleActive: {
    borderColor: COLORS.primary, // Highlights the edit button when editing
  },
  iconEmoji: { fontSize: 20 },

  // ── Rest of the styles ──
  avatarContainer: { position: "relative", marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center" },
  avatarEmoji: { fontSize: 52 },
  spotifyPfp: { position: "absolute", bottom: 0, right: -4, width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: COLORS.background },
  statusDot: { position: "absolute", top: 4, right: 4, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: COLORS.background },
  nickname: { fontSize: 24, fontWeight: "bold", color: COLORS.textPrimary, marginBottom: 4 },
  spotifyName: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  sectionLabel: { alignSelf: "flex-start", color: COLORS.textMuted, fontSize: 11, letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  input: { width: "100%", backgroundColor: COLORS.surface, color: COLORS.textPrimary, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 16, gap: 8 },
  emojiOption: { width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center" },
  emojiOptionSelected: { borderWidth: 2, borderColor: COLORS.primary },
  emojiOptionText: { fontSize: 22 },
  toggleRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginVertical: 16 },
  toggleInfo: { flex: 1, marginRight: 16 },
  toggleLabel: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  toggleSubLabel: { color: COLORS.textSecondary, fontSize: 13 },
  statsCard: { width: "100%", backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 24 },
  statRow: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 6 },
  privateNote: { color: COLORS.textMuted, fontSize: 12, marginTop: 8, fontStyle: "italic" },
  saveBtn: { width: "100%", backgroundColor: COLORS.primary, borderRadius: 50, padding: 16, alignItems: "center", marginBottom: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: COLORS.background, fontWeight: "bold", fontSize: 16 },
  logoutBtn: { padding: 12, marginTop: 8 },
  logoutText: { color: COLORS.textSecondary, fontSize: 14 },
});