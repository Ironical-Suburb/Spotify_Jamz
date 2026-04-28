import React, { useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Platform,
} from "react-native";
import { COLORS } from "@constants";

export default function ChatPanel({ messages, currentUserId, onSend }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <View style={styles.container}>
      <FlatList
        inverted
        data={[...messages].reverse()}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.uid === currentUserId ? styles.mine : styles.theirs]}>
            {item.uid !== currentUserId && (
              <Text style={styles.sender}>{item.displayName}</Text>
            )}
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No messages yet. Say hi 👋</Text>
        }
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={COLORS.textMuted}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  mine: {
    backgroundColor: COLORS.primary,
    alignSelf: "flex-end",
  },
  theirs: {
    backgroundColor: COLORS.surface,
    alignSelf: "flex-start",
  },
  sender: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  msgText: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  empty: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 16 : 8,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendText: {
    color: COLORS.background,
    fontWeight: "bold",
    fontSize: 14,
  },
});
