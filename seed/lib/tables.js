import { respell } from './respell.js';
import { plain } from './kaikki.js';

const CASES = ['nominative', 'genitive', 'dative', 'accusative', 'instrumental', 'locative', 'vocative'];
const PERSONS = [
  ['я', 'first-person', 'singular'],
  ['ти', 'second-person', 'singular'],
  ['він / вона', 'third-person', 'singular'],
  ['ми', 'first-person', 'plural'],
  ['ви', 'second-person', 'plural'],
  ['вони', 'third-person', 'plural'],
];
const PARADIGM_TAGS = ['first-person', 'second-person', 'third-person', 'singular', 'plural', 'masculine', 'feminine', 'neuter', 'formal', 'informal'];

const usable = (f) => f.form && f.form !== '-' && !f.tags?.includes('error-unrecognized-form') && !f.form.includes(':');

// First listed variant whose tags include all of `want` and none of `avoid`.
function pick(forms, want, avoid = []) {
  return forms.find((f) => usable(f) && want.every((t) => f.tags?.includes(t)) && !avoid.some((t) => f.tags?.includes(t)));
}

function cell(f, ctx) {
  if (!f) return null;
  const form = f.form.replace(/̀/g, '');
  const key = plain(form);
  const native = ctx.audio?.get(key);
  return { form, respelling: respell(form), common: ctx.common?.has(key) ?? false, audio: native ? { url: native, source: 'commons' } : null };
}

const section = (title, rows, columns) => {
  const kept = rows.filter((r) => r.cells.some(Boolean));
  return kept.length ? { title, ...(columns ? { columns } : {}), rows: kept } : null;
};

function verbTable(e, ctx) {
  const forms = e.forms;
  const perfective = e.args?.[2] === 'pf' || forms.some((f) => f.tags?.includes('perfective'));
  const tense = perfective ? 'future' : 'present';
  const partnerRaw = perfective ? e.args?.impf : e.args?.pf;
  const sections = [
    section(perfective ? 'Future' : 'Present', PERSONS.map(([label, person, number]) => ({ label, cells: [cell(pick(forms, [person, number, tense]), ctx)] }))),
    section('Past', [
      { label: 'він', cells: [cell(pick(forms, ['masculine', 'past', 'singular']), ctx)] },
      { label: 'вона', cells: [cell(pick(forms, ['feminine', 'past', 'singular']), ctx)] },
      { label: 'воно', cells: [cell(pick(forms, ['neuter', 'past', 'singular']), ctx)] },
      { label: 'вони', cells: [cell(pick(forms, ['past', 'plural'], ['passive']), ctx)] },
    ]),
    section('Imperative', [
      { label: 'ти', cells: [cell(pick(forms, ['imperative', 'second-person', 'singular']), ctx)] },
      { label: 'ви', cells: [cell(pick(forms, ['imperative', 'second-person', 'plural']), ctx)] },
      { label: 'ми (let’s)', cells: [cell(pick(forms, ['imperative', 'first-person', 'plural']), ctx)] },
    ]),
  ].filter(Boolean);
  if (!sections.length) return null;
  return {
    kind: 'verb',
    aspect: perfective ? 'perfective' : 'imperfective',
    partner: partnerRaw ? plain(String(partnerRaw).split(',')[0].split('<')[0]) : null,
    sections,
  };
}

function caseTable(kind, forms, columns, ctx, onlyNominative = false) {
  const rows = (onlyNominative ? ['nominative'] : CASES).map((c) => ({
    label: c,
    cells: columns.map((col) => cell(pick(forms, [c, ...col.want], col.avoid), ctx)),
  }));
  const s = section('Forms', rows, columns.map((c) => c.name));
  return s ? { kind, sections: [s] } : null;
}

export function extractTable(e, ctx) {
  const forms = (e.forms ?? []).filter((f) => f.source === 'declension' || f.source === 'conjugation');
  if (e.pos === 'verb') return verbTable({ ...e, forms }, ctx);
  const decl = forms.filter((f) => f.source === 'declension');
  if (!decl.length) return null;

  if (e.pos === 'pron' && decl.some((f) => f.tags?.some((t) => t.endsWith('-person')))) {
    // Personal pronoun tables list every person; keep the lemma's own paradigm.
    const own = decl.find((f) => f.tags?.includes('nominative') && plain(f.form) === plain(e.lemma ?? ''));
    const sig = (f) => PARADIGM_TAGS.filter((t) => f.tags?.includes(t)).join(' ');
    const mine = own ? decl.filter((f) => sig(f) === sig(own)) : decl;
    return caseTable('pronoun', mine, [{ name: '', want: [], avoid: [] }], ctx);
  }
  if (decl.some((f) => f.tags?.includes('masculine') && f.tags?.includes('nominative'))) {
    const gender = (g) => ({ name: g, want: [g, 'singular'], avoid: [] });
    return caseTable(e.pos === 'pron' || e.pos === 'det' ? 'pronoun' : 'adjective', decl,
      [gender('masculine'), gender('feminine'), gender('neuter'), { name: 'plural', want: ['plural'], avoid: [] }], ctx, true);
  }
  return caseTable(e.pos === 'pron' ? 'pronoun' : 'noun', decl,
    [{ name: 'singular', want: ['singular'], avoid: [] }, { name: 'plural', want: ['plural'], avoid: [] }], ctx);
}
