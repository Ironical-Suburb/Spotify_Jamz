import React, { createContext, useContext, useState } from "react";
import "react-native-uuid";
import uuid from "react-native-uuid";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Generate a stable anonymous ID without Firebase Auth
  const [user] = useState({ uid: uuid.v4() });
  const [spotifyToken, setSpotifyToken] = useState(null);

  return (
    <AuthContext.Provider value={{ user, spotifyToken, setSpotifyToken, loading: false, logout: () => {} }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}