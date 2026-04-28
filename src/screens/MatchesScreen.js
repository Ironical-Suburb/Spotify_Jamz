import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { useAuth } from "@hooks/useAuth";
import { useProfile } from "@hooks/useProfile";
import { getMatches, getMatchOtherProfile } from "@services/matchService";
import { createRoom } from "@services/roomService";
import { COLORS } from "@constants";
import { matchLabel, matchColor } from "@utils/similarity";

export default function MatchesScreen({ navigation }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  const loadMatches = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const raw = await getMatches(user.uid);
      const withProfiles = await Promise.all(
        raw.map(async (m) => {
          const other = await getMatchOtherProfile(m, user.uid);
          return { ...m, other };
        })
      );
      setMatches(withProfiles.filter(m => m.other));
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  const handleJam = async (match) => {
    if (joiningId) return;
    setJoiningId(match.id);
    const displayName = profile?.nickname ?? user.uid.slice(0, 8);
    try {
      const code = await createRoom(user.uid, displayName);
      navigation.navigate("Room", { roomCode: code, isHost: true, displayName });
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setJoiningId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>💜</Text>
        <Text style={styles.emptyTitle}>No matches yet</Text>
        <Text style={styles.emptySub}>Head to Discover to find your music soulmate.</Text>
      </View>
    );
  }

  const renderMatch = ({ item }) => {
    const pct = item.score ?? 0;
    const color = matchColor(pct / 100);
    const label = matchLabel(pct / 100);
    const isJamming = joiningId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.emoji}>{item.other?.emoji ?? "🎵"}</Text>
          <View style={styles.info}>
            <Text style={styles.nickname}>{item.other?.nickname}</Text>
            <Text style={[styles.pct, { color }]}>{pct}% match · {label}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => navigation.navigate("MatchChat", {
              matchId: item.id,
              otherNickname: item.other?.nickname,
              otherEmoji: item.other?.emoji,
              otherUid: item.other?.uid,
            })}
          >
            <Text style={styles.chatBtnText}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.jamBtn}
            onPress={() => handleJam(item)}
            disabled={!!joiningId}
          >
            {isJamming
              ? <ActivityIndicator color={COLORS.background} size="small" />
              : <Text style={styles.jamBtnText}>🎵 Jam</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={m => m.id}
        renderItem={renderMatch}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onRefresh={loadMatches}
        refreshing={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  emptySub: { color: COLORS.textSecondary, fontSize: 14, textAlign: "center" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  emoji: { fontSize: 40, marginRight: 14 },
  info: { flex: 1 },
  nickname: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  pct: { fontSize: 12, fontWeight: "600" },
  cardActions: { flexDirection: "row", gap: 8 },
  chatBtn: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 50,
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  chatBtnText: { fontSize: 18 },
  jamBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    paddingHorizontal: 16,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  jamBtnText: { color: COLORS.background, fontWeight: "bold", fontSize: 13 },
});
