const workspace = document.getElementById('workspace');
const title = document.getElementById('workspace-title');
const privacy = document.getElementById('privacy-dialog');
title.tabIndex = -1;
document.querySelectorAll('[data-open-review]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    workspace.hidden = false;
    history.replaceState(null, '', '#workspace');
    title.focus({preventScroll:true});
    workspace.scrollIntoView({block:'start',behavior:'instant'});
  });
});
document.querySelectorAll('a[href="#privacy"]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    document.getElementById('dialog-ai-privacy').textContent = document.getElementById('ai-privacy').textContent;
    privacy.showModal();
  });
});
document.getElementById('close-privacy').addEventListener('click',()=>privacy.close());
// A previously saved URL does not open the document workspace without a click.
if(location.hash === '#workspace' || location.hash === '#privacy') history.replaceState(null,'',location.pathname+location.search);
