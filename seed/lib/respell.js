// Ukrainian -> English-alphabet pronunciation guide. Spec: "Respelling".
const VOWELS = { а: 'a', е: 'e', и: 'y', і: 'ee', о: 'o', у: 'oo', є: 'ye', ю: 'yoo', я: 'ya', ї: 'yee' };
const CONSONANTS = {
  б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', ж: 'zh', з: 'z', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  п: 'p', р: 'r', с: 's', т: 't', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
};
const SONORANTS = new Set(['м', 'н', 'л', 'р', 'в', 'й']);
const PRIMARY_STRESS = '́';

function toItems(word) {
  const items = [];
  for (const ch of word) {
    const last = items.at(-1);
    if (ch === PRIMARY_STRESS) {
      if (last?.vowel) last.stressed = true;
    } else if (VOWELS[ch]) {
      items.push({ vowel: true, text: VOWELS[ch], stressed: false });
    } else if (CONSONANTS[ch]) {
      items.push({ vowel: false, text: CONSONANTS[ch], letter: ch });
    } else if (ch === 'ь') {
      if (last && !last.vowel) last.text += "'";
    }
    // Apostrophes, grave accents and anything else are silent.
  }
  return items;
}

// Index in `items` where the syllable after the vowel at `a` starts (next vowel at `b`).
function cutBetween(items, a, b) {
  const between = b - a - 1;
  if (between <= 1) return a + 1;
  const last = items[b - 1];
  const prev = items[b - 2];
  const obstruentLiquid = (last.letter === 'р' || last.letter === 'л') && !SONORANTS.has(prev.letter);
  return obstruentLiquid ? b - 2 : b - 1;
}

function respellWord(word) {
  const items = toItems(word);
  const vowelAt = items.flatMap((it, i) => (it.vowel ? [i] : []));
  if (!vowelAt.length) return items.map((i) => i.text).join('');

  const syllables = [];
  let start = 0;
  for (let k = 0; k < vowelAt.length - 1; k++) {
    const cut = cutBetween(items, vowelAt[k], vowelAt[k + 1]);
    syllables.push(items.slice(start, cut));
    start = cut;
  }
  syllables.push(items.slice(start));

  return syllables
    .map((s) => {
      const text = s.map((i) => i.text).join('');
      return s.some((i) => i.stressed) ? text.toUpperCase() : text;
    })
    .join('-');
}

export function respell(stressed) {
  return stressed
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(respellWord)
    .join(' ');
}
