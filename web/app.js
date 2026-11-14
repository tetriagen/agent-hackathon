import { answer, findTotal, draftLetter } from './core.mjs';

const $ = (id) => document.getElementById(id);
let reading = 0;
let generation = 0;
let controller = null;
let draft = '';
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
  const match = findTotal($(`${kind}-text`).value);
  $(`${kind}-amount`).value = match?.amount ?? '';
  $(`${kind}-evidence`).textContent = match
    ? `Local match: “${match.evidence}”. Confirm this is the correct total.`
    : 'No single clear total found. Enter the amount manually.';
  invalidate();
}

async function readFile(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error('File is larger than 10 MB. Use a smaller document.');
  let text;
  if (/\.txt$/i.test(file.name)) text = await file.text();
  else if (/\.pdf$/i.test(file.name)) {
    const pdfjs = await import('/vendor/pdfjs/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.mjs';
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 30) throw new Error('Use a PDF with 30 pages or fewer.');
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join(''));
      }
      text = pages.join('\n\n');
    } finally { await task.destroy(); }
  } else throw new Error('Choose a text PDF or .txt file. Photos are not supported yet.');
  if (!text.trim()) throw new Error('No text found. This may be a scan. Paste text or enter amounts manually.');
  if (text.length > 100000) throw new Error('Too much text. Use a shorter document.');
  return text;
}

for (const kind of ['estimate', 'bill']) {
  $(`${kind}-file`).addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const token = ++generation;
    reading++;
    $('controls').disabled = true;
    $('demo').disabled = true;
    $(`${kind}-text`).value = '';
    $(`${kind}-amount`).value = '';
    $(`${kind}-evidence`).textContent = '';
    invalidate();
    notice('Reading the document in your browser…');
    try {
      const text = await readFile(file);
      if (token !== generation) return;
      $(`${kind}-text`).value = text;
      suggest(kind);
      notice('Document read locally. Check the suggested amount.');
    } catch (error) {
      if (token === generation) notice(error.message.startsWith('Failed to fetch') ? 'PDF reader is unavailable. Install the npm dependencies or paste text instead.' : error.message, true);
    } finally {
      reading--;
      if (!reading) { $('controls').disabled = false; $('demo').disabled = false; }
    }
  });
  $(`${kind}-text`).addEventListener('input', () => {
    $(`${kind}-amount`).value = '';
    $(`${kind}-evidence`).textContent = 'Text changed. Find the total again or enter it manually.';
  });
}

document.querySelectorAll('[data-suggest]').forEach(button => button.addEventListener('click', () => suggest(button.dataset.suggest)));
$('review-form').addEventListener('input', event => { if (event.target.id !== 'confirmed') invalidate(); });
$('review-form').addEventListener('change', event => { if (event.target.id !== 'confirmed') invalidate(); });

$('demo').addEventListener('click', () => {
  $('review-form').reset();
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
  for (const kind of ['estimate', 'bill']) $(`${kind}-evidence`).textContent = '';
  invalidate();
  notice('Case cleared.');
});

$('review-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (reading || controller) return;
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
