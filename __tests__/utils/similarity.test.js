import {
  cosineSimilarity,
  tasteSimilarity,
  getVibe,
  matchLabel,
  matchColor,
} from '../../src/utils/similarity';

describe('cosineSimilarity', () => {
  it('returns 1.0 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 1], [1, 0, 1])).toBeCloseTo(1.0);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns 0 when one vector is all zeros', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('returns 0 when both vectors are all zeros', () => {
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  it('returns a partial score for overlapping vectors', () => {
    const score = cosineSimilarity([1, 1, 0], [1, 0, 1]);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe('tasteSimilarity', () => {
  it('returns 1.0 for identical genre and artist lists', () => {
    const profile = { topGenres: ['pop', 'rock'], topArtists: ['Artist A', 'Artist B'] };
    expect(tasteSimilarity(profile, profile)).toBeCloseTo(1.0);
  });

  it('returns 0 for completely different genres and no shared artists', () => {
    const p1 = { topGenres: ['jazz'], topArtists: ['Miles Davis'] };
    const p2 = { topGenres: ['metal'], topArtists: ['Metallica'] };
    expect(tasteSimilarity(p1, p2)).toBeCloseTo(0);
  });

  it('returns a blended score (70% genre, 30% artist)', () => {
    // Same genres, no shared artists → should be close to 0.7
    const p1 = { topGenres: ['pop'], topArtists: ['Artist A'] };
    const p2 = { topGenres: ['pop'], topArtists: ['Artist B'] };
    expect(tasteSimilarity(p1, p2)).toBeCloseTo(0.7);
  });

  it('handles Firebase object format for topGenres', () => {
    const p1 = { topGenres: { 0: 'pop', 1: 'rock' }, topArtists: [] };
    const p2 = { topGenres: ['pop', 'rock'], topArtists: [] };
    expect(tasteSimilarity(p1, p2)).toBeCloseTo(1.0);
  });

  it('returns 0 when both profiles have empty data', () => {
    expect(tasteSimilarity({}, {})).toBe(0);
  });

  it('returns 0 when profiles are null/undefined', () => {
    expect(tasteSimilarity(null, null)).toBe(0);
  });

  it('handles partial artist overlap correctly', () => {
    const p1 = { topGenres: [], topArtists: ['A', 'B', 'C'] };
    const p2 = { topGenres: [], topArtists: ['B', 'C', 'D'] };
    // intersection=2, union=4 → artistScore=0.5, genreScore=0 → total=0.15
    expect(tasteSimilarity(p1, p2)).toBeCloseTo(0.15);
  });
});

describe('getVibe', () => {
  it.each([
    [['hip-hop', 'trap'], '🔥 Hype'],
    [['rap'], '🔥 Hype'],
    [['indie', 'alternative'], '🌿 Indie Vibes'],
    [['electronic', 'edm'], '⚡ Electric'],
    [['r&b', 'soul'], '🌙 Soulful'],
    [['pop'], '✨ Pop Central'],
    [['rock', 'metal'], '🎸 Rock Out'],
    [['jazz'], '🎷 Jazz Flow'],
    [['classical'], '🎼 Classical'],
    [['latin', 'reggaeton'], '💃 Latin Heat'],
    [['country', 'folk'], '🤠 Country Roads'],
    [['ambient'], '🎵 Eclectic'],
  ])('returns correct vibe for %p', (genres, expected) => {
    expect(getVibe(genres)).toBe(expected);
  });

  it('returns Eclectic for empty genres', () => {
    expect(getVibe([])).toBe('🎵 Eclectic');
  });

  it('handles Firebase object format', () => {
    expect(getVibe({ 0: 'pop' })).toBe('✨ Pop Central');
  });
});

describe('matchLabel', () => {
  it.each([
    [0.9, '🔥 Perfect Match'],
    [0.8, '🔥 Perfect Match'],
    [0.7, '💜 Great Match'],
    [0.6, '💜 Great Match'],
    [0.5, '✨ Good Vibes'],
    [0.4, '✨ Good Vibes'],
    [0.3, '🎵 Some Overlap'],
    [0.2, '🎵 Some Overlap'],
    [0.1, '🌊 Explore Together'],
    [0.0, '🌊 Explore Together'],
  ])('score %d → %s', (score, label) => {
    expect(matchLabel(score)).toBe(label);
  });
});

describe('matchColor', () => {
  it('returns green for score >= 0.6', () => {
    expect(matchColor(0.6)).toBe('#1DB954');
    expect(matchColor(1.0)).toBe('#1DB954');
  });

  it('returns orange for score >= 0.4 and < 0.6', () => {
    expect(matchColor(0.4)).toBe('#F39C12');
    expect(matchColor(0.59)).toBe('#F39C12');
  });

  it('returns gray for score < 0.4', () => {
    expect(matchColor(0.39)).toBe('#B3B3B3');
    expect(matchColor(0.0)).toBe('#B3B3B3');
  });
});
