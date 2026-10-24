/* Non-blocking, accessible feedback for the existing form handlers. */
(() => {
  let timer;
  window.alert = message => {
    const text = String(message).replace(/^[^\p{L}\p{N}]+/u, '').trim();
    let toast = document.getElementById('fsh-feedback');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'fsh-feedback';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.innerHTML = '<span class="feedback-mark" aria-hidden="true"></span><span class="feedback-copy"></span><button type="button" aria-label="Dismiss message">×</button>';
      toast.querySelector('button').addEventListener('click', () => toast.classList.remove('visible'));
      document.body.appendChild(toast);
    }
    const success = /success|approved|sent|updated|saved/i.test(text) && !/not |failed|error/i.test(text);
    toast.classList.toggle('success', success);
    toast.querySelector('.feedback-mark').textContent = success ? '✓' : '!';
    toast.querySelector('.feedback-copy').textContent = text;
    requestAnimationFrame(() => toast.classList.add('visible'));
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('visible'), 6500);
  };
})();
