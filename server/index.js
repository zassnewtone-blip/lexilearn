import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const app = express();
const port = Number(process.env.PORT || 8787);
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim());
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)) }));
app.use(express.json({ limit: '32kb' }));
app.use('/api/ai', rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }));

const text = z.string().trim().min(1).max(160);
const wordSchema = z.object({ word: text, definition: z.string().max(500).optional() });
const vocabularySchema = z.object({ topic: z.string().trim().max(120).default('everyday English'), existingWords: z.array(z.string().trim().max(80)).max(300).default([]) });
const dailyWordRequestSchema = z.object({ existingWords: z.array(z.string().trim().max(80)).max(300).default([]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });
const wordsSchema = z.object({ words: z.array(wordSchema).max(100).default([]), count: z.number().int().min(1).max(20).optional(), focusWord: z.string().trim().max(80).optional() });
const reviewSchema = z.object({ progress: z.array(z.record(z.string(), z.unknown())).max(100).default([]), words: z.array(wordSchema).max(100).default([]), focusWord: z.string().trim().max(80).optional() });

async function generate(instruction, schema) {
  if (!ai) throw Object.assign(new Error('AI is not configured. Set GEMINI_API_KEY on the backend.'), { status: 503 });
  const response = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite', contents: instruction, config: { responseMimeType: 'application/json', responseSchema: schema, maxOutputTokens: 2048, temperature: 0.3 } });
  return JSON.parse(response.text);
}
const schemas = {
  vocabulary: { type: 'ARRAY', items: { type: 'OBJECT', properties: { word: { type: 'STRING' }, definition: { type: 'STRING' }, partOfSpeech: { type: 'STRING' }, pronunciation: { type: 'STRING' }, examples: { type: 'ARRAY', items: { type: 'STRING' } }, synonyms: { type: 'ARRAY', items: { type: 'STRING' } }, antonyms: { type: 'ARRAY', items: { type: 'STRING' } }, roots: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['word', 'definition', 'partOfSpeech', 'examples'] } },
  strings: { type: 'ARRAY', items: { type: 'STRING' } },
  quiz: { type: 'ARRAY', items: { type: 'OBJECT', properties: { question: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } }, answer: { type: 'STRING' }, explanation: { type: 'STRING' } }, required: ['question', 'options', 'answer'] } },
  challenge: { type: 'OBJECT', properties: { word: { type: 'STRING' }, prompt: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } }, answer: { type: 'STRING' }, explanation: { type: 'STRING' } }, required: ['word', 'prompt', 'options', 'answer'] },
  dailyWord: { type: 'OBJECT', properties: { word: { type: 'STRING' }, definition: { type: 'STRING' }, partOfSpeech: { type: 'STRING' }, pronunciation: { type: 'STRING' }, examples: { type: 'ARRAY', items: { type: 'STRING' } }, synonyms: { type: 'ARRAY', items: { type: 'STRING' } }, antonyms: { type: 'ARRAY', items: { type: 'STRING' } }, roots: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['word', 'definition', 'partOfSpeech', 'examples'] },
};
const route = (parse, prompt, responseSchema = schemas.strings) => async (req, res, next) => { try { const input = parse(req.body); res.json({ result: await generate(prompt(input), responseSchema) }); } catch (error) { if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request.', details: error.issues.map(({ path, message }) => ({ path, message })) }); next(error); } };
const aiRoute = '/api/ai';
app.post(`${aiRoute}/vocabulary`, route((b) => vocabularySchema.parse(b), (b) => `Return exactly 6 distinct, useful English vocabulary words about "${b.topic}". Do not include words from this local collection: ${JSON.stringify(b.existingWords)}. Keep every definition under 20 words, include exactly 2 short example sentences, at most 3 synonyms, at most 2 antonyms, and at most 2 short word-root notes. Return only the requested structured data.`, schemas.vocabulary));
app.post(`${aiRoute}/daily-word`, route((b) => dailyWordRequestSchema.parse(b), (b) => `Choose one useful, memorable English vocabulary word for the daily lesson on ${b.date || new Date().toISOString().slice(0, 10)}. Do not choose any word from this local collection: ${JSON.stringify(b.existingWords)}. Return one concise definition, part of speech, IPA pronunciation, one short example sentence, up to 3 synonyms, up to 2 antonyms, and a short root note if useful.`, schemas.dailyWord));
for (const [path, label] of [['synonyms','synonyms'],['antonyms','antonyms'],['roots','word roots']]) app.post(`${aiRoute}/${path}`, route((b) => wordSchema.parse(b), (b) => `For the English word ${b.word}${b.definition ? ` meaning ${b.definition}` : ''}, return 5 concise ${label}.`, schemas.strings));
app.post(`${aiRoute}/examples`, route((b) => wordSchema.parse(b), (b) => `Write 3 natural example sentences using ${b.word}${b.definition ? ` in this sense: ${b.definition}` : ''}.`, schemas.strings));
app.post(`${aiRoute}/quiz`, route((b) => wordsSchema.parse(b), (b) => `Create ${b.count || 5} multiple-choice vocabulary questions using these saved words: ${JSON.stringify(b.words)}. ${b.focusWord ? `Include at least one direct question about today's featured word, ${b.focusWord}, preferably as the first question.` : ''} Each question has exactly 4 options; answer must exactly match one option.`, schemas.quiz));
app.post(`${aiRoute}/daily-challenge`, route((b) => wordsSchema.parse(b), (b) => `Create one multiple choice daily vocabulary challenge from these words: ${JSON.stringify(b.words)}. Include exactly 4 options and a short explanation.`, schemas.challenge));
app.post(`${aiRoute}/adaptive-review`, route((b) => reviewSchema.parse(b), (b) => `Create a focused adaptive vocabulary review based only on this learner's saved words and progress: ${JSON.stringify(b)}. ${b.focusWord ? `Focus the review on this previously saved word, ${b.focusWord}.` : ''} Return up to 5 review questions with 4 options and correct answer.`, schemas.quiz));
app.get('/api/health', (_req, res) => res.json({ ok: true, provider: 'google-gemini', configured: Boolean(ai), model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite' }));
app.use((error, _req, res, _next) => { console.error(error.message); res.status(error.status || 500).json({ error: error.status ? error.message : 'The AI request could not be completed.' }); });
app.listen(port, () => console.log(`LexiLearn AI gateway listening on ${port}`));
