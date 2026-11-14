const privacy = document.getElementById('privacy-dialog');
document.querySelectorAll('a[href="#privacy"]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    const providerNotice = document.getElementById('ai-privacy');
    if (providerNotice) document.getElementById('dialog-ai-privacy').textContent = providerNotice.textContent;
    privacy.showModal();
  });
});
document.getElementById('close-privacy').addEventListener('click',()=>privacy.close());
