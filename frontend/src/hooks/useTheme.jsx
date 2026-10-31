import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "laburodev-theme";

function initialTheme() {
   const saved = localStorage.getItem(STORAGE_KEY);
   if (saved === "light" || saved === "dark") return saved;
   return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
}

export function useTheme() {
   const [theme, setTheme] = useState(initialTheme);

   useEffect(() => {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem(STORAGE_KEY, theme);
   }, [theme]);

   const toggle = useCallback(() => {
      setTheme((t) => (t === "dark" ? "light" : "dark"));
   }, []);

   return { theme, toggle };
}
