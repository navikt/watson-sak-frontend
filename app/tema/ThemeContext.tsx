import { Theme } from "@navikt/ds-react";
import { createContext, useContext, useState } from "react";
import { logger } from "~/logging/logging";
import { RouteConfig } from "~/routeConfig";
import { type Theme as ThemeType } from "./ThemeCookie";

const ThemeContext = createContext<{
  theme: ThemeType;
  toggleTheme: () => Promise<void>;
}>({
  theme: "light",
  toggleTheme: async () => {},
});

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: ThemeType;
};

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeType>(defaultTheme);

  const toggleTheme = async () => {
    const oldTheme = theme;
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    try {
      const formData = new FormData();
      formData.append("theme", newTheme);

      await fetch(RouteConfig.API.THEME, {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      logger.error("Kunne ikke lagre tema-preferense", { error });
      setTheme(oldTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <Theme theme={theme}>{children}</Theme>
    </ThemeContext.Provider>
  );
}
