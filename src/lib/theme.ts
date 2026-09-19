type Theme = "light" | "dark";

const DEFAULT_THEME: Theme = "light";
const THEME_KEY = "portfolio.theme";

/** Runs before paint so the stored theme is applied without a flash. */
export const themeInitScript = `(function(){document.documentElement.classList.add("js");try{var t=localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})();`;

function current(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const t = document.documentElement.dataset.theme;
  return t === "dark" ? "dark" : "light";
}

const listeners = new Set<() => void>();

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getThemeSnapshot(): Theme {
  return current();
}

export function getThemeServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage can be blocked; the theme still applies for this page */
  }
  listeners.forEach((l) => l());
}
