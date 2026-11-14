import { answer, draftLetter } from './core.mjs';
import { parseDocument } from './document-parser.mjs';
import { readDocument } from './ingestion.mjs';

const $ = (id) => document.getElementById(id);
let reading = 0;
let generation = 0;
let controller = null;
let draft = '';
const ocrUsed = { estimate: false, bill: false };
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function facts() {
  return {
    estimate_amount: $('estimate-amount').value.trim(),
    billed_amount: $('bill-amount').value.trim(),
    payment_type: $('payment-type').value,
    same_provider: answer($('same-provider').value),
    estimate_received: answer($('estimate-received').value),
    within_120_days: answer($('within-window').value),
  };
}

function notice(message, error = false) {
  $('notice').textContent = message;
  $('notice').classList.toggle('error', error);
}

function invalidate() {
  $('result').hidden = true;
  $('confirmed').checked = false;
  draft = '';
  $('payload').textContent = JSON.stringify(facts(), null, 2);
}

function suggest(kind) {
  const parsed = parseDocument($(`${kind}-text`).value, { usedOCR: ocrUsed[kind] });
  const box = $(`${kind}-parsed`);
  box.replaceChildren();
  const heading = document.createElement('p');
  heading.textContent = `Document type: ${parsed.type.replaceAll('_', ' ')}. Local rules, no language model.`;
  box.append(heading);
  const fields = document.createElement('dl');
  for (const [name, field] of Object.entries(parsed.fields)) {
    if (field.value === null) continue;
    const label = document.createElement('dt');
    label.textContent = `${name.replaceAll('_', ' ')}: ${money.format(field.value)}`;
    const quote = document.createElement('dd');
    quote.textContent = `Source: ${field.evidence}`;
    fields.append(label, quote);
  }
  box.append(fields);
  for (const warning of parsed.warnings) {
    const paragraph = document.createElement('p'); paragraph.className = 'note';
    paragraph.textContent = warning; box.append(paragraph);
  }
  const correctType = kind === 'estimate' ? parsed.type === 'good_faith_estimate' : parsed.type === 'medical_bill';
  const field = parsed.fields[kind === 'estimate' ? 'estimated_total' : 'billed_total'];
  $(`${kind}-amount`).value = correctType ? (field.value ?? '') : '';
  $(`${kind}-evidence`).textContent = correctType && field.value !== null
    ? `Local match: “${field.evidence}”. Confirm this is the correct total.`
    : 'No amount copied to the self-pay comparison. Check the document type and amounts.';
  invalidate();
}

for (const kind of ['estimate', 'bill']) {
  $(`${kind}-file`).addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const token = ++generation;
    reading++;
    $('controls').disabled = true;
    $('demo').disabled = true;
    $('reset').disabled = true;
    $(`${kind}-text`).value = '';
    $(`${kind}-amount`).value = '';
    $(`${kind}-evidence`).textContent = '';
    $(`${kind}-parsed`).replaceChildren();
    ocrUsed[kind] = false;
    invalidate();
    notice('Reading the document in your browser…');
    try {
      const result = await readDocument(file, message => notice(message));
      if (token !== generation) return;
      $(`${kind}-text`).value = result.text;
      ocrUsed[kind] = result.usedOCR;
      suggest(kind);
      notice('Document read locally. Review the extracted fields and any warnings.');
    } catch (error) {
      if (token === generation) notice(error.message.startsWith('Failed to fetch') ? 'PDF reader is unavailable. Install the npm dependencies or paste text instead.' : error.message, true);
    } finally {
      reading--;
      if (!reading) { $('controls').disabled = false; $('demo').disabled = false; $('reset').disabled = false; }
    }
  });
  $(`${kind}-text`).addEventListener('input', () => {
    $(`${kind}-amount`).value = '';
    $(`${kind}-evidence`).textContent = 'Text changed. Find the total again or enter it manually.';
    $(`${kind}-parsed`).replaceChildren();
  });
}

document.querySelectorAll('[data-suggest]').forEach(button => button.addEventListener('click', () => suggest(button.dataset.suggest)));
$('review-form').addEventListener('input', event => { if (event.target.id !== 'confirmed') invalidate(); });
$('review-form').addEventListener('change', event => { if (event.target.id !== 'confirmed') invalidate(); });

$('demo').addEventListener('click', () => {
  $('review-form').reset();
  ocrUsed.estimate = false; ocrUsed.bill = false;
  $('estimate-text').value = 'SYNTHETIC EXAMPLE — NOT A REAL PATIENT\nProvider: Example Clinic\nPatient: Demo Patient\nGood faith estimate\nOffice procedure: $900.00\nTotal estimated cost: $900.00';
  $('bill-text').value = 'SYNTHETIC EXAMPLE — NOT A REAL PATIENT\nProvider: Example Clinic\nPatient: Demo Patient\nMedical bill\nOffice procedure: $1,650.00\nTotal charges: $1,650.00';
  suggest('estimate'); suggest('bill');
  $('payment-type').value = 'self_pay';
  for (const id of ['same-provider', 'estimate-received', 'within-window']) $(id).value = 'yes';
  invalidate();
  notice('Synthetic example loaded. The answers are sample assumptions; inspect and confirm them.');
});

$('reset').addEventListener('click', () => {
  if (!window.confirm('Clear this case from the page? Unsaved text and results will be lost.')) return;
  generation++;
  controller?.abort();
  $('review-form').reset();
  for (const kind of ['estimate', 'bill']) {
    $(`${kind}-evidence`).textContent = '';
    $(`${kind}-parsed`).replaceChildren();
    ocrUsed[kind] = false;
  }
  invalidate();
  notice('Case cleared.');
});

$('review-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (reading || controller) return;
  for (const kind of ['estimate', 'bill']) {
    const type = parseDocument($(`${kind}-text`).value).type;
    if (['eob', 'educational_example'].includes(type) || (kind === 'bill' && type === 'good_faith_estimate') || (kind === 'estimate' && type === 'medical_bill')) {
      notice('These document types do not form a self-pay estimate and bill. Read the extracted fields above or clear the documents to enter a supported case.', true);
      return;
    }
  }
  const payload = facts();
  const token = generation;
  controller = new AbortController();
  const timeout = setTimeout(() => controller?.abort(), 15000);
  $('controls').disabled = true;
  $('demo').disabled = true;
  $('result').hidden = true;
  notice('Comparing the confirmed facts…');
  try {
    const response = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
    if (!response.ok) throw new Error('Comparison failed. Check the amounts and retry.');
    const result = await response.json();
    if (token !== generation) return;
    $('result-title').textContent = result.title;
    $('difference').textContent = `Estimate: ${money.format(result.estimate_amount)} · Bill: ${money.format(result.billed_amount)} · Difference: ${money.format(result.difference)}`;
    $('explanation').textContent = result.explanation;
    $('limitation').textContent = result.limitation;
    $('next-steps').replaceChildren(...result.next_steps.map(step => { const li = document.createElement('li'); li.textContent = step; return li; }));
    $('source').href = result.source_url;
    draft = draftLetter(result);
    $('letter').textContent = draft;
    $('result').hidden = false;
    $('result-title').focus();
    notice('Comparison complete. No complaint has been sent.');
  } catch (error) {
    if (token === generation) notice(error.name === 'AbortError' ? 'Request timed out. Check the server and retry.' : 'Could not complete the comparison. Check the server and amounts, then retry.', true);
  } finally {
    clearTimeout(timeout);
    controller = null;
    $('controls').disabled = reading > 0;
    $('demo').disabled = reading > 0;
  }
});

$('download').addEventListener('click', () => {
  if (!draft) return;
  const url = URL.createObjectURL(new Blob([draft], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'billing-review-request.txt'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('print').addEventListener('click', () => { if (draft) window.print(); });
invalidate();
