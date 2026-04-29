jest.mock('firebase/database', () => ({
  ref: jest.fn().mockReturnValue('mock-ref'),
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  push: jest.fn().mockReturnValue('mock-push-ref'),
  onValue: jest.fn(),
  off: jest.fn(),
  serverTimestamp: jest.fn().mockReturnValue('SERVER_TS'),
}));

jest.mock('../../src/services/firebase', () => ({ db: {} }));

// @constants resolved via moduleNameMapper
jest.mock('../../src/constants/index.js', () => ({
  DB_ROOMS: 'rooms',
  DB_USERS: 'users',
  COLORS: {},
  SPOTIFY_SCOPES: [],
  SYNC_INTERVAL_MS: 30000,
  MAX_DRIFT_MS: 2000,
}));

const { ref, set, get, update, push, onValue, off } = require('firebase/database');
const {
  createRoom,
  joinRoom,
  leaveRoom,
  updatePlaybackState,
  sendChatMessage,
  subscribeToRoom,
  subscribeToChat,
  rateTrack,
} = require('../../src/services/roomService');

function makeSnap(value) {
  return { val: () => value, exists: () => value !== null && value !== undefined };
}

beforeEach(() => jest.clearAllMocks());

describe('createRoom', () => {
  it('returns a 4-character uppercase room code', async () => {
    const code = await createRoom('uid-host', 'HostName');
    expect(code).toMatch(/^[A-Z0-9]{4}$/);
  });

  it('writes room data with host as first listener', async () => {
    const code = await createRoom('uid-host', 'HostName');
    const [, roomData] = set.mock.calls[0];
    expect(roomData.hostId).toBe('uid-host');
    expect(roomData.hostDisplayName).toBe('HostName');
    expect(roomData.ended).toBe(false);
    expect(roomData.listeners['uid-host']).toBeDefined();
    expect(roomData.playback.isPlaying).toBe(false);
    expect(roomData.code).toBe(code);
  });
});

describe('joinRoom', () => {
  it('throws when room does not exist', async () => {
    get.mockResolvedValue(makeSnap(null));
    await expect(joinRoom('XXXX', 'uid-user', 'Alice')).rejects.toThrow('Room not found');
  });

  it('adds listener and returns room snapshot data', async () => {
    const roomData = { code: 'ABCD', hostId: 'uid-host', ended: false };
    get.mockResolvedValue(makeSnap(roomData));

    const result = await joinRoom('ABCD', 'uid-user', 'Alice');
    expect(update).toHaveBeenCalledWith('mock-ref', { displayName: 'Alice', joinedAt: expect.any(Number) });
    expect(result).toEqual(roomData);
  });
});

describe('leaveRoom', () => {
  it('marks room as ended when host leaves', async () => {
    await leaveRoom('ABCD', 'uid-host', true);
    expect(update).toHaveBeenCalledWith('mock-ref', { ended: true });
  });

  it('removes listener entry when non-host leaves', async () => {
    await leaveRoom('ABCD', 'uid-user', false);
    expect(set).toHaveBeenCalledWith('mock-ref', null);
    expect(ref).toHaveBeenCalledWith({}, 'rooms/ABCD/listeners/uid-user');
  });
});

describe('updatePlaybackState', () => {
  it('writes playback with updatedAt timestamp', async () => {
    const playback = { trackUri: 'spotify:track:abc', isPlaying: true, positionMs: 5000 };
    await updatePlaybackState('ABCD', playback);
    expect(update).toHaveBeenCalledWith('mock-ref', {
      ...playback,
      updatedAt: expect.any(Number),
    });
  });
});

describe('sendChatMessage', () => {
  it('pushes a chat message to rooms/{code}/chat', async () => {
    await sendChatMessage('ABCD', 'uid-a', 'Alice', '  hello  ');
    expect(push).toHaveBeenCalledWith('mock-ref');
    expect(set).toHaveBeenCalledWith('mock-push-ref', expect.objectContaining({
      uid: 'uid-a',
      displayName: 'Alice',
      text: 'hello', // trimmed
    }));
  });
});

describe('subscribeToRoom', () => {
  it('returns an unsubscribe function', () => {
    const unsub = subscribeToRoom('ABCD', jest.fn());
    expect(typeof unsub).toBe('function');
    unsub();
    expect(off).toHaveBeenCalledWith('mock-ref');
  });
});

describe('subscribeToChat', () => {
  it('calls onUpdate with messages sorted ascending by sentAt', () => {
    const onUpdate = jest.fn();
    subscribeToChat('ABCD', onUpdate);

    const [[, callback]] = onValue.mock.calls;
    callback(makeSnap({
      'msg-b': { uid: 'a', text: 'second', sentAt: 2000 },
      'msg-a': { uid: 'b', text: 'first',  sentAt: 1000 },
    }));

    const [messages] = onUpdate.mock.calls[0];
    expect(messages[0].text).toBe('first');
    expect(messages[1].text).toBe('second');
  });

  it('calls onUpdate with empty array when no chat', () => {
    const onUpdate = jest.fn();
    subscribeToChat('ABCD', onUpdate);
    const [[, callback]] = onValue.mock.calls;
    callback(makeSnap(null));
    expect(onUpdate).toHaveBeenCalledWith([]);
  });
});

describe('rateTrack', () => {
  it('extracts track ID from Spotify URI and writes rating', async () => {
    await rateTrack('uid-a', 'spotify:track:abc123', 'Song Name', 'Artist', 5);
    expect(ref).toHaveBeenCalledWith({}, 'users/uid-a/ratings/abc123');
    expect(set).toHaveBeenCalledWith('mock-ref', expect.objectContaining({
      trackUri: 'spotify:track:abc123',
      trackName: 'Song Name',
      artistName: 'Artist',
      rating: 5,
    }));
  });
});
