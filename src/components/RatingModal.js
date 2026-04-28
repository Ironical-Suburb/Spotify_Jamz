import React, { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "@constants";

export default function RatingModal({ visible, trackName, artistName, onRate, onClose }) {
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (visible) setRating(5);
  }, [visible, trackName]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.label}>RATE THIS TRACK</Text>
          <Text style={styles.trackName} numberOfLines={1}>{trackName}</Text>
          <Text style={styles.artistName} numberOfLines={1}>{artistName}</Text>

          <View style={styles.pipsRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)} style={styles.pipWrapper}>
                <View style={[styles.pip, n <= rating && styles.pipFilled]} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.ratingValue}>{rating} / 10</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rateBtn}
              onPress={() => { onRate(rating); onClose(); }}
            >
              <Text style={styles.rateBtnText}>Rate ❤️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: COLORS.surfaceAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
    alignItems: "center",
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 12,
  },
  trackName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  artistName: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 28,
  },
  pipsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  pipWrapper: {
    padding: 4,
  },
  pip: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
  },
  pipFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  ratingValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 28,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
    borderRadius: 50,
    padding: 14,
    alignItems: "center",
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontWeight: "bold",
  },
  rateBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    padding: 14,
    alignItems: "center",
  },
  rateBtnText: {
    color: COLORS.background,
    fontWeight: "bold",
    fontSize: 15,
  },
});
