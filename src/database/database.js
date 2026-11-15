import { getAdapter } from './databaseFactory.js';
import { runMigrations, SCHEMA_VERSION } from './migrations.js';
import { exportBackup as createBackup, importBackup as restoreBackup } from './backupService.js';
import { v4 as uuidv4 } from '../utils/uuid.js';

let adapter; let initialized;
const now = () => new Date().toISOString();
const normalize = (value) => value.trim().toLocaleLowerCase('en-US');

export function initializeDatabase() {
  if (!initialized) initialized = (async () => { adapter = getAdapter(); await adapter.initialize(); await runMigrations(adapter); })();
  return initialized;
}
async function ready() { await initializeDatabase(); return adapter; }
export async function saveWord(input) {
  const db = await ready(); const word = typeof input === 'string' ? { word: input } : input;
  if (!word?.word?.trim()) throw new Error('Enter a word before saving.');
  const key = normalize(word.word); const existing = await db.getWordByName(key); const timestamp = now();
  const record = { id: existing?.id ?? word.id ?? uuidv4(), word: word.word.trim(), normalizedWord: key, definition: word.definition?.trim() || existing?.definition || '', partOfSpeech: word.partOfSpeech || existing?.partOfSpeech || '', pronunciation: word.pronunciation || existing?.pronunciation || '', synonyms: word.synonyms ?? existing?.synonyms ?? [], antonyms: word.antonyms ?? existing?.antonyms ?? [], roots: word.roots ?? existing?.roots ?? [], examples: word.examples ?? existing?.examples ?? [], createdAt: existing?.createdAt ?? word.createdAt ?? timestamp, updatedAt: timestamp };
  await db.saveWord(record); return record;
}
export async function getWordById(id) { return (await ready()).getWordById(id); }
export async function getWordByName(word) { return (await ready()).getWordByName(normalize(word)); }
export async function getAllWords() { return (await ready()).getAllWords(); }
export async function searchWords(query) { const q = normalize(query); const words = await getAllWords(); return q ? words.filter((w) => `${w.word} ${w.definition} ${w.partOfSpeech}`.toLocaleLowerCase('en-US').includes(q)) : words; }
export async function deleteWord(id) { return (await ready()).deleteWord(id); }
export async function addFavorite(id) { const db = await ready(); if (!(await db.getWordById(id))) throw new Error('Save this word before favoriting it.'); return db.addFavorite(id, now()); }
export async function removeFavorite(id) { return (await ready()).removeFavorite(id); }
export async function getFavorites() { const db = await ready(); const ids = await db.getFavoriteIds(); return Promise.all(ids.map((id) => db.getWordById(id))).then((items) => items.filter(Boolean)); }
export async function saveQuiz(quiz) { const db = await ready(); const record = { id: quiz.id ?? uuidv4(), score: Number(quiz.score) || 0, total: Number(quiz.total) || 0, answers: quiz.answers ?? [], createdAt: quiz.createdAt ?? now() }; const progress = { id: uuidv4(), type: 'quiz', score: record.score, total: record.total, createdAt: record.createdAt }; await db.transaction(async () => { await db.saveQuiz(record); await db.saveLearningProgress(progress); }); return record; }
export async function getQuizHistory() { return (await ready()).getQuizHistory(); }
export async function saveLearningProgress(progress) { const db = await ready(); const record = { ...progress, id: progress.id ?? uuidv4(), createdAt: progress.createdAt ?? now() }; await db.saveLearningProgress(record); return record; }
export async function getLearningProgress() { return (await ready()).getLearningProgress(); }
export async function saveSettings(settings) { const db = await ready(); for (const [key, value] of Object.entries(settings)) await db.saveSetting(key, value, now()); return db.getSettings(); }
export async function getSettings() { return (await ready()).getSettings(); }
export async function exportBackup() { return JSON.stringify(await createBackup(await ready()), null, 2); }
export async function importBackup(file) { return restoreBackup(await ready(), file); }
export { SCHEMA_VERSION };
