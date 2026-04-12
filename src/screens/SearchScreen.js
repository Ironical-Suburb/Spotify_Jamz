import React, { useState } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Alert,
} from "react-native";
import { searchTracks, playTrack } from "@services/spotify";
import { useAuth } from "@hooks/useAuth";
import { COLORS } from "@constants";

export default function SearchScreen({ route, navigation }) {
  const { roomCode, broadcastPlayback } = route.params;
  const { spotifyToken } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchTracks(query, spotifyToken);
      setResults(data.tracks.items);
    } catch (e) {
      Alert.alert("Search failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrack = async (track) => {
    try {
      // Play on host's Spotify
      await playTrack(track.uri, 0, spotifyToken);

      // Broadcast to room
      broadcastPlayback({
        trackUri: track.uri,
        trackName: track.name,
        artistName: track.artists.map((a) => a.name).join(", "),
        albumArt: track.album.images[0]?.url ?? null,
        isPlaying: true,
        positionMs: 0,
      });

      navigation.goBack();
    } catch (e) {
      Alert.alert("Playback error", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search for a song..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Go</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.trackRow} onPress={() => handleSelectTrack(item)}>
            {item.album.images[1] && (
              <Image source={{ uri: item.album.images[1].url }} style={styles.thumb} />
            )}
            <View style={styles.trackInfo}>
              <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.artistName} numberOfLines={1}>
                {item.artists.map((a) => a.name).join(", ")}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  searchRow:      { flexDirection: "row", marginBottom: 16 },
  input:          {
    flex: 1,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginRight: 8,
  },
  searchBtn:      {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  searchBtnText:  { color: COLORS.background, fontWeight: "bold" },
  trackRow:       { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  thumb:          { width: 52, height: 52, borderRadius: 6, marginRight: 12 },
  trackInfo:      { flex: 1 },
  trackName:      { color: COLORS.textPrimary, fontWeight: "bold", fontSize: 15 },
  artistName:     { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  separator:      { height: 1, backgroundColor: COLORS.surfaceAlt },
});
