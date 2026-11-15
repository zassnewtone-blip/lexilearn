import { Capacitor } from '@capacitor/core';
import { SQLiteConnection, CapacitorSQLite } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);
const DB_NAME = 'lexilearn';
const json = (value, fallback = []) => { try { return JSON.parse(value ?? ''); } catch { return fallback; } };
let connection;

async function query(sql, values = []) { return connection.query(sql, values); }
// The plugin wraps run()/execute() in their own transaction by default.
// Disable that wrapper while our adapter has an explicit transaction open.
async function inTransaction() { return (await connection.isTransactionActive()).result; }
async function run(sql, values = []) { return connection.run(sql, values, !(await inTransaction())); }

export const androidAdapter = {
  kind: 'android',
  async initialize() {
    if (!Capacitor.isNativePlatform()) throw new Error('Native SQLite is only available inside the Android app.');
    const consistency = await sqlite.checkConnectionsConsistency();
    const has = (await sqlite.isConnection(DB_NAME, false)).result;
    connection = consistency.result && has ? await sqlite.retrieveConnection(DB_NAME, false) : await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    await connection.open();
    await connection.execute('PRAGMA foreign_keys = ON;');
  },
  async getSchemaVersion() { try { return Number((await query("SELECT value FROM metadata WHERE key='schemaVersion'")).values?.[0]?.value ?? 0); } catch { return 0; } },
  async setSchemaVersion(value) { await run('INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)', ['schemaVersion', String(value)]); },
  async transaction(callback) { await connection.beginTransaction(); try { const result = await callback(); await connection.commitTransaction(); return result; } catch (error) { await connection.rollbackTransaction(); throw error; } },
  async executeScript(script) { await connection.execute(script, !(await inTransaction())); },
  async saveWord(w) { await run('INSERT INTO words(id,word,normalizedWord,definition,partOfSpeech,pronunciation,synonyms,antonyms,roots,examples,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET word=excluded.word,normalizedWord=excluded.normalizedWord,definition=excluded.definition,partOfSpeech=excluded.partOfSpeech,pronunciation=excluded.pronunciation,synonyms=excluded.synonyms,antonyms=excluded.antonyms,roots=excluded.roots,examples=excluded.examples,updatedAt=excluded.updatedAt', [w.id,w.word,w.normalizedWord,w.definition,w.partOfSpeech,w.pronunciation,JSON.stringify(w.synonyms),JSON.stringify(w.antonyms),JSON.stringify(w.roots),JSON.stringify(w.examples),w.createdAt,w.updatedAt]); return w.id; },
  async getWordById(id) { const row = (await query('SELECT * FROM words WHERE id=?', [id])).values?.[0]; return row ? hydrate(row) : null; },
  async getWordByName(normalized) { const row = (await query('SELECT * FROM words WHERE normalizedWord=?', [normalized])).values?.[0]; return row ? hydrate(row) : null; },
  async getAllWords() { return ((await query('SELECT * FROM words ORDER BY word COLLATE NOCASE')).values ?? []).map(hydrate); },
  async deleteWord(id) { return run('DELETE FROM words WHERE id=?', [id]); },
  async addFavorite(wordId, createdAt) { await run('INSERT OR REPLACE INTO favorites(wordId,createdAt) VALUES(?,?)', [wordId, createdAt]); },
  async removeFavorite(wordId) { await run('DELETE FROM favorites WHERE wordId=?', [wordId]); },
  async getFavoriteIds() { return ((await query('SELECT wordId FROM favorites')).values ?? []).map((row) => row.wordId); },
  async saveQuiz(q) { await run('INSERT OR REPLACE INTO quizzes(id,score,total,answers,createdAt) VALUES(?,?,?,?,?)', [q.id,q.score,q.total,JSON.stringify(q.answers),q.createdAt]); },
  async getQuizHistory() { return ((await query('SELECT * FROM quizzes ORDER BY createdAt DESC')).values ?? []).map((r) => ({ ...r, answers: json(r.answers) })); },
  async saveLearningProgress(p) { await run('INSERT OR REPLACE INTO learningProgress(id,payload,createdAt) VALUES(?,?,?)', [p.id,JSON.stringify(p),p.createdAt]); },
  async getLearningProgress() { return ((await query('SELECT payload FROM learningProgress ORDER BY createdAt DESC')).values ?? []).map((r) => json(r.payload, {})); },
  async saveSetting(key, value, updatedAt) { await run('INSERT OR REPLACE INTO settings(key,value,updatedAt) VALUES(?,?,?)', [key,JSON.stringify(value),updatedAt]); },
  async getSettings() { return Object.fromEntries(((await query('SELECT key,value FROM settings')).values ?? []).map((r) => [r.key,json(r.value,null)])); },
  async replaceAll(s) { await this.transaction(async () => { await connection.execute('DELETE FROM favorites; DELETE FROM quizzes; DELETE FROM learningProgress; DELETE FROM settings; DELETE FROM words;'); for (const w of s.words) await this.saveWord(w); for (const f of s.favorites) await this.addFavorite(f.wordId,f.createdAt); for (const q of s.quizzes) await this.saveQuiz(q); for (const p of s.learningProgress) await this.saveLearningProgress(p); for (const x of s.settings) await this.saveSetting(x.key,x.value,x.updatedAt); await this.setSchemaVersion(s.schemaVersion); }); },
};

function hydrate(row) { return { ...row, synonyms: json(row.synonyms), antonyms: json(row.antonyms), roots: json(row.roots), examples: json(row.examples) }; }
