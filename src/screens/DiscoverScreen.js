import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, Modal,
} from "react-native";
import { useAuth } from "@hooks/useAuth";
import { useProfile } from "@hooks/useProfile";
import { getPublicUsers, getAlreadySeen, likeUser, passUser } from "@services/matchService";
import { tasteSimilarity, getVibe, matchLabel, matchColor } from "@utils/similarity";
import { COLORS } from "@constants";

export default function DiscoverScreen({ navigation }) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [matchModal, setMatchModal] = useState(null);

  const loadCards = useCallback(async () => {
    if (!user?.uid || !profile) return;
    setLoading(true);
    try {
      const [users, seen] = await Promise.all([
        getPublicUsers(user.uid),
        getAlreadySeen(user.uid),
      ]);
      const unseen = users.filter(u => !seen.has(u.uid));
      const scored = unseen
        .map(u => ({ ...u, score: tasteSimilarity(profile, u) }))
        .sort((a, b) => b.score - a.score);
      setCards(scored);
      setIndex(0);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, profile]);

  useEffect(() => { loadCards(); }, [loadCards]);

  const current = cards[index];

  const handleLike = async () => {
    if (!current || acting) return;
    setActing(true);
    try {
      const mid = await likeUser(user.uid, current.uid, current.score);
      if (mid) {
        setMatchModal({ mid, other: current });
      } else {
        setIndex(i => i + 1);
      }
    } finally {
      setActing(false);
    }
  };

  const handlePass = async () => {
    if (!current || acting) return;
    setActing(true);
    try {
      await passUser(user.uid, current.uid);
      setIndex(i => i + 1);
    } finally {
      setActing(false);
    }
  };

  const handleMatchContinue = () => {
    const { mid, other } = matchModal;
    setMatchModal(null);
    setIndex(i => i + 1);
    navigation.navigate("MatchChat", { matchId: mid, otherNickname: other.nickname, otherEmoji: other.emoji });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>🎵</Text>
        <Text style={styles.emptyTitle}>You're all caught up</Text>
        <Text style={styles.emptySub}>No more profiles to discover right now.</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadCards}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pct = Math.round(current.score * 100);
  const vibe = getVibe(current.topGenres);
  const label = matchLabel(current.score);
  const color = matchColor(current.score);

  return (
    <View style={styles.container}>
      <Text style={[styles.matchPct, { color }]}>{pct}% taste match</Text>

      <View style={styles.card}>
        <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.emoji}>{current.emoji ?? "🎵"}</Text>
          <Text style={styles.nickname}>{current.nickname}</Text>
          <View style={styles.vibePill}>
            <Text style={styles.vibeText}>{vibe}</Text>
          </View>

          {(current.topGenres?.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TOP GENRES</Text>
              <View style={styles.chips}>
                {current.topGenres.slice(0, 5).map(g => (
                  <View key={g} style={styles.chip}>
                    <Text style={styles.chipText}>{g}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {(current.topArtists?.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>TOP ARTISTS</Text>
              {current.topArtists.slice(0, 4).map(a => (
                <Text key={a} style={styles.artist}>🎤 {a}</Text>
              ))}
            </View>
          )}

          <View style={styles.labelPill}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
        </ScrollView>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.passBtn} onPress={handlePass} disabled={acting}>
          <Text style={styles.passBtnText}>👎  Pass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeBtn} onPress={handleLike} disabled={acting}>
          {acting ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.likeBtnText}>❤️  Like</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.counter}>{index + 1} / {cards.length}</Text>

      {/* Match modal */}
      <Modal visible={!!matchModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.matchTitle}>It's a Match! 🎉</Text>
            <View style={styles.matchEmojis}>
              <Text style={styles.matchEmoji}>{profile?.emoji ?? "🎵"}</Text>
              <Text style={styles.matchHeart}>❤️</Text>
              <Text style={styles.matchEmoji}>{matchModal?.other?.emoji ?? "🎵"}</Text>
            </View>
            <Text style={styles.matchNames}>
              You & {matchModal?.other?.nickname} both liked each other!
            </Text>
            <Text style={styles.matchSub}>
              {Math.round((matchModal?.other?.score ?? 0) * 100)}% music taste match
            </Text>
            <TouchableOpacity style={styles.chatBtn} onPress={handleMatchContinue}>
              <Text style={styles.chatBtnText}>💬 Start Chatting</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setMatchModal(null); setIndex(i => i + 1); }}>
              <Text style={styles.keepGoing}>Keep Discovering</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  centered: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center", padding: 32 },
  matchPct: { fontSize: 13, fontWeight: "bold", letterSpacing: 1, textAlign: "center", marginBottom: 12 },
  card: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 24, marginBottom: 16, overflow: "hidden" },
  cardContent: { padding: 28, alignItems: "center" },
  emoji: { fontSize: 72, marginBottom: 12 },
  nickname: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  vibePill: { backgroundColor: COLORS.surfaceAlt, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 24 },
  vibeText: { color: COLORS.textSecondary, fontSize: 14 },
  section: { width: "100%", marginBottom: 20 },
  sectionLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: COLORS.surfaceAlt, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: COLORS.textSecondary, fontSize: 12 },
  artist: { color: COLORS.textPrimary, fontSize: 14, marginBottom: 6 },
  labelPill: { marginTop: 8, backgroundColor: COLORS.primary + "22", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  labelText: { color: COLORS.primary, fontSize: 13, fontWeight: "bold" },
  actions: { flexDirection: "row", gap: 12, marginBottom: 8 },
  passBtn: { flex: 1, borderWidth: 2, borderColor: COLORS.surfaceAlt, borderRadius: 50, padding: 16, alignItems: "center" },
  passBtnText: { color: COLORS.textSecondary, fontWeight: "bold", fontSize: 16 },
  likeBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 50, padding: 16, alignItems: "center" },
  likeBtnText: { color: COLORS.background, fontWeight: "bold", fontSize: 16 },
  counter: { color: COLORS.textMuted, fontSize: 12, textAlign: "center" },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  emptySub: { color: COLORS.textSecondary, fontSize: 14, textAlign: "center", marginBottom: 24 },
  refreshBtn: { backgroundColor: COLORS.surface, borderRadius: 50, paddingHorizontal: 32, paddingVertical: 14 },
  refreshBtnText: { color: COLORS.textPrimary, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { backgroundColor: COLORS.surfaceAlt, borderRadius: 28, padding: 32, width: "100%", alignItems: "center" },
  matchTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: "bold", marginBottom: 24 },
  matchEmojis: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  matchEmoji: { fontSize: 56 },
  matchHeart: { fontSize: 36 },
  matchNames: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  matchSub: { color: COLORS.primary, fontSize: 14, marginBottom: 28 },
  chatBtn: { backgroundColor: COLORS.primary, borderRadius: 50, paddingHorizontal: 32, paddingVertical: 16, width: "100%", alignItems: "center", marginBottom: 16 },
  chatBtnText: { color: COLORS.background, fontWeight: "bold", fontSize: 16 },
  keepGoing: { color: COLORS.textSecondary, fontSize: 14 },
});
