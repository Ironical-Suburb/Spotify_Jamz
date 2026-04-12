import { playTrack, seekTo, pausePlayback, getPlaybackState } from "@services/spotify";
import { MAX_DRIFT_MS } from "@constants";

/**
 * Called on every Firebase playback update received by a non-host listener.
 * Syncs the local Spotify client to the room state.
 *
 * @param {object} roomPlayback  Playback object from Firebase
 * @param {string} accessToken   Listener's Spotify access token
 * @param {string|null} currentTrackUri  What is currently playing locally
 */
export async function syncToHost(roomPlayback, accessToken, currentTrackUri) {
  const { trackUri, isPlaying, positionMs, updatedAt } = roomPlayback;

  if (!trackUri) return; // Room hasn't started playing yet

  // Calculate how many ms have passed since host pushed the update
  const networkDelayMs = Date.now() - updatedAt;
  const targetPositionMs = positionMs + networkDelayMs;

  try {
    if (!isPlaying) {
      await pausePlayback(accessToken);
      return;
    }

    if (currentTrackUri !== trackUri) {
      // Different track — hard play from calculated position
      await playTrack(trackUri, targetPositionMs, accessToken);
      return;
    }

    // Same track — check drift and seek only if needed
    const state = await getPlaybackState(accessToken);
    const localPosition = state?.progress_ms ?? 0;
    const drift = Math.abs(localPosition - targetPositionMs);

    if (drift > MAX_DRIFT_MS) {
      await seekTo(targetPositionMs, accessToken);
    }
  } catch (err) {
    console.warn("[SyncEngine] Sync failed:", err.message);
  }
}

/**
 * Periodic re-sync ticker. Call on mount for listeners, clear on unmount.
 * Returns a clearInterval handle.
 *
 * @param {function} syncFn  The sync function to call on each tick
 * @param {number}   intervalMs
 */
export function startSyncTicker(syncFn, intervalMs) {
  return setInterval(syncFn, intervalMs);
}
