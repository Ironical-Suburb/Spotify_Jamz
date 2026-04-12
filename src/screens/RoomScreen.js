import React, { useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView,
} from "react-native";
import { useRoom } from "@hooks/useRoom";
import { COLORS } from "@constants";

export default function RoomScreen({ route, navigation }) {
  const { roomCode, isHost, displayName } = route.params;
  const { room, error, broadcastPlayback, leave } = useRoom(roomCode, isHost);

  useEffect(() => {
    if (error) {
      Alert.alert("Room ended", error, [{ text: "OK", onPress: () => navigation.goBack() }]);
    }
  }, [error]);

  const handleLeave = async () => {
    await leave();
    navigation.goBack();
  };

  const playback = room?.playback;
  const listenerCount = room ? Object.keys(room.listeners || {}).length : 0;

  return (
    <View style={styles.container}>
      {/* Room Code Badge */}
      <View style={styles.codePill}>
        <Text style={styles.codeLabel}>ROOM CODE</Text>
        <Text style={styles.code}>{roomCode}</Text>
      </View>

      {/* Album Art */}
      {playback?.albumArt ? (
        <Image source={{ uri: playback.albumArt }} style={styles.albumArt} />
      ) : (
        <View style={[styles.albumArt, styles.albumArtPlaceholder]}>
          <Text style={styles.albumArtEmoji}>🎵</Text>
        </View>
      )}

      {/* Track Info */}
      <Text style={styles.trackName}>{playback?.trackName ?? "No track playing"}</Text>
      <Text style={styles.artistName}>{playback?.artistName ?? ""}</Text>

      {/* Host Controls */}
      {isHost && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => navigation.navigate("Search", { roomCode, broadcastPlayback })}
          >
            <Text style={styles.searchBtnText}>🔍 Pick a Song</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pauseBtn}
            onPress={() =>
              broadcastPlayback({ ...playback, isPlaying: !playback?.isPlaying })
            }
          >
            <Text style={styles.pauseBtnText}>
              {playback?.isPlaying ? "⏸ Pause" : "▶ Play"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!isHost && (
        <Text style={styles.listenerNote}>
          Listening in sync • {listenerCount} {listenerCount === 1 ? "person" : "people"} in room
        </Text>
      )}

      {/* Listeners List */}
      <ScrollView style={styles.listenerList}>
        <Text style={styles.listenerHeading}>In this room ({listenerCount})</Text>
        {room &&
          Object.entries(room.listeners || {}).map(([uid, info]) => (
            <Text key={uid} style={styles.listenerName}>
              {uid === room.hostId ? "👑 " : "🎧 "}
              {info.displayName}
            </Text>
          ))}
      </ScrollView>

      {/* Leave Button */}
      <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
        <Text style={styles.leaveBtnText}>{isHost ? "End Room" : "Leave Room"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: COLORS.background, padding: 24, alignItems: "center" },
  codePill:             {
    backgroundColor: COLORS.roomCode,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  codeLabel:            { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 2 },
  code:                 { color: COLORS.textPrimary, fontSize: 24, fontWeight: "bold", letterSpacing: 6 },
  albumArt:             { width: 220, height: 220, borderRadius: 16, marginBottom: 20 },
  albumArtPlaceholder:  { backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center" },
  albumArtEmoji:        { fontSize: 64 },
  trackName:            { color: COLORS.textPrimary, fontSize: 20, fontWeight: "bold", textAlign: "center" },
  artistName:           { color: COLORS.textSecondary, fontSize: 15, marginBottom: 24, textAlign: "center" },
  controls:             { width: "100%", marginBottom: 16 },
  searchBtn:            {
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    padding: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  searchBtnText:        { color: COLORS.background, fontWeight: "bold", fontSize: 15 },
  pauseBtn:             {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 50,
    padding: 14,
    alignItems: "center",
  },
  pauseBtnText:         { color: COLORS.primary, fontWeight: "bold", fontSize: 15 },
  listenerNote:         { color: COLORS.textSecondary, marginBottom: 16 },
  listenerList:         { width: "100%", flex: 1 },
  listenerHeading:      { color: COLORS.textMuted, fontSize: 12, letterSpacing: 1, marginBottom: 8 },
  listenerName:         { color: COLORS.textPrimary, fontSize: 15, marginBottom: 6 },
  leaveBtn:             { marginTop: 16, padding: 12 },
  leaveBtnText:         { color: COLORS.error, fontWeight: "bold" },
});
