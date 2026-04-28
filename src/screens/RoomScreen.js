import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Alert,
  ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRoom } from "@hooks/useRoom";
import { useRoomContext } from "@hooks/useRoomContext";
import { useAuth } from "@hooks/useAuth";
import { subscribeToChat, sendChatMessage, rateTrack } from "@services/roomService";
import { COLORS } from "@constants";
import ChatPanel from "@components/ChatPanel";
import RatingModal from "@components/RatingModal";

export default function RoomScreen({ route, navigation }) {
  const { roomCode, isHost, displayName } = route.params;
  const { room, error, broadcastPlayback, leave } = useRoom(roomCode, isHost);
  const { broadcastRef } = useRoomContext();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("listeners");
  const [chatMessages, setChatMessages] = useState([]);
  const [ratingVisible, setRatingVisible] = useState(false);

  useEffect(() => {
    broadcastRef.current = broadcastPlayback;
  }, [broadcastPlayback]);

  useEffect(() => {
    if (error) {
      Alert.alert("Room ended", error, [{ text: "OK", onPress: () => navigation.goBack() }]);
    }
  }, [error]);

  useEffect(() => {
    const unsub = subscribeToChat(roomCode, setChatMessages);
    return unsub;
  }, [roomCode]);

  const handleLeave = async () => {
    await leave();
    navigation.goBack();
  };

  const handleSendMessage = (text) => {
    if (!user) return;
    sendChatMessage(roomCode, user.uid, displayName, text).catch(console.error);
  };

  const handleRate = (rating) => {
    if (!user || !playback?.trackUri) return;
    rateTrack(user.uid, playback.trackUri, playback.trackName, playback.artistName, rating)
      .catch(console.error);
  };

  const playback = room?.playback;
  const hasTrack = !!playback?.trackUri;
  const listeners = room?.listeners ?? {};
  const listenerCount = Object.keys(listeners).length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Room code */}
      <View style={styles.codePill}>
        <Text style={styles.codeLabel}>ROOM CODE</Text>
        <Text style={styles.code}>{roomCode}</Text>
      </View>

      {/* Album art */}
      {playback?.albumArt ? (
        <Image source={{ uri: playback.albumArt }} style={styles.albumArt} />
      ) : (
        <View style={[styles.albumArt, styles.albumArtPlaceholder]}>
          <Text style={styles.albumArtEmoji}>🎵</Text>
        </View>
      )}

      {/* Track info + rate */}
      <Text style={styles.trackName} numberOfLines={1}>
        {hasTrack ? playback.trackName : "No track playing"}
      </Text>
      <View style={styles.artistRow}>
        <Text style={styles.artistName} numberOfLines={1}>{playback?.artistName ?? ""}</Text>
        {hasTrack && (
          <TouchableOpacity onPress={() => setRatingVisible(true)} style={styles.heartBtn}>
            <Text style={styles.heartEmoji}>❤️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Host controls */}
      {isHost && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => navigation.navigate("Search", { roomCode })}
          >
            <Text style={styles.searchBtnText}>🔍 Pick a Song</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pauseBtn}
            onPress={() => broadcastPlayback({ ...playback, isPlaying: !playback?.isPlaying })}
          >
            <Text style={styles.pauseBtnText}>
              {playback?.isPlaying ? "⏸ Pause" : "▶ Play"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "listeners" && styles.tabActive]}
          onPress={() => setActiveTab("listeners")}
        >
          <Text style={[styles.tabText, activeTab === "listeners" && styles.tabTextActive]}>
            👥 Listeners ({listenerCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "chat" && styles.tabActive]}
          onPress={() => setActiveTab("chat")}
        >
          <Text style={[styles.tabText, activeTab === "chat" && styles.tabTextActive]}>
            💬 Chat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      <View style={styles.tabContent}>
        {activeTab === "listeners" ? (
          <ScrollView contentContainerStyle={styles.listenerList}>
            {Object.entries(listeners).map(([uid, info]) => (
              <View key={uid} style={styles.listenerRow}>
                <Text style={styles.listenerEmoji}>
                  {uid === room?.hostId ? "👑" : "🎧"}
                </Text>
                <Text style={styles.listenerName}>{info.displayName}</Text>
                {uid === room?.hostId && (
                  <View style={styles.hostBadge}>
                    <Text style={styles.hostBadgeText}>HOST</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <ChatPanel
            messages={chatMessages}
            currentUserId={user?.uid}
            onSend={handleSendMessage}
          />
        )}
      </View>

      {/* Leave / End */}
      <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
        <Text style={styles.leaveBtnText}>{isHost ? "End Room" : "Leave Room"}</Text>
      </TouchableOpacity>

      <RatingModal
        visible={ratingVisible}
        trackName={playback?.trackName ?? ""}
        artistName={playback?.artistName ?? ""}
        onRate={handleRate}
        onClose={() => setRatingVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  codePill: {
    alignSelf: "center",
    backgroundColor: COLORS.roomCode,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  codeLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 1,
  },
  code: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 6,
  },
  albumArt: {
    width: 160,
    height: 160,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 14,
  },
  albumArtPlaceholder: {
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  albumArtEmoji: {
    fontSize: 48,
  },
  trackName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  artistRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    gap: 8,
  },
  artistName: {
    color: COLORS.textSecondary,
    fontSize: 14,
    flexShrink: 1,
  },
  heartBtn: {
    padding: 4,
  },
  heartEmoji: {
    fontSize: 20,
  },
  controls: {
    marginBottom: 12,
    gap: 8,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    padding: 12,
    alignItems: "center",
  },
  searchBtnText: {
    color: COLORS.background,
    fontWeight: "bold",
    fontSize: 14,
  },
  pauseBtn: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 50,
    padding: 12,
    alignItems: "center",
  },
  pauseBtnText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabContent: {
    flex: 1,
  },
  listenerList: {
    paddingVertical: 4,
  },
  listenerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  listenerEmoji: {
    fontSize: 18,
  },
  listenerName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    flex: 1,
  },
  hostBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hostBadgeText: {
    color: COLORS.background,
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  leaveBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  leaveBtnText: {
    color: COLORS.error,
    fontWeight: "bold",
    fontSize: 14,
  },
});
