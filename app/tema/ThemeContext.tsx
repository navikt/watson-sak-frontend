import { Theme } from "@navikt/ds-react";
import { createContext, useContext } from "react";
import { usePreferences } from "~/preferanser/PreferencesContext";
import type { Preferences } from "~/preferanser/PreferencesCookie";

type ThemeType = Preferences["tema"];

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
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { preferences, oppdaterPreference } = usePreferences();
  const theme = preferences.tema;

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    await oppdaterPreference("tema", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <Theme theme={theme}>{children}</Theme>
    </ThemeContext.Provider>
  );
}
