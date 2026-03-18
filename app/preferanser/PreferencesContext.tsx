import { createContext, useContext, useState } from "react";
import { logger } from "~/logging/logging";
import { RouteConfig } from "~/routeConfig";
import type { Preferences } from "./PreferencesCookie";

type PreferencesContextType = {
  preferences: Preferences;
  oppdaterPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences må brukes innenfor en PreferencesProvider");
  }
  return context;
}

type PreferencesProviderProps = {
  children: React.ReactNode;
  defaultPreferences: Preferences;
};

export function PreferencesProvider({ children, defaultPreferences }: PreferencesProviderProps) {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  const oppdaterPreference = async <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const forrige = preferences;
    setPreferences((prev) => ({ ...prev, [key]: value }));

    try {
      const formData = new FormData();
      formData.append(key, String(value));

      const response = await fetch(RouteConfig.API.PREFERENCES, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        logger.error("Kunne ikke lagre preferanse – server svarte med feilstatus", {
          status: response.status,
          statusText: response.statusText,
        });
        setPreferences(forrige);
      }
    } catch (error) {
      logger.error("Kunne ikke lagre preferanse", { error });
      setPreferences(forrige);
    }
  };

  return (
    <PreferencesContext.Provider value={{ preferences, oppdaterPreference }}>
      {children}
    </PreferencesContext.Provider>
  );
}
