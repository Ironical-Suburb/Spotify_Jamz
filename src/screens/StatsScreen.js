import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator
} from "react-native";
import { useAuth } from "@hooks/useAuth";
import { fetchUserStats } from "@services/spotify";
import { COLORS } from "@constants";

const TIME_RANGES = ["4 Weeks", "6 Months", "All Time"];

export default function StatsScreen({ navigation }) {
  const { spotifyToken } = useAuth();
  const [activeTab, setActiveTab] = useState("4 Weeks");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ artists: [], tracks: [] });

  // ── Fetch Spotify Data whenever the tab changes ──
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
        
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>⬅️</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Stats</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* ── Time Range Selector ── */}
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

        {/* ── Main Content ── */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Top Artists Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏆 Top 5 Artists</Text>
                <View style={styles.card}>
                  {stats.artists.length === 0 ? (
                    <Text style={styles.emptyText}>Not enough data yet!</Text>
                  ) : (
                    stats.artists.map((artist, index) => (
                      <View key={artist.id || index} style={styles.listItem}>
                        <Text style={styles.rank}>#{index + 1}</Text>
                        <Text style={styles.itemName} numberOfLines={1}>{artist.name}</Text>
                      </View>
                    ))
                  )}
                </View>
              </View>

              {/* Top Tracks Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎧 Top 5 Tracks</Text>
                <View style={styles.card}>
                  {stats.tracks.length === 0 ? (
                    <Text style={styles.emptyText}>Not enough data yet!</Text>
                  ) : (
                    stats.tracks.map((track, index) => (
                      <View key={track.id || index} style={styles.listItem}>
                        <Text style={styles.rank}>#{index + 1}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName} numberOfLines={1}>{track.name}</Text>
                          {/* Shows the artist name(s) under the track title */}
                          <Text style={styles.itemSub} numberOfLines={1}>
                            {track.artists.map(a => a.name).join(", ")}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </>
          )}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 24 },
  
  topBar: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, marginTop: 8 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.textPrimary },
  iconBtn: { padding: 2 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: COLORS.surfaceAlt },
  iconEmoji: { fontSize: 20 },

  tabContainer: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.surfaceAlt },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: COLORS.textPrimary, fontWeight: "bold" },

  scrollContent: { paddingBottom: 40, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.textPrimary, marginLeft: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16 },
  listItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  rank: { color: COLORS.primary, fontWeight: "900", fontSize: 16, width: 32 },
  itemName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "500", marginBottom: 2 },
  itemSub: { color: COLORS.textMuted, fontSize: 12 },
  emptyText: { color: COLORS.textMuted, fontStyle: "italic", textAlign: "center", paddingVertical: 10 },
});