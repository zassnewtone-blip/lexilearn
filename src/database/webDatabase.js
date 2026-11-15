import Dexie from 'dexie';

const db = new Dexie('lexilearn-local');
db.version(1).stores({ words: 'id,&normalizedWord,word,createdAt,updatedAt', favorites: 'wordId,createdAt', quizzes: 'id,createdAt', learningProgress: 'id,createdAt', settings: 'key,updatedAt', metadata: 'key' });

export const webAdapter = {
  kind: 'web',
  async initialize() { await db.open(); },
  async getSchemaVersion() { return (await db.metadata.get('schemaVersion'))?.value ?? 0; },
  async setSchemaVersion(value) { await db.metadata.put({ key: 'schemaVersion', value }); },
  async transaction(callback) { return db.transaction('rw', db.words, db.favorites, db.quizzes, db.learningProgress, db.settings, db.metadata, callback); },
  async executeScript() {},
  async saveWord(word) { return db.words.put(word); },
  async getWordById(id) { return (await db.words.get(id)) ?? null; },
  async getWordByName(normalized) { return (await db.words.where('normalizedWord').equals(normalized).first()) ?? null; },
  async getAllWords() { return db.words.orderBy('word').toArray(); },
  async deleteWord(id) { return db.transaction('rw', db.words, db.favorites, async () => { await db.favorites.delete(id); return db.words.delete(id); }); },
  async addFavorite(wordId, createdAt) { return db.favorites.put({ wordId, createdAt }); },
  async removeFavorite(wordId) { return db.favorites.delete(wordId); },
  async getFavoriteIds() { return (await db.favorites.toArray()).map((entry) => entry.wordId); },
  async saveQuiz(quiz) { return db.quizzes.put(quiz); },
  async getQuizHistory() { return db.quizzes.orderBy('createdAt').reverse().toArray(); },
  async saveLearningProgress(progress) { return db.learningProgress.put(progress); },
  async getLearningProgress() { return db.learningProgress.orderBy('createdAt').reverse().toArray(); },
  async saveSetting(key, value, updatedAt) { return db.settings.put({ key, value, updatedAt }); },
  async getSettings() { return Object.fromEntries((await db.settings.toArray()).map(({ key, value }) => [key, value])); },
  async replaceAll(snapshot) {
    await db.transaction('rw', db.words, db.favorites, db.quizzes, db.learningProgress, db.settings, db.metadata, async () => {
      await Promise.all([db.words.clear(), db.favorites.clear(), db.quizzes.clear(), db.learningProgress.clear(), db.settings.clear()]);
      await Promise.all([snapshot.words.length ? db.words.bulkPut(snapshot.words) : undefined, snapshot.favorites.length ? db.favorites.bulkPut(snapshot.favorites) : undefined, snapshot.quizzes.length ? db.quizzes.bulkPut(snapshot.quizzes) : undefined, snapshot.learningProgress.length ? db.learningProgress.bulkPut(snapshot.learningProgress) : undefined, snapshot.settings.length ? db.settings.bulkPut(snapshot.settings) : undefined]);
      await db.metadata.put({ key: 'schemaVersion', value: snapshot.schemaVersion });
    });
  },
};

export { db as webDb };
