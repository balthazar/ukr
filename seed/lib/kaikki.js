import fs from 'node:fs';
import readline from 'node:readline';

const SKIP_POS = new Set(['name', 'character', 'suffix', 'prefix', 'combining_form', 'interfix', 'symbol', 'punct', 'proverb', 'phrase', 'prep_phrase']);
const SKIP_SENSE_TAGS = new Set(['obsolete', 'archaic']);
const LETTERS = "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'";
const UK_WORD = new RegExp(`^[${LETTERS}]+(?:-[${LETTERS}]+)*$`);
const MAX_AUDIO = 3;
const PERSONS = new Set(['first-person', 'second-person', 'third-person']);
// Tags that tell one pronoun paradigm from another inside a shared table (я/ти/Ви/він/ми...).
const PARADIGM_TAGS = new Set([...PERSONS, 'singular', 'plural', 'masculine', 'feminine', 'neuter', 'formal', 'informal']);

export const plain = (s) => s.toLowerCase().replace(/[̀́]/g, '').replace(/[ʼ’]/g, "'");
export const isUkrainianWord = (s) => UK_WORD.test(s) && /[^'-]/.test(s);

export function createIndex() {
  return { lemmas: new Map(), formToLemmas: new Map() };
}

function addForm(index, form, lemma) {
  if (!isUkrainianWord(form)) return;
  let set = index.formToLemmas.get(form);
  if (!set) index.formToLemmas.set(form, (set = new Set()));
  set.add(lemma);
}

export function addEntry(index, e) {
  if (e.lang_code && e.lang_code !== 'uk') return;
  if (SKIP_POS.has(e.pos)) return;
  const word = plain(e.word ?? '');
  if (!isUkrainianWord(word)) return;

  const glosses = [];
  for (const sense of e.senses ?? []) {
    if (sense.form_of?.length || sense.tags?.includes('form-of')) {
      for (const f of sense.form_of ?? []) addForm(index, word, plain(f.word ?? ''));
      continue;
    }
    if (sense.tags?.some((t) => SKIP_SENSE_TAGS.has(t))) continue;
    const g = sense.glosses?.at(-1);
    if (g) glosses.push(g);
  }
  if (!glosses.length) return;

  let lem = index.lemmas.get(word);
  if (!lem) index.lemmas.set(word, (lem = { lemma: word, stressed: null, ipa: null, pos: [], glosses: [], audio: [] }));
  if (!lem.pos.includes(e.pos)) lem.pos.push(e.pos);
  for (const g of glosses) if (!lem.glosses.includes(g)) lem.glosses.push(g);

  const canonical = e.forms?.find((f) => f.tags?.includes('canonical'))?.form;
  if (!lem.stressed && canonical && plain(canonical) === word) {
    lem.stressed = canonical.toLowerCase().replace(/̀/g, '');
  }
  for (const s of e.sounds ?? []) {
    if (s.ipa && !lem.ipa) lem.ipa = s.ipa;
    if (s.mp3_url && lem.audio.length < MAX_AUDIO && !lem.audio.some((a) => a.url === s.mp3_url)) {
      lem.audio.push({ url: s.mp3_url, source: 'commons' });
    }
  }

  addForm(index, word, word);
  const own = ownParadigm(e.forms ?? [], word);
  for (const f of e.forms ?? []) {
    if (f.source !== 'declension' && f.source !== 'conjugation') continue;
    if (own && f.source === 'declension' && paradigm(f) && paradigm(f) !== own) continue;
    addForm(index, plain(f.form ?? ''), word);
  }
}

const paradigm = (f) =>
  f.tags?.some((t) => PERSONS.has(t)) ? f.tags.filter((t) => PARADIGM_TAGS.has(t)).sort().join(' ') : null;

// Personal pronoun tables list every person's forms; the lemma's own paradigm is the
// one on its nominative row (я -> first-person singular).
function ownParadigm(forms, word) {
  const row = forms.find((f) => f.source === 'declension' && f.tags?.includes('nominative') && plain(f.form ?? '') === word);
  return row ? paradigm(row) : null;
}

export async function loadKaikki(path) {
  const index = createIndex();
  const rl = readline.createInterface({ input: fs.createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim()) addEntry(index, JSON.parse(line));
  }
  return index;
}
