// Deterministic extraction only. Missing or conflicting labels stay unresolved.
const USD = '(?:\\$\\s*)?((?:\\d{1,3}(?:,\\d{3})+|\\d+)\\.\\d{2})(?![\\d.,])';

function extract(text, labels) {
  const matches = labels.flatMap(label => [...text.matchAll(new RegExp(label + '\\s*[:=|]?\\s*' + USD, 'gi'))]);
  const amounts = [...new Set(matches.map(match => match[1].replaceAll(',', '')))];
  if (amounts.length !== 1) return { value: null, evidence: '', ambiguous: amounts.length > 1 };
  return { value: amounts[0], evidence: matches[0][0], ambiguous: false };
}

export function parseDocument(text, { usedOCR = false } = {}) {
  const normalized = text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  // Use only the first page for EOB summaries, avoiding glossary examples and claim subtotals.
  const firstPage = text.split(/\[Page 2\]|\f/)[0].replace(/\s+/g, ' ').trim();
  const header = normalized.slice(0, 1800);
  let type = 'unknown';
  if (/how to know if you can dispute|examples from a good faith estimate|example\s*\d\s*:\s*(?:yes|no)/i.test(normalized)) type = 'educational_example';
  else if (/explanation of benefits|\bEOB\b/i.test(header)) type = 'eob';
  else if (/good faith estimate/i.test(header)) type = 'good_faith_estimate';
  else if (/medical bill|patient statement|billing statement|invoice/i.test(header)) type = 'medical_bill';

  const empty = () => ({ value: null, evidence: '', ambiguous: false });
  const fields = { billed_total: empty(), estimated_total: empty(), patient_responsibility: empty(), plan_paid: empty() };
  const warnings = [];
  if (usedOCR) warnings.push('OCR was used. Check every amount against the original PDF; OCR can misread digits.');
  if (type === 'eob') {
    fields.patient_responsibility = extract(firstPage, ['\\bpatient responsibility', '\\bwhat provider\\(s\\) may bill you', '\\btotal provider may bill you']);
    fields.plan_paid = extract(firstPage, ['\\btotal payment amount', '\\b(?:total )?plan paid', '\\bpaid(?=\\s+\\$[\\d,.]+\\s+towards the claims)']);
    fields.billed_total = extract(firstPage, ['\\btotal amount provider\\(s\\) charged', '\\btotal billed charges']);
    warnings.push('EOB explains an insurance claim. It is not a provider bill or a good faith estimate. Do not use it in the self-pay comparison below.');
    if (/\b[2-9]\d* claims\b/i.test(firstPage)) warnings.push('This EOB combines several claims. Summary amounts do not belong to a single visit automatically.');
  } else if (type === 'good_faith_estimate') {
    fields.estimated_total = extract(normalized, ['\\btotal estimated(?: cost)?', '\\bestimated total', '\\btotal expected charges(?: from [^$\\d]{0,80})?', '\\bgrand total', '\\btotal']);
  } else if (type === 'medical_bill') {
    fields.billed_total = extract(normalized, ['\\btotal charges', '\\btotal billed', '\\bgrand total', '\\btotal']);
  } else if (type === 'educational_example') {
    warnings.push('This document contains several teaching scenarios, not one patient case. Select a scenario and enter its amounts manually.');
  } else {
    warnings.push('Document type was not recognized. Enter amounts manually; this parser does not guess.');
  }
  for (const [key, field] of Object.entries(fields)) {
    if (field.ambiguous) warnings.push(`Conflicting values for ${key.replaceAll('_', ' ')}. Confirm the correct scope manually.`);
  }
  const found = Object.values(fields).filter(field => field.value !== null).length;
  if (!found && !['unknown', 'educational_example'].includes(type)) warnings.push('No unambiguous labeled totals found. This may be a blank form or an unsupported layout.');
  return { type, fields, warnings, usedOCR, status: found ? 'partial_extraction' : 'manual_review' };
}
