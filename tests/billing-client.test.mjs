import test from 'node:test';
import assert from 'node:assert/strict';
import { findTotal, answer, draftLetter } from '../web/core.mjs';

test('find a single labeled USD total and preserve its evidence', () => {
  assert.deepEqual(findTotal('Patient: Demo\nTotal charges: $1,650.25'), { amount: '1650.25', evidence: 'Total charges: $1,650.25' });
});
test('do not guess between conflicting totals or mistake a subtotal', () => {
  assert.equal(findTotal('Total: 900\nAmount due: 800'), null);
  assert.equal(findTotal('Subtotal: 900'), null);
  assert.equal(findTotal('Patient ID 1650'), null);
  assert.equal(findTotal('Total: 1.234,56'), null);
});
test('unknown answers stay unknown', () => {
  assert.equal(answer('unknown'), null);
  assert.equal(answer('yes'), true);
  assert.equal(answer('no'), false);
});
test('letter uses calculated amounts and no claim of savings', () => {
  const letter = draftLetter({ estimate_amount: '123.45', billed_amount: '723.46', difference: '600.01' });
  assert.match(letter, /\$600\.01/);
  assert.match(letter, /\[Your name\]/);
  assert.doesNotMatch(letter, /violation|guarantee/i);
});
