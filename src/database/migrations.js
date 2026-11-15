export const SCHEMA_VERSION = 1;
export const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS words (
  id TEXT PRIMARY KEY NOT NULL, word TEXT NOT NULL, normalizedWord TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL DEFAULT '', partOfSpeech TEXT NOT NULL DEFAULT '', pronunciation TEXT NOT NULL DEFAULT '',
  synonyms TEXT NOT NULL DEFAULT '[]', antonyms TEXT NOT NULL DEFAULT '[]', roots TEXT NOT NULL DEFAULT '[]',
  examples TEXT NOT NULL DEFAULT '[]', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS favorites (wordId TEXT PRIMARY KEY NOT NULL REFERENCES words(id) ON DELETE CASCADE, createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quizzes (id TEXT PRIMARY KEY NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL, answers TEXT NOT NULL DEFAULT '[]', createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS learningProgress (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, createdAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_words_normalized ON words(normalizedWord);
CREATE INDEX IF NOT EXISTS idx_quizzes_created ON quizzes(createdAt);
CREATE INDEX IF NOT EXISTS idx_progress_created ON learningProgress(createdAt);`;

export async function runMigrations(adapter) {
  const version = await adapter.getSchemaVersion();
  if (version < 1) {
    await adapter.transaction(async () => {
      await adapter.executeScript(CREATE_SQL);
      await adapter.setSchemaVersion(1);
    });
  }
  if (version > SCHEMA_VERSION) throw new Error('This backup or database was created by a newer LexiLearn version.');
}
