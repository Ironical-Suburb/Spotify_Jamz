jest.mock('firebase/database', () => ({
  ref: jest.fn().mockReturnValue('mock-ref'),
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  remove: jest.fn().mockResolvedValue(undefined),
  onValue: jest.fn(),
  off: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/services/firebase', () => ({ db: {} }));

const { ref, set, get, remove, onValue, off } = require('firebase/database');
const {
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  checkRelationship,
  getFriends,
  subscribeToPendingRequests,
} = require('../../src/services/friendRequestService');

function makeSnap(value) {
  return { val: () => value, exists: () => value !== null && value !== undefined };
}

beforeEach(() => jest.clearAllMocks());

describe('sendFriendRequest', () => {
  it('writes to friendRequests/{toUid}/{fromUid}', async () => {
    const profile = { nickname: 'Alice', emoji: '🎵' };
    await sendFriendRequest('uid-from', profile, 'uid-to');
    expect(ref).toHaveBeenCalledWith({}, 'friendRequests/uid-to/uid-from');
    expect(set).toHaveBeenCalledWith('mock-ref', expect.objectContaining({
      fromUid: 'uid-from',
      nickname: 'Alice',
      emoji: '🎵',
    }));
  });

  it('uses default emoji when profile has none', async () => {
    await sendFriendRequest('uid-from', { nickname: 'Bob' }, 'uid-to');
    expect(set).toHaveBeenCalledWith('mock-ref', expect.objectContaining({ emoji: '🎵' }));
  });
});

describe('cancelFriendRequest', () => {
  it('removes from friendRequests/{toUid}/{fromUid}', async () => {
    await cancelFriendRequest('uid-from', 'uid-to');
    expect(ref).toHaveBeenCalledWith({}, 'friendRequests/uid-to/uid-from');
    expect(remove).toHaveBeenCalledWith('mock-ref');
  });
});

describe('declineFriendRequest', () => {
  it('removes from friendRequests/{myUid}/{fromUid}', async () => {
    await declineFriendRequest('uid-me', 'uid-from');
    expect(ref).toHaveBeenCalledWith({}, 'friendRequests/uid-me/uid-from');
    expect(remove).toHaveBeenCalledWith('mock-ref');
  });
});

describe('acceptFriendRequest', () => {
  it('creates bilateral friend entries and removes request', async () => {
    get.mockResolvedValue(makeSnap({ nickname: 'Alice', emoji: '🎸' }));
    const myProfile = { nickname: 'Bob', emoji: '🎵' };

    await acceptFriendRequest('uid-me', myProfile, 'uid-them');

    const setCalls = set.mock.calls.map(([refArg]) => refArg);
    expect(ref).toHaveBeenCalledWith({}, 'friends/uid-me/uid-them');
    expect(ref).toHaveBeenCalledWith({}, 'friends/uid-them/uid-me');
    expect(remove).toHaveBeenCalledWith('mock-ref'); // request removed
  });
});

describe('removeFriend', () => {
  it('removes both directions', async () => {
    await removeFriend('uid-a', 'uid-b');
    expect(ref).toHaveBeenCalledWith({}, 'friends/uid-a/uid-b');
    expect(ref).toHaveBeenCalledWith({}, 'friends/uid-b/uid-a');
    expect(remove).toHaveBeenCalledTimes(2);
  });
});

describe('checkRelationship', () => {
  it('returns "friends" when friend entry exists', async () => {
    get
      .mockResolvedValueOnce(makeSnap({ uid: 'uid-b' })) // friends/me/other exists
      .mockResolvedValueOnce(makeSnap(null))
      .mockResolvedValueOnce(makeSnap(null));
    expect(await checkRelationship('uid-me', 'uid-other')).toBe('friends');
  });

  it('returns "pending_received" when they sent us a request', async () => {
    get
      .mockResolvedValueOnce(makeSnap(null))              // not friends
      .mockResolvedValueOnce(makeSnap({ fromUid: 'uid-other' })) // request received
      .mockResolvedValueOnce(makeSnap(null));
    expect(await checkRelationship('uid-me', 'uid-other')).toBe('pending_received');
  });

  it('returns "pending_sent" when we sent them a request', async () => {
    get
      .mockResolvedValueOnce(makeSnap(null))
      .mockResolvedValueOnce(makeSnap(null))
      .mockResolvedValueOnce(makeSnap({ fromUid: 'uid-me' })); // request sent
    expect(await checkRelationship('uid-me', 'uid-other')).toBe('pending_sent');
  });

  it('returns "none" when no relationship exists', async () => {
    get
      .mockResolvedValueOnce(makeSnap(null))
      .mockResolvedValueOnce(makeSnap(null))
      .mockResolvedValueOnce(makeSnap(null));
    expect(await checkRelationship('uid-me', 'uid-other')).toBe('none');
  });
});

describe('getFriends', () => {
  it('returns array of friend objects', async () => {
    get.mockResolvedValue(makeSnap({
      'uid-b': { uid: 'uid-b', nickname: 'Bob', emoji: '🎸', addedAt: 1000 },
    }));
    const friends = await getFriends('uid-a');
    expect(friends).toHaveLength(1);
    expect(friends[0].nickname).toBe('Bob');
  });

  it('returns empty array when user has no friends', async () => {
    get.mockResolvedValue(makeSnap(null));
    expect(await getFriends('uid-a')).toEqual([]);
  });
});

describe('subscribeToPendingRequests', () => {
  it('returns an unsubscribe function', () => {
    const unsub = subscribeToPendingRequests('uid-a', jest.fn());
    expect(typeof unsub).toBe('function');
    unsub();
    expect(off).toHaveBeenCalledWith('mock-ref');
  });

  it('calls onUpdate with formatted pending requests', () => {
    const onUpdate = jest.fn();
    subscribeToPendingRequests('uid-a', onUpdate);
    const [[, callback]] = onValue.mock.calls;
    callback(makeSnap({
      'uid-x': { fromUid: 'uid-x', nickname: 'Xavier', emoji: '🎵', sentAt: 1000 },
    }));
    expect(onUpdate).toHaveBeenCalledWith([
      expect.objectContaining({ fromUid: 'uid-x', nickname: 'Xavier' }),
    ]);
  });

  it('calls onUpdate with empty array when no pending requests', () => {
    const onUpdate = jest.fn();
    subscribeToPendingRequests('uid-a', onUpdate);
    const [[, callback]] = onValue.mock.calls;
    callback(makeSnap(null));
    expect(onUpdate).toHaveBeenCalledWith([]);
  });
});
