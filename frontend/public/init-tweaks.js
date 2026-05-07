// Synchronously applies user tweak preferences (theme, density, dark mode)
// from localStorage to <html> before the body parses. Eliminates the flash
// of default theme on first paint. Mirrors validation in useTweaks().
(function () {
  try {
    var raw = localStorage.getItem('article30-tweaks');
    if (!raw) return;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    var themes = ['ink', 'forest', 'sand', 'slate'];
    var densities = ['comfortable', 'compact'];
    var root = document.documentElement;
    if (typeof parsed.theme === 'string' && themes.indexOf(parsed.theme) !== -1) {
      root.dataset.theme = parsed.theme;
    }
    if (typeof parsed.density === 'string' && densities.indexOf(parsed.density) !== -1) {
      root.dataset.density = parsed.density;
    }
    if (parsed.dark === true) root.classList.add('dark');
    else if (parsed.dark === false) root.classList.remove('dark');
  } catch (e) {
    /* fail silently — DEFAULT_TWEAKS take effect via static html attrs */
  }
})();
