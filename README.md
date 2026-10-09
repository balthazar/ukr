# ukr

Ukrainian high-frequency vocabulary (stress, English-alphabet respelling, native
audio, mic check, SM-2 review) plus YouTube comprehensible input with resume.
Live at https://ukr.balthazar.dev (shared password). Design:
`docs/superpowers/specs/2026-10-09-ukr-design.md`.

## Layout

- `api/`: Express 5 + mongoose; serves `/api/*` and the built SPA.
- `web/`: React + Vite SPA.
- `seed/`: builds `seed/out/words.json` from the frequency list + Wiktionary.

## Local development

```sh
docker run -d --name ukr-mongo -p 27017:27017 mongo:7
cat > api/.env <<'EOF'
APP_PASSWORD=dev
SESSION_SECRET=dev-secret
MONGO_URI=mongodb://localhost:27017
YOUTUBE_API_KEY=
EOF
(cd api && npm install && npm run seed && npm run dev)   # :8080
(cd web && npm install && npm run dev)                    # proxies /api to :8080
```

Tests: `npm test` in `api/`, `seed/` and `web/`.

## Rebuilding the word list

```sh
cd seed && npm install && npm run download && npm run build
npm run tts   # macOS only: pre-renders words with no recording into web/public/tts
git add out/words.json ../web/public/tts && git commit -m "seed: rebuild word list"
```

Words without a Wiktionary recording get speech pre-rendered with Apple's Lesya
voice (silence trimmed, loudness normalized, 30 ms fade-out). Each render is
rejected if its last 50 ms is within 10 dB of its loudest part, so engine
artifacts at the end never ship. One-vowel words (у) use the Wiktionary
recording of that letter. The device's own voice is only a last resort.

The subtitle frequency list is roughly a third Russian, so the build also
downloads a Russian frequency list and drops tokens whose Ukrainian frequency is
explained by that contamination (`seed/lib/russian.js`).

After deploy, import it: `kubectl --context dadonew -n apps exec deploy/ukr -- npm run seed`.
Re-seeding keeps progress for words that remain.

## Deploy

Push to `master`: GitHub Actions tests, builds `ghcr.io/balthazar/ukr`, and rolls
out `deployment/ukr` in `apps` on `dadonew`. `./deploy.sh` does the same from a
laptop. Secrets live only in the `ukr-secrets` k8s Secret (this repo is public).

Rotate a secret value:

```sh
kubectl --context dadonew -n apps create secret generic ukr-secrets \
  --from-literal=... --dry-run=client -o yaml | kubectl --context dadonew apply -f -
kubectl --context dadonew -n apps rollout restart deploy/ukr
```
