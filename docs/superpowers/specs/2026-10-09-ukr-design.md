# ukr: Ukrainian vocabulary + comprehensible input app

Date: 2026-10-09
Status: approved design, pending implementation plan

## Purpose

A private web app for us (one shared profile) to learn Ukrainian:

1. Work through a Ukrainian high-frequency word list: see how each word is
   spelled, how to pronounce it written in the English alphabet, hear audio
   (native recordings when available), and check our own pronunciation with
   the microphone.
2. Get comprehensible input from YouTube: search and pinned channels, embedded
   playback, and remembered progress (resume position, watched list).

Success: we can open `https://ukr.balthazar.dev`, enter the shared password,
do a daily review of words with audio and a mic check, and pick up a video
where we left off, from phone or desktop.

## Decisions

| Topic | Decision |
|---|---|
| Users | One shared profile behind one password. No per-user data. |
| Study mode | Browsable ranked list plus a daily SM-2 review queue. |
| Pronunciation check | Browser Web Speech API (`uk-UA`) auto-check plus record/playback; auto-check hidden where unsupported. |
| Video discovery | Free-form YouTube search plus pinned channels (YouTube Data API v3). |
| Word data | Offline seed pipeline: frequency list + Wiktionary (kaikki.org extract), lemma folding, rule-based respelling. No LLM enrichment in v1. |
| Hosting | dadonew k3s cluster, namespace `apps`, existing Mongo, Cloudflare-proxied subdomain. |

## Architecture

Single repo at `/Users/b/git/ukr`, single container image.

```
api/     Express + mongoose (ESM, Node 24), serves /api and the built SPA
web/     React + Vite SPA (mobile-first)
seed/    Offline word pipeline -> seed/out/words.json (committed); raw downloads in seed/raw (gitignored)
k8s/     app.yaml (ConfigMap, Deployment, Service, Ingress)
Dockerfile  multi-stage: build web/, then node:24-alpine runtime with api/ + web dist
deploy.sh   manual build/push/rollout until CI exists
.github/workflows/deploy.yml  test, build, push to GHCR, set image, rollout status
```

Request path (same as other apps on the cluster):

```
ukr.balthazar.dev (Cloudflare proxied, TLS terminates here)
   | plain HTTP
Traefik (ingressClassName: traefik)
   | /  -> svc/ukr :80 -> pod :8080 (Express: /api/*, /health, static SPA with index.html fallback)
```

### Kubernetes (context `dadonew`, namespace `apps`)

- ConfigMap `ukr-config`: `MONGO_DB=ukr`, `PORT=8080`, `NEW_PER_DAY=10`.
- Secret `ukr-secrets` (created out of band, never committed):
  `APP_PASSWORD=goobernetics`,
  `MONGO_URI=mongodb://mongo.infra.svc.cluster.local:27017`,
  `SESSION_SECRET` (random, generated inline with `openssl rand -hex 32`),
  `YOUTUBE_API_KEY`.
- Deployment `ukr`: image `ghcr.io/balthazar/ukr:latest`, `imagePullSecrets: ghcr-creds`,
  1 replica, `envFrom` the ConfigMap and Secret, startup/liveness probes on
  `/health`, requests `cpu 50m / memory 128Mi`, limits `cpu 500m / memory 512Mi`.
  No PVC; all state is in Mongo.
- Service `ukr`: ClusterIP, port 80 -> 8080.
- Ingress `ukr`: `ingressClassName: traefik`, host `ukr.balthazar.dev`, path `/`, no `tls:` block.

### External setup (done by us, outside the code)

- Cloudflare: proxied A record `ukr` in the `balthazar.dev` zone -> `135.148.100.142`.
- Google Cloud: a project with YouTube Data API v3 enabled and an API key
  (restricted to that API) stored in `ukr-secrets`.
- GitHub repo (expected `balthazar/ukr`) with secret `KUBECONFIG_B64` built on
  the shared `gh-deployer` service account (as wedding/wedding-trip do) and a
  `production` environment.

## Auth

- `POST /api/login {password}`: constant-time compare against `APP_PASSWORD`;
  on success sets an httpOnly, `Secure` (in production), `SameSite=Lax` cookie
  containing an HMAC-signed token (signed with `SESSION_SECRET`), valid 1 year.
  Rate-limited (e.g. 10 attempts / 15 min / IP).
- `POST /api/logout` clears the cookie.
- All other `/api/*` routes require a valid cookie, else 401.
- `/health` and static SPA assets are public; the SPA shows a password screen
  until `GET /api/me` succeeds.

## Data model (db `ukr`)

### `words` (written only by seed import)

| Field | Example | Notes |
|---|---|---|
| `rank` | 42 | 1 = most frequent; unique index |
| `lemma` | `дякую` | dictionary form, no stress mark; unique index |
| `stressed` | `дя́кую` | combining acute on stressed vowel |
| `respelling` | `DYA-koo-yoo` | generated from `stressed` |
| `ipa` | `[ˈdʲakuju]` | from Wiktionary when present |
| `pos` | `verb` | |
| `glosses` | `["thank you"]` | English, at most 5 |
| `forms` | `["дякую", ...]` | top inflected forms folded into this lemma (for mic matching and display) |
| `audio` | `[{url, source:"commons"}]` | Wikimedia Commons file URLs |
| `freq` | 123456 | summed frequency of folded forms |

### `progress` (one doc per started word)

`wordId` (unique), `status` (`learning` | `known`), `ease` (default 2.5),
`interval` (days), `reps`, `lapses`, `due` (Date), `lastReviewed`,
`micPass`, `micTotal`.

### `videos`

`videoId` (unique), `title`, `channelId`, `channelTitle`, `thumbnail`,
`duration` (s), `position` (s), `watched` (bool), `lastWatchedAt`.

### `channels` (pinned)

`channelId` (unique), `title`, `thumbnail`, `uploadsPlaylistId`.

### `ytcache`

`key` (unique, e.g. `search:<q>` or `channel:<id>:<pageToken>`), `data`,
`createdAt` with a 24h TTL index.

## API

All JSON, all behind auth except where noted.

Words and review:

- `GET /api/words?page=&limit=&status=new|learning|known&q=`: ranked list;
  `q` matches lemma prefix or gloss substring. Each item includes its progress (or null).
- `GET /api/words/:id`: word + progress.
- `PUT /api/words/:id/status {status: "known"|"learning"|"reset"}`: `reset` deletes progress.
- `POST /api/words/:id/mic {pass: bool}`: increments `micTotal` (and `micPass`).
- `GET /api/review`: due `learning` cards (`due <= now`, oldest first) plus up to
  `NEW_PER_DAY` new words (lowest rank without progress), minus new words already
  introduced today. Introducing a new word happens on its first grade.
- `POST /api/review/:id {grade: 0|1|2|3}` (Again/Hard/Good/Easy): applies SM-2,
  creates progress if absent, returns updated progress.
- `GET /api/stats`: counts of known, learning, due now, words total, videos watched, videos in progress.

Videos:

- `GET /api/yt/search?q=&pageToken=`: YouTube search (`type=video`,
  `relevanceLanguage=uk`), enriched with durations via `videos.list`, cached in `ytcache`.
- `GET /api/channels`, `POST /api/channels {channelIdOrUrlOrHandle}`, `DELETE /api/channels/:id`.
- `GET /api/channels/:id/videos?pageToken=`: uploads playlist items, cached.
- `GET /api/videos?state=inprogress|watched`: from `videos`, newest first.
- `PUT /api/videos/:videoId/progress {position, duration, meta:{title, channelId, channelTitle, thumbnail}}`:
  upsert; server sets `watched=true` when `position/duration >= 0.9`
  (never unsets it automatically).
- `PUT /api/videos/:videoId/watched {watched: bool}`: manual toggle.

Public: `GET /health` (200 when Mongo is connected), `POST /api/login`.

### Error handling

- YouTube quota exceeded or upstream error: 503 `{error: "youtube_unavailable", detail}`;
  UI shows a banner and keeps any cached results visible.
- Validation errors: 400 with a message. Unknown ids: 404.
- Missing required env at boot (`APP_PASSWORD`, `SESSION_SECRET`, `MONGO_URI`):
  process exits with a clear error. Missing `YOUTUBE_API_KEY`: app boots, YouTube
  routes return 503 `youtube_not_configured`.

## SM-2 scheduling (pure module)

Grades map to SM-2 quality: Again=1, Hard=3, Good=4, Easy=5.

- Quality < 3 (Again): `reps=0`, `lapses+=1`, `interval=0`, due in 10 minutes (stays in today's queue).
- Else: `reps+=1`; interval = 1 day if `reps==1`, 6 days if `reps==2`,
  else `round(interval * ease)`; Hard multiplies the computed interval by 0.8 (min 1),
  Easy by 1.3.
- `ease = max(1.3, ease + 0.1 - (5-q)*(0.08 + (5-q)*0.02))`.
- Marking a word `known` from the list sets status `known` and removes it from review.

## Respelling (pure module)

Input: stressed form. Output: English-alphabet respelling, hyphen between
syllables, stressed syllable uppercase.

- Letter map: а a, б b, в v, г h, ґ g, д d, е e, є yeh, ж zh, з z, и y (as in "sit"),
  і ee, ї yee, й y, к k, л l, м m, н n, о o, п p, р r, с s, т t, у oo, ф f, х kh,
  ц ts, ч ch, ш sh, щ shch, ь ' (apostrophe), ю yoo, я ya, apostrophe (ʼ) separates (no sound).
- `є ю я` after a consonant (not after apostrophe or soft sign) soften it and
  render as `ye/yoo/ya` attached to that consonant syllable.
- Syllabification: one vowel per syllable; a single consonant between vowels
  starts the next syllable; for consonant clusters, the last consonant starts
  the next syllable.
- Words without a stress mark (e.g. monosyllables) render lowercase.
- A legend explaining the scheme is shown on word cards.

## Frontend (React + Vite)

Tabs: Today, Review, Words, Watch. Mobile-first layout.

- **Today**: stats, "Start review (N due)", "Continue watching" strip.
- **Review**: shows stressed word + audio; tap to reveal respelling, IPA, glosses,
  mic tools; grade buttons Again/Hard/Good/Easy.
- **Words**: ranked, paginated list with filter (all/new/learning/known) and
  search; each row: rank, word, respelling, first gloss, status. Tap opens word card.
- **Word card**: stressed word, respelling, IPA, pos, glosses, forms; buttons:
  - Listen: Commons audio (labeled "native recording"); fallback
    `speechSynthesis` with a `uk-UA` voice (labeled "synthetic"); disabled with
    a note if neither is available.
  - Record / Play mine: MediaRecorder, in-memory only, never uploaded.
  - Check: SpeechRecognition `lang=uk-UA`, `maxAlternatives=5`; normalize
    (lowercase, strip combining stress marks and punctuation); pass if any
    alternative equals the lemma or one of `forms`; "close" if Levenshtein
    distance 1; always shows what was heard; posts result to `/mic`. Hidden when
    unsupported; permission denial shows an inline hint.
  - Mark known / Reset.
- **Watch**: search box with results grid; pinned channels (add by URL, handle,
  or id; remove) each with a video list; "In progress" and "Watched" lists.
- **Player**: YouTube IFrame API embed, starts at saved `position`; saves
  progress every 5 s while playing and on pause, end, and `visibilitychange`
  to hidden; manual "mark watched/unwatched" toggle.
- 401 from any call returns to the password screen.

## Seed pipeline (`seed/`, Node scripts)

1. Download sources to `seed/raw/` (gitignored): a Ukrainian subtitle frequency
   list (candidate: hermitdave FrequencyWords `uk` full list) and the kaikki.org
   Wiktionary extract for Ukrainian (JSONL). Exact URLs and formats are
   verified as the first implementation task; the pipeline adapts to what is
   actually there.
2. Build a form -> lemma map from Wiktionary entries (headwords and their
   `forms` / `form_of` data).
3. Fold frequency-list forms into lemmas, summing frequency; drop proper nouns,
   entries without an English gloss, and non-Cyrillic tokens.
4. Take the top 5000 lemmas by summed frequency; assign `rank`.
5. Attach stressed form, IPA, pos, glosses (max 5), top forms, Commons audio URLs;
   compute `respelling`.
6. Write `seed/out/words.json` (committed, reviewable).
7. `npm run seed` (in `api/`) upserts `words.json` into Mongo by `lemma`,
   preserving `_id`s so `progress` survives re-seeds. Run locally against the
   cluster Mongo via `kubectl port-forward`, or as a one-off Job using the same
   image (the Dockerfile copies `seed/out/words.json` into the runtime image for this).

## Testing

- Unit (vitest): SM-2 module, respelling module (table of known words), mic
  normalize/match, auth token sign/verify.
- API (vitest + supertest + mongodb-memory-server): login/401 flow, words list
  filters, review queue composition and grading, video progress/watched
  threshold, YouTube routes with the HTTP client stubbed (success, cache hit, quota error).
- Seed: unit tests for lemma folding on a small fixture.
- Frontend: kept light; manual verification of mic, audio, and player on
  Chrome desktop and iOS Safari after deploy.

## Out of scope (v1)

Per-user profiles, LLM-generated example sentences, server-side speech
recognition, uploading recordings, subtitle/transcript features, offline/PWA mode.
