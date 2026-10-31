import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export function ThemeToggle() {
   const { theme, toggle } = useTheme();

   return (
      <button
         type="button"
         className="theme-toggle"
         onClick={toggle}
         aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      >
         {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
   );
}
