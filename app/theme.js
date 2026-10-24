/* Apply appearance before styles render; follow the device until a user chooses. */
(() => {
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => value === 'light' || value === 'dark';
  const manual = () => localStorage.getItem('fsh_theme_manual') === '1' && valid(localStorage.getItem('fsh_theme'));
  const apply = () => {
    const mode = manual() ? localStorage.getItem('fsh_theme') : (preference.matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', mode);
    window.dispatchEvent(new CustomEvent('fsh-theme-change', { detail: { mode, automatic: !manual() } }));
    return mode;
  };

  // Earlier builds saved a default theme. Treat that value as automatic.
  if (!manual()) {
    localStorage.removeItem('fsh_theme');
    localStorage.removeItem('fsh_theme_manual');
  }

  window.fshTheme = {
    current: () => document.documentElement.getAttribute('data-theme'),
    isAutomatic: () => !manual(),
    set(mode) {
      if (!valid(mode)) return;
      localStorage.setItem('fsh_theme', mode);
      localStorage.setItem('fsh_theme_manual', '1');
      apply();
    },
    useDevice() {
      localStorage.removeItem('fsh_theme');
      localStorage.removeItem('fsh_theme_manual');
      apply();
    }
  };

  preference.addEventListener('change', () => { if (!manual()) apply(); });
  window.addEventListener('storage', event => {
    if (event.key === 'fsh_theme' || event.key === 'fsh_theme_manual') apply();
  });
  apply();
})();
