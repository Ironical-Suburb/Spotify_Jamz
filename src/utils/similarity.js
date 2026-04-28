export function cosineSimilarity(vec1, vec2) {
  const dot = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((s, v) => s + v * v, 0));
  const mag2 = Math.sqrt(vec2.reduce((s, v) => s + v * v, 0));
  return mag1 && mag2 ? dot / (mag1 * mag2) : 0;
}

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") return Object.values(v);
  return [];
}

export function tasteSimilarity(profile1, profile2) {
  const genres1 = toArray(profile1?.topGenres);
  const genres2 = toArray(profile2?.topGenres);
  const artists1 = toArray(profile1?.topArtists);
  const artists2 = toArray(profile2?.topArtists);

  const allGenres = [...new Set([...genres1, ...genres2])];
  const genreScore = allGenres.length === 0 ? 0 : cosineSimilarity(
    allGenres.map(g => genres1.includes(g) ? 1 : 0),
    allGenres.map(g => genres2.includes(g) ? 1 : 0),
  );

  const union = new Set([...artists1, ...artists2]).size;
  const intersection = artists1.filter(a => artists2.includes(a)).length;
  const artistScore = union > 0 ? intersection / union : 0;

  return genreScore * 0.7 + artistScore * 0.3;
}

export function getVibe(genres) {
  const g = toArray(genres).map(x => x.toLowerCase()).join(" ");
  if (g.includes("hip-hop") || g.includes("rap") || g.includes("trap")) return "🔥 Hype";
  if (g.includes("indie") || g.includes("alternative")) return "🌿 Indie Vibes";
  if (g.includes("electronic") || g.includes("edm") || g.includes("house") || g.includes("techno")) return "⚡ Electric";
  if (g.includes("r&b") || g.includes("soul")) return "🌙 Soulful";
  if (g.includes("pop")) return "✨ Pop Central";
  if (g.includes("rock") || g.includes("metal")) return "🎸 Rock Out";
  if (g.includes("jazz")) return "🎷 Jazz Flow";
  if (g.includes("classical")) return "🎼 Classical";
  if (g.includes("latin") || g.includes("reggaeton")) return "💃 Latin Heat";
  if (g.includes("country") || g.includes("folk")) return "🤠 Country Roads";
  return "🎵 Eclectic";
}

export function matchLabel(score) {
  if (score >= 0.8) return "🔥 Perfect Match";
  if (score >= 0.6) return "💜 Great Match";
  if (score >= 0.4) return "✨ Good Vibes";
  if (score >= 0.2) return "🎵 Some Overlap";
  return "🌊 Explore Together";
}

export function matchColor(score) {
  if (score >= 0.6) return "#1DB954";
  if (score >= 0.4) return "#F39C12";
  return "#B3B3B3";
}
