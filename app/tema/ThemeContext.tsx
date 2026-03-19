import { Theme } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { usePreferences } from "~/preferanser/PreferencesContext";
import { finnAktivtTema } from "./theme-utils";

type ThemeProviderProps = {
  children: React.ReactNode;
};

function lagSystemTemaScript() {
  return `
    (function() {
      var root = document.currentScript && document.currentScript.parentElement;
      if (!root || !window.matchMedia) return;
      var erMorkt = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.remove("light", "dark");
      root.classList.add(erMorkt ? "dark" : "light");
    })();
  `;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { preferences } = usePreferences();
  const [systemForetrekkerMorktTema, setSystemForetrekkerMorktTema] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const oppdaterSystemTema = () => {
      setSystemForetrekkerMorktTema(mediaQuery.matches);
    };

    oppdaterSystemTema();
    mediaQuery.addEventListener("change", oppdaterSystemTema);

    return () => {
      mediaQuery.removeEventListener("change", oppdaterSystemTema);
    };
  }, []);

  const theme = finnAktivtTema(preferences.tema, systemForetrekkerMorktTema);

  return (
    <Theme asChild theme={theme}>
      <div suppressHydrationWarning>
        {preferences.tema === "system" ? (
          <script dangerouslySetInnerHTML={{ __html: lagSystemTemaScript() }} />
        ) : null}
        {children}
      </div>
    </Theme>
  );
}
