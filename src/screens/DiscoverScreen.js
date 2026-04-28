import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Modal, Animated, Dimensions,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { useAuth } from "@hooks/useAuth";
import { useProfile } from "@hooks/useProfile";
import { getPublicUsers, getAlreadySeen, likeUser, passUser } from "@services/matchService";
import { tasteSimilarity, getVibe, matchLabel, matchColor } from "@utils/similarity";
import { COLORS } from "@constants";

const { width: SW } = Dimensions.get("window");
const SWIPE_THRESHOLD = SW * 0.28;

export default function DiscoverScreen({ navigation }) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [matchModal, setMatchModal] = useState(null);

  const position = useRef(new Animated.ValueXY()).current;

  const rotate = position.x.interpolate({
    inputRange: [-SW / 2, 0, SW / 2],
    outputRange: ["-18deg", "0deg", "18deg"],
    extrapolate: "clamp",
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [20, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const passOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -20],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const nextScale = position.x.interpolate({
    inputRange: [-SW, 0, SW],
    outputRange: [1, 0.94, 1],
    extrapolate: "clamp",
  });

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
  const next = cards[index + 1];

  // ── Core action handlers ──────────────────────────────────────────────────

  const doLike = useCallback(async (card) => {
    setActing(true);
    try {
      const mid = await likeUser(user.uid, card.uid, card.score);
      if (mid) {
        setMatchModal({ mid, other: card });
      } else {
        setIndex(i => i + 1);
      }
    } finally {
      setActing(false);
    }
  }, [user.uid]);

  const doPass = useCallback(async (card) => {
    setActing(true);
    try {
      await passUser(user.uid, card.uid);
      setIndex(i => i + 1);
    } finally {
      setActing(false);
    }
  }, [user.uid]);

  // ── Swipe helpers ─────────────────────────────────────────────────────────

  const flyOff = (direction, onDone) => {
    Animated.timing(position, {
      toValue: { x: direction * SW * 1.5, y: 0 },
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      onDone();
    });
  };

  const snapBack = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: position.x, translationY: position.y } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.state !== State.END || !current || acting) return;
    if (nativeEvent.translationX > SWIPE_THRESHOLD) {
      flyOff(1, () => doLike(current));
    } else if (nativeEvent.translationX < -SWIPE_THRESHOLD) {
      flyOff(-1, () => doPass(current));
    } else {
      snapBack();
    }
  };

  // Button-triggered swipes
  const handleLikeBtn = () => {
    if (!current || acting) return;
    flyOff(1, () => doLike(current));
  };

  const handlePassBtn = () => {
    if (!current || acting) return;
    flyOff(-1, () => doPass(current));
  };

  const handleMatchContinue = () => {
    const { mid, other } = matchModal;
    setMatchModal(null);
    setIndex(i => i + 1);
    navigation.navigate("MatchChat", {
      matchId: mid,
      otherNickname: other.nickname,
      otherEmoji: other.emoji,
      otherUid: other.uid,
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

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
        <Text style={styles.emptySub}>No more profiles right now.</Text>
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

      {/* Card stack */}
      <View style={styles.stack}>

        {/* Next card sits behind */}
        {next && (
          <Animated.View style={[styles.card, styles.cardBehind, { transform: [{ scale: nextScale }] }]}>
            <CardContent card={next} />
          </Animated.View>
        )}

        {/* Current card — draggable */}
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          enabled={!acting}
        >
          <Animated.View style={[
            styles.card,
            { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] },
          ]}>
            {/* Stamps */}
            <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
              <Text style={styles.stampLikeText}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]}>
              <Text style={styles.stampPassText}>PASS</Text>
            </Animated.View>

            <CardContent card={current} vibe={vibe} label={label} />
          </Animated.View>
        </PanGestureHandler>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.passBtn} onPress={handlePassBtn} disabled={acting} activeOpacity={0.8}>
          <Text style={styles.actionIcon}>👎</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>{index + 1} / {cards.length}</Text>
        <TouchableOpacity style={styles.likeBtn} onPress={handleLikeBtn} disabled={acting} activeOpacity={0.8}>
          {acting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.actionIcon}>❤️</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Match modal */}
      <Modal visible={!!matchModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.matchTitle}>It's a Match! 🎉</Text>
            <View style={styles.matchEmojis}>
              <Text style={styles.bigEmoji}>{profile?.emoji ?? "🎵"}</Text>
              <Text style={styles.heartEmoji}>❤️</Text>
              <Text style={styles.bigEmoji}>{matchModal?.other?.emoji ?? "🎵"}</Text>
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

function CardContent({ card, vibe, label }) {
  const toArr = v => Array.isArray(v) ? v : (v && typeof v === "object" ? Object.values(v) : []);
  const genres = toArr(card.topGenres).slice(0, 5);
  const artists = toArr(card.topArtists).slice(0, 4);

  return (
    <View style={styles.cardInner}>
      <Text style={styles.cardEmoji}>{card.emoji ?? "🎵"}</Text>
      <Text style={styles.cardNickname}>{card.nickname}</Text>

      {vibe && (
        <View style={styles.vibePill}>
          <Text style={styles.vibeText}>{vibe}</Text>
        </View>
      )}

      {genres.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TOP GENRES</Text>
          <View style={styles.chips}>
            {genres.map(g => (
              <View key={g} style={styles.chip}>
                <Text style={styles.chipText}>{g}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {artists.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TOP ARTISTS</Text>
          {artists.map(a => (
            <Text key={a} style={styles.artist}>🎤 {a}</Text>
          ))}
        </View>
      )}

      {label && (
        <View style={styles.labelPill}>
          <Text style={styles.labelText}>{label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  centered: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center", padding: 32 },
  matchPct: { fontSize: 13, fontWeight: "bold", letterSpacing: 1, textAlign: "center", marginBottom: 12 },

  stack: { flex: 1, position: "relative" },
  card: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.surface, borderRadius: 24, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardBehind: { top: 10, left: 6, right: 6 },
  cardInner: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center" },
  cardEmoji: { fontSize: 72, marginBottom: 12 },
  cardNickname: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "bold", marginBottom: 10 },

  stamp: {
    position: "absolute", top: 36, zIndex: 10,
    borderWidth: 4, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6,
  },
  stampLike: { right: 28, borderColor: "#1DB954", transform: [{ rotate: "15deg" }] },
  stampLikeText: { color: "#1DB954", fontSize: 26, fontWeight: "900", letterSpacing: 3 },
  stampPass: { left: 28, borderColor: "#FF5252", transform: [{ rotate: "-15deg" }] },
  stampPassText: { color: "#FF5252", fontSize: 26, fontWeight: "900", letterSpacing: 3 },

  vibePill: { backgroundColor: COLORS.surfaceAlt, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 20 },
  vibeText: { color: COLORS.textSecondary, fontSize: 14 },
  section: { width: "100%", marginBottom: 16, alignItems: "flex-start" },
  sectionLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: COLORS.surfaceAlt, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: COLORS.textSecondary, fontSize: 12 },
  artist: { color: COLORS.textPrimary, fontSize: 14, marginBottom: 5 },
  labelPill: { marginTop: 12, backgroundColor: COLORS.primary + "22", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  labelText: { color: COLORS.primary, fontSize: 13, fontWeight: "bold" },

  actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 32, paddingTop: 4 },
  passBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: COLORS.surfaceAlt, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  likeBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center", shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  actionIcon: { fontSize: 28 },
  counter: { color: COLORS.textMuted, fontSize: 13, minWidth: 48, textAlign: "center" },

  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  emptySub: { color: COLORS.textSecondary, fontSize: 14, textAlign: "center", marginBottom: 24 },
  refreshBtn: { backgroundColor: COLORS.surface, borderRadius: 50, paddingHorizontal: 32, paddingVertical: 14 },
  refreshBtnText: { color: COLORS.textPrimary, fontWeight: "bold" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { backgroundColor: COLORS.surfaceAlt, borderRadius: 28, padding: 32, width: "100%", alignItems: "center" },
  matchTitle: { color: COLORS.textPrimary, fontSize: 26, fontWeight: "bold", marginBottom: 24 },
  matchEmojis: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  bigEmoji: { fontSize: 56 },
  heartEmoji: { fontSize: 36 },
  matchNames: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  matchSub: { color: COLORS.primary, fontSize: 14, marginBottom: 28 },
  chatBtn: { backgroundColor: COLORS.primary, borderRadius: 50, paddingHorizontal: 32, paddingVertical: 16, width: "100%", alignItems: "center", marginBottom: 16 },
  chatBtnText: { color: COLORS.background, fontWeight: "bold", fontSize: 16 },
  keepGoing: { color: COLORS.textSecondary, fontSize: 14 },
});
