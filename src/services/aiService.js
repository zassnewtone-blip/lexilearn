const API_BASE = import.meta.env.VITE_AI_API_URL || '/api';
export async function getAIHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
    if (!response.ok) return { ok: false, configured: false };
    return await response.json();
  } catch { return { ok: false, configured: false }; }
}
async function request(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'AI service is unavailable. Check your connection and try again.');
  return body?.result ?? body;
}
function normalizeVocabulary(result) {
  let value = result;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof value === 'string') {
      const json = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      try { value = JSON.parse(json); } catch { throw new Error('The AI service returned unreadable vocabulary. Please try again.'); }
    }
    if (Array.isArray(value)) {
      const words = value.filter((item) => item && typeof item.word === 'string' && item.word.trim());
      if (words.length) return words;
      throw new Error('The AI service returned no usable words. Please try again.');
    }
    if (!value || typeof value !== 'object') break;
    if (typeof value.word === 'string' && value.word.trim()) return [value];
    value = value.words ?? value.vocabulary ?? value.items ?? value.result ?? value.data;
  }
  throw new Error('The AI service returned an invalid vocabulary set. Please try again.');
}

export async function generateVocabulary(topic, existingWords = []) {
  return normalizeVocabulary(await request('/ai/vocabulary', { topic, existingWords }));
}
export const lookupWord = (word) => request('/ai/word', { word });
export const generateDailyWord = (existingWords = [], date = new Date().toISOString().slice(0, 10)) => request('/ai/daily-word', { existingWords, date });
export const generateSynonyms = (word, definition) => request('/ai/synonyms', { word, definition });
export const generateAntonyms = (word, definition) => request('/ai/antonyms', { word, definition });
export const generateWordRoots = (word) => request('/ai/roots', { word });
export const generateExamples = (word, definition) => request('/ai/examples', { word, definition });
export const generateQuiz = (words, count = 5, focusWord) => request('/ai/quiz', { words, count, focusWord });
export const generateDailyChallenge = (words) => request('/ai/daily-challenge', { words });
export const generateAdaptiveReview = (progress, words, focusWord) => request('/ai/adaptive-review', { progress, words, focusWord });
