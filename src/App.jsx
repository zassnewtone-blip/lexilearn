import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowDownRight, ArrowLeft, ArrowRight, AudioLines, BookOpen, Bookmark, Check, ChevronRight, CircleHelp, Flame, Heart, Home, Lightbulb, ListChecks, LoaderCircle, Search, Settings2, Sparkles, Sun, Target, Trash2, Trophy, Upload, Volume2, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as database from './database/database.js';
import * as ai from './services/aiService.js';

const initialWord = { word: 'Serendipity', partOfSpeech: 'noun', pronunciation: '/ˌser.ənˈdɪp.ə.ti/', definition: 'The occurrence of events by chance in a happy or beneficial way.', examples: ['Finding this little bookshop was pure serendipity.'], synonyms: ['chance', 'fortune', 'luck'], antonyms: ['misfortune', 'design'] };
const navItems = [{ id: 'home', label: 'Home', icon: Home }, { id: 'explore', label: 'Explore', icon: Search }, { id: 'practice', label: 'Practice', icon: ListChecks }, { id: 'favorites', label: 'Favorites', icon: Heart }];
const dateLabel = () => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const DAILY_QUESTION_LIMIT = 10;
const READER_FONT_FAMILIES = { system: 'Inter, "DM Sans", system-ui, sans-serif', arial: 'Arial, Helvetica, sans-serif', georgia: 'Georgia, "Times New Roman", serif', verdana: 'Verdana, Geneva, sans-serif' };
const offlineDailyWords = [
  initialWord,
  { word: 'Resilient', partOfSpeech: 'adjective', pronunciation: '/rɪˈzɪl.jənt/', definition: 'Able to recover quickly after difficulty.', examples: ['The resilient team kept going after a setback.'], synonyms: ['strong', 'adaptable', 'tough'], antonyms: ['fragile', 'weak'] },
  { word: 'Ephemeral', partOfSpeech: 'adjective', pronunciation: '/ɪˈfem.ər.əl/', definition: 'Lasting for only a short time.', examples: ['The evening light made an ephemeral rainbow.'], synonyms: ['brief', 'fleeting', 'transient'], antonyms: ['lasting', 'permanent'] },
  { word: 'Meticulous', partOfSpeech: 'adjective', pronunciation: '/məˈtɪk.jə.ləs/', definition: 'Showing great care and attention to detail.', examples: ['She kept meticulous notes during the lecture.'], synonyms: ['careful', 'precise', 'thorough'], antonyms: ['careless', 'sloppy'] },
  { word: 'Luminous', partOfSpeech: 'adjective', pronunciation: '/ˈluː.mə.nəs/', definition: 'Giving off or reflecting light; bright and clear.', examples: ['The moon looked luminous above the lake.'], synonyms: ['glowing', 'bright', 'radiant'], antonyms: ['dim', 'dark'] },
  { word: 'Tenacious', partOfSpeech: 'adjective', pronunciation: '/təˈneɪ.ʃəs/', definition: 'Not giving up easily; persistent.', examples: ['His tenacious practice helped him master the piece.'], synonyms: ['persistent', 'determined', 'steadfast'], antonyms: ['yielding', 'inconstant'] },
  { word: 'Tranquil', partOfSpeech: 'adjective', pronunciation: '/ˈtræŋ.kwɪl/', definition: 'Calm, quiet, and peaceful.', examples: ['We found a tranquil spot under the trees.'], synonyms: ['peaceful', 'serene', 'calm'], antonyms: ['agitated', 'turbulent'] },
  { word: 'Candid', partOfSpeech: 'adjective', pronunciation: '/ˈkæn.dɪd/', definition: 'Honest and direct in expressing thoughts.', examples: ['They had a candid conversation about the plan.'], synonyms: ['frank', 'open', 'sincere'], antonyms: ['evasive', 'guarded'] },
  { word: 'Flourish', partOfSpeech: 'verb', pronunciation: '/ˈflɜːr.ɪʃ/', definition: 'To grow or develop in a healthy, successful way.', examples: ['The garden plants flourish in morning sunlight.'], synonyms: ['thrive', 'bloom', 'prosper'], antonyms: ['decline', 'wither'] },
  { word: 'Astute', partOfSpeech: 'adjective', pronunciation: '/əˈstuːt/', definition: 'Quick to understand a situation and judge it well.', examples: ['Her astute observation helped solve the puzzle.'], synonyms: ['shrewd', 'perceptive', 'sharp'], antonyms: ['unaware', 'naive'] },
  { word: 'Compassion', partOfSpeech: 'noun', pronunciation: '/kəmˈpæʃ.ən/', definition: 'Sympathy for others and a wish to help.', examples: ['He showed compassion to the nervous new student.'], synonyms: ['kindness', 'empathy', 'care'], antonyms: ['cruelty', 'indifference'] },
  { word: 'Eloquent', partOfSpeech: 'adjective', pronunciation: '/ˈel.ə.kwənt/', definition: 'Fluent and persuasive in speaking or writing.', examples: ['Her eloquent thank-you note moved the volunteers.'], synonyms: ['expressive', 'articulate', 'persuasive'], antonyms: ['inarticulate', 'unclear'] },
  { word: 'Ingenious', partOfSpeech: 'adjective', pronunciation: '/ɪnˈdʒiː.ni.əs/', definition: 'Clever, original, and inventive.', examples: ['They found an ingenious way to reuse the boxes.'], synonyms: ['inventive', 'clever', 'creative'], antonyms: ['inept', 'unimaginative'] },
  { word: 'Amiable', partOfSpeech: 'adjective', pronunciation: '/ˈeɪ.mi.ə.bəl/', definition: 'Friendly and pleasant.', examples: ['Our amiable guide made everyone feel welcome.'], synonyms: ['friendly', 'warm', 'pleasant'], antonyms: ['hostile', 'unfriendly'] },
  { word: 'Diligent', partOfSpeech: 'adjective', pronunciation: '/ˈdɪl.ə.dʒənt/', definition: 'Careful and persistent in work or effort.', examples: ['Diligent review helped the new words stick.'], synonyms: ['hardworking', 'careful', 'dedicated'], antonyms: ['lazy', 'negligent'] },
];
function fallbackDailyWord(dateKey, excluded = []) { const day = Math.floor((new Date(`${dateKey}T00:00:00Z`) - new Date(`${dateKey.slice(0, 4)}-01-01T00:00:00Z`)) / 86_400_000); const used = new Set(excluded.map((word) => word.trim().toLocaleLowerCase('en-US'))); for (let offset = 0; offset < offlineDailyWords.length; offset += 1) { const candidate = offlineDailyWords[(day + offset) % offlineDailyWords.length]; if (!used.has(candidate.word.toLocaleLowerCase('en-US'))) return candidate; } return offlineDailyWords[day % offlineDailyWords.length]; }

export default function App() {
  const [page, setPage] = useState('home');
  const [words, setWords] = useState([]); const [favorites, setFavorites] = useState([]); const [history, setHistory] = useState([]);
  const [dailyWord, setDailyWord] = useState(initialWord);
  const [nameDraft, setNameDraft] = useState('Sarah Miller');
  const [settings, setSettings] = useState({ theme: 'light', fontSize: 17, fontFamily: 'system', highContrast: false, reduceMotion: false, brightness: 68, letterSpacing: 0, lineSpacing: 1.55 });
  const [query, setQuery] = useState(''); const [searchOpen, setSearchOpen] = useState(false); const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const [aiBusy, setAiBusy] = useState('');
  const [quiz, setQuiz] = useState(null); const [answer, setAnswer] = useState(''); const [quizFinished, setQuizFinished] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const searchInputRef = useRef(null);
  const dailyLoadRef = useRef(null);
  const loadedDailyDateRef = useRef('');
  const navigationRef = useRef({ selected: null, page: 'home' });
  navigationRef.current = { selected, page };

  async function refresh() {
    const [all, fav, quizzes, prefs] = await Promise.all([database.getAllWords(), database.getFavorites(), database.getQuizHistory(), database.getSettings()]);
    setWords(all); setFavorites(fav); setHistory(quizzes);
    setSettings((current) => ({ ...current, ...prefs }));
    if (typeof prefs.profileName === 'string' && prefs.profileName.trim()) setNameDraft(prefs.profileName);
  }
  async function ensureDailyWord() {
    if (dailyLoadRef.current) return dailyLoadRef.current;
    dailyLoadRef.current = (async () => {
      const today = localDateKey();
      const savedSettings = await database.getSettings();
      if (savedSettings.dailyWordDate === today && savedSettings.dailyWordId) {
        const savedWord = await database.getWordById(savedSettings.dailyWordId);
        if (savedWord) { setDailyWord(savedWord); loadedDailyDateRef.current = today; return savedWord; }
      }
      const allWords = await database.getAllWords();
      const existingNames = allWords.map((item) => item.word);
      const existingSet = new Set(existingNames.map((item) => item.trim().toLocaleLowerCase('en-US')));
      let word = null;
      if (navigator.onLine) {
        try {
          const gateway = await ai.getAIHealth();
          if (gateway.configured) word = await ai.generateDailyWord(existingNames.slice(0, 300), today);
        } catch { /* Use the local daily list if Gemini is temporarily unavailable. */ }
      }
      if (word?.word && existingSet.has(word.word.trim().toLocaleLowerCase('en-US'))) word = null;
      const record = await database.saveWord(word?.word ? word : fallbackDailyWord(today, existingNames));
      await database.saveSettings({ dailyWordDate: today, dailyWordId: record.id });
      setDailyWord(record); loadedDailyDateRef.current = today;
      return record;
    })();
    try { return await dailyLoadRef.current; } finally { dailyLoadRef.current = null; }
  }
  useEffect(() => {
    database.initializeDatabase().then(async () => { await ensureDailyWord(); await refresh(); }).catch((error) => setNotice(error.message));
    const onOnline = () => setOnline(true); const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
    let nativeListeners = [];
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#f7f5ff' }).catch(() => {});
      Network.getStatus().then((state) => setOnline(state.connected)).catch(() => {});
      Network.addListener('networkStatusChange', (state) => setOnline(state.connected)).then((listener) => nativeListeners.push(listener));
      NativeApp.addListener('backButton', () => { const current = navigationRef.current; if (current.selected) setSelected(null); else if (current.page !== 'home') setPage('home'); else NativeApp.exitApp(); }).then((listener) => nativeListeners.push(listener));
    }
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); nativeListeners.forEach((listener) => listener.remove()); };
  }, []);
  useEffect(() => { const timer = window.setInterval(() => { if (localDateKey() !== loadedDailyDateRef.current) ensureDailyWord().then(refresh).catch((error) => setNotice(error.message)); }, 60_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { const onShortcut = (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPage('home'); setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 0); } }; window.addEventListener('keydown', onShortcut); return () => window.removeEventListener('keydown', onShortcut); }, []);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 3800); return () => clearTimeout(timer); } }, [notice]);
  useEffect(() => { document.documentElement.dataset.theme = settings.theme; document.documentElement.style.setProperty('--reader-size', `${settings.fontSize}px`); document.documentElement.style.setProperty('--reader-scale', Number(settings.fontSize || 17) / 17); document.documentElement.style.setProperty('--reader-family', READER_FONT_FAMILIES[settings.fontFamily] || READER_FONT_FAMILIES.system); document.documentElement.style.setProperty('--reader-letter', `${settings.letterSpacing}px`); document.documentElement.style.setProperty('--reader-line', settings.lineSpacing); document.documentElement.style.setProperty('--brightness', `${settings.brightness}%`); document.documentElement.classList.toggle('high-contrast', settings.highContrast); document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion); }, [settings]);

  const searchResults = useMemo(() => { const source = page === 'favorites' ? favorites : words; const q = query.trim().toLowerCase(); return q ? source.filter((w) => `${w.word} ${w.definition}`.toLowerCase().includes(q)) : source; }, [words, favorites, page, query]);
  const selectedIsFavorite = selected && favorites.some((w) => w.id === selected.id);
  const profileName = settings.profileName?.trim() || 'Sarah Miller';
  const profileInitial = profileName[0]?.toUpperCase() || 'S';
  const dailyWordKey = dailyWord.word.trim().toLocaleLowerCase('en-US');
  const reviewWords = words.filter((item) => item.word.trim().toLocaleLowerCase('en-US') !== dailyWordKey).slice(0, 100);
  const wordMapLabels = [dailyWord.synonyms?.[0], dailyWord.synonyms?.[1], dailyWord.antonyms?.[0], dailyWord.synonyms?.[2]].map((label, index) => label || [dailyWord.partOfSpeech, dailyWord.examples?.[0], dailyWord.roots?.[0], 'Related word'][index] || 'Related word');
  const questionsUsedToday = settings.dailyQuestionDate === localDateKey() ? Number(settings.dailyQuestionCount || 0) : 0;
  const questionsRemainingToday = Math.max(0, DAILY_QUESTION_LIMIT - questionsUsedToday);

  async function toggleFavorite(word) { try { selectedIsFavorite && selected?.id === word.id || favorites.some((w) => w.id === word.id) ? await database.removeFavorite(word.id) : await database.addFavorite(word.id); await refresh(); } catch (error) { setNotice(error.message); } }
  async function createAIWords() { if (!online) return setNotice('Connect to the internet to generate new vocabulary. Your saved words are available offline.'); setBusy(true); try { const gateway = await ai.getAIHealth(); if (!gateway.ok || !gateway.configured) throw new Error('AI service is not reachable. Set VITE_AI_API_URL to your deployed HTTPS gateway URL ending in /api, then rebuild and reinstall the Android app.'); const topic = query.trim() || 'thoughtful everyday English'; if (query.trim() && await database.getWordByName(query)) return setNotice(`“${query.trim()}” is already in your vocabulary.`); const existing = new Set(words.map((word) => word.normalizedWord)); const generated = await ai.generateVocabulary(topic, words.slice(0, 300).map((word) => word.word)); if (!Array.isArray(generated)) throw new Error('The AI service returned an invalid vocabulary set. Please try again.'); const newWords = []; for (const word of generated) { if (!word || typeof word.word !== 'string' || !word.word.trim()) continue; const normalized = word.word.trim().toLocaleLowerCase('en-US'); if (!existing.has(normalized)) { newWords.push(await database.saveWord(word)); existing.add(normalized); } } await refresh(); setPage('explore'); setQuery(''); setNotice(`${newWords.length} new words added to your collection.`); } catch (error) { setNotice(error.message || 'Could not generate vocabulary. Please try again.'); } finally { setBusy(false); } }
  async function startQuiz(mode = 'quiz') {
    if (busy) return;
    if (mode === 'daily' && !dailyWord?.word) return setNotice('Your daily word is still loading. Try again in a moment.');
    if (mode !== 'daily' && !reviewWords.length) return setNotice('Save a few vocabulary words first. Practice and adaptive review use your older saved words.');
    setBusy(true);
    try {
      let remaining = DAILY_QUESTION_LIMIT;
      if (mode === 'daily') {
        const today = localDateKey();
        const savedSettings = await database.getSettings();
        const used = savedSettings.dailyQuestionDate === today ? Number(savedSettings.dailyQuestionCount || 0) : 0;
        remaining = Math.max(0, DAILY_QUESTION_LIMIT - used);
        if (!remaining) return setNotice('You have used all 10 daily challenge questions. A fresh set is ready tomorrow.');
      }
      let questions;
      if (online) {
        try {
          const vocabulary = reviewWords.map(({ word, definition }) => ({ word, definition }));
          if (mode === 'daily') {
            const challenge = await ai.generateDailyChallenge([{ word: dailyWord.word, definition: dailyWord.definition }]);
            questions = [{ question: challenge.prompt || challenge.question, options: challenge.options, answer: challenge.answer, explanation: challenge.explanation || '' }];
          } else if (mode === 'adaptive') {
            const progress = await database.getLearningProgress();
            const recentAnswers = history.slice(0, 15).map((session) => ({ type: 'quiz-review', score: session.score, total: session.total, answers: session.answers || [], createdAt: session.createdAt }));
            questions = await ai.generateAdaptiveReview([...recentAnswers, ...progress].slice(0, 100), vocabulary, reviewWords[0]?.word);
          } else {
            questions = await ai.generateQuiz(vocabulary, 5);
          }
        } catch {
          questions = mode === 'daily' ? buildLocalQuiz([dailyWord], 1) : mode === 'adaptive' ? buildAdaptiveReviewQuiz(reviewWords, history) : buildLocalQuiz(reviewWords, 5);
          setNotice(mode === 'adaptive' ? 'Adaptive review is ready from your saved words and quiz history.' : 'AI is unavailable right now. Here is an offline quiz from your saved words.');
        }
      } else {
        questions = mode === 'daily' ? buildLocalQuiz([dailyWord], 1) : mode === 'adaptive' ? buildAdaptiveReviewQuiz(reviewWords, history) : buildLocalQuiz(reviewWords, 5);
        setNotice(mode === 'adaptive' ? 'Adaptive review is ready from your saved words and quiz history.' : 'Offline quiz ready from your saved words.');
      }
      if (!hasValidQuizQuestions(questions)) questions = mode === 'daily' ? buildLocalQuiz([dailyWord], 1) : mode === 'adaptive' ? buildAdaptiveReviewQuiz(reviewWords, history) : buildLocalQuiz(reviewWords, 5);
      questions = (questions || []).slice(0, mode === 'daily' ? 1 : 5);
      if (!questions.length) throw new Error('There are no quiz questions available from your saved words yet.');
      setQuiz({ questions, index: 0, correct: 0, answers: [], mode, focusWord: mode === 'daily' ? dailyWord.word : reviewWords[0]?.word });
      setAnswer(''); setQuizFinished(false); setPage('practice');
    } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  }
  async function submitAnswer() {
    if (!answer || !quiz) return;
    const question = quiz.questions[quiz.index];
    const isCorrect = answer === question.answer;
    const updated = { ...quiz, correct: quiz.correct + Number(isCorrect), answers: [...quiz.answers, { question: question.question, selected: answer, correct: question.answer, isCorrect }] };
    setQuiz(updated); setAnswer('');
    if (updated.index + 1 >= updated.questions.length) {
      await database.saveQuiz({ score: updated.correct, total: updated.questions.length, answers: updated.answers });
      if (quiz.mode === 'daily') {
        const today = localDateKey();
        const savedSettings = await database.getSettings();
        const used = savedSettings.dailyQuestionDate === today ? Number(savedSettings.dailyQuestionCount || 0) : 0;
        const dailyQuestionCount = Math.min(DAILY_QUESTION_LIMIT, used + updated.questions.length);
        await database.saveSettings({ dailyQuestionDate: today, dailyQuestionCount });
        setSettings((current) => ({ ...current, dailyQuestionDate: today, dailyQuestionCount }));
      }
      await refresh(); setQuizFinished(true);
    } else updated.index += 1;
  }  async function changeSetting(key, value) { const next = { ...settings, [key]: value }; setSettings(next); try { await database.saveSettings({ [key]: value }); } catch (error) { setNotice(error.message); } }
  async function saveProfileName(event) { event.preventDefault(); const name = nameDraft.trim(); if (!name) return setNotice('Enter a name to save.'); await changeSetting('profileName', name); setNameDraft(name); setNotice('Your name is saved on this device.'); }
  async function setReminder(enabled) {
    if (!Capacitor.isNativePlatform()) return setNotice('Daily reminders are available in the Android app.');
    try {
      if (enabled) {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display !== 'granted') return setNotice('Allow notifications in Android settings to turn on daily reminders.');
        await LocalNotifications.schedule({ notifications: [{ id: 101, title: 'A little LexiLearn?', body: 'Take a few minutes to practice the words you are learning.', schedule: { on: { hour: 20, minute: 0 }, allowWhileIdle: true } }] });
      } else await LocalNotifications.cancel({ notifications: [{ id: 101 }] });
      await changeSetting('dailyReminder', enabled); setNotice(enabled ? 'Daily reminder set for 8:00 PM.' : 'Daily reminder turned off.');
    } catch (error) { setNotice(error.message || 'Could not update your notification reminder.'); }
  }
  function leaveQuiz() { setQuiz(null); setAnswer(''); setQuizFinished(false); }
  async function enrichSelected(field) {
    if (!selected) return;
    if (selected[field]?.length) return setNotice(`This word already has ${field} saved.`);
    if (!online) return setNotice('Connect to the internet to generate word details.');
    const word = selected;
    setAiBusy(field);
    try {
      const generators = { synonyms: ai.generateSynonyms, antonyms: ai.generateAntonyms, roots: ai.generateWordRoots, examples: ai.generateExamples };
      const details = await generators[field](word.word, word.definition);
      const saved = await database.saveWord({ ...word, [field]: details });
      setSelected(saved); await refresh(); setNotice(`${field[0].toUpperCase()}${field.slice(1)} added to ${word.word}.`);
    } catch (error) { setNotice(error.message); } finally { setAiBusy(''); }
  }
  async function exportData() { try { const content = await database.exportBackup(); const filename = `lexilearn-backup-${new Date().toISOString().slice(0, 10)}.json`; if (Capacitor.isNativePlatform()) { const file = await Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 }); await Share.share({ title: 'LexiLearn backup', text: 'Save your local vocabulary backup.', url: file.uri, dialogTitle: 'Export LexiLearn backup' }); } else { const blob = new Blob([content], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); } setNotice('Backup exported.'); } catch (error) { setNotice(error.message || 'Could not export your backup.'); } }
  async function importData(file) { try { if (!window.confirm('Restore this backup and replace the vocabulary, favorites, quiz history, progress, and settings on this device?')) return; await database.importBackup(file); await refresh(); setNotice('Backup restored successfully.'); } catch (error) { setNotice(error.message); } }

  const progressData = history.slice(0, 7).reverse().map((item, index) => ({ day: `Quiz ${index + 1}`, score: item.total ? Math.round(item.score / item.total * 100) : 0 }));
  const activeNav = page === 'settings' || page === 'profile' ? 'profile' : page;
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark"><BookOpen size={20} /></span><span>lexi<span>learn</span></span></div><div className="workspace-label">YOUR LEARNING SPACE</div><nav>{navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setPage(id)} className={`side-link ${activeNav === id ? 'active' : ''}`}><Icon size={19} strokeWidth={1.8} />{label}{id === 'favorites' && favorites.length > 0 && <span className="nav-count">{favorites.length}</span>}</button>)}</nav><div className="side-bottom"><div className="streak-card"><div className="streak-icon"><Flame size={18} /></div><div><b>{history.length ? `${history.length} day${history.length > 1 ? 's' : ''}` : 'Start a streak'}</b><span>Small steps add up</span></div><ChevronRight size={16} /></div><button onClick={() => setPage('settings')} className={`side-link ${page === 'settings' ? 'active' : ''}`}><Settings2 size={19} />Settings</button><div className="profile-mini"><div className="avatar">{profileInitial}</div><div><b>{profileName}</b><span>Curious learner</span></div></div></div></aside>

    <main className="main-area"><header className="topbar"><button className="mobile-brand" onClick={() => setPage('home')}><span className="brand-mark"><BookOpen size={17} /></span>LexiLearn</button><div className="crumb">{page === 'home' ? 'Your learning space' : page[0].toUpperCase() + page.slice(1)}</div><div className="top-actions"><span className={`network ${online ? 'online' : ''}`}><i />{online ? 'Online' : 'Offline'}</span><button className="icon-button" aria-label="Open settings" onClick={() => setPage('settings')}><Settings2 size={19} /></button><div className="avatar top-avatar">{profileInitial}</div></div></header>
    <div className="content-wrap">
      {page === 'home' && <>
        <div className="welcome-row"><div><div className="eyebrow">{dateLabel()}</div><h1>Good morning, {profileName.trim().split(/\s+/)[0]} <span className="wave">✳</span></h1><p className="subheading">A little curiosity goes a long way. Ready to learn?</p></div><button onClick={() => startQuiz()} className="button button-primary" disabled={busy}><Sparkles size={17} />{busy ? 'Preparing…' : 'Quick practice'}</button></div>
        <div className="search-box"><Search size={19} /><input ref={searchInputRef} placeholder="Search your vocabulary…" value={query} onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={(e) => e.key === 'Enter' && setPage('explore')} /><kbd>⌘ K</kbd>{searchOpen && query && <button className="clear-search" onClick={() => { setQuery(''); setSearchOpen(false); }}><X size={16} /></button>}</div>
        {searchOpen && query && <div className="search-popover">{words.filter((w) => w.word.toLowerCase().includes(query.toLowerCase())).slice(0, 5).map((word) => <button key={word.id} onClick={() => { setSelected(word); setSearchOpen(false); }}><Search size={15} /><span><b>{word.word}</b><small>{word.definition}</small></span><ChevronRight size={16} /></button>)}{!words.some((w) => w.word.toLowerCase().includes(query.toLowerCase())) && <div className="no-results">No saved words match yet. Try generating a vocabulary set.</div>}</div>}
        <section className="hero-word"><div className="hero-copy"><div className="section-kicker"><span className="sparkle-dot"><Sparkles size={13} /></span>YOUR DAILY WORD <span className="today-chip">TODAY</span></div><h2>{dailyWord.word}<span className="word-type">{dailyWord.partOfSpeech}</span></h2><div className="pronunciation">{dailyWord.pronunciation}<button title="Hear pronunciation" onClick={() => speak(dailyWord.word)}><Volume2 size={16} /></button></div><p>{dailyWord.definition}</p><div className="example"><span>IN A SENTENCE</span>“{dailyWord.examples?.[0] || 'A word for today.'}”</div><button className="text-link" onClick={() => setSelected(words.find((w) => w.word.toLowerCase() === dailyWord.word.toLowerCase()) || words[0] || dailyWord)}>Explore this word <ArrowRight size={15} /></button></div><div className="hero-illustration"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="word-bubble">Aa</div><span className="float-tag tag-top">a new perspective</span><span className="float-tag tag-bottom"><Sparkles size={12} /> word of the day</span><div className="decor decor-one">✦</div><div className="decor decor-two">✳</div></div><button className={`hero-save ${favorites.some((w) => w.word.toLowerCase() === dailyWord.word.toLowerCase()) ? 'saved' : ''}`} title="Save daily word" onClick={async () => { const w = words.find((item) => item.word.toLowerCase() === dailyWord.word.toLowerCase()) || await database.saveWord(dailyWord); if (favorites.some((item) => item.id === w.id)) await database.removeFavorite(w.id); else await database.addFavorite(w.id); await refresh(); }}><Bookmark size={18} /></button></section>
        <div className="stat-grid"><Stat icon={BookOpen} label="Words learned" value={words.length} note="in your collection" tone="purple" /><Stat icon={Target} label="Daily challenge" value={`${questionsRemainingToday} / ${DAILY_QUESTION_LIMIT}`} note="quiz questions left today" tone="mint" /><Stat icon={Trophy} label="Quiz accuracy" value={`${history.length ? Math.round(history.reduce((n, q) => n + (q.total ? q.score / q.total : 0), 0) / history.length * 100) : 0}%`} note={`${history.length} quizzes completed`} tone="peach" /></div>
        <div className="dashboard-grid"><section className="panel relationship"><PanelHead title="Words around you" caption="Synonyms and opposites" action="Explore all" onAction={() => setPage('explore')} /><div className="relationship-map"><div className="map-word">{dailyWord.word}</div><span className="map-line line-a"/><span className="map-line line-b"/><span className="map-line line-c"/><span className="map-line line-d"/><span className="map-node node-a">{wordMapLabels[0]}</span><span className="map-node node-b">{wordMapLabels[1]}</span><span className="map-node node-c">{wordMapLabels[2]}</span><span className="map-node node-d">{wordMapLabels[3]}</span><span className="map-spark">✳</span></div><div className="map-footer"><span>Synonyms &amp; related ideas</span><button onClick={() => setSelected(dailyWord)}>Explore daily word <ArrowRight size={14} /></button></div></section>
        <section className="panel goal-panel"><PanelHead title="Your weekly rhythm" caption="Every session counts"/><div className="chart-wrap">{progressData.length > 1 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={progressData} margin={{ top: 8, right: 2, left: -25, bottom: 0 }}><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#887bc3" stopOpacity={0.25}/><stop offset="100%" stopColor="#887bc3" stopOpacity={0.015}/></linearGradient></defs><CartesianGrid stroke="#efedf6" vertical={false}/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill:'#aaa6ba', fontSize:10 }}/><YAxis hide domain={[0,100]}/><Tooltip formatter={(v) => [`${v}%`, 'Accuracy']} contentStyle={{ borderRadius: 12, border: '1px solid #f0eef7', fontSize: 12 }}/><Area type="monotone" dataKey="score" stroke="#8377bb" strokeWidth={2.5} fill="url(#fill)"/></AreaChart></ResponsiveContainer> : <div className="chart-empty"><div className="chart-empty-icon"><Activity size={20}/></div><b>Your progress will bloom here</b><span>Take a quick quiz to start your learning rhythm.</span><button className="text-link" onClick={() => startQuiz()}>Start a practice session <ArrowRight size={14}/></button></div>}</div><div className="chart-summary"><span><i className="legend-dot"/>Quiz accuracy</span><b>{history.length ? `${history[0].score}/${history[0].total} last quiz` : 'No quizzes yet'}</b></div></section></div>
        <div className="lower-grid"><section className="panel challenge-card"><div className="challenge-icon"><Lightbulb size={19}/></div><div className="challenge-text"><div className="section-kicker">A MOMENT TO PRACTICE</div><h3>Make today’s word yours.</h3><p>Put what you know to the test with a short, personal quiz.</p><button className="button button-small" onClick={() => startQuiz('daily')} disabled={busy}>Start a challenge <ArrowRight size={14}/></button></div><div className="challenge-art">?</div></section><section className="panel collection-card"><PanelHead title="Recently added" caption={`${words.length} words in your collection`} action="View all" onAction={() => setPage('explore')}/><div className="recent-list">{words.slice(-3).reverse().map((word) => <button className="recent-item" key={word.id} onClick={() => setSelected(word)}><span className="word-initial">{word.word[0].toUpperCase()}</span><span className="recent-name"><b>{word.word}</b><small>{word.partOfSpeech || 'vocabulary'} · {word.definition}</small></span><ChevronRight size={17}/></button>)}{words.length === 0 && <p className="empty-inline">Your saved words will appear here.</p>}</div></section></div>
      </>}

      {page === 'explore' && <section className="page-view"><div className="page-heading"><div><div className="eyebrow">BUILD YOUR VOCABULARY</div><h1>Explore words</h1><p className="subheading">Discover useful words and keep the ones that speak to you.</p></div><button className="button button-primary" onClick={() => createAIWords()} disabled={busy || !online}>{busy ? <LoaderCircle className="spin" size={16}/> : <Sparkles size={16}/>}Generate a set</button></div><div className="search-box page-search"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter your saved words…"/><span className="result-count">{searchResults.length} words</span></div><div className="word-grid">{searchResults.map((word) => <WordCard key={word.id} word={word} favorite={favorites.some((f) => f.id === word.id)} onFavorite={() => toggleFavorite(word)} onOpen={() => setSelected(word)} />)}</div>{!searchResults.length && <EmptyState icon={BookOpen} title="Your next favorite word is waiting" body="Generate a small collection around a topic you love." button="Generate vocabulary" onClick={createAIWords}/>}</section>}

      {page === 'favorites' && <section className="page-view"><div className="page-heading"><div><div className="eyebrow">WORDS TO KEEP CLOSE</div><h1>Your favorites</h1><p className="subheading">A personal shelf for words you want to remember.</p></div><span className="favorite-total"><Heart size={16}/>{favorites.length} saved</span></div><div className="word-grid">{favorites.map((word) => <WordCard key={word.id} word={word} favorite onFavorite={() => toggleFavorite(word)} onOpen={() => setSelected(word)} />)}</div>{!favorites.length && <EmptyState icon={Heart} title="Your favorites live here" body="Save a word to make it easy to find again." button="Browse vocabulary" onClick={() => setPage('explore')}/>}</section>}

      {page === 'practice' && <section className="page-view practice-view"><div className="page-heading"><div><div className="eyebrow">PRACTICE, AT YOUR PACE</div><h1>Practice makes it yours</h1><p className="subheading">{quiz && !quizFinished ? (quiz.mode === 'daily' ? `Daily challenge: ${questionsUsedToday}/10 used today` : `${quiz.mode === 'adaptive' ? 'Adaptive review' : 'Practice'} · Previously learned words · No daily limit`) : `Daily challenge: ${questionsRemainingToday}/10 left today · Practice and adaptive review are unlimited.`}</p></div></div>{quiz && !quizFinished ? <div className="quiz-card"><button type="button" className="quiz-back" onClick={leaveQuiz}><ArrowLeft size={17}/>Back to practice</button><div className="quiz-progress"><span>QUESTION {quiz.index + 1} OF {quiz.questions.length}</span><div><i style={{ width: `${(quiz.index + 1) / quiz.questions.length * 100}%` }}/></div></div><div className="quiz-daily-word"><span>{quiz.mode === 'daily' ? 'DAILY WORD' : 'SAVED WORD'}</span><b>{quiz.focusWord}</b></div><div className="quiz-icon"><CircleHelp size={23}/></div><h2>{quiz.questions[quiz.index].question}</h2><div className="answer-list">{quiz.questions[quiz.index].options.map((option) => <button key={option} onClick={() => setAnswer(option)} className={`answer-option ${answer === option ? 'selected' : ''}`}><span className="answer-radio">{answer === option && <i/>}</span>{option}<ArrowRight size={16}/></button>)}</div><button className="button button-primary quiz-submit" disabled={!answer} onClick={submitAnswer}>Check my answer <ArrowRight size={16}/></button></div> : quizFinished ? <div className="quiz-card quiz-result"><div className="result-medal"><Trophy size={28}/></div><div className="eyebrow">PRACTICE COMPLETE</div><h2>You got {quiz.correct} out of {quiz.questions.length}</h2><p>Your progress has been saved on this device.</p><button className="button button-primary" onClick={() => startQuiz(quiz.mode === 'daily' ? 'daily' : 'quiz')} disabled={busy}><Sparkles size={16}/>Try another quiz</button></div> : <div className="practice-options"><div className="practice-feature"><div className="practice-art"><div><Sparkles size={25}/></div><span>abc</span></div><div className="eyebrow">A LITTLE REVIEW GOES A LONG WAY</div><h2>Ready for a quick quiz?</h2><p>Practice with previously learned words. These quizzes do not use your daily challenge limit.</p><button className="button button-primary" onClick={() => startQuiz('quiz')} disabled={busy || !reviewWords.length}>{busy ? <LoaderCircle className="spin" size={16}/> : <ArrowRight size={16}/>} {reviewWords.length ? 'Start practice' : 'Save words to practice'}</button><span className="muted-note">About 2 minutes · Saves your progress</span></div><div className="practice-side"><div className="panel"><div className="side-card-icon mint"><Target size={18}/></div><h3>Daily challenge</h3><p>Try a question about {dailyWord.word}. {questionsRemainingToday}/10 left today.</p><button onClick={() => startQuiz('daily')} disabled={busy || questionsRemainingToday === 0}>Play today’s challenge <ChevronRight size={15}/></button></div><div className="panel"><div className="side-card-icon peach"><Activity size={18}/></div><h3>Adaptive review</h3><p>Revisit words you may want a little more time with.</p><button onClick={() => startQuiz('adaptive')} disabled={busy}>{busy ? <LoaderCircle className="spin" size={14}/> : <Activity size={14}/>} {busy ? 'Building your review…' : 'Start a review'}</button></div></div></div>}<section className="panel history-panel"><PanelHead title="Recent practice" caption={`${history.length} saved sessions`}/>{history.length ? history.slice(0,5).map((item) => <div className="history-row" key={item.id}><span className="history-check"><Check size={15}/></span><span><b>Vocabulary quiz</b><small>{new Date(item.createdAt).toLocaleDateString()}</small></span><strong>{item.score}/{item.total}</strong></div>) : <div className="history-empty">Your completed quizzes and scores will show up here.</div>}</section></section>}

      {page === 'settings' && <section className="page-view settings-view"><div className="page-heading"><div><div className="eyebrow">MADE FOR YOU</div><h1>Reading comfort</h1><p className="subheading">Adjust the way LexiLearn feels, right here on this device.</p></div><span className="local-badge"><span/>Saved on this device</span></div><div className="settings-grid"><div className="settings-column"><section className="panel settings-panel"><div className="settings-panel-head"><div className="settings-icon color"><Sun size={19}/></div><div><h3>Color &amp; light</h3><p>Choose a comfortable reading atmosphere.</p></div></div><div className="setting-row mode-setting"><div><b>Display mode</b><small>Choose a light or dark appearance</small></div><div className="mode-toggle" role="group" aria-label="Display mode"><button type="button" className={`mode-option ${settings.theme !== 'dark' ? 'active' : ''}`} aria-pressed={settings.theme !== 'dark'} onClick={() => changeSetting("theme", "light")}>Light</button><button type="button" className={`mode-option ${settings.theme === 'dark' ? 'active' : ''}`} aria-pressed={settings.theme === 'dark'} onClick={() => changeSetting("theme", "dark")}>Dark</button></div></div><div className="setting-row"><div><b>High contrast</b><small>Strengthen text and control contrast</small></div><button className={`switch ${settings.highContrast ? 'on' : ''}`} onClick={() => changeSetting('highContrast', !settings.highContrast)} aria-label="Toggle high contrast"><i/></button></div><div className="setting-row column"><div className="range-heading"><div><b>Light sensitivity</b><small>Background brightness</small></div><span>{settings.brightness}%</span></div><input type="range" min="45" max="100" value={settings.brightness} onChange={(e) => changeSetting('brightness', Number(e.target.value))}/></div><div className="setting-row"><div><b>Reduce motion</b><small>Limit animation and movement</small></div><button className={`switch ${settings.reduceMotion ? 'on' : ''}`} onClick={() => changeSetting('reduceMotion', !settings.reduceMotion)} aria-label="Toggle reduced motion"><i/></button></div></section><section className="panel settings-panel"><div className="settings-panel-head"><div className="settings-icon reading"><AudioLines size={19}/></div><div><h3>Reading preferences</h3><p>Make words easier to read.</p></div></div><div className="setting-row column"><div className="range-heading"><div><b>Text size</b><small>Preview size: {settings.fontSize}px</small></div><span>Aa</span></div><input type="range" min="14" max="23" value={settings.fontSize} onChange={(e) => changeSetting('fontSize', Number(e.target.value))}/></div><div className="setting-row font-setting"><label htmlFor="font-family">Font style</label><select id="font-family" value={settings.fontFamily || 'system'} onChange={(event) => changeSetting('fontFamily', event.target.value)}><option value="system">System sans</option><option value="arial">Arial</option><option value="georgia">Georgia</option><option value="verdana">Verdana</option></select></div><div className="setting-row column"><div className="range-heading"><div><b>Letter spacing</b><small>Space between letters</small></div><span>{settings.letterSpacing}px</span></div><input type="range" min="0" max="3" step="0.5" value={settings.letterSpacing} onChange={(e) => changeSetting('letterSpacing', Number(e.target.value))}/></div><div className="setting-row column"><div className="range-heading"><div><b>Line spacing</b><small>Space between lines</small></div><span>{settings.lineSpacing}×</span></div><input type="range" min="1.2" max="2" step="0.05" value={settings.lineSpacing} onChange={(e) => changeSetting('lineSpacing', Number(e.target.value))}/></div><div className="reading-preview" style={{ fontSize: 'var(--reader-size)', letterSpacing: 'var(--reader-letter)', lineHeight: 'var(--reader-line)' }}>The quick brown fox jumps over the lazy dog. Serendipity is finding something good without looking for it.</div></section></div><div className="settings-column"><section className="panel settings-panel profile-panel"><div className="settings-panel-head"><div className="settings-icon reading"><BookOpen size={19}/></div><div><h3>Your profile</h3><p>Choose what LexiLearn calls you.</p></div></div><form className="profile-name-form" onSubmit={saveProfileName}><label htmlFor="profile-name">Display name</label><div><input id="profile-name" type="text" maxLength="60" required value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} placeholder="Your name"/><button className="button button-primary" type="submit">Save name</button></div></form></section><section className="panel settings-panel data-panel"><div className="settings-panel-head"><div className="settings-icon backup"><Upload size={19}/></div><div><h3>Your local data</h3><p>Your learning data belongs to you.</p></div></div><div className="data-stat"><span><BookOpen size={17}/>Vocabulary</span><b>{words.length} words</b></div><div className="data-stat"><span><Heart size={17}/>Favorites</span><b>{favorites.length} saved</b></div><div className="data-stat"><span><Activity size={17}/>Practice sessions</span><b>{history.length} completed</b></div><div className="setting-row"><div><b>Daily reminder</b><small>Gentle vocabulary nudge at 8:00 PM</small></div><button className={`switch ${settings.dailyReminder ? 'on' : ''}`} onClick={() => setReminder(!settings.dailyReminder)} aria-label="Toggle daily reminder"><i/></button></div><div className="backup-actions"><button className="button button-outline" onClick={exportData}><ArrowDownRight size={16}/>Export backup</button><label className="button button-soft"><Upload size={16}/>Restore backup<input type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files[0] && importData(e.target.files[0])}/></label></div><p className="privacy-note"><span/>Stored locally in this browser. AI features send only the word or vocabulary content needed for your request.</p></section><section className="panel about-panel"><div className="about-mark"><BookOpen size={19}/></div><h3>A growing vocabulary, at your pace.</h3><p>LexiLearn keeps your words, favorites, and learning history right on your device.</p><div className="about-meta"><span>LEXILEARN</span><span>VERSION 1.0.0</span></div></section></div></div></section>}
    </div><footer className="footer"><span>Made for curious minds <span className="footer-star">✳</span></span><span>Your words stay yours.</span></footer></main>

    <nav className="mobile-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setPage(id)} className={activeNav === id ? 'active' : ''}><Icon size={19}/><span>{label}</span></button>)}<button onClick={() => setPage('settings')} className={page === 'settings' ? 'active' : ''}><Settings2 size={19}/><span>Settings</span></button></nav>
    {selected && <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}><div className="word-detail modal-card"><button className="modal-close" onClick={() => setSelected(null)}><X size={19}/></button><div className="section-kicker">WORD DETAILS</div><h2>{selected.word}<span className="word-type">{selected.partOfSpeech || 'word'}</span></h2><div className="pronunciation">{selected.pronunciation || 'Pronunciation not added'} <button onClick={() => speak(selected.word)}><Volume2 size={16}/></button></div><div className="detail-section"><b><Lightbulb size={16}/> Definition</b><p>{selected.definition || 'Add a definition to make this word more memorable.'}</p></div><div className="detail-ai-actions"><span>ADD DETAILS WITH AI</span>{[{ key: 'synonyms', label: 'Synonyms' }, { key: 'antonyms', label: 'Antonyms' }, { key: 'roots', label: 'Word roots' }, { key: 'examples', label: 'Examples' }].map((item) => <button key={item.key} disabled={!online || !!aiBusy || !!selected[item.key]?.length} onClick={() => enrichSelected(item.key)}>{aiBusy === item.key ? 'Generating…' : item.label}</button>)}</div>{selected.synonyms?.length > 0 && <div className="detail-section"><b><Sparkles size={16}/> Synonyms</b><p>{selected.synonyms.join(', ')}</p></div>}{selected.antonyms?.length > 0 && <div className="detail-section"><b><ArrowDownRight size={16}/> Antonyms</b><p>{selected.antonyms.join(', ')}</p></div>}{selected.roots?.length > 0 && <div className="detail-section"><b><BookOpen size={16}/> Word roots</b><p>{selected.roots.join(", ")}</p></div>}{selected.examples?.length > 0 && <div className="detail-section"><b><BookOpen size={16}/> Example</b><p>{selected.examples[0]}</p></div>}<div className="detail-actions"><button className="button button-primary" onClick={() => toggleFavorite(selected)}><Heart size={16} fill={selectedIsFavorite ? 'currentColor' : 'none'}/>{selectedIsFavorite ? 'Saved to favorites' : 'Save to favorites'}</button><button className="button button-outline" onClick={async () => { await database.deleteWord(selected.id); await refresh(); setSelected(null); setNotice('Word removed from your collection.'); }}><Trash2 size={16}/>Delete</button></div></div></div>}
    {notice && <div className="toast"><span className="toast-dot"/>{notice}<button onClick={() => setNotice('')}><X size={15}/></button></div>}
  </div>;
}

function Stat({ icon: Icon, label, value, note, tone }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>; }
function PanelHead({ title, caption, action, onAction }) { return <div className="panel-head"><div><h3>{title}</h3><span>{caption}</span></div>{action && <button onClick={onAction}>{action}<ArrowRight size={14}/></button>}</div>; }
function WordCard({ word, favorite, onFavorite, onOpen }) { return <article className="word-card"><div className="word-card-top"><span className="word-initial large">{word.word[0]?.toUpperCase()}</span><button className={`favorite-button ${favorite ? 'is-favorite' : ''}`} onClick={onFavorite} aria-label={favorite ? 'Remove favorite' : 'Add favorite'}><Heart size={18} fill={favorite ? 'currentColor' : 'none'}/></button></div><button className="word-card-title" onClick={onOpen}>{word.word}<span>{word.partOfSpeech || 'word'}</span></button><p>{word.definition || 'A word in your collection.'}</p><div className="word-card-bottom"><span>{word.examples?.length || 0} examples</span><button onClick={onOpen}>Details <ChevronRight size={15}/></button></div></article>; }
function EmptyState({ icon: Icon, title, body, button, onClick }) { return <div className="empty-state"><div><Icon size={24}/></div><h3>{title}</h3><p>{body}</p><button className="button button-primary" onClick={onClick}><Sparkles size={16}/>{button}</button></div>; }
function speak(word) { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(word)); } }
function hasValidQuizQuestions(questions) {
  return Array.isArray(questions) && questions.length > 0 && questions.every((item) => typeof item?.question === 'string' && item.question.trim() && Array.isArray(item.options) && item.options.length >= 2 && item.options.includes(item.answer));
}
function buildAdaptiveReviewQuiz(words, quizHistory, count = 5) {
  if (!words.length) return [];
  const missesByWord = new Map();
  for (const session of quizHistory) {
    for (const answer of session.answers || []) {
      if (answer.isCorrect) continue;
      const question = `${answer.question || ''} ${answer.correct || ''} ${answer.selected || ''}`.toLocaleLowerCase('en-US');
      for (const item of words) {
        if (question.includes(item.word.toLocaleLowerCase('en-US'))) missesByWord.set(item.id, (missesByWord.get(item.id) || 0) + 1);
      }
    }
  }
  const ordered = [...words].sort((a, b) => (missesByWord.get(b.id) || 0) - (missesByWord.get(a.id) || 0));
  const fallbackDefinitions = [
    'Able to recover quickly after a difficult experience.',
    'Showing great care and attention to detail.',
    'Lasting for only a short time.',
    'Calm, peaceful, and free from disturbance.',
    'Honest and direct when expressing an opinion.',
  ];
  return ordered.slice(0, count).filter((item) => item.definition?.trim()).map((item) => {
    const distractors = ordered.filter((other) => other.id !== item.id && other.definition?.trim()).map((other) => other.definition.trim());
    const options = [...new Set([item.definition.trim(), ...distractors, ...fallbackDefinitions].filter((value) => value !== item.definition.trim()))].slice(0, 3);
    const choices = [item.definition.trim(), ...options].sort(() => Math.random() - 0.5);
    return { question: `What does "${item.word}" mean?`, options: choices, answer: item.definition.trim(), explanation: item.definition.trim() };
  });
}
function buildLocalQuiz(words, count = DAILY_QUESTION_LIMIT) {
  if (!words.length) return [];
  const pool = [...new Set(words.flatMap((item) => [item.word, ...(item.synonyms || []), ...(item.antonyms || [])]).filter(Boolean))];
  return Array.from({ length: Math.min(count, DAILY_QUESTION_LIMIT) }, (_, index) => {
    const item = words[index % words.length];
    const synonymMode = index % 3 === 1 && item.synonyms?.length;
    const antonymMode = index % 3 === 2 && item.antonyms?.length;
    const answer = synonymMode ? item.synonyms[index % item.synonyms.length] : antonymMode ? item.antonyms[index % item.antonyms.length] : item.word;
    const distractors = pool.filter((candidate) => candidate.toLocaleLowerCase() !== answer.toLocaleLowerCase()).slice(0, 3);
    const options = [...new Set([answer, ...distractors])].sort(() => Math.random() - 0.5);
    const question = synonymMode ? `Which word is closest in meaning to “${item.word}”?` : antonymMode ? `Which word is an opposite of “${item.word}”?` : item.definition ? `Which word means: “${item.definition}”` : `Which word are you reviewing?`;
    return { question, options, answer, explanation: item.definition || '' };
  });
}
