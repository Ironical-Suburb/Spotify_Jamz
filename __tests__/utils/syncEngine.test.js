import { syncToHost, startSyncTicker } from '../../src/utils/syncEngine';

jest.mock('../../src/services/spotify', () => ({
  playTrack: jest.fn().mockResolvedValue(undefined),
  pausePlayback: jest.fn().mockResolvedValue(undefined),
  seekTo: jest.fn().mockResolvedValue(undefined),
  getPlaybackState: jest.fn().mockResolvedValue({ progress_ms: 0 }),
}));

// @constants is resolved via moduleNameMapper → src/constants/index.js (real values)
// MAX_DRIFT_MS = 2000

const { playTrack, pausePlayback, seekTo, getPlaybackState } =
  require('../../src/services/spotify');

const TOKEN = 'test-token';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('syncToHost', () => {
  it('does nothing when trackUri is empty', async () => {
    await syncToHost({ trackUri: '', isPlaying: true, positionMs: 0, updatedAt: Date.now() }, TOKEN, null);
    expect(playTrack).not.toHaveBeenCalled();
    expect(pausePlayback).not.toHaveBeenCalled();
  });

  it('pauses when isPlaying is false', async () => {
    await syncToHost(
      { trackUri: 'spotify:track:abc', isPlaying: false, positionMs: 5000, updatedAt: Date.now() },
      TOKEN,
      'spotify:track:abc',
    );
    expect(pausePlayback).toHaveBeenCalledWith(TOKEN);
    expect(seekTo).not.toHaveBeenCalled();
  });

  it('plays new track when currentTrackUri differs', async () => {
    const now = Date.now();
    await syncToHost(
      { trackUri: 'spotify:track:new', isPlaying: true, positionMs: 1000, updatedAt: now },
      TOKEN,
      'spotify:track:old',
    );
    expect(playTrack).toHaveBeenCalledWith('spotify:track:new', expect.any(Number), TOKEN);
  });

  it('accounts for network delay in target position', async () => {
    const past = Date.now() - 500; // 500ms ago
    await syncToHost(
      { trackUri: 'spotify:track:new', isPlaying: true, positionMs: 1000, updatedAt: past },
      TOKEN,
      'spotify:track:old',
    );
    const [, positionArg] = playTrack.mock.calls[0];
    expect(positionArg).toBeGreaterThanOrEqual(1500); // at least 1000 + 500ms delay
  });

  it('does not seek when drift is within MAX_DRIFT_MS (2000ms)', async () => {
    const now = Date.now();
    getPlaybackState.mockResolvedValueOnce({ progress_ms: 900 }); // local at 900ms
    await syncToHost(
      { trackUri: 'spotify:track:same', isPlaying: true, positionMs: 1000, updatedAt: now },
      TOKEN,
      'spotify:track:same', // same track
    );
    // drift = |900 - ~1000| = ~100ms, well within 2000ms threshold
    expect(seekTo).not.toHaveBeenCalled();
  });

  it('seeks when drift exceeds MAX_DRIFT_MS', async () => {
    const now = Date.now();
    getPlaybackState.mockResolvedValueOnce({ progress_ms: 10000 }); // local far ahead
    await syncToHost(
      { trackUri: 'spotify:track:same', isPlaying: true, positionMs: 1000, updatedAt: now },
      TOKEN,
      'spotify:track:same',
    );
    // drift = |10000 - ~1000| = ~9000ms, exceeds 2000ms
    expect(seekTo).toHaveBeenCalledWith(expect.any(Number), TOKEN);
  });

  it('handles null progress_ms from getPlaybackState', async () => {
    const now = Date.now();
    getPlaybackState.mockResolvedValueOnce(null);
    await syncToHost(
      { trackUri: 'spotify:track:same', isPlaying: true, positionMs: 100, updatedAt: now },
      TOKEN,
      'spotify:track:same',
    );
    // localPosition defaults to 0, target ~100ms, drift < 2000ms → no seek
    expect(seekTo).not.toHaveBeenCalled();
  });

  it('catches errors silently without throwing', async () => {
    getPlaybackState.mockRejectedValueOnce(new Error('Spotify API unavailable'));
    await expect(
      syncToHost(
        { trackUri: 'spotify:track:same', isPlaying: true, positionMs: 1000, updatedAt: Date.now() },
        TOKEN,
        'spotify:track:same',
      )
    ).resolves.toBeUndefined();
  });
});

describe('startSyncTicker', () => {
  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  it('returns a timer handle', () => {
    const fn = jest.fn();
    const handle = startSyncTicker(fn, 1000);
    expect(handle).toBeDefined();
    clearInterval(handle);
  });

  it('calls syncFn on each tick', () => {
    const fn = jest.fn();
    const handle = startSyncTicker(fn, 1000);
    jest.advanceTimersByTime(3000);
    expect(fn).toHaveBeenCalledTimes(3);
    clearInterval(handle);
  });
});
