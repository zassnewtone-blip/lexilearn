import { v4 as uuidv4 } from '../utils/uuid.js';
export const BACKUP_VERSION = 1;
const array = (v) => Array.isArray(v) ? v : null;

export function validateBackup(data) {
  if (!data || typeof data !== 'object' || data.format !== 'lexilearn-backup' || data.schemaVersion !== BACKUP_VERSION || !data.data) throw new Error('This file is not a supported LexiLearn backup.');
  for (const key of ['words','favorites','quizzes','learningProgress','settings']) if (!array(data.data[key])) throw new Error(`Backup is missing a valid ${key} collection.`);
  const ids = new Set(); const names = new Set();
  for (const word of data.data.words) {
    if (!word || typeof word.id !== 'string' || typeof word.word !== 'string' || typeof word.normalizedWord !== 'string' || typeof word.definition !== 'string') throw new Error('A saved word in this backup is invalid.');
    if (ids.has(word.id)) throw new Error('Backup contains duplicate word identifiers.'); ids.add(word.id);
    if (names.has(word.normalizedWord)) throw new Error('Backup contains duplicate vocabulary entries.'); names.add(word.normalizedWord);
    for (const field of ['synonyms', 'antonyms', 'roots', 'examples']) if (word[field] !== undefined && (!Array.isArray(word[field]) || word[field].some((item) => typeof item !== 'string'))) throw new Error(`A saved word has an invalid ${field} list.`);
  }
  if (data.data.favorites.some((entry) => !entry || !ids.has(entry.wordId))) throw new Error('Backup contains a favorite linked to a missing word.');
  if (data.data.quizzes.some((item) => !item || typeof item.score !== 'number' || typeof item.total !== 'number' || (item.answers !== undefined && !Array.isArray(item.answers)))) throw new Error('Backup contains an invalid quiz result.');
  if (data.data.settings.some((item) => !item || typeof item.key !== 'string' || !Object.hasOwn(item, 'value'))) throw new Error('Backup contains an invalid setting.');
  if (data.data.learningProgress.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error('Backup contains invalid learning progress.');
  return data.data;
}

export async function exportBackup(adapter) {
  const [words, favoriteIds, quizzes, learningProgress, allSettings] = await Promise.all([adapter.getAllWords(), adapter.getFavoriteIds(), adapter.getQuizHistory(), adapter.getLearningProgress(), adapter.getSettings()]);
  const favorites = favoriteIds.map((wordId) => ({ wordId, createdAt: new Date().toISOString() }));
  const settings = Object.entries(allSettings).map(([key, value]) => ({ key, value, updatedAt: new Date().toISOString() }));
  return { format: 'lexilearn-backup', schemaVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: { words, favorites, quizzes, learningProgress, settings } };
}

export async function importBackup(adapter, file) {
  const text = typeof file === 'string' ? file : await file.text();
  let parsed; try { parsed = JSON.parse(text); } catch { throw new Error('The selected file is not valid JSON.'); }
  const data = validateBackup(parsed);
  // Normalize collection records before the atomic replace.
  data.quizzes = data.quizzes.map((q) => ({ ...q, id: q.id || uuidv4(), answers: q.answers ?? [], createdAt: q.createdAt || new Date().toISOString() }));
  data.learningProgress = data.learningProgress.map((p) => ({ ...p, id: p.id || uuidv4(), createdAt: p.createdAt || new Date().toISOString() }));
  return adapter.replaceAll(data);
}
