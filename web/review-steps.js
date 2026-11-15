const $ = id => document.getElementById(id);
let current = 'read';
let tab = 'findings';

export function refreshSteps() {
  let hasFindings = false;
  for (const kind of ['estimate', 'bill']) {
    const present = Boolean($(`${kind}-parsed`).textContent || $(`${kind}-ai-result`).textContent);
    $(`${kind}-findings`).hidden = !present;
    hasFindings ||= present;
  }
  $('findings-empty').hidden = hasFindings;
  const aiLetter = Boolean($('estimate-letter').textContent || $('bill-letter').textContent);
  const selfpayLetter = !$('result').hidden;
  $('selfpay-letter').hidden = tab !== 'selfpay' || !selfpayLetter;
  for (const kind of ['estimate', 'bill']) $(`${kind}-letter`).hidden = tab !== 'findings';
  $('letter-empty').hidden = tab === 'selfpay' ? selfpayLetter : aiLetter;
  $('to-letter').disabled = tab === 'selfpay' ? !selfpayLetter : !aiLetter;
  $('verify-confirmation').hidden = tab !== 'findings' || !aiLetter;
  $('letter-hint').hidden = !$('to-letter').disabled;
  $('letter-hint').textContent = tab === 'selfpay'
    ? 'Compare and confirm your amounts to prepare a letter.'
    : 'A letter becomes available when document review identifies a finding to clarify. You can also compare self-pay amounts in the other tab.';
  // Hidden required controls must not block the other workflow.
  $('panel-selfpay').querySelectorAll('input,select').forEach(el => { el.disabled = current !== 'verify' || tab !== 'selfpay'; });
}

export function showReviewTab(next) {
  tab = next;
  for (const name of ['findings', 'selfpay']) {
    $(`panel-${name}`).hidden = name !== tab;
    $(`tab-${name}`).setAttribute('aria-selected', String(name === tab));
    $(`tab-${name}`).tabIndex = name === tab ? 0 : -1;
  }
  refreshSteps();
}

export function showReviewStep(next, focus = true) {
  current = next;
  document.body.dataset.reviewStep = next;
  for (const name of ['read', 'verify', 'letter']) $(`step-${name}`).hidden = name !== next;
  document.querySelectorAll('.workflow li').forEach((el, i) => {
    if (i === ['read', 'verify', 'letter'].indexOf(next)) el.setAttribute('aria-current', 'step');
    else el.removeAttribute('aria-current');
  });
  $('privacy').hidden = next !== 'read';
  refreshSteps();
  if (focus) {
    const heading = next === 'read' ? $('workspace-title') : $(`${next}-title`);
    heading.tabIndex = -1;
    heading.focus({preventScroll: true});
    document.querySelector('.workflow').scrollIntoView({block: 'start', behavior: 'instant'});
  }
}

export function setupReviewSteps(isBusy) {
  $('to-verify').addEventListener('click', () => { if (!isBusy()) showReviewStep('verify'); });
  $('to-letter').addEventListener('click', () => {
    if (isBusy()) return;
    if (tab === 'findings' && !$('findings-confirmed').checked) {
      $('notice').textContent = 'Check the findings against your PDF and confirm them before continuing.';
      $('findings-confirmed').focus();
      return;
    }
    showReviewStep('letter');
  });
  document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
    if (!isBusy()) showReviewStep(button.dataset.step);
  }));
  for (const name of ['findings', 'selfpay']) {
    const button = $(`tab-${name}`);
    button.addEventListener('click', () => { if (!isBusy()) showReviewTab(name); });
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || isBusy()) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'findings' : event.key === 'End' ? 'selfpay' : name === 'findings' ? 'selfpay' : 'findings';
      showReviewTab(next); $(`tab-${next}`).focus();
    });
  }
  showReviewStep('read', false);
}
