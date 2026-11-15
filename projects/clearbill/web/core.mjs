export function answer(value) {
  return value === "yes" ? true : value === "no" ? false : null;
}

export function draftLetter(result) {
  return `To: Billing department\nFrom: [Your name]\nAccount: [Your account number]\nDate: [Date]\n\nSubject: Request for an itemized explanation of my bill\n\nI am requesting a review of my bill and the estimate I received.\n\nEstimated amount: $${result.estimate_amount}\nBilled amount: $${result.billed_amount}\nDifference (bill minus estimate): $${result.difference}\n\nPlease provide an itemized explanation of the charges and any differences from the estimate. Please explain which services, quantities, or other changes account for the difference and correct any billing errors you identify.\n\nI can provide copies of the bill and estimate. Please let me know what additional information you need and how I can follow up.\n\nThank you,\n[Your name]\n[Preferred contact details]\n`;
}

// Uses the completed server comparison only; no additional AI or network call.
export function draftInsuranceLetter(consistency) {
  const amount = value => typeof value === 'string' && /^\d+\.\d{2}$/.test(value);
  const checks = (consistency?.checks ?? []).filter(check =>
    check.status === 'mismatch' && check.rule === 'payment_total_vs_distribution'
    && amount(check.reported_total) && amount(check.distribution_total)
    && typeof check.difference === 'string' && /^-?\d+\.\d{2}$/.test(check.difference)
    && Number(check.difference) !== 0 && check.sources?.length > 1
    && check.sources.every(source => amount(source.value) && Number.isInteger(source.page) && source.page > 0));
  if (!checks.length) return '';
  const comparisons = checks.map((check, index) => {
    const direction = Number(check.difference) > 0 ? 'higher' : 'lower';
    const difference = check.difference.replace(/^-/, '');
    const rows = check.sources.slice(1).map((source, row) =>
      `  - Distribution row ${row + 1}: $${source.value} (PDF page ${source.page})`).join('\n');
    return `Payment comparison ${index + 1}:\n- Reported TOTAL PAYMENT AMOUNT: $${check.reported_total} (PDF page ${check.sources[0].page})\n- PAYMENT DISTRIBUTION rows:\n${rows}\n- Sum of these distribution rows: $${check.distribution_total}\n- Difference: $${difference}; the distribution sum is ${direction} than the reported total.`;
  }).join('\n\n');
  return `To: [Insurance company / claims department]\nFrom: [Your name]\nMember ID: [Your member ID]\nClaim reference(s): [Claim reference for each comparison below]\nDate(s) of service: [Date(s) of service]\nDate: [Today's date]\n\nSubject: Request to clarify inconsistent payment amounts in my Explanation of Benefits\n\nDear Claims Department,\n\nI am requesting clarification of the payment figures in my Explanation of Benefits (EOB). The reported total payment and the payment distribution appear inconsistent as follows:\n\n${comparisons}\n\nPlease review these sections and provide a written explanation:\n1. Do the reported total and distribution rows refer to the same claim and payment? If not, please explain what each section covers.\n2. Which payment amount is correct, and what accounts for the difference?\n3. If the EOB contains an error, please provide a corrected EOB and explain whether any amount listed as my responsibility changes.\n\nI am requesting clarification rather than assuming that the difference is an overcharge or a refund due. I can provide a copy of the EOB and the referenced pages. Please let me know what additional information you need and provide a reference number for this inquiry and the next steps.\n\nThank you,\n[Your name]\n[Preferred contact details]\n`;
}
