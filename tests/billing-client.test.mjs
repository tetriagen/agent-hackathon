import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from '../web/document-parser.mjs';
import { answer, draftLetter } from '../web/core.mjs';

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


test('extract labeled totals with evidence and no fixed sample amounts', () => {
  const result = parseDocument('Good faith estimate\nTotal estimated cost: $2,137.42');
  assert.equal(result.type, 'good_faith_estimate');
  assert.equal(result.fields.estimated_total.value, '2137.42');
  assert.match(result.fields.estimated_total.evidence, /2,137.42/);
  assert.equal(parseDocument('Medical bill\nTotal charges: $2,600.45').fields.billed_total.value, '2600.45');
});
test('conflicting totals stay unresolved; subtotal is not a total', () => {
  const result = parseDocument('Medical bill\nTotal: $100.00\nTotal: $200.00');
  assert.equal(result.fields.billed_total.value, null);
  assert.equal(result.fields.billed_total.ambiguous, true);
  assert.equal(parseDocument('Medical bill Subtotal: $500.00').fields.billed_total.value, null);
});
test('EOB fields remain distinct and later glossary amounts are ignored', () => {
  const result = parseDocument('[Page 1] Explanation of benefits Total Amount Provider(s) Charged: $777.00 Patient responsibility: $25.00 Total payment amount | 500.00 [Page 2] Patient responsibility: $999.00');
  assert.equal(result.type, 'eob');
  assert.equal(result.fields.patient_responsibility.value, '25.00');
  assert.equal(result.fields.plan_paid.value, '500.00');
  assert.equal(result.fields.billed_total.value, '777.00');
  assert.equal(result.fields.estimated_total.value, null);
});
test('blank and unknown documents do not generate amounts', () => {
  assert.equal(parseDocument('Good faith estimate Total: _____').status, 'manual_review');
  const result = parseDocument('Account 123456 Total: $900.00');
  assert.equal(result.type, 'unknown');
  assert.equal(result.fields.billed_total.value, null);
});
test('teaching scenarios are never parsed as one patient case', () => {
  const result = parseDocument('How to know if you can dispute Good faith estimate Total: $1,000.00 Medical bill Total: $2,000.00');
  assert.equal(result.type, 'educational_example');
  assert.ok(Object.values(result.fields).every(field => field.value === null));
});
test('OCR metadata warns users to verify digits; missing digits are not guessed', () => {
  const result = parseDocument('EXPLANATION OF BENEFITS TOTAL PAYMENT AMOUNT | 43.06 PATIENT RESPONSIBILITY | l0.77', {usedOCR:true});
  assert.equal(result.fields.plan_paid.value, '43.06');
  assert.equal(result.fields.patient_responsibility.value, null);
  assert.match(result.warnings[0], /OCR/);
});
