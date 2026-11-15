# LexiLearn

LexiLearn is a local-first vocabulary learning app. Every install owns its learning database. The web build uses IndexedDB through Dexie; the Android build uses SQLite through Capacitor Community SQLite. The Express service is only a Gemini AI gateway and does not persist learner data.

## Run locally

Requires Node.js 20 or newer.

```sh
npm install
cp .env.example .env
npm run server
npm run dev
```

Set `GEMINI_API_KEY` in the backend `.env` file to enable AI generation. Keep this key on the server; it is never read by Vite or shipped to Android. Without a key, local vocabulary, favorites, settings, quizzes already saved, and backups still work. For Android production builds, set `VITE_AI_API_URL` to the deployed HTTPS gateway API URL (ending in `/api`) before building. `CLIENT_ORIGIN` accepts a comma-separated list, including your web origin and the Capacitor Android WebView origin when needed.

## Local data

- Browser: the `lexilearn-local` IndexedDB database.
- Android: the `lexilearn` SQLite database (`com.lexilearn.app`).
- Daily word: created and saved automatically once per local calendar day through the Gemini gateway; a built-in word list supplies it offline.
- Practice: up to 10 quiz questions per local calendar day, tracked on this device and reset at midnight.
- Export/restore: versioned JSON backup in Settings. Restore validates the schema and asks before replacing this device's data.
- Migration version is maintained in `src/database/migrations.js` and each adapter applies it before app use.

## Android

```sh
npm run android:add
npm run android:sync
npm run android:open
```

Android Studio and the Android SDK are needed to build, sign, and test the Android application. No iOS project is configured. Capacitor initializes the splash screen, status bar, Android back behavior, SQLite, local reminders, and network status in the native app.

## AI gateway

The server validates request bodies, rate-limits `/api/ai/*`, and sends only the requested word/topic/learner-provided progress needed to Gemini. It has no database and does not store vocabulary, progress, quizzes, or profiles. Configure `CLIENT_ORIGIN` for the production web origin and use HTTPS when deployed.

### Deploy the Gemini gateway to Cloud Run

The Android app needs a public HTTPS URL for this gateway; the Gemini API key stays on the server.

1. From the project root, deploy the Node service with `gcloud run deploy lexilearn-ai --source . --allow-unauthenticated`. Cloud Run supports deploying Node.js source directly.
2. In the Cloud Run service settings, set `GEMINI_API_KEY` from Secret Manager. Set `CLIENT_ORIGIN` to `https://localhost,capacitor://localhost` (add your web app origin if you deploy the web app too).
3. Copy the service URL and add `/api` to it. Set `VITE_AI_API_URL` in the local `.env` to that URL, for example `https://your-service.run.app/api`.
4. Build and sync Android with `npm run android:sync`, then build the APK with `android\\gradlew.bat assembleDebug`.

Check `https://your-service.run.app/api/health` before rebuilding. It should return `ok: true` and `configured: true`.
