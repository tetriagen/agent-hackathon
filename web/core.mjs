export function answer(value) {
  return value === "yes" ? true : value === "no" ? false : null;
}

export function draftLetter(result) {
  return `To: Billing department\nFrom: [Your name]\nAccount: [Your account number]\nDate: [Date]\n\nSubject: Request for an itemized explanation of my bill\n\nI am requesting a review of my bill and the estimate I received.\n\nEstimated amount: $${result.estimate_amount}\nBilled amount: $${result.billed_amount}\nDifference (bill minus estimate): $${result.difference}\n\nPlease provide an itemized explanation of the charges and any differences from the estimate. Please explain which services, quantities, or other changes account for the difference and correct any billing errors you identify.\n\nI can provide copies of the bill and estimate. Please let me know what additional information you need and how I can follow up.\n\nThank you,\n[Your name]\n[Preferred contact details]\n`;
}
