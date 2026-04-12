import { useEffect, useRef, useState } from "react";
import { subscribeToRoom, updatePlaybackState, leaveRoom } from "@services/roomService";
import { syncToHost, startSyncTicker } from "@utils/syncEngine";
import { SYNC_INTERVAL_MS } from "@constants";
import { useAuth } from "./useAuth";

/**
 * Manages all room state for both host and listeners.
 *
 * @param {string} roomCode
 * @param {boolean} isHost
 */
export function useRoom(roomCode, isHost) {
  const { user, spotifyToken } = useAuth();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const currentTrackUriRef = useRef(null);
  const tickerRef = useRef(null);

  useEffect(() => {
    if (!roomCode) return;

    // Subscribe to real-time room updates
    const unsubscribe = subscribeToRoom(roomCode, (data) => {
      if (!data) { setError("Room ended or not found."); return; }
      setRoom(data);

      // Listeners: sync to host playback on every update
      if (!isHost && data.playback && spotifyToken) {
        syncToHost(data.playback, spotifyToken, currentTrackUriRef.current);
        currentTrackUriRef.current = data.playback.trackUri;
      }
    });

    // Periodic drift correction for listeners
    if (!isHost) {
      tickerRef.current = startSyncTicker(() => {
        if (room?.playback && spotifyToken) {
          syncToHost(room.playback, spotifyToken, currentTrackUriRef.current);
        }
      }, SYNC_INTERVAL_MS);
    }

    return () => {
      unsubscribe();
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [roomCode, isHost, spotifyToken]);

  /** Host only — broadcast a new playback state to all listeners */
  const broadcastPlayback = (playbackState) => {
    if (!isHost) return;
    updatePlaybackState(roomCode, playbackState).catch(console.error);
  };

  const leave = () => leaveRoom(roomCode, user?.uid, isHost);

  return { room, error, broadcastPlayback, leave };
}
