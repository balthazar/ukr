import { describe, it, expect } from 'vitest';
import { respell } from '../lib/respell.js';

describe('respell', () => {
  it.each([
    ['дя́кую', 'DYA-koo-yoo'],
    ['ма́ти', 'MA-ty'],
    ['ха́та', 'KHA-ta'],
    ['до́брий', 'DO-bryy'],
    ['Украї́на', 'oo-kra-YEE-na'],
    ["сім'я́", 'see-MYA'],
    ['сімʼя́', 'see-MYA'],
    ['день', "den'"],
    ['ща́стя', 'SHCHAS-tya'],
    ['Євро́па', 'yev-RO-pa'],
    ['при́віт', 'PRY-veet'],
    ['ґа́нок', 'GA-nok'],
    ['хліб', 'khleeb'],
    ['будь ла́ска', "bood' LAS-ka"],
    ['що-не́будь', "shcho NE-bood'"],
    ['в', 'v'],
    ['ї́жа', 'YEE-zha'],
  ])('%s -> %s', (input, out) => {
    expect(respell(input)).toBe(out);
  });

  it('ignores secondary (grave) stress marks', () => {
    expect(respell('пі̀вдорозі')).toBe('peev-do-ro-zee');
  });
});
