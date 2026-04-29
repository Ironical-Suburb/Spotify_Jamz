jest.mock('firebase/database', () => ({
  ref: jest.fn().mockReturnValue('mock-ref'),
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  push: jest.fn().mockReturnValue('mock-push-ref'),
  onValue: jest.fn(),
  off: jest.fn(),
}));

jest.mock('../../src/services/firebase', () => ({ db: {} }));

const { ref, set, get, push, onValue, off } = require('firebase/database');
const {
  getDmId,
  getOrCreateDM,
  sendDM,
  subscribeToDMMessages,
  subscribeToDMList,
  markDMRead,
} = require('../../src/services/dmService');

function makeSnap(value) {
  return { val: () => value, exists: () => value !== null && value !== undefined };
}

beforeEach(() => jest.clearAllMocks());

describe('getDmId', () => {
  it('produces a sorted, underscore-joined ID', () => {
    expect(getDmId('uid-b', 'uid-a')).toBe('uid-a_uid-b');
    expect(getDmId('uid-a', 'uid-b')).toBe('uid-a_uid-b');
  });

  it('is commutative — both orderings produce the same ID', () => {
    const id1 = getDmId('alice', 'bob');
    const id2 = getDmId('bob', 'alice');
    expect(id1).toBe(id2);
  });
});

describe('getOrCreateDM', () => {
  it('creates DM info when it does not exist', async () => {
    get.mockResolvedValue(makeSnap(null)); // does not exist
    const dmId = await getOrCreateDM('uid-a', 'uid-b');
    expect(dmId).toBe('uid-a_uid-b');
    expect(set).toHaveBeenCalledWith('mock-ref', expect.objectContaining({
      participants: { 'uid-a': true, 'uid-b': true },
    }));
  });

  it('skips creation when DM already exists', async () => {
    get.mockResolvedValue(makeSnap({ participants: { 'uid-a': true, 'uid-b': true }, createdAt: 1000 }));
    await getOrCreateDM('uid-a', 'uid-b');
    expect(set).not.toHaveBeenCalled();
  });
});

describe('sendDM', () => {
  it('pushes message and updates both userDMs entries', async () => {
    await sendDM('dm-a_b', 'uid-a', 'Alice', '🎵', 'uid-b', 'Bob', '🎸', 'Hello!');

    expect(push).toHaveBeenCalledWith('mock-ref');
    expect(set).toHaveBeenCalledTimes(3); // message + two userDMs updates

    // Verify sender's userDMs entry (no unread)
    const senderCall = set.mock.calls.find(([, data]) => data && data.otherUid === 'uid-b' && !data.unread);
    expect(senderCall).toBeDefined();

    // Verify receiver's userDMs entry (unread: true)
    const receiverCall = set.mock.calls.find(([, data]) => data && data.unread === true);
    expect(receiverCall).toBeDefined();
    expect(receiverCall[1].otherNickname).toBe('Alice');
  });
});

describe('subscribeToDMMessages', () => {
  it('returns an unsubscribe function', () => {
    const unsub = subscribeToDMMessages('dm-id', jest.fn());
    expect(typeof unsub).toBe('function');
    unsub();
    expect(off).toHaveBeenCalledWith('mock-ref');
  });

  it('calls onUpdate with sorted messages', () => {
    const onUpdate = jest.fn();
    subscribeToDMMessages('dm-id', onUpdate);

    const [[, callback]] = onValue.mock.calls;
    callback(makeSnap({
      'msg-2': { uid: 'a', text: 'hi', sentAt: 2000 },
      'msg-1': { uid: 'b', text: 'hey', sentAt: 1000 },
    }));

    expect(onUpdate).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'msg-1', sentAt: 1000 }),
      expect.objectContaining({ id: 'msg-2', sentAt: 2000 }),
    ]);
  });

  it('calls onUpdate with empty array when no messages', () => {
    const onUpdate = jest.fn();
    subscribeToDMMessages('dm-id', onUpdate);
    const [[, callback]] = onValue.mock.calls;
    callback(makeSnap(null));
    expect(onUpdate).toHaveBeenCalledWith([]);
  });
});

describe('subscribeToDMList', () => {
  it('calls onUpdate with empty array when no conversations', () => {
    const onUpdate = jest.fn();
    subscribeToDMList('uid-a', onUpdate);
    const [[, callback]] = onValue.mock.calls;
    callback(makeSnap(null));
    expect(onUpdate).toHaveBeenCalledWith([]);
  });

  it('calls onUpdate with conversations sorted newest first', () => {
    const onUpdate = jest.fn();
    subscribeToDMList('uid-a', onUpdate);

    const [[, callback]] = onValue.mock.calls;
    callback(makeSnap({
      'dm-1': { dmId: 'dm-1', lastAt: 1000, lastText: 'old' },
      'dm-2': { dmId: 'dm-2', lastAt: 3000, lastText: 'newest' },
      'dm-3': { dmId: 'dm-3', lastAt: 2000, lastText: 'middle' },
    }));

    const result = onUpdate.mock.calls[0][0];
    expect(result[0].lastText).toBe('newest');
    expect(result[2].lastText).toBe('old');
  });
});

describe('markDMRead', () => {
  it('sets unread to false for the given user', async () => {
    await markDMRead('dm-id', 'uid-a');
    expect(ref).toHaveBeenCalledWith({}, 'userDMs/uid-a/dm-id/unread');
    expect(set).toHaveBeenCalledWith('mock-ref', false);
  });
});
