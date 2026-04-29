jest.mock('firebase/database', () => ({
  ref: jest.fn().mockReturnValue('mock-ref'),
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  push: jest.fn().mockReturnValue({ key: 'mock-push-key' }),
  onValue: jest.fn(),
  off: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  serverTimestamp: jest.fn().mockReturnValue(0),
}));

jest.mock('../../src/services/firebase', () => ({ db: {} }));

const { ref, set, get } = require('firebase/database');
const {
  likeUser,
  passUser,
  getAlreadySeen,
  getPublicUsers,
  getMatches,
} = require('../../src/services/matchService');

function makeSnap(value) {
  return {
    val: () => value,
    exists: () => value !== null && value !== undefined,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('likeUser', () => {
  it('returns null when the other user has not liked back', async () => {
    get.mockResolvedValue(makeSnap(null)); // toUid has not liked fromUid
    const result = await likeUser('user-a', 'user-b', 0.8);
    expect(set).toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('creates a match and returns matchId when mutual like exists', async () => {
    get
      .mockResolvedValueOnce(makeSnap(true))   // likes/toUid/fromUid → they liked back
      .mockResolvedValueOnce(makeSnap(null));  // matches/matchId → not yet created

    const result = await likeUser('user-a', 'user-b', 0.75);
    expect(result).toBe('user-a_user-b'); // sorted alphabetically
    expect(set).toHaveBeenCalledTimes(2); // one for the like, one for the match
  });

  it('does not overwrite an existing match', async () => {
    get
      .mockResolvedValueOnce(makeSnap(true))  // mutual like
      .mockResolvedValueOnce(makeSnap({ user1: 'user-a', user2: 'user-b' })); // match exists

    await likeUser('user-a', 'user-b', 0.5);
    // set called once (for the like), NOT twice — existing match is skipped
    expect(set).toHaveBeenCalledTimes(1);
  });

  it('stores score rounded to integer percentage', async () => {
    get
      .mockResolvedValueOnce(makeSnap(true))
      .mockResolvedValueOnce(makeSnap(null));

    await likeUser('user-a', 'user-b', 0.756);
    const matchSetCall = set.mock.calls.find(
      ([, data]) => data && typeof data === 'object' && 'score' in data
    );
    expect(matchSetCall[1].score).toBe(76);
  });

  it('produces a consistent matchId regardless of argument order', async () => {
    get
      .mockResolvedValue(makeSnap(true))
      .mockResolvedValue(makeSnap(null));

    const id1 = await likeUser('user-b', 'user-a', 0.5);
    expect(id1).toBe('user-a_user-b'); // always sorted
  });
});

describe('passUser', () => {
  it('writes to the passed node', async () => {
    await passUser('user-a', 'user-b');
    expect(set).toHaveBeenCalledWith('mock-ref', true);
    expect(ref).toHaveBeenCalledWith({}, 'passed/user-a/user-b');
  });
});

describe('getAlreadySeen', () => {
  it('returns union of liked and passed UIDs', async () => {
    get
      .mockResolvedValueOnce(makeSnap({ 'user-b': true, 'user-c': true })) // likes
      .mockResolvedValueOnce(makeSnap({ 'user-d': true }));                // passed

    const seen = await getAlreadySeen('user-a');
    expect(seen).toEqual(new Set(['user-b', 'user-c', 'user-d']));
  });

  it('returns empty Set when user has no likes or passes', async () => {
    get
      .mockResolvedValueOnce(makeSnap(null))
      .mockResolvedValueOnce(makeSnap(null));

    const seen = await getAlreadySeen('user-a');
    expect(seen.size).toBe(0);
  });
});

describe('getPublicUsers', () => {
  it('returns only public users with a nickname, excluding the current user', async () => {
    get.mockResolvedValue(makeSnap({
      'uid-self':    { isPublic: true,  nickname: 'Me' },
      'uid-public':  { isPublic: true,  nickname: 'Alice' },
      'uid-private': { isPublic: false, nickname: 'Bob' },
      'uid-no-nick': { isPublic: true,  nickname: undefined },
    }));

    const users = await getPublicUsers('uid-self');
    expect(users).toHaveLength(1);
    expect(users[0].uid).toBe('uid-public');
  });

  it('returns empty array when database is empty', async () => {
    get.mockResolvedValue(makeSnap(null));
    const users = await getPublicUsers('uid-self');
    expect(users).toEqual([]);
  });
});

describe('getMatches', () => {
  it('returns matches sorted newest first', async () => {
    get.mockResolvedValue(makeSnap({
      'match-1': { user1: 'uid-a', user2: 'uid-b', createdAt: 1000 },
      'match-2': { user1: 'uid-a', user2: 'uid-c', createdAt: 3000 },
      'match-3': { user1: 'uid-x', user2: 'uid-y', createdAt: 2000 }, // unrelated
    }));

    const matches = await getMatches('uid-a');
    expect(matches).toHaveLength(2);
    expect(matches[0].id).toBe('match-2'); // newest first
    expect(matches[1].id).toBe('match-1');
  });

  it('returns empty array when no matches exist', async () => {
    get.mockResolvedValue(makeSnap(null));
    expect(await getMatches('uid-a')).toEqual([]);
  });
});
