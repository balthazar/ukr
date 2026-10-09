#!/bin/sh
# Fetch raw sources into seed/raw (gitignored). ~300 MB total.
set -eu
cd "$(dirname "$0")"
mkdir -p raw
curl -fSL -o raw/uk_full.txt https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/uk/uk_full.txt
curl -fSL -o raw/ru_50k.txt https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ru/ru_50k.txt
curl -fSL -o raw/kaikki.jsonl https://kaikki.org/dictionary/Ukrainian/kaikki.org-dictionary-Ukrainian.jsonl
wc -l raw/uk_full.txt raw/ru_50k.txt raw/kaikki.jsonl
