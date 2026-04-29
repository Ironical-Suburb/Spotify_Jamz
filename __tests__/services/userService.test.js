jest.mock('firebase/database', () => ({
  ref: jest.fn().mockReturnValue('mock-ref'),
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  onValue: jest.fn(),
  off: jest.fn(),
  serverTimestamp: jest.fn().mockReturnValue('SERVER_TS'),
  query: jest.fn().mockReturnValue('mock-query'),
  orderByChild: jest.fn().mockReturnValue('mock-orderByChild'),
  startAt: jest.fn().mockReturnValue('mock-startAt'),
  endAt: jest.fn().mockReturnValue('mock-endAt'),
}));

jest.mock('../../src/services/firebase', () => ({ db: {} }));

const { ref, set, get, update, onValue, off } = require('firebase/database');
const {
  profileExists,
  createProfile,
  updateProfile,
  getProfile,
  subscribeToProfile,
  setOnlineStatus,
  setCurrentTrack,
  searchPublicUsers,
} = require('../../src/services/userService');

function makeSnap(value) {
  return { val: () => value, exists: () => value !== null && value !== undefined };
}

beforeEach(() => jest.clearAllMocks());

describe('profileExists', () => {
  it('returns true when snapshot exists', async () => {
    get.mockResolvedValue(makeSnap({ nickname: 'Alice' }));
    expect(await profileExists('uid-a')).toBe(true);
  });

  it('returns false when snapshot does not exist', async () => {
    get.mockResolvedValue(makeSnap(null));
    expect(await profileExists('uid-a')).toBe(false);
  });
});

describe('createProfile', () => {
  it('writes profile to users/{uid} with required fields', async () => {
    const profileData = {
      nickname: 'Alice',
      emoji: '🎵',
      isPublic: true,
      topGenres: ['pop', 'rock'],
      topArtists: ['Artist A'],
      spotifyDisplayName: 'Alice Spotify',
      spotifyAvatar: 'https://example.com/avatar.jpg',
      followerCount: 42,
    };

    await createProfile('uid-a', profileData);
    expect(ref).toHaveBeenCalledWith({}, 'users/uid-a');
    const [, written] = set.mock.calls[0];
    expect(written.nickname).toBe('Alice');
    expect(written.online).toBe(true);
    expect(written.currentRoom).toBeNull();
    expect(written.currentTrack).toBeNull();
    expect(typeof written.createdAt).toBe('number');
  });

  it('filters out undefined values from topGenres and topArtists', async () => {
    await createProfile('uid-a', {
      nickname: 'Bob',
      topGenres: ['pop', undefined, null],
      topArtists: [undefined],
      spotifyDisplayName: null,
      spotifyAvatar: undefined,
      followerCount: undefined,
    });
    const [, written] = set.mock.calls[0];
    expect(written.topGenres).toEqual(['pop']);
    expect(written.topArtists).toEqual([]);
    expect(written.spotifyAvatar).toBeNull();
    expect(written.followerCount).toBeNull();
  });
});

describe('getProfile', () => {
  it('returns profile data when user exists', async () => {
    get.mockResolvedValue(makeSnap({ nickname: 'Alice', emoji: '🎵' }));
    const profile = await getProfile('uid-a');
    expect(profile.nickname).toBe('Alice');
  });

  it('returns null when user does not exist', async () => {
    get.mockResolvedValue(makeSnap(null));
    expect(await getProfile('uid-a')).toBeNull();
  });
});

describe('updateProfile', () => {
  it('calls update with the given partial data', async () => {
    await updateProfile('uid-a', { nickname: 'Updated' });
    expect(ref).toHaveBeenCalledWith({}, 'users/uid-a');
    expect(update).toHaveBeenCalledWith('mock-ref', { nickname: 'Updated' });
  });
});

describe('subscribeToProfile', () => {
  it('returns an unsubscribe function that calls off', () => {
    const unsub = subscribeToProfile('uid-a', jest.fn());
    expect(typeof unsub).toBe('function');
    unsub();
    expect(off).toHaveBeenCalledWith('mock-ref');
  });

  it('calls onUpdate with profile data', () => {
    const onUpdate = jest.fn();
    subscribeToProfile('uid-a', onUpdate);
    const [[, callback]] = onValue.mock.calls;
    callback(makeSnap({ nickname: 'Alice' }));
    expect(onUpdate).toHaveBeenCalledWith({ nickname: 'Alice' });
  });
});

describe('setOnlineStatus', () => {
  it('updates online, currentRoom, and lastSeen', async () => {
    await setOnlineStatus('uid-a', true, 'room-xyz');
    expect(update).toHaveBeenCalledWith('mock-ref', {
      online: true,
      currentRoom: 'room-xyz',
      lastSeen: 'SERVER_TS',
    });
  });

  it('defaults currentRoom to null', async () => {
    await setOnlineStatus('uid-a', false);
    expect(update).toHaveBeenCalledWith('mock-ref', expect.objectContaining({
      currentRoom: null,
    }));
  });
});

describe('setCurrentTrack', () => {
  it('updates currentTrack field', async () => {
    const track = { name: 'Song', artist: 'Artist', uri: 'spotify:track:123' };
    await setCurrentTrack('uid-a', track);
    expect(update).toHaveBeenCalledWith('mock-ref', { currentTrack: track });
  });
});

describe('searchPublicUsers', () => {
  it('returns only public users from query results', async () => {
    get.mockResolvedValue(makeSnap({
      'uid-a': { nickname: 'alice', isPublic: true,  emoji: '🎵' },
      'uid-b': { nickname: 'alice2', isPublic: false, emoji: '🎸' },
    }));
    const results = await searchPublicUsers('alice');
    expect(results).toHaveLength(1);
    expect(results[0].uid).toBe('uid-a');
    expect(results[0].nickname).toBe('alice');
  });

  it('returns empty array when snapshot has no data', async () => {
    get.mockResolvedValue(makeSnap(null));
    const results = await searchPublicUsers('nobody');
    expect(results).toEqual([]);
  });

  it('passes nickname to query bounds', async () => {
    const { query, orderByChild, startAt, endAt } = require('firebase/database');
    get.mockResolvedValue(makeSnap(null));
    await searchPublicUsers('bob');
    expect(orderByChild).toHaveBeenCalledWith('nickname');
    expect(startAt).toHaveBeenCalledWith('bob');
    expect(endAt).toHaveBeenCalledWith('bob');
  });
});
