import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { createRoom, joinRoom } from "@services/roomService";
import { useAuth } from "@hooks/useAuth";
import { COLORS } from "@constants";

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!displayName.trim()) { Alert.alert("Enter your name first!"); return; }
    setLoading(true);
    try {
      const code = await createRoom(user.uid, displayName.trim());
      navigation.navigate("Room", { roomCode: code, isHost: true, displayName });
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomCode.trim() || !displayName.trim()) {
      Alert.alert("Enter both your name and a room code.");
      return;
    }
    setLoading(true);
    try {
      await joinRoom(roomCode.trim().toUpperCase(), user.uid, displayName.trim());
      navigation.navigate("Room", {
        roomCode: roomCode.trim().toUpperCase(),
        isHost: false,
        displayName,
      });
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* Switch Account */}
      <TouchableOpacity style={styles.switchBtn} onPress={logout}>
        <Text style={styles.switchText}>⇄ Switch Spotify Account</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Who are you?</Text>
      <TextInput
        style={styles.input}
        placeholder="Your display name"
        placeholderTextColor={COLORS.textMuted}
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={24}
      />

      <View style={styles.divider} />

      <TouchableOpacity style={styles.primaryBtn} onPress={handleCreate} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <Text style={styles.primaryBtnText}>🎵 Create a Room</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.orText}>— or join one —</Text>

      <TextInput
        style={[styles.input, styles.codeInput]}
        placeholder="Room code (e.g. X7K2)"
        placeholderTextColor={COLORS.textMuted}
        value={roomCode}
        onChangeText={setRoomCode}
        autoCapitalize="characters"
        maxLength={4}
      />

      <TouchableOpacity style={styles.secondaryBtn} onPress={handleJoin} disabled={loading}>
        <Text style={styles.secondaryBtnText}>Join Room</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: "center",
  },
  switchBtn: {
    alignSelf: "flex-end",
    padding: 8,
    marginBottom: 16,
  },
  switchText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  codeInput: {
    letterSpacing: 8,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.surfaceAlt,
    marginVertical: 24,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  primaryBtnText: {
    color: COLORS.background,
    fontWeight: "bold",
    fontSize: 16,
  },
  orText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 20,
  },
  secondaryBtn: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 50,
    padding: 16,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 16,
  },
});