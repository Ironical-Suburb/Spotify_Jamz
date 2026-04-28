import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useAuth } from "@hooks/useAuth";
import { useProfile } from "@hooks/useProfile";
import { sendMatchMessage, subscribeToMatchChat } from "@services/matchService";
import { createRoom } from "@services/roomService";
import { COLORS } from "@constants";

export default function MatchChatScreen({ route, navigation }) {
  const { matchId, otherNickname, otherEmoji } = route.params;
  const { user } = useAuth();
  const { profile } = useProfile();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [jamming, setJamming] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeToMatchChat(matchId, setMessages);
    return unsub;
  }, [matchId]);

  const displayName = profile?.nickname ?? user?.uid?.slice(0, 8) ?? "You";

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText("");
    setSending(true);
    try {
      await sendMatchMessage(matchId, user.uid, displayName, trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleJamTogether = async () => {
    if (jamming) return;
    setJamming(true);
    try {
      const code = await createRoom(user.uid, displayName);
      await sendMatchMessage(matchId, user.uid, displayName, `🎵 I started a Jam Sesh! Join with code: **${code}**`, { type: "jam_invite", roomCode: code });
      navigation.navigate("Room", { roomCode: code, isHost: true, displayName });
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setJamming(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.uid === user.uid;
    const isJamInvite = item.type === "jam_invite";

    if (isJamInvite) {
      return (
        <View style={styles.jamInviteRow}>
          <TouchableOpacity
            style={styles.jamInviteCard}
            onPress={() => navigation.navigate("Room", {
              roomCode: item.roomCode,
              isHost: false,
              displayName,
            })}
          >
            <Text style={styles.jamInviteEmoji}>🎵</Text>
            <Text style={styles.jamInviteTitle}>{item.displayName} started a Jam Sesh!</Text>
            <Text style={styles.jamInviteCode}>Code: {item.roomCode}</Text>
            <Text style={styles.jamInviteJoin}>Tap to join</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
        {!isMe && <Text style={styles.msgAvatar}>{otherEmoji ?? "🎵"}</Text>}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          {!isMe && <Text style={styles.msgName}>{item.displayName}</Text>}
          <Text style={styles.msgText}>{item.text}</Text>
          <Text style={styles.msgTime}>{formatTime(item.sentAt)}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Jam Together banner */}
      <TouchableOpacity
        style={styles.jamBanner}
        onPress={handleJamTogether}
        disabled={jamming}
        activeOpacity={0.85}
      >
        {jamming
          ? <ActivityIndicator color={COLORS.background} size="small" />
          : <>
              <Text style={styles.jamBannerIcon}>🎵</Text>
              <Text style={styles.jamBannerText}>Jam Together</Text>
            </>
        }
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={[...messages].reverse()}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        inverted
        contentContainerStyle={styles.msgList}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor={COLORS.textMuted}
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatTime(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  jamBanner: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  jamBannerIcon: { fontSize: 18 },
  jamBannerText: { color: COLORS.background, fontWeight: "bold", fontSize: 15 },
  msgList: { padding: 12, paddingBottom: 4 },
  msgRow: { flexDirection: "row", marginBottom: 10, alignItems: "flex-end", gap: 8 },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowThem: { justifyContent: "flex-start" },
  msgAvatar: { fontSize: 24, marginBottom: 4 },
  bubble: { maxWidth: "75%", borderRadius: 18, padding: 12 },
  bubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
  msgName: { color: COLORS.textMuted, fontSize: 11, marginBottom: 4 },
  msgText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
  msgTime: { color: COLORS.textMuted + "88", fontSize: 10, marginTop: 4, textAlign: "right" },
  jamInviteRow: { alignItems: "center", marginBottom: 12 },
  jamInviteCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    width: "80%",
  },
  jamInviteEmoji: { fontSize: 32, marginBottom: 8 },
  jamInviteTitle: { color: COLORS.textPrimary, fontWeight: "bold", fontSize: 14, textAlign: "center", marginBottom: 4 },
  jamInviteCode: { color: COLORS.primary, fontWeight: "bold", fontSize: 18, letterSpacing: 4, marginBottom: 4 },
  jamInviteJoin: { color: COLORS.textSecondary, fontSize: 12 },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 18, justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: COLORS.surfaceAlt },
  sendBtnText: { color: COLORS.background, fontWeight: "bold", fontSize: 14 },
});
