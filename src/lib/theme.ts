// Theme preference. index.html applies it before first paint; this module changes it.
export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'carl-theme';
const dark = () => matchMedia('(prefers-color-scheme: dark)').matches;

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* private mode: still applies for this visit */
  }
  document.documentElement.dataset.theme = pref === 'system' ? (dark() ? 'dark' : 'light') : pref;
}
