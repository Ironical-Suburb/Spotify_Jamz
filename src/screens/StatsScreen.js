import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@hooks/useAuth";
import { fetchUserStats } from "@services/spotify";
import { COLORS } from "@constants";

const TIME_RANGES = ["4 Weeks", "6 Months", "All Time"];

export default function StatsScreen({ navigation }) {
  const { spotifyToken } = useAuth();
  const [activeTab, setActiveTab] = useState("4 Weeks");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ artists: [], tracks: [] });

  useEffect(() => {
    const loadStats = async () => {
      if (!spotifyToken) return;
      setLoading(true);
      const data = await fetchUserStats(spotifyToken, activeTab);
      setStats(data);
      setLoading(false);
    };
    loadStats();
  }, [activeTab, spotifyToken]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>Your Stats</Text>
        </View>

        <View style={styles.tabContainer}>
          {TIME_RANGES.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏆 Top Artists</Text>
                {stats.artists.length === 0 ? (
                  <Text style={styles.emptyText}>Not enough data yet!</Text>
                ) : (
                  stats.artists.map((artist, index) => (
                    <ArtistRow key={artist.id || index} artist={artist} rank={index + 1} />
                  ))
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎧 Top Tracks</Text>
                {stats.tracks.length === 0 ? (
                  <Text style={styles.emptyText}>Not enough data yet!</Text>
                ) : (
                  stats.tracks.map((track, index) => (
                    <TrackRow key={track.id || index} track={track} rank={index + 1} />
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ArtistRow({ artist, rank }) {
  const imageUrl = artist.images?.[0]?.url;
  const popularity = artist.popularity ?? 0;

  return (
    <View style={styles.row}>
      <Text style={styles.rank}>#{rank}</Text>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.artistImg} />
      ) : (
        <View style={[styles.artistImg, styles.imgPlaceholder]}>
          <Text style={{ fontSize: 22 }}>🎤</Text>
        </View>
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{artist.name}</Text>
        <View style={styles.popRow}>
          <View style={styles.popBar}>
            <View style={[styles.popFill, { width: `${popularity}%` }]} />
          </View>
          <Text style={styles.popLabel}>{popularity} popularity</Text>
        </View>
        {artist.genres?.length > 0 && (
          <Text style={styles.genres} numberOfLines={1}>
            {artist.genres.slice(0, 3).join(" · ")}
          </Text>
        )}
      </View>
    </View>
  );
}

function TrackRow({ track, rank }) {
  const imageUrl = track.album?.images?.[0]?.url;
  const popularity = track.popularity ?? 0;
  const artistNames = track.artists?.map(a => a.name).join(", ") ?? "";

  return (
    <View style={styles.row}>
      <Text style={styles.rank}>#{rank}</Text>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.trackImg} />
      ) : (
        <View style={[styles.trackImg, styles.imgPlaceholder]}>
          <Text style={{ fontSize: 22 }}>🎵</Text>
        </View>
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{track.name}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{artistNames}</Text>
        <View style={styles.popRow}>
          <View style={styles.popBar}>
            <View style={[styles.popFill, { width: `${popularity}%` }]} />
          </View>
          <Text style={styles.popLabel}>{popularity} popularity</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 20 },
  topBar: { marginBottom: 20, marginTop: 8 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: COLORS.textPrimary },

  tabContainer: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.surfaceAlt },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: COLORS.textPrimary, fontWeight: "bold" },

  scrollContent: { paddingBottom: 40, gap: 32 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.textPrimary },
  emptyText: { color: COLORS.textMuted, fontStyle: "italic", textAlign: "center", paddingVertical: 10 },

  row: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 16, padding: 12, gap: 12 },
  rank: { color: COLORS.primary, fontWeight: "900", fontSize: 15, width: 28, textAlign: "center" },
  artistImg: { width: 56, height: 56, borderRadius: 28 },
  trackImg: { width: 56, height: 56, borderRadius: 10 },
  imgPlaceholder: { backgroundColor: COLORS.surfaceAlt, justifyContent: "center", alignItems: "center" },
  rowInfo: { flex: 1, gap: 4 },
  rowName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "600" },
  rowSub: { color: COLORS.textMuted, fontSize: 12 },
  genres: { color: COLORS.textMuted, fontSize: 11 },

  popRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  popBar: { flex: 1, height: 4, backgroundColor: COLORS.surfaceAlt, borderRadius: 2 },
  popFill: { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
  popLabel: { color: COLORS.textMuted, fontSize: 10, width: 80 },
});
