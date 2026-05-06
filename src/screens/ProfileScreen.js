import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Switch, ActivityIndicator, Alert, SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { updateProfile } from "@services/userService";
import { useAuth } from "@hooks/useAuth";
import { useProfile } from "@hooks/useProfile";
import { COLORS } from "@constants";
import AvatarCircle from "@components/AvatarCircle";
import GradientButton from "@components/GradientButton";

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

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editing ? "Edit Profile" : "Profile"}</Text>
          <TouchableOpacity
            style={[styles.editBtn, editing && styles.editBtnActive]}
            onPress={() => setEditing(!editing)}
            activeOpacity={0.8}
          >
            <Text style={styles.editBtnText}>{editing ? "✕" : "✏️"}</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <LinearGradient
            colors={[COLORS.gradientStart + "30", COLORS.gradientEnd + "30"]}
            style={styles.avatarGlow}
          >
            <AvatarCircle name={profile.nickname} size={96} useGradient />
          </LinearGradient>
          <View style={styles.onlineDot} />

          {editing ? (
            <TextInput
              style={styles.nicknameInput}
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
              autoCapitalize="none"
              placeholderTextColor={COLORS.textMuted}
              textAlign="center"
            />
          ) : (
            <Text style={styles.nickname}>{profile.nickname}</Text>
          )}
          <Text style={styles.spotifyName}>🎵 {profile.spotifyDisplayName}</Text>
        </View>

        {/* Emoji picker */}
        {editing && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CHOOSE YOUR EMOJI</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiOption, selectedEmoji === emoji && styles.emojiOptionSelected]}
                  onPress={() => setSelectedEmoji(emoji)}
                >
                  <Text style={styles.emojiOptionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Visibility toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>
              {isPublic ? "🌐 Public profile" : "🔒 Private profile"}
            </Text>
            <Text style={styles.toggleSub}>
              {isPublic ? "Anyone can find and add you" : "Only room members can add you"}
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={editing ? setIsPublic : undefined}
            disabled={!editing}
            trackColor={{ false: COLORS.surfaceHigh, true: COLORS.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Spotify stats */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionLabel}>SPOTIFY STATS</Text>
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

        {/* Save */}
        {editing && (
          <GradientButton
            onPress={handleSave}
            disabled={saving}
            loading={saving}
            label="Save Changes"
            style={styles.saveBtnWrap}
          />
        )}

        {/* Logout */}
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
  container: { padding: 22, paddingBottom: 48, alignItems: "center" },

  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
    marginTop: 4,
  },
  headerTitle: { fontSize: 17, fontWeight: "bold", color: COLORS.textPrimary },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: COLORS.surfaceAlt,
  },
  backBtnText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "bold" },
  editBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: COLORS.surfaceAlt,
  },
  editBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "22" },
  editBtnText: { fontSize: 18 },

  avatarSection: { alignItems: "center", marginBottom: 28, position: "relative" },
  avatarGlow: {
    width: 116, height: 116, borderRadius: 58,
    justifyContent: "center", alignItems: "center",
    marginBottom: 16,
  },
  onlineDot: {
    position: "absolute", top: 8, right: "31%",
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.liveGreen,
    borderWidth: 2, borderColor: COLORS.background,
  },
  nickname: { fontSize: 24, fontWeight: "bold", color: COLORS.textPrimary, marginBottom: 4 },
  nicknameInput: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primary,
    paddingVertical: 4,
    minWidth: 140,
    textAlign: "center",
    marginBottom: 4,
  },
  spotifyName: { fontSize: 13, color: COLORS.textSecondary },

  section: { width: "100%", marginBottom: 20 },
  sectionLabel: {
    color: COLORS.textMuted, fontSize: 10, letterSpacing: 2,
    fontWeight: "700", marginBottom: 12,
  },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  emojiOption: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: "center", alignItems: "center",
  },
  emojiOptionSelected: {
    borderWidth: 2, borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "18",
  },
  emojiOptionText: { fontSize: 22 },

  toggleCard: {
    width: "100%",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 18, marginBottom: 16,
  },
  toggleInfo: { flex: 1, marginRight: 16 },
  toggleLabel: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  toggleSub: { color: COLORS.textSecondary, fontSize: 13 },

  statsCard: {
    width: "100%",
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 18, marginBottom: 24,
  },
  statRow: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 6 },
  privateNote: { color: COLORS.textMuted, fontSize: 12, marginTop: 8, fontStyle: "italic" },

  saveBtnWrap: { width: "100%", marginBottom: 16 },

  logoutBtn: { padding: 12, marginTop: 4 },
  logoutText: { color: COLORS.textSecondary, fontSize: 14 },
});
